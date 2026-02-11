-- ============================================================================
-- Seed: ~500 sample transfers for the "orderinvest" organization
--
-- Prerequisites:
--   1. The "orderinvest" organization must already exist.
--   2. It must have at least one PSP, category, payment method, and type.
--      If not, the script creates sensible defaults first.
--
-- Usage: Paste into Supabase SQL Editor and run.
-- ============================================================================

do $$
declare
  _org_id          uuid;
  _psp_ids         uuid[];
  _psp_rates       numeric[];
  _deposit_cat_id  uuid;
  _withdraw_cat_id uuid;
  _pm_ids          uuid[];
  _type_ids        uuid[];
  _names           text[] := array[
    'Ahmet Yılmaz', 'Mehmet Kaya', 'Ayşe Demir', 'Fatma Çelik', 'Ali Şahin',
    'Zeynep Arslan', 'Hüseyin Doğan', 'Elif Aydın', 'Mustafa Yıldız', 'Hatice Öztürk',
    'İbrahim Kılıç', 'Emine Çetin', 'Hasan Koç', 'Merve Erdoğan', 'Osman Polat',
    'Esra Kurt', 'Yusuf Özdemir', 'Büşra Aksoy', 'Emre Korkmaz', 'Selin Kaplan',
    'Murat Acar', 'Derya Güneş', 'Serkan Çiftçi', 'Gizem Bayrak', 'Burak Aslan',
    'Deniz Turan', 'Cem Karaca', 'Sibel Yalçın', 'Volkan Ateş', 'Pınar Bulut'
  ];
  _day_offset      int;
  _transfers_today int;
  _i               int;
  _name            text;
  _is_deposit      boolean;
  _psp_idx         int;
  _raw_amount      numeric;
  _amount          numeric;
  _commission      numeric;
  _net             numeric;
  _currency        public.currency;
  _hour            int;
  _minute          int;
  _transfer_date   timestamptz;
  _cat_id          uuid;
  _pm_id           uuid;
  _type_id         uuid;
  _psp_id          uuid;
  _comm_rate       numeric;
  _exchange_rate   numeric;
  _amount_try      numeric;
  _amount_usd      numeric;
