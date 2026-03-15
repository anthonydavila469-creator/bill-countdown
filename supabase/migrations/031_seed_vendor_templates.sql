create temporary table if not exists vendor_seed (
  vendor_key text,
  display_name text,
  category_default text,
  recurrence_default text,
  website_domain text,
  sender_name text,
  subject_anchor text,
  email_type text
) on commit drop;

truncate vendor_seed;

insert into vendor_seed (vendor_key, display_name, category_default, recurrence_default, website_domain, sender_name, subject_anchor, email_type)
values
  ('capital_one', 'Capital One', 'credit_card', 'monthly', 'capitalone.com', 'Capital One', 'statement ready', 'statement_ready'),
  ('chase', 'Chase', 'credit_card', 'monthly', 'chase.com', 'Chase', 'payment due', 'bill_due'),
  ('att', 'AT&T', 'phone', 'monthly', 'att.com', 'AT&T', 'bill due', 'bill_due'),
  ('t_mobile', 'T-Mobile', 'phone', 'monthly', 't-mobile.com', 'T-Mobile', 'autopay', 'autopay_notice'),
  ('verizon', 'Verizon', 'phone', 'monthly', 'verizon.com', 'Verizon', 'bill due', 'bill_due'),
  ('netflix', 'Netflix', 'subscription', 'monthly', 'netflix.com', 'Netflix', 'membership', 'subscription_renewal'),
  ('spotify', 'Spotify', 'subscription', 'monthly', 'spotify.com', 'Spotify', 'premium', 'subscription_renewal'),
  ('amazon_prime', 'Amazon Prime', 'subscription', 'monthly', 'amazon.com', 'Amazon Prime', 'membership', 'subscription_renewal'),
  ('comcast_xfinity', 'Comcast Xfinity', 'internet', 'monthly', 'xfinity.com', 'Xfinity', 'bill due', 'bill_due'),
  ('progressive', 'Progressive', 'insurance', 'monthly', 'progressive.com', 'Progressive', 'payment due', 'bill_due'),
  ('state_farm', 'State Farm', 'insurance', 'monthly', 'statefarm.com', 'State Farm', 'payment reminder', 'bill_due'),
  ('geico', 'GEICO', 'insurance', 'monthly', 'geico.com', 'GEICO', 'payment due', 'bill_due'),
  ('duke_energy', 'Duke Energy', 'utilities', 'monthly', 'duke-energy.com', 'Duke Energy', 'amount due', 'bill_due'),
  ('national_grid', 'National Grid', 'utilities', 'monthly', 'nationalgrid.com', 'National Grid', 'bill due', 'bill_due'),
  ('spectrum', 'Spectrum', 'internet', 'monthly', 'spectrum.com', 'Spectrum', 'statement ready', 'statement_ready'),
  ('hulu', 'Hulu', 'subscription', 'monthly', 'hulu.com', 'Hulu', 'subscription', 'subscription_renewal'),
  ('disney_plus', 'Disney+', 'subscription', 'monthly', 'disneyplus.com', 'Disney+', 'subscription', 'subscription_renewal'),
  ('youtube_premium', 'YouTube Premium', 'subscription', 'monthly', 'youtube.com', 'YouTube Premium', 'membership', 'subscription_renewal'),
  ('apple', 'Apple', 'subscription', 'monthly', 'apple.com', 'Apple', 'subscription renewal', 'subscription_renewal'),
  ('google', 'Google', 'subscription', 'monthly', 'google.com', 'Google', 'subscription renewal', 'subscription_renewal');

insert into public.vendors (vendor_key, display_name, category_default, recurrence_default, website_domain, active)
select vendor_key, display_name, category_default, recurrence_default, website_domain, true
from vendor_seed
on conflict (vendor_key) do update set
  display_name = excluded.display_name,
  category_default = excluded.category_default,
  recurrence_default = excluded.recurrence_default,
  website_domain = excluded.website_domain,
  active = true;

insert into public.vendor_aliases (vendor_id, alias_type, alias_value, confidence)
select v.id, alias_type, alias_value, confidence
from (
  select vendor_key, 'domain'::text as alias_type, website_domain as alias_value, 0.97::numeric as confidence from vendor_seed
  union all
  select vendor_key, 'sender_name', lower(sender_name), 0.93::numeric from vendor_seed
  union all
  select vendor_key, 'subject_anchor', lower(subject_anchor), 0.88::numeric from vendor_seed
) aliases
join public.vendors v on v.vendor_key = aliases.vendor_key
on conflict (vendor_id, alias_type, alias_value) do update set confidence = excluded.confidence;

insert into public.vendor_aliases (vendor_id, alias_type, alias_value, confidence)
select v.id, 'sender_email', sender.email_alias, 0.95
from public.vendors v
join (
  values
    ('capital_one', 'capitalone@notification.capitalone.com'),
    ('chase', 'chase@e.chase.com'),
    ('att', 'myatt@e.att.com'),
    ('t_mobile', 'donotreply@t-mobile.com'),
    ('verizon', 'verizon@ecrmemail.verizonwireless.com'),
    ('netflix', 'info@account.netflix.com'),
    ('spotify', 'no-reply@spotify.com'),
    ('amazon_prime', 'auto-confirm@amazon.com'),
    ('comcast_xfinity', 'online.communications@alerts.comcast.net'),
    ('progressive', 'customerservice@email.progressive.com'),
    ('state_farm', 'notice@statefarm.com'),
    ('geico', 'service@geico.com'),
    ('duke_energy', 'notifications@duke-energy.com'),
    ('national_grid', 'donotreply@nationalgrid.com'),
    ('spectrum', 'spectrum@e.spectrum.com'),
    ('hulu', 'hulu@hulumail.com'),
    ('disney_plus', 'disneyplus@email.disneyplus.com'),
    ('youtube_premium', 'payments-noreply@youtube.com'),
    ('apple', 'no_reply@email.apple.com'),
    ('google', 'googleplay-noreply@google.com')
) as sender(vendor_key, email_alias) on sender.vendor_key = v.vendor_key
on conflict (vendor_id, alias_type, alias_value) do update set confidence = excluded.confidence;

