alter table public.bill_extraction_results
  add column if not exists ranking_json jsonb,
  add column if not exists final_resolved_json jsonb;