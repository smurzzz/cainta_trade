-- Run manually in the Supabase SQL editor after this account has signed up
-- through Clerk. The Clerk user ID and email below are for the requested
-- demo account. This repairs a missing webhook-created profile and
-- pre-verifies only this one resident; it does not change approval for others.
do $$
declare
  v_clerk_user_id constant text := 'user_3LchCQEwWOTl1zvnkSptKNumvUw';
  v_email constant text := 'faldashenry25@gmail.com';
  v_full_name constant text := 'Demo Resident';
  v_status account_status;
  v_profile_email text;
  v_email_owner text;
begin
  if left(v_clerk_user_id, 5) <> 'user_' then
    raise exception 'v_clerk_user_id must be this account''s Clerk user_ ID.';
  end if;

  select id into v_email_owner
  from profiles
  where lower(email) = lower(v_email)
    and id <> v_clerk_user_id
  limit 1;

  if v_email_owner is not null then
    raise exception 'The demo email is already linked to a different Clerk user ID.';
  end if;

  select email, status into v_profile_email, v_status
  from profiles
  where id = v_clerk_user_id;

  if not found then
    insert into profiles (id, full_name, email, role, status, onboarded_at, approved_at)
    values (v_clerk_user_id, v_full_name, v_email, 'resident', 'verified', now(), now());
    raise notice 'Created and pre-verified the demo resident profile.';
    return;
  end if;

  if v_profile_email is not null and lower(v_profile_email) <> lower(v_email) then
    raise exception 'That Clerk user ID belongs to a different email address.';
  end if;
  if v_status in ('deleted', 'suspended') then
    raise exception 'The demo profile is deleted or suspended and cannot be pre-verified.';
  end if;

  update profiles
  set full_name = coalesce(full_name, v_full_name),
      email = v_email,
      role = 'resident',
      status = 'verified',
      onboarded_at = coalesce(onboarded_at, now()),
      approved_at = coalesce(approved_at, now())
  where id = v_clerk_user_id;
  raise notice 'Updated and pre-verified the demo resident profile.';
end $$;
