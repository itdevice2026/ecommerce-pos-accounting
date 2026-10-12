-- Phase 1 · Inventory posting (receiving transfers, cancelling drafts, stock summary).

-- Receive a transfer at its destination. p_received: [{ line_id, received_qty }];
-- lines left out are received in full. Shortages are written off as count variance.
create or replace function public.pos_receive_transfer(p_doc uuid, p_received jsonb default '[]')
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  d        public.pos_stock_docs;
  l        record;
  transit  uuid;
  r        numeric;
  short    numeric := 0;
  je       uuid;
begin
  select * into d from public.pos_stock_docs where id = p_doc for update;
  if not found or d.company_id is distinct from pos_private.company_id() then
    raise exception 'Document not found';
  end if;
  if d.status <> 'in_transit' then
    raise exception 'Only transfers in transit can be received';
  end if;
  if not (pos_private.has_role('owner', 'admin')
          or (pos_private.has_role('branch_manager', 'warehouse') and pos_private.in_my_branches(d.to_branch_id))) then
    raise exception 'You are not allowed to receive this transfer';
  end if;

  select id into transit from public.pos_stock_locations where company_id = d.company_id and type = 'transit';

  for l in
    select dl.*, p.name as pname from public.pos_stock_doc_lines dl
      join public.pos_products p on p.id = dl.product_id
     where dl.doc_id = d.id and not dl.superseded order by dl.line_no
  loop
    r := coalesce((select (x ->> 'received_qty')::numeric
                     from jsonb_array_elements(coalesce(p_received, '[]')) x
                    where (x ->> 'line_id')::uuid = l.id
                    limit 1), l.qty);
    if r < 0 or r > l.qty then
      raise exception 'Received quantity for % must be between 0 and %', l.pname, l.qty;
    end if;

    insert into public.pos_stock_moves (company_id, location_id, product_id, lot_id, qty, unit_cost, move_type,
                                        doc_type, doc_id, doc_line_id)
    values (d.company_id, transit, l.product_id, l.lot_id, -l.qty, coalesce(l.unit_cost, 0), 'transfer_out', 'transfer', d.id, l.id);
    if r > 0 then
      insert into public.pos_stock_moves (company_id, location_id, product_id, lot_id, qty, unit_cost, move_type,
                                          doc_type, doc_id, doc_line_id)
      values (d.company_id, d.to_location_id, l.product_id, l.lot_id, r, coalesce(l.unit_cost, 0), 'transfer_in', 'transfer', d.id, l.id);
    end if;
    update public.pos_stock_doc_lines set received_qty = r where id = l.id;
    short := short + round((l.qty - r) * coalesce(l.unit_cost, 0), 2);
  end loop;

  if short > 0 then
    je := pos_private.post_journal(d.company_id, current_date, 'stock_transfer', d.id,
                                   d.doc_no || ' · shortage on receipt', d.to_branch_id,
                                   jsonb_build_array(jsonb_build_object('code', '5030', 'debit', short),
                                                     jsonb_build_object('code', '1200', 'credit', short)));
  end if;

  update public.pos_stock_docs set
    status = 'received',
    received_at = now(),
    received_by = auth.uid(),
    journal_entry_id = coalesce(je, journal_entry_id)
  where id = d.id;
end;
$$;
revoke execute on function public.pos_receive_transfer(uuid, jsonb) from public, anon;
grant execute on function public.pos_receive_transfer(uuid, jsonb) to authenticated;

create or replace function public.pos_cancel_stock_doc(p_doc uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  d public.pos_stock_docs;
begin
  select * into d from public.pos_stock_docs where id = p_doc for update;
  if not found or d.company_id is distinct from pos_private.company_id() then
    raise exception 'Document not found';
  end if;
  if d.status <> 'draft' then
    raise exception 'Only drafts can be cancelled; post an adjustment to correct posted stock';
  end if;
  if not pos_private.can_edit_doc(d.doc_type, d.branch_id) then
    raise exception 'You are not allowed to cancel this document';
  end if;
  update public.pos_stock_docs set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid() where id = d.id;
end;
$$;
revoke execute on function public.pos_cancel_stock_doc(uuid) from public, anon;
grant execute on function public.pos_cancel_stock_doc(uuid) to authenticated;

-- Stock per product (all storage locations), in-transit qty, average cost and value.
create or replace view public.pos_stock_summary
with (security_invoker = true)
as
select p.company_id,
       p.id as product_id,
       p.sku,
       p.name,
       p.base_uom,
       p.category_id,
       p.reorder_point,
       p.track_lots,
       p.is_active,
       coalesce(sum(b.qty) filter (where l.type = 'storage'), 0)::numeric(14, 3) as qty_on_hand,
       coalesce(sum(b.qty) filter (where l.type = 'transit'), 0)::numeric(14, 3) as qty_in_transit,
       coalesce(c.avg_cost, 0)::numeric(14, 4) as avg_cost
  from public.pos_products p
  left join public.pos_stock_balances b on b.product_id = p.id
  left join public.pos_stock_locations l on l.id = b.location_id
  left join public.pos_product_costs c on c.product_id = p.id
 where p.track_stock
 group by p.id, c.avg_cost;
revoke all on public.pos_stock_summary from anon;
grant select on public.pos_stock_summary to authenticated;
