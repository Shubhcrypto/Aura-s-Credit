-- Run this once in Supabase → SQL Editor.
-- Lets ONLY your client's login read the enquiries.
-- Anyone can still submit the website form (insert), nobody else can read.

-- 1) Make sure RLS is on
alter table public.enquiries enable row level security;

-- 2) Keep the public form working (skip if you already have this policy)
-- create policy "Public can submit enquiries"
--   on public.enquiries for insert to anon, authenticated
--   with check (true);

-- 3) Only the client's email may read.  >>> CHANGE THE EMAIL BELOW <<<
create policy "Client can read enquiries"
  on public.enquiries for select to authenticated
  using ( lower(auth.jwt() ->> 'email') = lower('CLIENT_EMAIL_HERE') );

-- Optional: let the client delete spam enquiries
-- create policy "Client can delete enquiries"
--   on public.enquiries for delete to authenticated
--   using ( lower(auth.jwt() ->> 'email') = lower('CLIENT_EMAIL_HERE') );
