-- Run manually in the Supabase SQL editor after this account has signed up
-- through Clerk and its profile has been created by the Clerk webhook.
-- This only pre-verifies the one requested demo account; it does not change
-- the approval flow for other users.
do $$
declare
  v_profile_id text;
  v_status account_status;
  v_matches integer;
  v_email constant text := 'faldashenry25@gmail.com';
begin
  select count(*) into v_matches
  from profiles
  where lower(email) = lower(v_email);

  if v_matches = 0 then
    raise exception 'No profile found for the demo email. Sign up through Clerk first, then run this script.';
  end if;
  if v_matches > 1 then
    raise exception 'More than one profile uses the demo email. Resolve duplicates before running this script.';
  end if;

  select id, status into v_profile_id, v_status
  from profiles
  where lower(email) = lower(v_email);

  if v_status in ('deleted', 'suspended') then
    raise exception 'The demo profile is deleted or suspended and cannot be pre-verified.';
  end if;

  update profiles
  set role = 'resident',
      status = 'verified',
      onboarded_at = coalesce(onboarded_at, now()),
      approved_at = coalesce(approved_at, now())
  where id = v_profile_id;
end $$;
