-- Illustrative product_type_attribute_schemas rows (Phase G) — makes the
-- schema-driven "Add Product" form observably real for two product types
-- rather than a structure with nothing to render. Not a full attribute
-- taxonomy; DML, idempotent, lives outside supabase/migrations/ like the
-- other seed files.

insert into product_type_attribute_schemas
  (product_type_code, attribute_key, label, input_type, options, sort_order)
values
  ('edible', 'dosage_mg', 'Dosage per serving (mg)', 'number', null, 10),
  ('edible', 'servings_per_package', 'Servings per package', 'number', null, 20),
  ('vape-disposable', 'device_type', 'Device type', 'select',
    '["Disposable", "Cartridge", "Pod"]'::jsonb, 10),
  ('vape-disposable', 'battery_included', 'Battery included', 'boolean', null, 20)
on conflict (product_type_code, attribute_key) do nothing;
