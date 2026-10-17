alter table public.categories
  alter column color set default '#c48bc8';

update public.categories
set color = case name
  when 'Workplace' then '#c08ec7'
  when 'Culture & community' then '#f4bd8b'
  when 'Tools & technology' then '#d79eee'
  when 'Sustainability' then '#c979a3'
end
where (name = 'Workplace' and color = '#8ec7a4')
   or (name = 'Culture & community' and color = '#f4bd8b')
   or (name = 'Tools & technology' and color = '#9db7ef')
   or (name = 'Sustainability' and color = '#a7c979');
