-- Talk To Us: initial schema, authorization rules, and private attachment bucket.

create extension if not exists pgcrypto;

create type public.user_role as enum ('user', 'admin', 'super_admin');
create type public.idea_status as enum (
  'submitted',
  'under_consideration',
  'in_review',
  'budget_review',
  'approved',
  'assigned',
  'in_progress',
  'resolved',
  'closed',
  'declined',
  'deferred',
  'duplicate'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 2 and 80),
  role public.user_role not null default 'user',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 2 and 48),
  color text not null default '#a6c47c' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 8 and 120),
  description text not null check (char_length(trim(description)) between 30 and 5000),
  category_id uuid not null references public.categories (id) on delete restrict,
  submitted_by uuid not null references public.profiles (id) on delete restrict,
  status public.idea_status not null default 'submitted',
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  cost_currency text not null default 'GBP' check (cost_currency ~ '^[A-Z]{3}$'),
  budget_period text check (budget_period is null or char_length(budget_period) <= 32),
  approved_amount numeric(14, 2) check (approved_amount is null or approved_amount >= 0),
  actual_spend numeric(14, 2) check (actual_spend is null or actual_spend >= 0),
  assigned_to uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.idea_comments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete restrict,
  body text not null check (char_length(trim(body)) between 2 and 3000),
  created_at timestamptz not null default now()
);

create table public.idea_events (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  event_type text not null check (event_type in ('submitted', 'status_changed', 'assigned', 'budget_updated')),
  from_status public.idea_status,
  to_status public.idea_status,
  note text check (note is null or char_length(note) <= 1000),
  created_at timestamptz not null default now()
);

create table public.idea_attachments (
  id uuid primary key default gen_random_uuid(),
  idea_id uuid not null references public.ideas (id) on delete cascade,
  uploaded_by uuid not null references public.profiles (id) on delete restrict,
  storage_path text not null unique,
  file_name text not null check (char_length(file_name) between 1 and 255),
  mime_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  created_at timestamptz not null default now()
);

create table public.email_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null,
  idea_id uuid not null references public.ideas (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (event_type in ('new_idea', 'new_comment', 'status_change')),
  recipient_email text not null,
  status text not null default 'pending' check (status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (source_id, event_type, recipient_email)
);

create index ideas_created_at_idx on public.ideas (created_at desc);
create index ideas_status_updated_at_idx on public.ideas (status, updated_at desc);
create index ideas_category_id_idx on public.ideas (category_id);
create index ideas_submitted_by_idx on public.ideas (submitted_by, created_at desc);
create index ideas_assigned_to_idx on public.ideas (assigned_to) where assigned_to is not null;
create index idea_comments_idea_created_idx on public.idea_comments (idea_id, created_at);
create index idea_events_idea_created_idx on public.idea_events (idea_id, created_at);
create index idea_attachments_idea_idx on public.idea_attachments (idea_id);
create index email_notification_delivery_pending_idx on public.email_notification_deliveries (status, created_at);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'New member'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active = true
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.current_user_role() in ('admin'::public.user_role, 'super_admin'::public.user_role)), false)
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select public.current_user_role() = 'super_admin'::public.user_role), false)
$$;

create or replace function public.record_idea_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  event_note text := nullif(current_setting('talk_to_us.event_note', true), '');
begin
  if tg_op = 'INSERT' then
    insert into public.idea_events (idea_id, actor_id, event_type, to_status)
    values (new.id, coalesce((select auth.uid()), new.submitted_by), 'submitted', new.status);
    return new;
  end if;

  new.updated_at := now();

  if new.status is distinct from old.status then
    insert into public.idea_events (idea_id, actor_id, event_type, from_status, to_status, note)
    values (new.id, (select auth.uid()), 'status_changed', old.status, new.status, event_note);
  end if;

  if new.assigned_to is distinct from old.assigned_to then
    insert into public.idea_events (idea_id, actor_id, event_type, note)
    values (new.id, (select auth.uid()), 'assigned', event_note);
  end if;

  if new.estimated_cost is distinct from old.estimated_cost
     or new.cost_currency is distinct from old.cost_currency
     or new.budget_period is distinct from old.budget_period
     or new.approved_amount is distinct from old.approved_amount
     or new.actual_spend is distinct from old.actual_spend then
    insert into public.idea_events (idea_id, actor_id, event_type, note)
    values (new.id, (select auth.uid()), 'budget_updated', event_note);
  end if;

  if new.status in ('resolved', 'closed', 'declined', 'duplicate') then
    new.resolved_at := coalesce(old.resolved_at, now());
  elsif new.status is distinct from old.status then
    new.resolved_at := null;
  end if;

  return new;
