-- Replace illustration paths on demo listings that were seeded before photos were added.
update item_photos p
set storage_path = v.new_path
from items i
join (values
  ('CT-100-DEMO1', '/assets/demo-items/dining-table.svg', '/assets/demo-items/dining-table.jpg'),
  ('CT-100-DEMO2', '/assets/demo-items/desk-fan.svg', '/assets/demo-items/desk-fan.jpg'),
  ('CT-100-DEMO3', '/assets/demo-items/kettle-toaster.svg', '/assets/demo-items/kettle-toaster.jpg'),
  ('CT-100-DEMO4', '/assets/demo-items/storybooks.svg', '/assets/demo-items/storybooks.jpg'),
  ('CT-100-DEMO5', '/assets/demo-items/city-bike.svg', '/assets/demo-items/city-bike.jpg'),
  ('CT-101-DEMO6', '/assets/demo-items/potted-monstera.svg', '/assets/demo-items/potted-monstera.jpg'),
  ('CT-101-DEMO7', '/assets/demo-items/ceramic-cookware.svg', '/assets/demo-items/ceramic-cookware.jpg'),
  ('CT-101-DEMO8', '/assets/demo-items/desk-lamp.svg', '/assets/demo-items/desk-lamp.jpg'),
  ('CT-101-DEMO9', '/assets/demo-items/backpack.svg', '/assets/demo-items/backpack.jpg'),
  ('CT-101-DEMO10', '/assets/demo-items/side-table.svg', '/assets/demo-items/side-table.jpg')
) as v(code, old_path, new_path) on i.code = v.code
where p.item_id = i.id
  and p.storage_path = v.old_path;
