alter table contacts
add column user_id uuid references auth.users (id);