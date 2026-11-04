-- 026 · expand the sample catalog and attach local demo photos.
-- Safe to re-run: listing codes and photo paths are both unique per demo item.

insert into items (code, owner_id, category_id, title, description, condition,
                   looking_for, barangay_id, status, expires_at, created_at)
select v.code, v.owner_id, c.id, v.title, v.description, v.condition::item_condition,
       v.looking_for, b.id, 'available', now() + interval '30 days', now() - interval '3 days'
from (values
  ('CT-101-DEMO6', 'demo_resident_a', 'Potted monstera plant',
   'Healthy monstera in a terracotta pot. New leaves coming in; pickup in San Juan.',
   'good', 'A small bookshelf or kitchenware', 'San Juan', 'Plants & garden'),
  ('CT-101-DEMO7', 'demo_resident_b', 'Ceramic cookware set',
   'A matching cooking pot and pan set with lids. Gently used and ready for a new kitchen.',
   'good', 'Indoor plants or storybooks', 'San Andres (Poblacion)', 'Kitchenware'),
  ('CT-101-DEMO8', 'demo_resident_a', 'Adjustable desk lamp',
   'Working adjustable study lamp with a warm bulb included. Great for a reading corner.',
   'like_new', 'School supplies or a small fan', 'San Juan', 'Electronics'),
  ('CT-101-DEMO9', 'demo_resident_b', 'Everyday school backpack',
   'Roomy teal backpack with several pockets. Clean and in good shape for the next school year.',
   'good', 'Books or a lunch container', 'San Andres (Poblacion)', 'Clothing'),
  ('CT-101-DEMO10', 'demo_resident_a', 'Wooden bedside table',
   'Compact side table with a drawer and lower shelf. Fits nicely in a small bedroom.',
   'fair', 'A potted plant or kitchenware', 'San Juan', 'Furniture')
) as v(code, owner_id, title, description, condition, looking_for, barangay_name, category_name)
join barangays b on b.name = v.barangay_name
join categories c on c.name = v.category_name and c.parent_id is null
on conflict (code) do nothing;

insert into item_photos (item_id, storage_path, sort_order, is_main)
select i.id, v.storage_path, 0, true
from (values
  ('CT-100-DEMO1', '/assets/demo-items/dining-table.jpg'),
  ('CT-100-DEMO2', '/assets/demo-items/desk-fan.jpg'),
  ('CT-100-DEMO3', '/assets/demo-items/kettle-toaster.jpg'),
  ('CT-100-DEMO4', '/assets/demo-items/storybooks.jpg'),
  ('CT-100-DEMO5', '/assets/demo-items/city-bike.jpg'),
  ('CT-101-DEMO6', '/assets/demo-items/potted-monstera.jpg'),
  ('CT-101-DEMO7', '/assets/demo-items/ceramic-cookware.jpg'),
  ('CT-101-DEMO8', '/assets/demo-items/desk-lamp.jpg'),
  ('CT-101-DEMO9', '/assets/demo-items/backpack.jpg'),
  ('CT-101-DEMO10', '/assets/demo-items/side-table.jpg')
) as v(code, storage_path)
join items i on i.code = v.code
where not exists (
  select 1 from item_photos p
  where p.item_id = i.id and p.storage_path = v.storage_path
);
