-- 016 · seed: 7 barangays, 13 categories (8 parents + 5 subcategories),
--       7 meetup spots, plus clearly-labeled demo data.
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 seed.sql item — shipped as a migration
-- because the Supabase CLI only auto-runs seed.sql for LOCAL dev; `db push`
-- then seeds a clean project reproducibly. Every block is idempotent.

-- ── reference data ─────────────────────────────────────────────────────────

insert into barangays (name, description) values
  ('San Andres (Poblacion)', 'Town centre: municipal hall, church and the public market.'),
  ('San Isidro',             'Residential streets east of the poblacion.'),
  ('San Juan',               'Vista Verde side, near the Sta. Lucia area.'),
  ('San Roque',              'Quiet streets toward the Marikina boundary.'),
  ('Santa Rosa',             'Schools, covered courts and small eateries.'),
  ('Santo Domingo',           'North Cainta, toward the Junction.'),
  ('Santo Niño',             'Subdivisions along Ortigas Avenue extension.')
on conflict (name) do nothing;

do $$
declare
  v_name text;
  v_pid  uuid;
  v_sort int := 0;
  v_child text[];
  v_children text[][] := array[
    ['Furniture', 'Sofas & chairs'],
    ['Furniture', 'Tables & storage'],
    ['Electronics', 'Phones & tablets'],
    ['Electronics', 'Computers & accessories'],
    ['Plants & garden', 'Indoor plants']
  ];
begin
  foreach v_name in array array[
    'Furniture', 'Appliances', 'Kitchenware', 'Electronics',
    'Books & school', 'Bicycles & parts', 'Clothing', 'Plants & garden'
  ] loop
    v_sort := v_sort + 1;
    if not exists (select 1 from categories c
                    where c.name = v_name and c.parent_id is null) then
      insert into categories (name, sort_order) values (v_name, v_sort);
    end if;
  end loop;

  foreach v_child slice 1 in array v_children loop
    select c.id into v_pid from categories c
     where c.name = v_child[1] and c.parent_id is null;
    if v_pid is not null
       and not exists (select 1 from categories c
                        where c.name = v_child[2] and c.parent_id = v_pid) then
      insert into categories (name, parent_id, sort_order)
      values (v_child[2], v_pid, 10);
    end if;
  end loop;
end $$;

do $$
declare
  v_spot text[];
  v_spots text[][] := array[
    ['Cainta Municipal Hall grounds',  'San Andres (Poblacion)'],
    ['Robinsons Cainta activity area', 'San Andres (Poblacion)'],
    ['Sta. Lucia Mall activity area',  'San Juan'],
    ['Cainta Public Market',           'San Andres (Poblacion)'],
    ['Immaculate Conception plaza',    'San Roque'],
    ['Vista Verde covered court',      'San Juan'],
    ['Cainta Junction market',         'Santo Domingo']
  ];
begin
  foreach v_spot slice 1 in array v_spots loop
    if not exists (select 1 from meetup_spots s where s.name = v_spot[1]) then
      insert into meetup_spots (name, barangay_id)
      select v_spot[1], b.id from barangays b where b.name = v_spot[2];
    end if;
  end loop;
end $$;

-- ── demo data (clearly labeled; safe to delete) ────────────────────────────

insert into profiles (id, full_name, email, mobile, barangay_id, street_address,
                      role, status, bio, onboarded_at, approved_at)
select v.id, v.full_name, v.email, v.mobile, b.id, 'Demo street', 'resident',
       'verified', 'Demo account for local testing.', now(), now()
from (values
  ('demo_resident_a', 'Demo Resident A', 'demo-a@caintatrade.test', '9170000001', 'San Juan'),
  ('demo_resident_b', 'Demo Resident B', 'demo-b@caintatrade.test', '9170000002', 'San Andres (Poblacion)')
) as v(id, full_name, email, mobile, barangay_name)
join barangays b on b.name = v.barangay_name
on conflict (id) do nothing;

insert into items (code, owner_id, category_id, title, description, condition,
                   looking_for, barangay_id, status, expires_at, created_at)
select v.code, v.owner_id, c.id, v.title, v.description, v.condition::item_condition,
       v.looking_for, b.id, 'available', now() + interval '30 days', now() - interval '5 days'
