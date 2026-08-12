-- Demo catalog seed — 12 realistic heated-tobacco accessories across the six
-- categories already seeded by seed.sql. Paste into the SQL editor.
--
-- No product_images rows here on purpose: images must be real files uploaded
-- to Supabase Storage (storage_path is a "products/{id}/{file}" path, see
-- BLUEPRINT §2.8), not a placeholder URL. Upload photos for these products
-- through /admin/products after seeding.

insert into products (slug, category_id, price_cents, discount_price_cents, stock_quantity, is_featured)
select v.slug, c.id, v.price_cents, v.discount_price_cents, v.stock_quantity, v.is_featured
from (values
  ('premium-leather-case',      'cases',          3500, 2900, 15, true),
  ('ultra-slim-carbon-case',    'cases',          2800, null,  8, false),
  ('anti-slip-silicone-cover',  'covers',         1200, null, 25, true),
  ('clear-silicone-cover',      'covers',          900, null,  0, false),
  ('usb-c-car-charger',         'chargers',       1800, 1500, 12, true),
  ('portable-3000mah-charger',  'chargers',       3200, null,  6, false),
  ('professional-cleaning-kit', 'cleaning-tools', 1500, null, 20, false),
  ('cleaning-brush-with-cap',   'cleaning-tools',  700,  550,  2, false),
  ('neck-lanyard-carabiner',    'lanyards',        800, null, 18, false),
  ('leather-neck-lanyard',      'lanyards',       1400, null, 10, true),
  ('magnetic-car-holder',       'holders',        2200, null,  9, false),
  ('rotating-desk-stand',       'holders',        1900, null, 14, false)
) as v (slug, category_slug, price_cents, discount_price_cents, stock_quantity, is_featured)
join categories c on c.slug = v.category_slug;

insert into product_translations (product_id, locale, name, short_description, description)
select p.id, 'sq', v.name, v.short_description, v.description
from products p
join (values
  ('premium-leather-case', 'Çantë Lëkure Premium', 'Mbrojtje elegante prej lëkure natyrale.', 'Çantë e punuar me dorë nga lëkurë natyrale, e përshtatur për pajisjen tuaj. Mbyllje magnetike dhe hapje e lehtë për përdorim të përditshëm.'),
  ('ultra-slim-carbon-case', 'Çantë Karboni Ultra-Hollë', 'Mbrojtje minimale pa peshë shtesë.', 'Fibër karboni e hollë që mbron pajisjen pa e bërë më të rëndë apo më të trashë. Për ata që duan mbrojtje diskrete.'),
  ('anti-slip-silicone-cover', 'Mbulesë Silikoni Antirrëshqitëse', 'Kapje e sigurt, ngjyra të gjalla.', 'Mbulesë silikoni me teksturë antirrëshqitëse, e disponueshme në disa ngjyra. E lehtë për t''u vendosur dhe hequr.'),
  ('clear-silicone-cover', 'Mbulesë Silikoni Transparente', 'Mbrojtje diskrete që lë pamjen origjinale.', 'Mbulesë transparente që mbron pa fshehur dizajnin origjinal të pajisjes suaj.'),
  ('usb-c-car-charger', 'Karikues Makine USB-C', 'Karikim i shpejtë gjatë udhëtimit.', 'Karikues për makinë me dalje USB-C, i përshtatshëm për karikim të shpejtë ndërkohë që jeni në lëvizje.'),
  ('portable-3000mah-charger', 'Karikues Portativ 3000mAh', 'Energji shtesë kudo që të jeni.', 'Bateri portative 3000mAh e projektuar posaçërisht për pajisjen tuaj, me dizajn kompakt për xhep.'),
  ('professional-cleaning-kit', 'Kit Pastrimi Profesional', 'Gjithçka që ju nevojitet për mirëmbajtje.', 'Kit i plotë pastrimi me furça dhe aksesorë të përshtatshëm për mirëmbajtjen e rregullt të pajisjes.'),
  ('cleaning-brush-with-cap', 'Furça Pastrimi me Kapëse', 'Pastrim i shpejtë, madhësi xhepi.', 'Furçë kompakte me kapëse mbrojtëse, ideale për pastrim të shpejtë kudo që të jeni.'),
  ('neck-lanyard-carabiner', 'Rrip Qafe me Karabinier', 'Mbajeni pranë, pa e menduar.', 'Rrip qafe i rehatshëm me karabinier të sigurt, që ju lejon të mbani pajisjen gjithmonë pranë.'),
  ('leather-neck-lanyard', 'Rrip Qafe Lëkure', 'Stil dhe funksionalitet së bashku.', 'Rrip qafe prej lëkure natyrale, i qëndrueshëm dhe elegant për përdorim ditor.'),
  ('magnetic-car-holder', 'Mbajtëse Makine Magnetike', 'Qëndron në vend, edhe në kthesa.', 'Mbajtëse magnetike që montohet lehtë në makinë dhe e mban pajisjen tuaj të palëvizshme gjatë udhëtimit.'),
  ('rotating-desk-stand', 'Mbajtëse Tavoline Rrotulluese', 'Këndi i përsosur, gjithmonë në tavolinë.', 'Mbajtëse tavoline me bazë rrotulluese, që ju lejon të gjeni këndin e duhur për përdorim në shtëpi apo zyrë.')
) as v (slug, name, short_description, description) on v.slug = p.slug;

