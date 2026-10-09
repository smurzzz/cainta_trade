-- 011 · views: public_profiles, item_saved_counts, public_items
-- Plan: docs/03_PHASE_PLAN.md → Phase 3.1 item 011; design: docs/06_DATABASE_ERD.md.
-- These views run as their owner (postgres) and therefore bypass profiles RLS —
-- they are the ONLY way other members see a profile, and they expose only safe
-- columns with privacy toggles applied (docs/11 §3).

create or replace view public_profiles as
select
  p.id,
  p.full_name,
  p.avatar_url,
  p.bio,
  p.role,
  p.status,
  case when p.show_barangay then p.barangay_id end as barangay_id,
  case when p.show_last_active then p.last_active_at end as last_active_at,
  case when p.show_trade_count then (
    select count(*)
    from trades t
    join offers o on o.id = t.offer_id
    where (o.from_user_id = p.id or o.to_user_id = p.id)
      and t.status = 'completed'
  ) end as completed_trades,
  (select round(avg(r.stars), 1) from ratings r where r.ratee_id = p.id) as avg_rating,
  (select count(*) from ratings r where r.ratee_id = p.id) as rating_count,
  p.approved_at
from profiles p
where p.status <> 'deleted';

create or replace view item_saved_counts as
select
  i.id as item_id,
  (select count(*) from wishlist w where w.item_id = i.id)::int as saves
from items i;

-- What guests see: live listings (never draft/removed) with the fields the
-- browse grid needs, plus the main photo and a save counter.
create or replace view public_items as
select
  i.id,
  i.code,
  i.owner_id,
  i.category_id,
  i.title,
  i.description,
  i.condition,
  i.looking_for,
  i.trade_type,
  i.barangay_id,
  i.meetup_spot_id,
  i.status,
  i.views_count,
  i.expires_at,
  i.flagged,
  i.created_at,
  c.name  as category_name,
  b.name  as barangay_name,
  (select p.storage_path
     from item_photos p
    where p.item_id = i.id
    order by p.is_main desc, p.sort_order
    limit 1) as main_photo_path,
  (select count(*) from wishlist w where w.item_id = i.id)::int as save_count
from items i
left join categories c on c.id = i.category_id
left join barangays  b on b.id = i.barangay_id
where i.status in ('available', 'pending', 'exchanged', 'paused');
