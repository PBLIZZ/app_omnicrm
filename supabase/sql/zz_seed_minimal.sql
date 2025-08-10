-- Minimal seed for local dev

-- seed user
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'you@example.com')
on conflict (id) do nothing;

-- sync prefs (create table if your project uses it)
-- Assuming a table public.user_sync_prefs (user_id uuid primary key references auth.users)
do $$ begin
  perform 1 from pg_tables where schemaname = 'public' and tablename = 'user_sync_prefs';
  if not found then
    create table public.user_sync_prefs (
      user_id uuid primary key references auth.users(id),
      created_at timestamp not null default now()
    );
  end if;
end $$;

insert into public.user_sync_prefs (user_id)
values ('00000000-0000-0000-0000-000000000001')
on conflict (user_id) do nothing;

-- sample contact
insert into public.contacts (id, user_id, display_name, primary_email, source, created_at, updated_at)
values (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Ana Client','ana@example.com','manual', now(), now()
)
on conflict (id) do nothing;

-- sample interaction (email)
insert into public.interactions (
  id, user_id, contact_id, type, subject, body_text, occurred_at, source, source_id, created_at
) values (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'email','Package renewal',
  'Hi Ana, your 10-class pass expires next week. Want to renew?',
  now() - interval '3 days','gmail','mock-123', now()
)
on conflict (id) do nothing;

-- placeholder insight
insert into public.ai_insights (
  id, user_id, subject_type, subject_id, kind, content, model, created_at
) values (
  '30000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'contact','10000000-0000-0000-0000-000000000001','summary',
  '{"text":"Ana usually books on Mondays; likely to renew."}','mock', now()
)
on conflict (id) do nothing;