end;
$$;

create trigger record_idea_submission_trigger
  after insert on public.ideas
  for each row execute function public.record_idea_history();

create trigger record_idea_history_trigger
  before update on public.ideas
  for each row execute function public.record_idea_history();

create or replace function public.set_idea_status(
  p_idea_id uuid,
  p_status public.idea_status,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  history_id uuid;
  current_status public.idea_status;
begin
  if not (select public.is_admin()) then
    raise exception 'Only an admin can update idea status.' using errcode = '42501';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Status notes must be 1,000 characters or less.' using errcode = '22023';
  end if;
  if p_note is not null and trim(p_note) <> '' and char_length(trim(p_note)) < 2 then
    raise exception 'A discussion reply must contain at least two characters.' using errcode = '22023';
  end if;
  select i.status into current_status
  from public.ideas i
  where i.id = p_idea_id
  for update;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;
  if current_status = p_status then
    return null;
  end if;
  perform set_config('talk_to_us.event_note', '', true);
  update public.ideas set status = p_status where id = p_idea_id;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;
  if nullif(trim(p_note), '') is not null then
    insert into public.idea_comments (idea_id, author_id, body)
    values (p_idea_id, (select auth.uid()), trim(p_note));
  end if;
  select e.id into history_id
  from public.idea_events e
  where e.idea_id = p_idea_id and e.actor_id = (select auth.uid())
    and e.event_type = 'status_changed' and e.to_status = p_status
  order by e.created_at desc limit 1;
  return history_id;
end;
$$;

create or replace function public.set_idea_assignment(
  p_idea_id uuid,
  p_assigned_to uuid,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Only an admin can assign an idea.' using errcode = '42501';
  end if;
  if p_assigned_to is not null and not exists (
    select 1 from public.profiles p
    where p.id = p_assigned_to and p.is_active and p.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
  ) then
    raise exception 'The assignee must be an active admin.' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Assignment notes must be 1,000 characters or less.' using errcode = '22023';
  end if;
  if p_note is not null and trim(p_note) <> '' and char_length(trim(p_note)) < 2 then
    raise exception 'A discussion reply must contain at least two characters.' using errcode = '22023';
  end if;
  perform set_config('talk_to_us.event_note', '', true);
  update public.ideas set assigned_to = p_assigned_to where id = p_idea_id;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;
  if nullif(trim(p_note), '') is not null then
    insert into public.idea_comments (idea_id, author_id, body)
    values (p_idea_id, (select auth.uid()), trim(p_note))
    returning id into comment_id;
  end if;
  return comment_id;
end;
$$;

create or replace function public.set_idea_budget(
  p_idea_id uuid,
  p_estimated_cost numeric,
  p_cost_currency text,
  p_budget_period text,
  p_approved_amount numeric,
  p_actual_spend numeric,
  p_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  comment_id uuid;
begin
  if not (select public.is_admin()) then
    raise exception 'Only an admin can update idea budgets.' using errcode = '42501';
  end if;
  if p_cost_currency !~ '^[A-Za-z]{3}$' then
    raise exception 'Currency must be a three-letter code.' using errcode = '22023';
  end if;
  if p_estimated_cost < 0 or p_approved_amount < 0 or p_actual_spend < 0 then
    raise exception 'Budget values cannot be negative.' using errcode = '22023';
  end if;
  if p_budget_period is not null and char_length(p_budget_period) > 32 then
    raise exception 'Budget period must be 32 characters or less.' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Budget notes must be 1,000 characters or less.' using errcode = '22023';
  end if;
  if p_note is not null and trim(p_note) <> '' and char_length(trim(p_note)) < 2 then
    raise exception 'A discussion reply must contain at least two characters.' using errcode = '22023';
  end if;
  perform set_config('talk_to_us.event_note', '', true);
  update public.ideas
  set estimated_cost = p_estimated_cost,
      cost_currency = upper(p_cost_currency),
      budget_period = nullif(trim(p_budget_period), ''),
      approved_amount = p_approved_amount,
      actual_spend = p_actual_spend
  where id = p_idea_id;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;
  if nullif(trim(p_note), '') is not null then
    insert into public.idea_comments (idea_id, author_id, body)
    values (p_idea_id, (select auth.uid()), trim(p_note))
    returning id into comment_id;
  end if;
  return comment_id;
end;
$$;

create or replace function public.set_user_role(
  p_user_id uuid,
  p_role public.user_role,
  p_is_active boolean
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  remaining_super_admins integer;
begin
  if not (select public.is_super_admin()) then
    raise exception 'Only a super admin can manage user access.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_user_id) then
    raise exception 'Profile not found.' using errcode = 'P0002';
  end if;
  if p_role <> 'super_admin' or not p_is_active then
    select count(*) into remaining_super_admins
    from public.profiles p
    where p.role = 'super_admin' and p.is_active and p.id <> p_user_id;
    if remaining_super_admins = 0 then
      raise exception 'Keep at least one active super admin.' using errcode = '22023';
    end if;
  end if;
  update public.profiles set role = p_role, is_active = p_is_active where id = p_user_id;
end;
$$;

create or replace function public.get_idea_notification_recipients(
  p_idea_id uuid,
  p_event_type text,
  p_source_id uuid
)
returns table (delivery_id uuid, email text, display_name text, idea_title text, actor_name text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid := (select auth.uid());
  target_idea public.ideas%rowtype;
  verified_source boolean := false;
  notification_recipient record;
  claimed_delivery_id uuid;
begin
  if actor_id is null then
    raise exception 'Sign in required.' using errcode = '42501';
  end if;
  select * into target_idea from public.ideas i where i.id = p_idea_id;
  if not found then
    raise exception 'Idea not found.' using errcode = 'P0002';
  end if;

  if p_event_type = 'new_idea' then
    select exists (
      select 1 from public.idea_events e
      where e.id = p_source_id and e.idea_id = p_idea_id and e.event_type = 'submitted' and e.actor_id = actor_id
    ) into verified_source;
    if not verified_source or target_idea.submitted_by <> actor_id then
      raise exception 'Only the submitter can notify admins about a new idea.' using errcode = '42501';
    end if;
    for notification_recipient in
      select u.email::text, p.display_name, target_idea.title,
        (select actor_profile.display_name from public.profiles actor_profile where actor_profile.id = actor_id) as actor_name
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.is_active and p.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
        and p.id <> actor_id and u.email is not null
    loop
      insert into public.email_notification_deliveries (source_id, idea_id, actor_id, event_type, recipient_email)
      values (p_source_id, p_idea_id, actor_id, p_event_type, notification_recipient.email)
      on conflict (source_id, event_type, recipient_email) do nothing;
      update public.email_notification_deliveries d
      set status = 'sending', attempts = d.attempts + 1, updated_at = now(), last_error = null
      where d.source_id = p_source_id and d.event_type = p_event_type and d.recipient_email = notification_recipient.email
        and (d.status in ('pending', 'failed') or (d.status = 'sending' and d.updated_at < now() - interval '5 minutes'))
      returning d.id into claimed_delivery_id;
      if claimed_delivery_id is not null then
        return query select claimed_delivery_id, notification_recipient.email, notification_recipient.display_name, target_idea.title, notification_recipient.actor_name;
      end if;
      claimed_delivery_id := null;
    end loop;
  elsif p_event_type = 'new_comment' then
    select exists (
      select 1 from public.idea_comments c
      where c.id = p_source_id and c.idea_id = p_idea_id and c.author_id = actor_id
    ) into verified_source;
    if not verified_source then
      raise exception 'Only the author of this reply can notify its recipients.' using errcode = '42501';
    elsif target_idea.submitted_by = actor_id then
      for notification_recipient in
        select u.email::text, p.display_name, target_idea.title,
          (select actor_profile.display_name from public.profiles actor_profile where actor_profile.id = actor_id) as actor_name
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.is_active and p.role in ('admin'::public.user_role, 'super_admin'::public.user_role)
          and p.id <> actor_id and u.email is not null
      loop
        insert into public.email_notification_deliveries (source_id, idea_id, actor_id, event_type, recipient_email)
        values (p_source_id, p_idea_id, actor_id, p_event_type, notification_recipient.email)
        on conflict (source_id, event_type, recipient_email) do nothing;
        update public.email_notification_deliveries d
        set status = 'sending', attempts = d.attempts + 1, updated_at = now(), last_error = null
        where d.source_id = p_source_id and d.event_type = p_event_type and d.recipient_email = notification_recipient.email
          and (d.status in ('pending', 'failed') or (d.status = 'sending' and d.updated_at < now() - interval '5 minutes'))
        returning d.id into claimed_delivery_id;
        if claimed_delivery_id is not null then
          return query select claimed_delivery_id, notification_recipient.email, notification_recipient.display_name, target_idea.title, notification_recipient.actor_name;
        end if;
        claimed_delivery_id := null;
      end loop;
    elsif (select public.is_admin()) then
      for notification_recipient in
        select u.email::text, p.display_name, target_idea.title,
          (select actor_profile.display_name from public.profiles actor_profile where actor_profile.id = actor_id) as actor_name
        from public.profiles p
        join auth.users u on u.id = p.id
        where p.id = target_idea.submitted_by and p.is_active and u.email is not null
      loop
        insert into public.email_notification_deliveries (source_id, idea_id, actor_id, event_type, recipient_email)
        values (p_source_id, p_idea_id, actor_id, p_event_type, notification_recipient.email)
        on conflict (source_id, event_type, recipient_email) do nothing;
        update public.email_notification_deliveries d
        set status = 'sending', attempts = d.attempts + 1, updated_at = now(), last_error = null
        where d.source_id = p_source_id and d.event_type = p_event_type and d.recipient_email = notification_recipient.email
          and (d.status in ('pending', 'failed') or (d.status = 'sending' and d.updated_at < now() - interval '5 minutes'))
        returning d.id into claimed_delivery_id;
        if claimed_delivery_id is not null then
          return query select claimed_delivery_id, notification_recipient.email, notification_recipient.display_name, target_idea.title, notification_recipient.actor_name;
        end if;
        claimed_delivery_id := null;
      end loop;
    else
      raise exception 'Only the submitter and admin team can notify this discussion.' using errcode = '42501';
    end if;
  elsif p_event_type = 'status_change' then
    if not (select public.is_admin()) then
      raise exception 'Only an admin can notify about a status change.' using errcode = '42501';
    end if;
    select exists (
      select 1 from public.idea_events e
      where e.id = p_source_id and e.idea_id = p_idea_id and e.event_type = 'status_changed' and e.actor_id = actor_id
    ) into verified_source;
    if not verified_source then
      raise exception 'A status history entry is required for this notification.' using errcode = '42501';
    end if;
    for notification_recipient in
      select u.email::text, p.display_name, target_idea.title,
        (select actor_profile.display_name from public.profiles actor_profile where actor_profile.id = actor_id) as actor_name
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.id = target_idea.submitted_by and p.is_active and u.email is not null
    loop
      insert into public.email_notification_deliveries (source_id, idea_id, actor_id, event_type, recipient_email)
      values (p_source_id, p_idea_id, actor_id, p_event_type, notification_recipient.email)
      on conflict (source_id, event_type, recipient_email) do nothing;
      update public.email_notification_deliveries d
      set status = 'sending', attempts = d.attempts + 1, updated_at = now(), last_error = null
      where d.source_id = p_source_id and d.event_type = p_event_type and d.recipient_email = notification_recipient.email
        and (d.status in ('pending', 'failed') or (d.status = 'sending' and d.updated_at < now() - interval '5 minutes'))
      returning d.id into claimed_delivery_id;
      if claimed_delivery_id is not null then
        return query select claimed_delivery_id, notification_recipient.email, notification_recipient.display_name, target_idea.title, notification_recipient.actor_name;
      end if;
      claimed_delivery_id := null;
    end loop;
  else
    raise exception 'Unsupported notification event.' using errcode = '22023';
  end if;
end;
$$;

create or replace function public.complete_email_notification(
  p_delivery_id uuid,
  p_sent boolean,
  p_error text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.email_notification_deliveries
  set status = case when p_sent then 'sent' else 'failed' end,
      last_error = case when p_sent then null else left(coalesce(p_error, 'Email could not be delivered.'), 500) end,
      updated_at = now(),
      sent_at = case when p_sent then now() else null end
  where id = p_delivery_id and actor_id = (select auth.uid()) and status = 'sending';
  if not found then
    raise exception 'Notification delivery not found or no longer available.' using errcode = 'P0002';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_comments enable row level security;
alter table public.idea_events enable row level security;
alter table public.idea_attachments enable row level security;
alter table public.email_notification_deliveries enable row level security;

revoke all on public.profiles, public.categories, public.ideas, public.idea_comments, public.idea_events, public.idea_attachments from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant select on public.categories to authenticated;
grant insert (name, color, is_active) on public.categories to authenticated;
grant update (name, color, is_active) on public.categories to authenticated;
grant select on public.ideas to authenticated;
grant insert (title, description, category_id, submitted_by, estimated_cost, cost_currency, budget_period) on public.ideas to authenticated;
grant update (status, assigned_to, estimated_cost, cost_currency, budget_period, approved_amount, actual_spend) on public.ideas to authenticated;
grant select, insert on public.idea_comments to authenticated;
grant select on public.idea_events to authenticated;
grant select, insert, delete on public.idea_attachments to authenticated;

create policy "Active members can view profiles"
  on public.profiles for select to authenticated
  using ((select public.current_user_role()) is not null);
create policy "Members can update their own display name"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) and (select public.current_user_role()) is not null)
  with check (id = (select auth.uid()) and (select public.current_user_role()) is not null);

create policy "Active members can browse categories"
  on public.categories for select to authenticated
  using ((select public.current_user_role()) is not null and (is_active or (select public.is_super_admin())));
create policy "Super admins can create categories"
  on public.categories for insert to authenticated
  with check ((select public.is_super_admin()));
create policy "Super admins can update categories"
  on public.categories for update to authenticated
  using ((select public.is_super_admin()))
  with check ((select public.is_super_admin()));

create policy "Active members can browse ideas"
  on public.ideas for select to authenticated
  using ((select public.current_user_role()) is not null);
create policy "Members can submit ideas for themselves"
  on public.ideas for insert to authenticated
  with check (
    submitted_by = (select auth.uid())
    and status = 'submitted'
    and assigned_to is null
    and (select public.current_user_role()) is not null
  );
create policy "Admins can update ideas"
  on public.ideas for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Submitter and admins can read private discussion"
  on public.idea_comments for select to authenticated
  using (
    (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Submitter and admins can reply"
  on public.idea_comments for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );

create policy "Active members can read public idea history"
  on public.idea_events for select to authenticated
  using ((select public.current_user_role()) is not null);

create policy "Submitter and admins can read private attachments"
  on public.idea_attachments for select to authenticated
  using (
    (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Submitter and admins can add private attachments"
  on public.idea_attachments for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Submitter and admins can remove private attachments"
  on public.idea_attachments for delete to authenticated
  using (
    (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = idea_id and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.record_idea_history() from public, anon, authenticated;
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
revoke all on function public.is_super_admin() from public, anon;
revoke all on function public.set_idea_status(uuid, public.idea_status, text) from public, anon;
revoke all on function public.set_idea_assignment(uuid, uuid, text) from public, anon;
revoke all on function public.set_idea_budget(uuid, numeric, text, text, numeric, numeric, text) from public, anon;
revoke all on function public.set_user_role(uuid, public.user_role, boolean) from public, anon;
revoke all on function public.get_idea_notification_recipients(uuid, text, uuid) from public, anon;
revoke all on function public.complete_email_notification(uuid, boolean, text) from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.set_idea_status(uuid, public.idea_status, text) to authenticated;
grant execute on function public.set_idea_assignment(uuid, uuid, text) to authenticated;
grant execute on function public.set_idea_budget(uuid, numeric, text, text, numeric, numeric, text) to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role, boolean) to authenticated;
grant execute on function public.get_idea_notification_recipients(uuid, text, uuid) to authenticated;
grant execute on function public.complete_email_notification(uuid, boolean, text) to authenticated;

insert into public.categories (name, color) values
  ('Workplace', '#8ec7a4'),
  ('Culture & community', '#f4bd8b'),
  ('Tools & technology', '#9db7ef'),
  ('Sustainability', '#a7c979'),
  ('Ways of working', '#d5a4cb')
on conflict (name) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'idea-files',
  'idea-files',
  false,
  10485760,
  array[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/png',
    'image/jpeg'
  ]
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "Submitter and admins can upload idea files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'idea-files'
    and (select public.current_user_role()) is not null
    and array_length(storage.foldername(name), 1) = 2
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.ideas i
      where i.id = case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end
      and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Submitter and admins can read idea files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'idea-files'
    and (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end
      and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
create policy "Submitter and admins can remove idea files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'idea-files'
    and (select public.current_user_role()) is not null
    and exists (
      select 1 from public.ideas i
      where i.id = case
        when (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
        then ((storage.foldername(name))[1])::uuid
        else null
      end
      and (i.submitted_by = (select auth.uid()) or (select public.is_admin()))
    )
  );
