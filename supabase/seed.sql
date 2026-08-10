-- BLUEPRINT §2.3 — shipping rates and category seed data.

insert into shipping_rates (country, rate_cents) values
  ('XK', 200),
  ('AL', 500),
  ('MK', 500),
  ('OTHER', 500);

insert into categories (slug, sort_order) values
  ('cases', 1),
  ('covers', 2),
  ('chargers', 3),
  ('cleaning-tools', 4),
  ('lanyards', 5),
  ('holders', 6);

insert into category_translations (category_id, locale, name)
select c.id, 'sq', v.name_sq
from categories c
join (values
  ('cases', 'Çanta'),
  ('covers', 'Mbulesa'),
  ('chargers', 'Karikues'),
  ('cleaning-tools', 'Vegla pastrimi'),
  ('lanyards', 'Rripa mbajtës'),
  ('holders', 'Mbajtëse')
) as v (slug, name_sq) on v.slug = c.slug;

insert into category_translations (category_id, locale, name)
select c.id, 'en', v.name_en
from categories c
join (values
  ('cases', 'Cases'),
  ('covers', 'Covers'),
  ('chargers', 'Chargers'),
  ('cleaning-tools', 'Cleaning tools'),
  ('lanyards', 'Lanyards'),
  ('holders', 'Holders')
) as v (slug, name_en) on v.slug = c.slug;