insert into product_translations (product_id, locale, name, short_description, description)
select p.id, 'en', v.name, v.short_description, v.description
from products p
join (values
  ('premium-leather-case', 'Premium Leather Case', 'Elegant protection in genuine leather.', 'Hand-finished genuine leather case tailored to your device. Magnetic closure and easy access for everyday use.'),
  ('ultra-slim-carbon-case', 'Ultra-Slim Carbon Case', 'Minimal protection, zero added bulk.', 'Thin carbon-fibre shell that protects your device without adding weight or thickness. For anyone who wants discreet protection.'),
  ('anti-slip-silicone-cover', 'Anti-Slip Silicone Cover', 'Secure grip, bold colours.', 'Textured silicone cover with an anti-slip finish, available in several colours. Easy to put on and take off.'),
  ('clear-silicone-cover', 'Clear Silicone Cover', 'Discreet protection that shows off the original design.', 'A transparent cover that protects without hiding your device''s original design.'),
  ('usb-c-car-charger', 'USB-C Car Charger', 'Fast charging on the road.', 'Car charger with a USB-C output, built for fast charging while you''re on the move.'),
  ('portable-3000mah-charger', 'Portable 3000mAh Charger', 'Extra power wherever you are.', 'A 3000mAh portable battery designed specifically for your device, compact enough for a pocket.'),
  ('professional-cleaning-kit', 'Professional Cleaning Kit', 'Everything you need for upkeep.', 'A complete cleaning kit with brushes and accessories suited to regular device maintenance.'),
  ('cleaning-brush-with-cap', 'Cleaning Brush with Cap', 'Quick cleaning, pocket-sized.', 'A compact brush with a protective cap, ideal for a quick clean wherever you are.'),
  ('neck-lanyard-carabiner', 'Neck Lanyard with Carabiner', 'Keep it close, without thinking about it.', 'A comfortable neck lanyard with a secure carabiner clip, so your device is always within reach.'),
  ('leather-neck-lanyard', 'Leather Neck Lanyard', 'Style and function together.', 'A genuine leather neck lanyard, durable and elegant for everyday use.'),
  ('magnetic-car-holder', 'Magnetic Car Holder', 'Stays put, even on turns.', 'A magnetic holder that mounts easily in your car and keeps your device steady on the road.'),
  ('rotating-desk-stand', 'Rotating Desk Stand', 'The perfect angle, always on your desk.', 'A desk stand with a rotating base, letting you find the right angle for use at home or in the office.')
) as v (slug, name, short_description, description) on v.slug = p.slug;