from (values
  ('CT-100-DEMO1', 'demo_resident_a', 'Wooden dining set',
     'Six-seater dining set, minor scratches on the table top. Pickup in San Juan.',
     'good', 'A sofa or kitchen appliances', 'San Juan'),
  ('CT-100-DEMO2', 'demo_resident_a', 'Box fan + extension cord',
     'Two electric fans, both working. Would love some indoor plants in return.',
     'fair', 'Indoor plants', 'San Juan'),
  ('CT-100-DEMO3', 'demo_resident_a', 'Kettle and toaster set',
     'Barely used kettle and toaster, complete box.', 'like_new',
     'Books or school supplies', 'San Juan'),
  ('CT-100-DEMO4', 'demo_resident_b', 'Preloved storybooks (12 pcs)',
     'Twelve children storybooks, good condition. Swap for plants?', 'good',
     'Plants & garden', 'San Andres (Poblacion)'),
  ('CT-100-DEMO5', 'demo_resident_b', 'City bike, medium frame',
     'Reliable city bike, recently tuned. Looking for a small fridge or fan.',
     'fair', 'Appliances', 'San Andres (Poblacion)')
) as v(code, owner_id, title, description, condition, looking_for, barangay_name)
join barangays b on b.name = v.barangay_name
join lateral (
  select cat.id from categories cat
   where cat.name = case
     when v.title like 'Wooden dining%' then 'Furniture'
     when v.title like 'Box fan%' then 'Appliances'
     when v.title like 'Kettle%' then 'Kitchenware'
     when v.title like 'Preloved%' then 'Books & school'
     else 'Bicycles & parts'
   end and cat.parent_id is null
  limit 1
) c on true
on conflict (code) do nothing;

-- one pending offer (B → A for DEMO2) and one completed trade (A → B for DEMO4)
do $$
declare
  v_wanted uuid;
  v_give   uuid;
  v_offer  uuid;
  v_trade  uuid;
begin
  if exists (select 1 from offers where offered_item_id =
             (select id from items where code = 'CT-100-DEMO4')) then
    return;
  end if;

  -- pending offer: B offers DEMO4 for A's DEMO2
  select id into v_wanted from items where code = 'CT-100-DEMO2';
  select id into v_give   from items where code = 'CT-100-DEMO4';
  insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id,
                      message, status, expires_at, created_at)
  values (v_wanted, v_give, 'demo_resident_b', 'demo_resident_a',
          'Swap my storybooks for your fan? Meet at the market this weekend.',
          'pending', now() + interval '3 days', now() - interval '1 day')
  returning id into v_offer;
  perform notify_in_app('demo_resident_a', 'new_offer', 'New trade offer',
    'A neighbour offered Preloved storybooks (12 pcs) for your Box fan + extension cord.',
    '/offers');

  -- completed trade: A gave DEMO1... use DEMO3 → DEMO4? DEMO4 is wanted above; use DEMO5.
  -- A offers DEMO3 for B's DEMO5 — accepted, met, both confirmed.
  select id into v_wanted from items where code = 'CT-100-DEMO5';
  select id into v_give   from items where code = 'CT-100-DEMO3';
  insert into offers (wanted_item_id, offered_item_id, from_user_id, to_user_id,
                      message, status, expires_at, responded_at, created_at)
  values (v_wanted, v_give, 'demo_resident_a', 'demo_resident_b',
          'Kettle and toaster set for the bike? I am in San Juan.',
          'completed', now() - interval '1 day', now() - interval '4 days',
          now() - interval '6 days')
  returning id into v_offer;

  update items set status = 'exchanged' where code in ('CT-100-DEMO3', 'CT-100-DEMO5');

  insert into trades (code, offer_id, meetup_spot_id, meetup_at, status,
                      owner_confirmed_at, requester_confirmed_at, completed_at)
  select 'TR-' || lpad((floor(random() * 10000))::int::text, 4, '0'), v_offer, s.id,
         now() - interval '3 days', 'completed', now() - interval '3 days',
         now() - interval '3 days' + interval '10 minutes', now() - interval '3 days' + interval '10 minutes'
  from meetup_spots s where s.name = 'Sta. Lucia Mall activity area'
  returning id into v_trade;

  insert into ratings (trade_id, rater_id, ratee_id, stars, comment, tags,
                       described, communication, on_time, friendly)
  select v_trade, 'demo_resident_b', 'demo_resident_a', 5,
         'Smooth swap at Sta. Lucia — item exactly as described.',
         '["fair","on_time"]'::jsonb, 5, 5, 5, 5
  where v_trade is not null;
end $$;
