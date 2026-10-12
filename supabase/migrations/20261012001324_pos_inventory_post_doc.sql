-- Phase 1 · Inventory posting (posting documents).

-- Post a draft: writes the ledger, updates average cost, posts the journal.
-- Transfers move stock into "In transit" and wait for pos_receive_transfer.
create or replace function public.pos_post_stock_doc(p_doc uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  d        public.pos_stock_docs;
  l        record;
  transit  uuid;
  lot      uuid;
  cost     numeric;
  v        numeric;
  inv_in   numeric := 0;
  inv_out  numeric := 0;
  spoil    numeric := 0;
  variance numeric := 0;
  gain     numeric := 0;
  docno    text;
  je       uuid;
  jl       jsonb := '[]';
begin
  select * into d from public.pos_stock_docs where id = p_doc for update;
  if not found or d.company_id is distinct from pos_private.company_id() then
    raise exception 'Document not found';
  end if;
  if d.status <> 'draft' then
    raise exception 'Only draft documents can be posted';
  end if;
  if not pos_private.can_post_doc(d.doc_type, d.branch_id) then
    raise exception 'You are not allowed to post this document';
  end if;
  if not exists (select 1 from public.pos_stock_doc_lines where doc_id = d.id and not superseded) then
    raise exception 'Add at least one line';
  end if;

  if d.doc_type = 'transfer' then
    select id into transit from public.pos_stock_locations where company_id = d.company_id and type = 'transit';
  end if;

  for l in
    select dl.*, p.name as pname, p.track_stock, p.track_lots, coalesce(c.avg_cost, 0) as avg_cost
      from public.pos_stock_doc_lines dl
      join public.pos_products p on p.id = dl.product_id
      left join public.pos_product_costs c on c.product_id = dl.product_id
     where dl.doc_id = d.id and not dl.superseded
     order by dl.line_no
  loop
    if not l.track_stock then
      raise exception '% is not set to track stock', l.pname;
    end if;
    lot := case when l.track_lots then l.lot_id end;

    if d.doc_type <> 'transfer' and l.qty > 0 then
      -- Stock coming in.
      if l.track_lots and lot is null then
        if nullif(trim(l.lot_no), '') is null then
          raise exception 'Enter a lot number for %', l.pname;
        end if;
        insert into public.pos_lots (company_id, product_id, lot_no, expiry_date)
        values (d.company_id, l.product_id, trim(l.lot_no), l.expiry_date)
        on conflict (product_id, lot_no) do update
          set expiry_date = coalesce(public.pos_lots.expiry_date, excluded.expiry_date)
        returning id into lot;
      end if;
      if d.doc_type in ('opening', 'receipt') then
        if l.unit_cost is null then
          raise exception 'Enter the unit cost for %', l.pname;
        end if;
        cost := l.unit_cost;
      else
        cost := l.avg_cost;
      end if;
      perform pos_private.update_avg_cost(d.company_id, l.product_id, l.qty, cost);
      insert into public.pos_stock_moves (company_id, location_id, product_id, lot_id, qty, unit_cost, move_type,
                                          doc_type, doc_id, doc_line_id)
      values (d.company_id, d.location_id, l.product_id, lot, l.qty, cost,
              (case d.doc_type when 'opening' then 'opening' when 'receipt' then 'receipt' else 'adjustment' end)::public.pos_move_type,
              d.doc_type::text, d.id, l.id);
      v := round(l.qty * cost, 2);
      inv_in := inv_in + v;
      if d.doc_type = 'adjustment' then
        gain := gain + v;
      end if;

    else
      -- Stock going out (adjustment loss) or moving (transfer).
      if d.doc_type in ('opening', 'receipt') then
        raise exception 'Quantity for % must be more than zero', l.pname;
      end if;
      if d.doc_type = 'transfer' and l.qty <= 0 then
        raise exception 'Transfer quantity for % must be more than zero', l.pname;
      end if;
      if l.track_lots and lot is null then
        raise exception 'Choose the lot for %', l.pname;
      end if;
      cost := l.avg_cost;

      if d.doc_type = 'adjustment' then
        insert into public.pos_stock_moves (company_id, location_id, product_id, lot_id, qty, unit_cost, move_type,
                                            doc_type, doc_id, doc_line_id)
        values (d.company_id, d.location_id, l.product_id, lot, l.qty, cost, 'adjustment', 'adjustment', d.id, l.id);
        v := round(-l.qty * cost, 2);
        inv_out := inv_out + v;
        if coalesce(l.reason, 'other') in ('spoilage', 'damage', 'expired') then
          spoil := spoil + v;
        else
          variance := variance + v;
        end if;
      else
        insert into public.pos_stock_moves (company_id, location_id, product_id, lot_id, qty, unit_cost, move_type,
                                            doc_type, doc_id, doc_line_id)
        values (d.company_id, d.location_id, l.product_id, lot, -l.qty, cost, 'transfer_out', 'transfer', d.id, l.id),
               (d.company_id, transit, l.product_id, lot, l.qty, cost, 'transfer_in', 'transfer', d.id, l.id);
        update public.pos_stock_doc_lines set unit_cost = cost where id = l.id;
      end if;
    end if;
  end loop;

  docno := (case d.doc_type when 'opening' then 'OB' when 'receipt' then 'SI' when 'adjustment' then 'ADJ' else 'TR' end)
           || '-' || lpad(pos_private.next_doc_no(d.company_id, 'stock_' || d.doc_type::text)::text, 6, '0');

  if d.doc_type = 'opening' then
    jl := jsonb_build_array(jsonb_build_object('code', '1200', 'debit', inv_in),
                            jsonb_build_object('code', '3000', 'credit', inv_in));
  elsif d.doc_type = 'receipt' then
    jl := jsonb_build_array(jsonb_build_object('code', '1200', 'debit', inv_in),
                            jsonb_build_object('code', '2020', 'credit', inv_in));
  elsif d.doc_type = 'adjustment' then
    jl := jsonb_build_array(jsonb_build_object('code', '1200', 'debit', gain),
                            jsonb_build_object('code', '5030', 'credit', gain),
                            jsonb_build_object('code', '5020', 'debit', spoil),
                            jsonb_build_object('code', '5030', 'debit', variance),
                            jsonb_build_object('code', '1200', 'credit', inv_out));
  end if;

  if inv_in + inv_out > 0 then
    je := pos_private.post_journal(d.company_id, d.doc_date, 'stock_' || d.doc_type::text, d.id,
                                   docno || coalesce(' · ' || d.note, ''), d.branch_id, jl);
  end if;

  update public.pos_stock_docs set
    status = (case when d.doc_type = 'transfer' then 'in_transit' else 'posted' end)::public.pos_stock_doc_status,
    doc_no = docno,
    posted_at = now(),
    posted_by = auth.uid(),
    journal_entry_id = je
  where id = d.id;

  return docno;
end;
$$;
revoke execute on function public.pos_post_stock_doc(uuid) from public, anon;
grant execute on function public.pos_post_stock_doc(uuid) to authenticated;
