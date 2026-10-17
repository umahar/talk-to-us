import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const migrationPath = resolve(
  process.cwd(),
  "supabase/migrations/20261017000000_initial_schema.sql",
);
const db = new PGlite({ extensions: { pgcrypto } });

describe("initial Supabase migration", () => {
  beforeAll(async () => {
    await db.exec(`
      create role anon nologin;
      create role authenticated nologin;
      create schema auth;
      create table auth.users (
        id uuid primary key,
        email text unique,
        raw_user_meta_data jsonb not null default '{}'::jsonb
      );
      create function auth.uid() returns uuid
      language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

      create schema storage;
      create table storage.buckets (
        id text primary key,
        name text not null,
        public boolean not null default false,
        file_size_limit bigint,
        allowed_mime_types text[]
      );
      create table storage.objects (
        id uuid primary key default gen_random_uuid(),
        bucket_id text not null,
        name text not null unique
      );
      create function storage.foldername(name text) returns text[]
      language sql immutable
      as $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
    `);

    const migration = await readFile(migrationPath, "utf8");
    await db.exec(migration);
  });

  afterAll(async () => {
    await db.close();
  });

  it("creates profiles, keeps idea history, and enforces private discussion access", async () => {
    const submitterId = "10000000-0000-4000-8000-000000000001";
    const otherUserId = "10000000-0000-4000-8000-000000000002";
    const adminId = "10000000-0000-4000-8000-000000000003";

    await db.query(
      `insert into auth.users (id, email, raw_user_meta_data) values
        ($1, 'submitter@example.test', '{"display_name":"Avery Submitter"}'),
        ($2, 'other@example.test', '{"display_name":"Riley Member"}'),
        ($3, 'admin@example.test', '{"display_name":"Morgan Admin"}')`,
      [submitterId, otherUserId, adminId],
    );
    await db.query(
      "update public.profiles set role = 'admin' where id = $1",
      [adminId],
    );

    const profileResult = await db.query<{ display_name: string }>(
      "select display_name from public.profiles where id = $1",
      [submitterId],
    );
    expect(profileResult.rows[0]?.display_name).toBe("Avery Submitter");

    const categoryResult = await db.query<{ id: string }>(
      "select id from public.categories where is_active order by name limit 1",
    );
    const categoryId = categoryResult.rows[0]?.id;
    expect(categoryId).toBeTruthy();

    const ideaResult = await asAuthenticated(submitterId, () =>
      db.query<{ id: string }>(
        `insert into public.ideas (title, description, category_id, submitted_by)
         values ('A quieter focus room', 'Reserve one small room for quiet focus work during shared office hours.', $1, $2)
         returning id`,
        [categoryId, submitterId],
      ),
    );
    const ideaId = ideaResult.rows[0]?.id;
    expect(ideaId).toBeTruthy();

    const submittedEventResult = await db.query<{ actor_id: string; event_type: string }>(
      "select actor_id, event_type from public.idea_events where idea_id = $1",
      [ideaId],
    );
    expect(submittedEventResult.rows).toEqual([
      { actor_id: submitterId, event_type: "submitted" },
    ]);

    await asAuthenticated(submitterId, () =>
      db.query(
        `insert into public.idea_comments (idea_id, author_id, body)
         values ($1, $2, 'I can help compare room booking options.')`,
        [ideaId, submitterId],
      ),
    );

    const visibleIdea = await asAuthenticated(otherUserId, () =>
      db.query<{ id: string }>("select id from public.ideas where id = $1", [ideaId]),
    );
    const hiddenComment = await asAuthenticated(otherUserId, () =>
      db.query<{ id: string }>("select id from public.idea_comments where idea_id = $1", [ideaId]),
    );
    expect(visibleIdea.rows).toHaveLength(1);
    expect(hiddenComment.rows).toHaveLength(0);

    await expect(
      asAuthenticated(otherUserId, () =>
        db.query(
          `insert into public.idea_comments (idea_id, author_id, body)
           values ($1, $2, 'This should be rejected.')`,
          [ideaId, otherUserId],
        ),
      ),
    ).rejects.toThrow();

    await expect(
      asAuthenticated(otherUserId, () =>
        db.query(
          "select public.set_idea_status($1, 'under_consideration', null)",
          [ideaId],
        ),
      ),
    ).rejects.toThrow(/Only an admin can update idea status/);

    await asAuthenticated(adminId, () =>
      db.query(
        "select public.set_idea_status($1, 'under_consideration', 'We will compare current tools before a small pilot.')",
        [ideaId],
      ),
    );

    const adminDiscussion = await asAuthenticated(adminId, () =>
      db.query<{ body: string }>(
        "select body from public.idea_comments where idea_id = $1 order by created_at",
        [ideaId],
      ),
    );
    expect(adminDiscussion.rows).toHaveLength(2);

    const privateNoteHidden = await asAuthenticated(otherUserId, () =>
      db.query<{ body: string }>("select body from public.idea_comments where idea_id = $1", [ideaId]),
    );
    const currentStatus = await db.query<{ status: string }>(
      "select status from public.ideas where id = $1",
      [ideaId],
    );
    expect(privateNoteHidden.rows).toHaveLength(0);
    expect(currentStatus.rows[0]?.status).toBe("under_consideration");
  });
});

async function asAuthenticated<T>(userId: string, action: () => Promise<T>): Promise<T> {
  await dbRole("authenticated");
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId]);
    return await action();
  } finally {
    await dbRole("none");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

async function dbRole(role: "authenticated" | "none"): Promise<void> {
  await db.exec(role === "none" ? "reset role" : `set role ${role}`);
}
