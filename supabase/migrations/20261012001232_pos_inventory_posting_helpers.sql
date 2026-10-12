-- Phase 1 · Inventory posting (average cost and journal helpers).

create or replace function pos_private.update_avg_cost(p_company uuid, p_product uuid, p_qty numeric, p_cost numeric)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  q numeric;
begin
  select coalesce(sum(b.qty), 0) into q from public.pos_stock_balances b where b.product_id = p_product;
  insert into public.pos_product_costs (product_id, company_id, avg_cost)
  values (p_product, p_company, round(p_cost, 4))
  on conflict (product_id) do update set
    avg_cost = case
      when q <= 0 or q + p_qty <= 0 then round(p_cost, 4)
      else round((q * public.pos_product_costs.avg_cost + p_qty * p_cost) / (q + p_qty), 4)
    end,
    updated_at = now();
end;
$$;
revoke execute on function pos_private.update_avg_cost(uuid, uuid, numeric, numeric) from public, anon, authenticated;

-- p_lines: [{"code": "1200", "debit": 100.00}, {"code": "2020", "credit": 100.00}]
create or replace function pos_private.post_journal(
  p_company uuid, p_date date, p_source_type text, p_source_id uuid, p_memo text, p_branch uuid, p_lines jsonb)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  je  uuid;
  x   jsonb;
  acc uuid;
  n   int := 0;
  dr  numeric;
  cr  numeric;
begin
  insert into public.pos_journal_entries (company_id, entry_date, source_doc_type, source_doc_id, memo)
  values (p_company, p_date, p_source_type, p_source_id, p_memo)
  returning id into je;

  for x in select * from jsonb_array_elements(p_lines) loop
    dr := coalesce((x ->> 'debit')::numeric, 0);
    cr := coalesce((x ->> 'credit')::numeric, 0);
    continue when dr = 0 and cr = 0;
    select a.id into acc from public.pos_accounts a where a.company_id = p_company and a.code = x ->> 'code';
    if acc is null then
      raise exception 'Account % is missing from the chart of accounts', x ->> 'code';
    end if;
    n := n + 1;
    insert into public.pos_journal_lines (entry_id, company_id, line_no, account_id, branch_id, debit, credit)
    values (je, p_company, n, acc, p_branch, dr, cr);
  end loop;

  update public.pos_journal_entries set status = 'posted' where id = je;
  return je;
end;
$$;
revoke execute on function pos_private.post_journal(uuid, date, text, uuid, text, uuid, jsonb) from public, anon, authenticated;