insert into public.vendor_templates (
  vendor_id,
  template_key,
  version,
  status,
  scope,
  owner_user_id,
  email_type,
  source,
  matcher_config,
  extractor_config,
  postprocess_config,
  confidence_config,
  drift_config,
  precision_score,
  recall_score,
  eval_sample_size
)
select
  v.id,
  concat(v.vendor_key, '_default'),
  1,
  'active',
  'global',
  null,
  seed.email_type,
  'manual',
  jsonb_build_object(
    'from', jsonb_build_array(
      jsonb_build_object('type', 'domain_regex', 'pattern', replace(seed.website_domain, '.', '\\.'), 'weight', 2.5),
      jsonb_build_object('type', 'display_name_regex', 'pattern', replace(lower(seed.sender_name), '+', '\\+'), 'weight', 1.6)
    ),
    'subject', jsonb_build_array(
      jsonb_build_object('type', 'contains', 'value', lower(seed.subject_anchor), 'weight', 1.5),
      jsonb_build_object('type', 'contains', 'value', 'special offer', 'weight', 1.0, 'negative', true)
    ),
    'body', jsonb_build_array(
      jsonb_build_object('type', 'contains', 'value', 'amount due', 'weight', 1.5),
      jsonb_build_object('type', 'contains', 'value', 'due date', 'weight', 1.2)
    )
  ),
  jsonb_build_object(
    'name', jsonb_build_array(
      jsonb_build_object('type', 'constant', 'value', seed.display_name, 'priority', 1, 'transforms', jsonb_build_array('normalize_vendor_name'), 'confidence', 0.98)
    ),
    'category', jsonb_build_array(
      jsonb_build_object('type', 'constant', 'value', seed.category_default, 'priority', 1, 'confidence', 0.96)
    ),
    'recurrence_interval', jsonb_build_array(
      jsonb_build_object('type', 'constant', 'value', seed.recurrence_default, 'priority', 1, 'confidence', 0.96)
    ),
    'is_recurring', jsonb_build_array(
      jsonb_build_object('type', 'constant', 'value', true, 'priority', 1, 'confidence', 0.95)
    ),
    'amount', jsonb_build_array(
      jsonb_build_object('type', 'label_proximity', 'label', 'amount due', 'window', 100, 'pattern', '(\\$?\\s?\\d[\\d,]*(?:\\.\\d{2})?)', 'priority', 1, 'transforms', jsonb_build_array('parse_currency'), 'confidence', 0.93),
      jsonb_build_object('type', 'label_proximity', 'label', 'new balance', 'window', 100, 'pattern', '(\\$?\\s?\\d[\\d,]*(?:\\.\\d{2})?)', 'priority', 2, 'transforms', jsonb_build_array('parse_currency'), 'confidence', 0.89),
      jsonb_build_object('type', 'regex', 'pattern', '(?:amount due|balance due|total due)[^\\d$]{0,20}(\\$?\\s?\\d[\\d,]*(?:\\.\\d{2})?)', 'priority', 3, 'group', 1, 'transforms', jsonb_build_array('parse_currency'), 'confidence', 0.85)
    ),
    'due_date', jsonb_build_array(
      jsonb_build_object('type', 'label_proximity', 'label', 'due date', 'window', 80, 'pattern', '([A-Za-z]{3,9}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)', 'priority', 1, 'transforms', jsonb_build_array('parse_us_date'), 'confidence', 0.92),
      jsonb_build_object('type', 'label_proximity', 'label', 'payment due', 'window', 80, 'pattern', '([A-Za-z]{3,9}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)', 'priority', 2, 'transforms', jsonb_build_array('parse_us_date'), 'confidence', 0.88),
      jsonb_build_object('type', 'regex', 'pattern', '(?:due date|payment due|due on)[^A-Za-z0-9]{0,20}([A-Za-z]{3,9}\\s+\\d{1,2}(?:,\\s*\\d{4})?|\\d{1,2}\\/\\d{1,2}(?:\\/\\d{2,4})?)', 'priority', 3, 'group', 1, 'transforms', jsonb_build_array('parse_us_date'), 'confidence', 0.84)
    )
  ),
  jsonb_build_object('reject_due_date_older_than_days', 45),
  jsonb_build_object('acceptThreshold', 0.92, 'aiVerifyThreshold', 0.70, 'baseScore', 0.40),
  jsonb_build_object('maxNullRate', 0.2, 'maxCorrectionRate', 0.12, 'maxAiFallbackRate', 0.5),
  0.95,
  0.70,
  0
from public.vendors v
join vendor_seed seed on seed.vendor_key = v.vendor_key
on conflict (vendor_id, template_key, version, scope, owner_user_id) do update set
  status = excluded.status,
  email_type = excluded.email_type,
  matcher_config = excluded.matcher_config,
  extractor_config = excluded.extractor_config,
  postprocess_config = excluded.postprocess_config,
  confidence_config = excluded.confidence_config,
  drift_config = excluded.drift_config,
  precision_score = excluded.precision_score,
  recall_score = excluded.recall_score;
