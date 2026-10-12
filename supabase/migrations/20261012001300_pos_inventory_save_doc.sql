-- Phase 1 · Inventory posting (saving drafts).

alter table public.pos_stock_doc_lines add column superseded boolean not null default false;
create index pos_stock_doc_lines_current_idx on public.pos_stock_doc_lines (doc_id) where not superseded;
comment on column public.pos_stock_doc_lines.superseded is 'True for lines replaced by a later save of the draft; kept as edit history.';

-- Create or update a draft. Earlier lines of an edited draft are marked
-- superseded (kept as edit history) and the new set is inserted. Runs as the caller, so RLS decides.
-- p = { id?, doc_type, doc_date, branch_id, location_id, to_location_id?, supplier_name?, reference?, note?,
--       lines: [{ product_id, qty, unit_cost?, lot_id?, lot_no?, expiry_date?, reason?, note? }] }
create or replace function public.pos_save_stock_doc(p jsonb)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  cid uuid := pos_private.company_id();
  did uuid := nullif(p ->> 'id', '')::uuid;
  x   jsonb;
  n   int := 0;
begin
  if cid is null then
    raise exception 'Not linked to a company';
  end if;
  if jsonb_typeof(p -> 'lines') is distinct from 'array' then
    raise exception 'Lines are missing';
  end if;

  if did is null then
    insert into public.pos_stock_docs (company_id, doc_type, doc_date, branch_id, location_id, to_location_id,
                                       supplier_name, reference, note)
    values (cid, (p ->> 'doc_type')::public.pos_stock_doc_type,
            coalesce(nullif(p ->> 'doc_date', '')::date, current_date),
            (p ->> 'branch_id')::uuid, (p ->> 'location_id')::uuid, nullif(p ->> 'to_location_id', '')::uuid,
            nullif(trim(p ->> 'supplier_name'), ''), nullif(trim(p ->> 'reference'), ''), nullif(trim(p ->> 'note'), ''))
    returning id into did;
  else
    update public.pos_stock_docs set
      doc_date = coalesce(nullif(p ->> 'doc_date', '')::date, current_date),
      branch_id = (p ->> 'branch_id')::uuid,
      location_id = (p ->> 'location_id')::uuid,
      to_location_id = nullif(p ->> 'to_location_id', '')::uuid,
      supplier_name = nullif(trim(p ->> 'supplier_name'), ''),
      reference = nullif(trim(p ->> 'reference'), ''),
      note = nullif(trim(p ->> 'note'), '')
    where id = did and status = 'draft';
    if not found then
      raise exception 'This document can no longer be edited';
    end if;
    update public.pos_stock_doc_lines set superseded = true where doc_id = did and not superseded;
  end if;

  for x in select * from jsonb_array_elements(p -> 'lines') loop
    n := n + 1;
    insert into public.pos_stock_doc_lines (doc_id, line_no, product_id, qty, unit_cost, lot_id, lot_no,
                                            expiry_date, reason, note)
    values (did, n, (x ->> 'product_id')::uuid, (x ->> 'qty')::numeric, nullif(x ->> 'unit_cost', '')::numeric,
            nullif(x ->> 'lot_id', '')::uuid, nullif(trim(x ->> 'lot_no'), ''), nullif(x ->> 'expiry_date', '')::date,
            nullif(x ->> 'reason', '')::public.pos_adjust_reason, nullif(trim(x ->> 'note'), ''));
  end loop;

  return did;
end;
$$;
revoke execute on function public.pos_save_stock_doc(jsonb) from public, anon;
grant execute on function public.pos_save_stock_doc(jsonb) to authenticated;