begin
  -- ── 1. Resolve org ──────────────────────────────────────────────
  select id into _org_id
  from organizations
  where name ilike '%orderinvest%'
  limit 1;

  if _org_id is null then
    raise exception 'Organization "orderinvest" not found. Create it first.';
  end if;

  -- ── 2. Ensure lookup data exists ────────────────────────────────

  -- PSPs
  if not exists (select 1 from psps where organization_id = _org_id and is_active) then
    insert into psps (organization_id, name, commission_rate) values
      (_org_id, 'PayTR',   0.0250),
      (_org_id, 'Papara',  0.0150),
      (_org_id, 'Mefete',  0.0300),
      (_org_id, 'Payfix',  0.0200);
  end if;

  select array_agg(id order by name), array_agg(commission_rate order by name)
  into _psp_ids, _psp_rates
  from psps
  where organization_id = _org_id and is_active;

  -- Ensure rate-history rows exist for each PSP (idempotent)
  for _psp_idx in 1..array_length(_psp_ids, 1) loop
    insert into psp_commission_rates (psp_id, organization_id, commission_rate, effective_from)
    values (_psp_ids[_psp_idx], _org_id, _psp_rates[_psp_idx], current_date - interval '90 days')
    on conflict (psp_id, effective_from) do nothing;
  end loop;

  -- Categories (need at least one deposit + one withdrawal)
  if not exists (select 1 from transfer_categories where organization_id = _org_id and is_active) then
    insert into transfer_categories (organization_id, name, is_deposit) values
      (_org_id, 'Yatırım', true),
      (_org_id, 'Çekim',   false);
  end if;

  select id into _deposit_cat_id
  from transfer_categories
  where organization_id = _org_id and is_deposit = true and is_active
  limit 1;

  select id into _withdraw_cat_id
  from transfer_categories
  where organization_id = _org_id and is_deposit = false and is_active
  limit 1;

  -- Payment Methods
  if not exists (select 1 from payment_methods where organization_id = _org_id and is_active) then
    insert into payment_methods (organization_id, name) values
      (_org_id, 'Banka Havale'),
      (_org_id, 'Papara'),
      (_org_id, 'Tether (USDT)'),
      (_org_id, 'Kredi Kartı');
  end if;

  select array_agg(id order by name) into _pm_ids
  from payment_methods
  where organization_id = _org_id and is_active;

  -- Transfer Types
  if not exists (select 1 from transfer_types where organization_id = _org_id and is_active) then
    insert into transfer_types (organization_id, name) values
      (_org_id, 'Payment'),
      (_org_id, 'Client');
  end if;

  select array_agg(id order by name) into _type_ids
  from transfer_types
  where organization_id = _org_id and is_active;

  -- ── 3. Generate ~500 transfers over 90 days ─────────────────────

  for _day_offset in 0..89 loop
    -- Uneven distribution: 2–12 transfers per day (weighted toward 4–8)
    _transfers_today := 2 + floor(random() * 6 + random() * 5)::int;

    for _i in 1.._transfers_today loop
      -- Random name
      _name := _names[1 + floor(random() * array_length(_names, 1))::int];

      -- 60% deposits, 40% withdrawals
      _is_deposit := random() < 0.6;

      -- Random PSP
      _psp_idx := 1 + floor(random() * array_length(_psp_ids, 1))::int;
      _psp_id := _psp_ids[_psp_idx];
      _comm_rate := _psp_rates[_psp_idx];

      -- Random amount (100–50,000)
      _raw_amount := round((100 + random() * 49900)::numeric, 2);

      -- Compute amount, commission, net
      if _is_deposit then
        _amount     := _raw_amount;
        _commission := round(_raw_amount * _comm_rate, 2);
        _net        := _amount - _commission;
        _cat_id     := _deposit_cat_id;
      else
        _amount     := -_raw_amount;
        _commission := 0;
        _net        := _amount;
        _cat_id     := _withdraw_cat_id;
      end if;

      -- 80% TL, 20% USD
      _currency := case when random() < 0.8 then 'TL'::public.currency else 'USD'::public.currency end;

      -- Exchange rate: always USD/TRY (random 32–36)
      _exchange_rate := round((32 + random() * 4)::numeric, 4);

      -- Compute dual-currency amounts
      if _currency = 'TL' then
        _amount_try := _amount;
        _amount_usd := round(_amount / _exchange_rate, 2);
      else
        _amount_usd := _amount;
        _amount_try := round(_amount * _exchange_rate, 2);
      end if;

      -- Random time between 08:00–22:00
      _hour   := 8 + floor(random() * 14)::int;
      _minute := floor(random() * 60)::int;
      _transfer_date := (current_date - _day_offset * interval '1 day')
                        + (_hour * interval '1 hour')
                        + (_minute * interval '1 minute')
                        + (floor(random() * 60) * interval '1 second');

      -- Random payment method and type
      _pm_id   := _pm_ids[1 + floor(random() * array_length(_pm_ids, 1))::int];
      _type_id := _type_ids[1 + floor(random() * array_length(_type_ids, 1))::int];

      insert into transfers (
        organization_id, full_name, payment_method_id, transfer_date,
        category_id, amount, commission, net, currency,
        psp_id, type_id, crm_id, meta_id,
        exchange_rate, amount_try, amount_usd,
        commission_rate_snapshot
      ) values (
        _org_id, _name, _pm_id, _transfer_date,
        _cat_id, _amount, _commission, _net, _currency,
        _psp_id, _type_id,
        case when random() < 0.3 then 'CRM-' || lpad((floor(random() * 99999))::text, 5, '0') else null end,
        case when random() < 0.2 then 'META-' || lpad((floor(random() * 99999))::text, 5, '0') else null end,
        _exchange_rate, _amount_try, _amount_usd,
        _comm_rate
      );

    end loop;
  end loop;

  raise notice 'Seed complete for org %', _org_id;
end;
$$;
