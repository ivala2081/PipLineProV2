-- ============================================================================
-- 026: Import OCAK CSV data to transfers
-- ============================================================================

do $$
declare
  v_org_id uuid;
  v_payment_method_id uuid;
  v_category_id uuid;
  v_psp_id uuid;
  v_type_id uuid;
  v_counter integer := 0;
begin
  -- Get ORDERINVEST organization ID
  select id into v_org_id
  from public.organizations
  where name = 'ORDERINVEST'
  limit 1;

  if v_org_id is null then
    raise exception 'ORDERINVEST organization not found. Please create it first.';
  end if;

  raise notice 'Using organization: %', v_org_id;

  -- ============================================================================
  -- Create lookup data (payment methods, categories, psps, types)
  -- ============================================================================

  -- Payment Methods (ÖDEME ŞEKLİ)
  insert into public.payment_methods (organization_id, name, is_active)
  values 
    (v_org_id, 'Tether', true),
    (v_org_id, 'BANKA', true)
  on conflict (organization_id, name) do nothing;

  -- Transfer Categories (KATEGORİ)
  insert into public.transfer_categories (organization_id, name, is_deposit, is_active)
  values 
    (v_org_id, 'YATIRIM', true, true),
    (v_org_id, 'ÇEKME', false, true)
  on conflict (organization_id, name) do nothing;

  -- PSPs (KASA) - all with 1% commission rate
  insert into public.psps (organization_id, name, commission_rate, is_active)
  values 
    (v_org_id, 'TETHER', 0.01, true),
    (v_org_id, '#72 CRYPPAY 10', 0.01, true),
    (v_org_id, '#70 CRYPPAY', 0.01, true),
    (v_org_id, '70 BLOKE', 0.01, true),
    (v_org_id, '72 BLOKE', 0.01, true),
    (v_org_id, 'FSK', 0.01, true),
    (v_org_id, '#72 CRYPPAY', 0.01, true)
  on conflict (organization_id, name) do nothing;

  -- Transfer Types (Tür)
  insert into public.transfer_types (organization_id, name, is_active)
  values 
    (v_org_id, 'MÜŞTERİ', true),
    (v_org_id, 'BLOKE HESAP', true),
    (v_org_id, 'ÖDEME', true)
  on conflict (organization_id, name) do nothing;

  raise notice 'Lookup data created successfully';

  -- ============================================================================
  -- Import transfers from OCAK CSV (791 rows)
  -- ============================================================================
  
  -- Row 2: SELMAN GÜÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELMAN GÜÇ', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '24726', '24726'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 3: ÇAĞATAY DAYE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÇAĞATAY DAYE', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46166', '42211'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 4: İONUT CRİSTİAN MEREUTA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İONUT CRİSTİAN MEREUTA', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 43000, 0, 43000, 'TL', v_psp_id, v_type_id, '46185', '42230'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 5: ŞAHİN GÜZDOĞAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞAHİN GÜZDOĞAOĞLU', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 995, 0, 995, 'USD', v_psp_id, v_type_id, '46186', '42231'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 6: MERVE KAYAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERVE KAYAOĞLU', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 11000, 0, 11000, 'TL', v_psp_id, v_type_id, '45417', '41452'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 7: KADİR GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KADİR GÜLER', v_payment_method_id, '2026-01-01'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42244', '22862'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 8: ORHAN KARAKUŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ORHAN KARAKUŞ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -12900, 0, -12900, 'TL', v_psp_id, v_type_id, '45057', '41091'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 9: KENAN GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KENAN GÜLER', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -9500, 0, -9500, 'TL', v_psp_id, v_type_id, '45478', '41513'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 10: ELMAN ZEYNALLİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ELMAN ZEYNALLİ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '44652', '24683'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 11: FATMA PEKER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATMA PEKER', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '45453', '41488'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 12: HÜSEYİN CANER GÖKTAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN CANER GÖKTAN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 550, 0, 550, 'USD', v_psp_id, v_type_id, '45656', '41691'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 13: YASİN KANBUR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASİN KANBUR', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 898, 0, 898, 'USD', v_psp_id, v_type_id, '45837', '41873'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 14: YASİN KANBUR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASİN KANBUR', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 101, 0, 101, 'USD', v_psp_id, v_type_id, '45837', '41873'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 15: İSMAİL KARADAĞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL KARADAĞ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -536, 0, -536, 'USD', v_psp_id, v_type_id, '45835', '41871'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 16: MEHMET SEFA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET SEFA', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '44727', '24760'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 17: EBUBEKİR HAMZA KEMİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EBUBEKİR HAMZA KEMİK', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -40000, 0, -40000, 'TL', v_psp_id, v_type_id, '44658', '24690'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 18: YUSUF DEMİRTUĞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF DEMİRTUĞ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -12100, 0, -12100, 'TL', v_psp_id, v_type_id, '45121', '41156'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 19: ABBAS ÇELENK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABBAS ÇELENK', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 4200, 0, 4200, 'TL', v_psp_id, v_type_id, '46184', '42229'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 20: HASAN ÇİFTÇİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN ÇİFTÇİ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -5000, 0, -5000, 'TL', v_psp_id, v_type_id, '46099', '42143'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 21: SAMET ÇÖREKÇİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET ÇÖREKÇİ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '45138', '41173'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 22: YUSUF ÇEVİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF ÇEVİK', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 565, 0, 565, 'USD', v_psp_id, v_type_id, '46102', '42146'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 23: FATMA PEKER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATMA PEKER', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '45453', '41488'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 24: UMIT IDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UMIT IDIZ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -1800, 0, -1800, 'TL', v_psp_id, v_type_id, '46016', '42060'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 25: TARIK ÜNLÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TARIK ÜNLÜ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 7000, 0, 7000, 'TL', v_psp_id, v_type_id, '46201', '42247'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 26: ÖMER UZUN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER UZUN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -107570, 0, -107570, 'TL', v_psp_id, v_type_id, '1993', '24074'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 27: UĞUR KARAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR KARAMAN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -70, 0, -70, 'USD', v_psp_id, v_type_id, '44492', '24523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 28: BARBAROS GÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARBAROS GÜL', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 135.75, 0, 135.75, 'USD', v_psp_id, v_type_id, '44926', '24960'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 29: BANU ÖZKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BANU ÖZKAN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -2000, 0, -2000, 'USD', v_psp_id, v_type_id, '46045', '42089'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 30: YUSUF DEMİRTUĞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF DEMİRTUĞ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '45121', '41156'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 31: ŞERAFETTİN ÖZTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞERAFETTİN ÖZTÜRK', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, -200, 0, -200, 'USD', v_psp_id, v_type_id, '45607', '41642'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 32: KADİR İŞLEYEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KADİR İŞLEYEN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46163', '42208'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 33: RAMAZAN KAÇAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RAMAZAN KAÇAR', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 12910, 0, 12910, 'TL', v_psp_id, v_type_id, '45568', '41603'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 34: ONUR ALSAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ALSAN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44487', '24518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 35: ONUR ALSAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ALSAN', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 27, 0, 27, 'USD', v_psp_id, v_type_id, '44487', '24518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 36: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 105, 0, 105, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 37: EFKAN ALPER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EFKAN ALPER', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 22400, 0, 22400, 'TL', v_psp_id, v_type_id, '44381', '24411'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 38: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 150000, 0, 150000, 'TL', v_psp_id, v_type_id, '44543', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 39: KADİR GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KADİR GÜLER', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '42244', '22862'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 40: NEVZAT ARDA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEVZAT ARDA', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 7008, 0, 7008, 'USD', v_psp_id, v_type_id, '44281', '41881'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 41: KAZIM GENÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAZIM GENÇ', v_payment_method_id, '2026-01-02'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44686', '24718'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 42: FİDELYE GÖKÇE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FİDELYE GÖKÇE', v_payment_method_id, '2026-01-03'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46213', '42259'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 43: OKTAY ALTUN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKTAY ALTUN', v_payment_method_id, '2026-01-04'::timestamptz,
    v_category_id, 5016, 0, 5016, 'USD', v_psp_id, v_type_id, '44862', '42241'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 44: ALDAN ALİYEV
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALDAN ALİYEV', v_payment_method_id, '2026-01-04'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '45280', '41315'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 45: MURAT ÖZİŞLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZİŞLER', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 2009, 0, 2009, 'USD', v_psp_id, v_type_id, '45917', '41958'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 46: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 47: HASAN ÇİFTÇİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN ÇİFTÇİ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -10000, 0, -10000, 'TL', v_psp_id, v_type_id, '46099', '42143'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 48: FURKAN ERBİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN ERBİL', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -6000, 0, -6000, 'TL', v_psp_id, v_type_id, '45823', '41858'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 49: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -39900, 0, -39900, 'USD', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 50: ALİ ALTUNTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ ALTUNTAŞ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -244, 0, -244, 'USD', v_psp_id, v_type_id, '45972', '42015'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 51: YAVUZ BAŞAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAVUZ BAŞAR', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 22170, 0, 22170, 'TL', v_psp_id, v_type_id, '46122', '42166'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 52: ÖMER ŞAHBAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER ŞAHBAZ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 5500, 0, 5500, 'TL', v_psp_id, v_type_id, '45288', '41323'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 53: ŞEYDA TEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞEYDA TEKİN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46140', '42184'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 54: YUSUF ŞENSES
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF ŞENSES', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -36589, 0, -36589, 'TL', v_psp_id, v_type_id, '44622', '24653'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 55: MURAT KILIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT KILIÇ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -16000, 0, -16000, 'TL', v_psp_id, v_type_id, '45303', '41338'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 56: MEHMET ALİ BAYINDIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ALİ BAYINDIR', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 306.23, 0, 306.23, 'USD', v_psp_id, v_type_id, '46110', '42154'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 57: FARUK KOCATÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK KOCATÜRK', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 200000, 0, 200000, 'TL', v_psp_id, v_type_id, '46225', '42271'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 58: NURSEL BAYCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NURSEL BAYCAN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '44008', '24019'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 59: MEHMET HÜSEYİN AKÇAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET HÜSEYİN AKÇAY', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -800, 0, -800, 'USD', v_psp_id, v_type_id, '45260', '41295'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 60: FATİH İŞLEYEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH İŞLEYEN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 17500, 0, 17500, 'TL', v_psp_id, v_type_id, '46163', '42208'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 61: CANER TARIK AKSU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CANER TARIK AKSU', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46149', '42194'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 62: BERAT TAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERAT TAT', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -4300, 0, -4300, 'TL', v_psp_id, v_type_id, '45949', '41990'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 63: TUNCA KARCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TUNCA KARCI', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 2535, 0, 2535, 'USD', v_psp_id, v_type_id, '44753', '24786'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 64: NEVZAT TANIŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEVZAT TANIŞ', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46227', '42273'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 65: METİN USLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'METİN USLU', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 43000, 0, 43000, 'TL', v_psp_id, v_type_id, '44555', '24586'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 66: YAVUZ ÖZKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAVUZ ÖZKAN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46226', '42272'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 67: TAMER AVCU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAMER AVCU', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -10760, 0, -10760, 'TL', v_psp_id, v_type_id, '45089', '41123'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 68: RAUF BİLGİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RAUF BİLGİN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 108000, 0, 108000, 'TL', v_psp_id, v_type_id, '45379', '41414'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 69: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 70: İBRAHİM BARIŞ SELÇUK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM BARIŞ SELÇUK', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 999, 0, 999, 'USD', v_psp_id, v_type_id, '46239', '42285'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 71: AYKUT SONGÜR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYKUT SONGÜR', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46228', '42274'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 72: EMRE ERKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE ERKE', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 37.58, 0, 37.58, 'USD', v_psp_id, v_type_id, '46235', '42281'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 73: AZİZ SEVİM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AZİZ SEVİM', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '44963', '24997'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 74: YUSUF SAMİ ATABEY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF SAMİ ATABEY', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 21540, 0, 21540, 'TL', v_psp_id, v_type_id, '46126', '42170'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 75: MUHAMMET MURAT YAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET MURAT YAMAN', v_payment_method_id, '2026-01-05'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '45754', '41789'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 76: METİN TULUNAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'METİN TULUNAY', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 600, 0, 600, 'USD', v_psp_id, v_type_id, '45181', '41216'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 77: ŞÜKRÜ KUTKU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞÜKRÜ KUTKU', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 999, 0, 999, 'USD', v_psp_id, v_type_id, '44266', '24293'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 78: ENES METİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ENES METİN', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 15066, 0, 15066, 'TL', v_psp_id, v_type_id, '45046', '41080'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 79: AYDIN ÇAĞLAYAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYDIN ÇAĞLAYAN', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '44697', '24729'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 80: İBRAHİM KARAGÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM KARAGÜL', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 4315, 0, 4315, 'TL', v_psp_id, v_type_id, '45406', '41441'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 81: ALİ KUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ KUTLU', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '46262', '42308'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 82: BERKAY BAKIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAY BAKIR', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46264', '42310'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 83: SEMA AKTAŞ ÖKSÜZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEMA AKTAŞ ÖKSÜZ', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 86100, 0, 86100, 'TL', v_psp_id, v_type_id, '45451', '41486'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 84: METİN USLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'METİN USLU', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 43000, 0, 43000, 'TL', v_psp_id, v_type_id, '44555', '24586'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 85: AHMET SANDALCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET SANDALCI', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 100.85, 0, 100.85, 'USD', v_psp_id, v_type_id, '46265', '42311'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 86: BAKİ UÇAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAKİ UÇAR', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, -10000, 0, -10000, 'TL', v_psp_id, v_type_id, '44596', '24627'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 87: ŞAFAK BAYCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞAFAK BAYCAN', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 300.44, 0, 300.44, 'USD', v_psp_id, v_type_id, '46256', '42302'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 88: OĞUZHAN BALCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OĞUZHAN BALCI', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 6000, 0, 6000, 'TL', v_psp_id, v_type_id, '46209', '42255'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 89: UĞUR KARAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR KARAMAN', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '44492', '24523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 90: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, -200, 0, -200, 'USD', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 91: MUHAMMET MURAT YAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET MURAT YAMAN', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '45754', '41789'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 92: SÜLEYMAN SAMET GÖÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SÜLEYMAN SAMET GÖÇER', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 1751, 0, 1751, 'USD', v_psp_id, v_type_id, '44770', '24803'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 93: AHMET AKKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET AKKAYA', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, -6800, 0, -6800, 'TL', v_psp_id, v_type_id, '44307', '24337'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 94: YUSUF BAKTIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF BAKTIR', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46260', '42306'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 95: AHMET ÇİLEKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET ÇİLEKAYA', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 242.61, 0, 242.61, 'USD', v_psp_id, v_type_id, '46278', '42324'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 96: AHMET ÇİLEKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET ÇİLEKAYA', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46278', '42324'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 97: ALİHAN KUZU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİHAN KUZU', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 230, 0, 230, 'USD', v_psp_id, v_type_id, '44093', '24113'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 98: UĞUR KIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR KIR', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 301, 0, 301, 'USD', v_psp_id, v_type_id, '46231', '42277'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 99: İSMAİL ALPEREN YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL ALPEREN YILDIRIM', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46259', '42305'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 100: FURKAN YETİŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN YETİŞ', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '44949', '24983'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 101: TUĞBA ELTİMUR DELAİRE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TUĞBA ELTİMUR DELAİRE', v_payment_method_id, '2026-01-06'::timestamptz,
    v_category_id, 1870, 0, 1870, 'USD', v_psp_id, v_type_id, '46281', '42327'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 102: ONUR YÖRÜK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR YÖRÜK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46123', '42167'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 103: SERVET OKTAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERVET OKTAY', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, -4300, 0, -4300, 'TL', v_psp_id, v_type_id, '44720', '24752'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 104: YUSUF APAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF APAK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '44472', '24503'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 105: RAUF BİLGİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RAUF BİLGİN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 42000, 0, 42000, 'TL', v_psp_id, v_type_id, '45379', '41414'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 106: MUSTAFA KERVAN ERDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA KERVAN ERDOĞAN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 86120, 0, 86120, 'TL', v_psp_id, v_type_id, '46282', '42328'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 107: ERKAN ÇAKMAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERKAN ÇAKMAK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 13500, 0, 13500, 'TL', v_psp_id, v_type_id, '46253', '42299'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 108: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 234.21, 0, 234.21, 'USD', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 109: DERVİŞHAN YAŞLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞHAN YAŞLI', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46233', '42279'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 110: İLKER BİRİNCİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLKER BİRİNCİ', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 6500, 0, 6500, 'TL', v_psp_id, v_type_id, '44791', '24824'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 111: MEHMET CAN TUNA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET CAN TUNA', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46251', '42297'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 112: NUR GÜLTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NUR GÜLTEKİN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46283', '42329'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 113: YASİN KANBUR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASİN KANBUR', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, -804, 0, -804, 'USD', v_psp_id, v_type_id, '45837', '41873'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 114: HALİL UĞUZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİL UĞUZ', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '44719', '24751'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 115: HALİL UĞUZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİL UĞUZ', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, -300, 0, -300, 'USD', v_psp_id, v_type_id, '44719', '24751'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 116: BERKAN GÖĞTEPE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAN GÖĞTEPE', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46302', '42348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 117: OĞUZHAN DALGIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OĞUZHAN DALGIÇ', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, -101, 0, -101, 'USD', v_psp_id, v_type_id, '45757', '41792'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 118: NUR AYDIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NUR AYDIN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, -45115, 0, -45115, 'TL', v_psp_id, v_type_id, '44661', '24693'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 119: MURAT ÖZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZER', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 6000, 0, 6000, 'TL', v_psp_id, v_type_id, '46303', '42349'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 120: ALİ ZIVLAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '70 BLOKE';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'BLOKE HESAP';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ ZIVLAK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 4300, 0, 4300, 'TL', v_psp_id, v_type_id, '46300', '42346'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 121: OĞUZHAN BALCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '72 BLOKE';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'BLOKE HESAP';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OĞUZHAN BALCI', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 21750, 0, 21750, 'TL', v_psp_id, v_type_id, '46209', '42255'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 122: MEHMET GÜRCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET GÜRCAN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 31000, 0, 31000, 'TL', v_psp_id, v_type_id, '46306', '42352'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 123: UFUK YÖRÜK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UFUK YÖRÜK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 195000, 0, 195000, 'TL', v_psp_id, v_type_id, '45797', '41832'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 124: FARUK KOCATÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK KOCATÜRK', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46225', '42271'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 125: ORHAN APASLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ORHAN APASLAN', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 21550, 0, 21550, 'TL', v_psp_id, v_type_id, '45859', '41896'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 126: OSMAN ENES ŞENOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OSMAN ENES ŞENOĞLU', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 6455, 0, 6455, 'TL', v_psp_id, v_type_id, '46172', '42217'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 127: ZEKİ BAYIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ZEKİ BAYIR', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46316', '42362'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 128: ASİF QULİYEV
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASİF QULİYEV', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46236', '42282'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 129: SELAMİ AKPINAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELAMİ AKPINAR', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '45624', '41659'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 130: TÜLİN AKOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TÜLİN AKOL', v_payment_method_id, '2026-01-07'::timestamptz,
    v_category_id, 21550, 0, 21550, 'TL', v_psp_id, v_type_id, '46321', '42367'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 131: MEMO ARICA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEMO ARICA', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 499, 0, 499, 'USD', v_psp_id, v_type_id, '45291', '41326'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 132: NEŞE ÖRNEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEŞE ÖRNEK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 12918, 0, 12918, 'TL', v_psp_id, v_type_id, '46312', '42358'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 133: ERKAN ORS
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERKAN ORS', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 103, 0, 103, 'USD', v_psp_id, v_type_id, '46311', '42357'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 134: DERVİŞHAN YAŞLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞHAN YAŞLI', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46233', '42279'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 135: HÜSEYİN KURTBOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN KURTBOĞAN', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 21550, 0, 21550, 'TL', v_psp_id, v_type_id, '45452', '41487'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 136: ALEATTİN KILIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALEATTİN KILIÇ', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46313', '42359'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 137: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 88.66, 0, 88.66, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 138: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 45, 0, 45, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 139: ERHAN ZENGİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERHAN ZENGİN', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -70000, 0, -70000, 'TL', v_psp_id, v_type_id, '45307', '41342'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 140: EMRE DİNÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE DİNÇER', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -14000, 0, -14000, 'TL', v_psp_id, v_type_id, '45405', '41440'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 141: FARUK KOCATÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK KOCATÜRK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 200000, 0, 200000, 'TL', v_psp_id, v_type_id, '46225', '42271'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 142: DERVİŞHAN YAŞLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞHAN YAŞLI', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '45452', '41487'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 143: HABİB GÜLOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HABİB GÜLOĞLU', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4315, 0, 4315, 'TL', v_psp_id, v_type_id, '44511', '24542'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 144: CİHAN UZAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHAN UZAR', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 990, 0, 990, 'USD', v_psp_id, v_type_id, '45336', '41371'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 145: CİHAN UZAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHAN UZAR', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 10, 0, 10, 'USD', v_psp_id, v_type_id, '45336', '41371'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 146: 70 KASA TETHER ALIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, '70 KASA TETHER ALIM', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -2717, 0, -2717, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 147: YUSUF ÇEVİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF ÇEVİK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -500, 0, -500, 'USD', v_psp_id, v_type_id, '46102', '42146'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 148: FARUK ATEŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK ATEŞ', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 800.75, 0, 800.75, 'USD', v_psp_id, v_type_id, '45758', '41793'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 149: NECAT BAYVAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NECAT BAYVAL', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46343', '42389'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 150: İZZETTİN İNAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İZZETTİN İNAL', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46348', '42394'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 151: MESUT ÖZKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MESUT ÖZKAN', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46320', '42366'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 152: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '45798', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 153: OĞUZHAN BALCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OĞUZHAN BALCI', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -20000, 0, -20000, 'TL', v_psp_id, v_type_id, '46209', '42255'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 154: ÖMER CANTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER CANTÜRK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -300, 0, -300, 'USD', v_psp_id, v_type_id, '45418', '41453'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 155: HÜSEYİN GAMTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN GAMTÜRK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 1476, 0, 1476, 'USD', v_psp_id, v_type_id, '44189', '24213'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 156: ANIL ATEŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ANIL ATEŞ', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4600, 0, 4600, 'TL', v_psp_id, v_type_id, '45708', '41743'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 157: ÖZLEM KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZLEM KOÇ', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '46358', '42404'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 158: RECEP BOZKURT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RECEP BOZKURT', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 252.01, 0, 252.01, 'USD', v_psp_id, v_type_id, '45786', '41821'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 159: BEDRİ AKKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BEDRİ AKKAYA', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 2500, 0, 2500, 'USD', v_psp_id, v_type_id, '45346', '41381'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 160: BAKİ UÇAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAKİ UÇAR', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -310, 0, -310, 'USD', v_psp_id, v_type_id, '44596', '24627'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 161: ASİL MERT ALTUNKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASİL MERT ALTUNKAYA', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 21500, 0, 21500, 'TL', v_psp_id, v_type_id, '44523', '24554'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 162: TARKAN YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TARKAN YILDIRIM', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 1199, 0, 1199, 'USD', v_psp_id, v_type_id, '45051', '41085'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 163: YUSUF BAŞYOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF BAŞYOL', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4300, 0, 4300, 'TL', v_psp_id, v_type_id, '45743', '41778'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 164: ÖMER ENES AKPINAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER ENES AKPINAR', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4310, 0, 4310, 'TL', v_psp_id, v_type_id, '46362', '42408'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 165: CİHAN KURT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHAN KURT', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '44704', '24736'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 166: ÖMER ENES AKPINAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER ENES AKPINAR', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, -4310, 0, -4310, 'TL', v_psp_id, v_type_id, '46362', '42408'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 167: ERHAN GÖK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERHAN GÖK', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 14000, 0, 14000, 'TL', v_psp_id, v_type_id, '46258', '42304'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 168: OSMAN YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OSMAN YILMAZ', v_payment_method_id, '2026-01-08'::timestamptz,
    v_category_id, 4351, 0, 4351, 'TL', v_psp_id, v_type_id, '46364', '42410'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 169: ŞENGÜL AYDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞENGÜL AYDOĞAN', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, -367, 0, -367, 'USD', v_psp_id, v_type_id, '45833', '41869'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 170: MURAT ÖZYÜREK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZYÜREK', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '44601', '24632'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 171: SAMET KULABAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET KULABAŞ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, -22130, 0, -22130, 'TL', v_psp_id, v_type_id, '45419', '41454'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 172: FARUK KOCATÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'FSK';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK KOCATÜRK', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 200000, 0, 200000, 'TL', v_psp_id, v_type_id, '46225', '42271'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 173: BURAK HEPÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURAK HEPÖZ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46372', '42418'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 174: TAYYİP YALÇIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAYYİP YALÇIN', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 98.79, 0, 98.79, 'USD', v_psp_id, v_type_id, '46351', '42397'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 175: ALİ ERDEM CAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ ERDEM CAN', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46329', '42375'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 176: UMUT DARILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UMUT DARILMAZ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, -16800, 0, -16800, 'TL', v_psp_id, v_type_id, '45649', '41684'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 177: ŞİYAR KEPİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞİYAR KEPİR', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 8800, 0, 8800, 'TL', v_psp_id, v_type_id, '45898', '41938'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 178: MUSTAFA SARALAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA SARALAR', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '44439', '24469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 179: MUSTAFA SARALAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA SARALAR', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 115700, 0, 115700, 'TL', v_psp_id, v_type_id, '44439', '24469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 180: KADİR GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KADİR GÜLER', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '42244', '22862'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 181: HASAN TÜTÜNCÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN TÜTÜNCÜ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 43100, 0, 43100, 'TL', v_psp_id, v_type_id, '44766', '24799'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 182: HATİCE ERGÜN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATİCE ERGÜN', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, -8620, 0, -8620, 'TL', v_psp_id, v_type_id, '44190', '24214'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 183: MURAT ONAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ONAR', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 999, 0, 999, 'USD', v_psp_id, v_type_id, '45526', '41561'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 184: YUNUS BEKTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUNUS BEKTAŞ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 9939, 0, 9939, 'TL', v_psp_id, v_type_id, '44769', '24802'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 185: KENAN TUNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KENAN TUNÇ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 8650, 0, 8650, 'TL', v_psp_id, v_type_id, '46170', '42215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 186: ADEM İPEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ADEM İPEK', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 40000, 0, 40000, 'TL', v_psp_id, v_type_id, '45035', '41069'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 187: PELİN KARABEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PELİN KARABEL', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 499, 0, 499, 'USD', v_psp_id, v_type_id, '44191', '24215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 188: ÖMER SACİT CAN ABAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER SACİT CAN ABAY', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 7000, 0, 7000, 'TL', v_psp_id, v_type_id, '45990', '42033'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 189: ERJON AKROBATI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERJON AKROBATI', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '46383', '42429'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 190: MEHMET ALİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ALİ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 101, 0, 101, 'USD', v_psp_id, v_type_id, '44829', '24863'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 191: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 13900, 0, 13900, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 192: HALİL ARAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİL ARAT', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46381', '42427'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 193: OSMAN KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OSMAN KARAGÖZ', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 131, 0, 131, 'USD', v_psp_id, v_type_id, '44859', '24893'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 194: PERVİN EHMEDOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PERVİN EHMEDOĞLU', v_payment_method_id, '2026-01-09'::timestamptz,
    v_category_id, 344, 0, 344, 'USD', v_psp_id, v_type_id, '45069', '41103'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 195: BELİS YORGANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BELİS YORGANCI', v_payment_method_id, '2026-01-10'::timestamptz,
    v_category_id, 2995, 0, 2995, 'USD', v_psp_id, v_type_id, '45313', '41348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 196: EMRE ERKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE ERKE', v_payment_method_id, '2026-01-10'::timestamptz,
    v_category_id, 68, 0, 68, 'USD', v_psp_id, v_type_id, '46235', '42281'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 197: SERKAN ÖZAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN ÖZAY', v_payment_method_id, '2026-01-10'::timestamptz,
    v_category_id, 21500, 0, 21500, 'TL', v_psp_id, v_type_id, '46396', '42442'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 198: FATİH SOLMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH SOLMAZ', v_payment_method_id, '2026-01-10'::timestamptz,
    v_category_id, 110, 0, 110, 'USD', v_psp_id, v_type_id, '46406', '42452'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 199: KURBAN BABAJANOV
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KURBAN BABAJANOV', v_payment_method_id, '2026-01-10'::timestamptz,
    v_category_id, 509, 0, 509, 'USD', v_psp_id, v_type_id, '45041', '41075'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 200: ÖZKAN KARABEY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZKAN KARABEY', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 43174, 0, 43174, 'TL', v_psp_id, v_type_id, '46408', '42454'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 201: KENAN TAŞCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KENAN TAŞCI', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46399', '42445'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 202: OSMAN YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OSMAN YILMAZ', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 21000, 0, 21000, 'TL', v_psp_id, v_type_id, '46364', '42410'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 203: MURAT UĞUR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT UĞUR', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46414', '42460'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 204: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 44000, 0, 44000, 'TL', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 205: ÖMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER EMRE AKKAR', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 206: MUSTAFA AYIK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA AYIK', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 13200, 0, 13200, 'TL', v_psp_id, v_type_id, '45172', '41207'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 207: SERKAN ASKÖY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN ASKÖY', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 101, 0, 101, 'USD', v_psp_id, v_type_id, '46429', '42475'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 208: DURMUŞ ALMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DURMUŞ ALMAZ', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 403, 0, 403, 'USD', v_psp_id, v_type_id, '46409', '42455'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 209: BELİS YORGANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BELİS YORGANCI', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 1005, 0, 1005, 'USD', v_psp_id, v_type_id, '45313', '41348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 210: AKIN KURT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AKIN KURT', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46436', '42482'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 211: UĞUR BOZKUL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR BOZKUL', v_payment_method_id, '2026-01-11'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46427', '42473'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 212: ZAUR MEHERREMLİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ZAUR MEHERREMLİ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46222', '42268'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 213: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 214: MÜMİN TAŞTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MÜMİN TAŞTEKİN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 99.19, 0, 99.19, 'USD', v_psp_id, v_type_id, '45360', '41395'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 215: MÜMİN TAŞTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MÜMİN TAŞTEKİN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '45360', '41395'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 216: MUSTAFA HASAN KÖSE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA HASAN KÖSE', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 12950, 0, 12950, 'TL', v_psp_id, v_type_id, '46085', '42129'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 217: OZAN MİNGSAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OZAN MİNGSAR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46458', '42504'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 218: KAYAHAN BAYAZİT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAYAHAN BAYAZİT', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, -250, 0, -250, 'USD', v_psp_id, v_type_id, '44851', '24885'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 219: NAİLE FELEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAİLE FELEK', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 43135, 0, 43135, 'TL', v_psp_id, v_type_id, '42362', '22695'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 220: NEŞE ÖRNEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEŞE ÖRNEK', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 43135, 0, 43135, 'TL', v_psp_id, v_type_id, '46312', '42358'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 221: VELİ ÇETİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'VELİ ÇETİN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 43140, 0, 43140, 'TL', v_psp_id, v_type_id, '44902', '24936'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 222: BÜŞRA ÖZAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BÜŞRA ÖZAY', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46455', '42501'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 223: AYHAN BÜYÜK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYHAN BÜYÜK', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46462', '42508'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 224: ÖMER ŞAHBAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER ŞAHBAZ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '45288', '41323'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 225: FAZİLET GÜNVAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FAZİLET GÜNVAR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 21580, 0, 21580, 'TL', v_psp_id, v_type_id, '46476', '42476'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 226: EMRE DİNÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE DİNÇER', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, -30000, 0, -30000, 'TL', v_psp_id, v_type_id, '45405', '41440'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 227: UĞUR ERKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR ERKAN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46043', '42087'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 228: FERHAT KADİR EROĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FERHAT KADİR EROĞLU', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 44000, 0, 44000, 'TL', v_psp_id, v_type_id, '46384', '42430'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 229: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 1000.62, 0, 1000.62, 'USD', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 230: MUHAMMET WELIBEGOW
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET WELIBEGOW', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 20, 0, 20, 'USD', v_psp_id, v_type_id, '44345', '24375'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 231: MUHAMMET WELIBEGOW
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET WELIBEGOW', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 80, 0, 80, 'USD', v_psp_id, v_type_id, '44345', '24375'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 232: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 40000, 0, 40000, 'USD', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 233: ADİL SAİT AKGÜN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ADİL SAİT AKGÜN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 21600, 0, 21600, 'TL', v_psp_id, v_type_id, '46417', '42463'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 234: HASAN AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN AKIN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42223', '41580'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 235: METEHAN İBİŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'METEHAN İBİŞ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46471', '42517'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 236: DURSUN ALP
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DURSUN ALP', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '22785', '42453'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 237: ALİ EREN ÜNLÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ EREN ÜNLÜ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46463', '42509'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 238: MORIS ADATO
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MORIS ADATO', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '42454', '22786'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 239: TAMER BACAKSIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAMER BACAKSIZ', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, -481, 0, -481, 'USD', v_psp_id, v_type_id, '22106', '22410'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 240: ATILLA KARSLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ATILLA KARSLI', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46307', '42353'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 241: SÜLEYMAN ESER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SÜLEYMAN ESER', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 7000, 0, 7000, 'TL', v_psp_id, v_type_id, '46444', '42490'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 242: YASİN AKOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASİN AKOVA', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 600, 0, 600, 'USD', v_psp_id, v_type_id, '46472', '42518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 243: HASAN AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN AKIN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '42223', '41580'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 244: ORHAN ACAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ORHAN ACAR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '43918', '22918'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 245: SELÇUK YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELÇUK YILDIRIM', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 200, 0, 200, 'USD', v_psp_id, v_type_id, '46447', '42493'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 246: BOĞAÇHAN ULUKAYAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BOĞAÇHAN ULUKAYAOĞLU', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 43150, 0, 43150, 'TL', v_psp_id, v_type_id, '46475', '42521'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 247: ERDEM ULUKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERDEM ULUKAYA', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '43908', '22913'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 248: HABİB GÜLOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HABİB GÜLOĞLU', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 10800, 0, 10800, 'TL', v_psp_id, v_type_id, '44511', '24542'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 249: SEDAT ÖZDEMİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '72 BLOKE';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'BLOKE HESAP';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEDAT ÖZDEMİR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '45163', '41198'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 250: BERTAN KUYUCU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERTAN KUYUCU', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 21570, 0, 21570, 'TL', v_psp_id, v_type_id, '46446', '42492'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 251: BAKİ UÇAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAKİ UÇAR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, -286, 0, -286, 'USD', v_psp_id, v_type_id, '44596', '24627'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 252: ZEKİ DÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ZEKİ DÖNER', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '44929', '24963'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 253: FURKAN AYKANAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN AYKANAT', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 2000, 0, 2000, 'TL', v_psp_id, v_type_id, '46485', '42531'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 254: FURKAN AYKANAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN AYKANAT', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 54.83, 0, 54.83, 'USD', v_psp_id, v_type_id, '46485', '42531'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 255: SERKAN AKSOY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN AKSOY', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 1450, 0, 1450, 'USD', v_psp_id, v_type_id, '46429', '42475'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 256: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 105, 0, 105, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 257: ŞEYMA AKBAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞEYMA AKBAY', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46486', '42532'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 258: SELAHETTİN YAPAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELAHETTİN YAPAR', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46424', '42470'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 259: SERKAN ÖZCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN ÖZCAN', v_payment_method_id, '2026-01-12'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46356', '42402'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 260: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 21560, 0, 21560, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 261: ŞADİYE SEÇİL ÇETİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞADİYE SEÇİL ÇETİN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '45989', '42032'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 262: ONUR ALSAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ALSAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -11000, 0, -11000, 'TL', v_psp_id, v_type_id, '44487', '24518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 263: ALİ EREN ÜNLÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ EREN ÜNLÜ', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -209.75, 0, -209.75, 'USD', v_psp_id, v_type_id, '46463', '42509'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 264: SERHAT YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERHAT YILDIRIM', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '46425', '42471'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 265: RAMAZAN MERT ERKOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RAMAZAN MERT ERKOÇ', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46480', '42526'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 266: ÖMER ÇELEBİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER ÇELEBİ', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 9000, 0, 9000, 'TL', v_psp_id, v_type_id, '44672', '24704'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 267: ÖZGÜR ÇETİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZGÜR ÇETİN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44700', '24732'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 268: YUSUF APAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF APAK', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 43400, 0, 43400, 'TL', v_psp_id, v_type_id, '44472', '24503'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 269: SERTAN YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERTAN YILDIRIM', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -200, 0, -200, 'USD', v_psp_id, v_type_id, '42949', '22810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 270: ALPARSLAN FURKAN DEDEOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALPARSLAN FURKAN DEDEOĞLU', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -6949, 0, -6949, 'TL', v_psp_id, v_type_id, '45901', '41941'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 271: ŞÜKRÜ KUTKU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞÜKRÜ KUTKU', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -1507, 0, -1507, 'USD', v_psp_id, v_type_id, '44266', '24293'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 272: HÜSEYİN KURTBOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN KURTBOĞAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -600, 0, -600, 'USD', v_psp_id, v_type_id, '45452', '41487'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 273: DENIZ KARA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DENIZ KARA', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -16583, 0, -16583, 'TL', v_psp_id, v_type_id, '45337', '41372'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 274: ÖMER FARUK İNAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER FARUK İNAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 4315, 0, 4315, 'TL', v_psp_id, v_type_id, '46461', '42507'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 275: SAVAŞ AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAVAŞ AKIN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46150', '42195'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 276: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 3500, 0, 3500, 'TL', v_psp_id, v_type_id, '22849', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 277: MEHMET ŞİŞMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ŞİŞMAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '46478', '42524'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 278: BARAŞ ÇULHACI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARAŞ ÇULHACI', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 4315, 0, 4315, 'TL', v_psp_id, v_type_id, '24620', '42533'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 279: SERKAN ATASEVEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN ATASEVEN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -483, 0, -483, 'USD', v_psp_id, v_type_id, '46155', '42200'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 280: ÇAĞLAR HÜNERÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÇAĞLAR HÜNERÖZ', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -60000, 0, -60000, 'TL', v_psp_id, v_type_id, '44589', '24620'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 281: HARUN ŞENTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HARUN ŞENTÜRK', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 21600, 0, 21600, 'TL', v_psp_id, v_type_id, '46220', '42266'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 282: MESUT ÖZKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MESUT ÖZKAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 190.21, 0, 190.21, 'USD', v_psp_id, v_type_id, '22700', '42366'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 283: ŞEYMA AKBAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞEYMA AKBAY', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, -48984, 0, -48984, 'TL', v_psp_id, v_type_id, '46486', '42532'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 284: MERVE KAYAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '72 BLOKE';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'BLOKE HESAP';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERVE KAYAOĞLU', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '45417', '41452'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 285: YUSUF KIRCA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF KIRCA', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 43160, 0, 43160, 'TL', v_psp_id, v_type_id, '46027', '42071'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 286: EMRE GÜNDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE GÜNDOĞAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46464', '42510'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 287: AYNUR ÖZKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYNUR ÖZKAN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '45193', '41228'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 288: DENİZ ADIGÜZEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DENİZ ADIGÜZEL', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46511', '42558'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 289: KENAN TAŞCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KENAN TAŞCI', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46399', '42445'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 290: EBRU MERCAN TAŞCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EBRU MERCAN TAŞCI', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46515', '42562'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 291: UĞUR BALÇİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR BALÇİN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '46413', '42459'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 292: UĞUR BALÇİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR BALÇİN', v_payment_method_id, '2026-01-13'::timestamptz,
    v_category_id, 1660, 0, 1660, 'TL', v_psp_id, v_type_id, '46413', '42459'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 293: UĞUR ERKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR ERKAN', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46043', '42087'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 294: MEHMET GÜRCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET GÜRCAN', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -1147, 0, -1147, 'USD', v_psp_id, v_type_id, '22685', '42352'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 295: ŞENOL YALÇIN ALADAĞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞENOL YALÇIN ALADAĞ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -13037, 0, -13037, 'TL', v_psp_id, v_type_id, '45657', '41692'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 296: KAYAHAN BAYAZİT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAYAHAN BAYAZİT', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -200, 0, -200, 'USD', v_psp_id, v_type_id, '44851', '24885'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 297: MURAT ELÇİOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ELÇİOĞLU', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 1500, 0, 1500, 'USD', v_psp_id, v_type_id, '46519', '42566'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 298: MUHAMMET REŞAT DÜNDAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET REŞAT DÜNDAR', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -9540, 0, -9540, 'TL', v_psp_id, v_type_id, '45402', '41437'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 299: HASAN MERT SAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT SAVAK', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -4401, 0, -4401, 'TL', v_psp_id, v_type_id, '46623', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 300: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 109000, 0, 109000, 'TL', v_psp_id, v_type_id, '44543', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 301: FATİH İŞLEYEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH İŞLEYEN', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -2100, 0, -2100, 'TL', v_psp_id, v_type_id, '45657', '41682'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 302: HATİP HÜSEYIN AKYÜZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATİP HÜSEYIN AKYÜZ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 400, 0, 400, 'USD', v_psp_id, v_type_id, '42569', '46521'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 303: ÖMER UZUN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER UZUN', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -107942, 0, -107942, 'TL', v_psp_id, v_type_id, '1993', '24074'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 304: UĞUR ERKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR ERKAN', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -695, 0, -695, 'USD', v_psp_id, v_type_id, '46043', '42087'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 305: MURAT ÖZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZER', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46303', '42349'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 306: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 307: BURCU KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU KOTİL', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 6130, 0, 6130, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 308: YAHYA KEMAL İNCİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAHYA KEMAL İNCİ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, -987, 0, -987, 'USD', v_psp_id, v_type_id, '44235', '24261'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 309: SELMA KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELMA KOÇ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 73000, 0, 73000, 'TL', v_psp_id, v_type_id, '46106', '42148'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 310: EROL TURGUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EROL TURGUT', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '45576', '41611'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 311: MEHMET UÇAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET UÇAK', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 5500, 0, 5500, 'TL', v_psp_id, v_type_id, '44711', '24743'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 312: SERTAN YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERTAN YILMAZ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '42949', '22810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 313: NECAT BAYVAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NECAT BAYVAL', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 4300, 0, 4300, 'TL', v_psp_id, v_type_id, '46343', '42389'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 314: MUSTAFA OZPOLAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA OZPOLAT', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 3600, 0, 3600, 'USD', v_psp_id, v_type_id, '46157', '42202'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 315: İLHAN ELİTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLHAN ELİTAŞ', v_payment_method_id, '2026-01-14'::timestamptz,
    v_category_id, 12500, 0, 12500, 'TL', v_psp_id, v_type_id, '46524', '42572'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 316: MEHMET ALİ SAVAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ALİ SAVAŞ', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 12960, 0, 12960, 'TL', v_psp_id, v_type_id, '46532', '42580'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 317: BURCU GÜNEYSU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU GÜNEYSU', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46531', '42579'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 318: BAYRAM MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAYRAM MERT', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 43200, 0, 43200, 'TL', v_psp_id, v_type_id, '44349', '24379'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 319: KASIM KAYA ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KASIM KAYA ÇELİK', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -200, 0, -200, 'USD', v_psp_id, v_type_id, '45319', '41347'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 320: İBRAHIM YÜZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHIM YÜZER', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -250, 0, -250, 'USD', v_psp_id, v_type_id, '45798', '41833'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 321: EMRE DINÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE DINÇER', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 43000, 0, 43000, 'TL', v_psp_id, v_type_id, '45405', '41440'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 322: ALPER ÇITIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALPER ÇITIR', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '45405', '42559'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 323: HÜLYA ALBAYRAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜLYA ALBAYRAK', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 12955, 0, 12955, 'TL', v_psp_id, v_type_id, '46536', '42584'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 324: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -4400, 0, -4400, 'TL', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 325: NEŞE ÖRNEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEŞE ÖRNEK', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 102700, 0, 102700, 'TL', v_psp_id, v_type_id, '22691', '42358'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 326: NEŞE ÖRNEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NEŞE ÖRNEK', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 102700, 0, 102700, 'TL', v_psp_id, v_type_id, '22691', '42358'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 327: FİDELYA GÖKÇE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FİDELYA GÖKÇE', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 21600, 0, 21600, 'TL', v_psp_id, v_type_id, '22618', '42259'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 328: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 329: ABDURRAHMAN YAZICI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAZICI', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -4320, 0, -4320, 'TL', v_psp_id, v_type_id, '45135', '41170'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 330: SİNAN KARAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİNAN KARAMAN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -5226, 0, -5226, 'TL', v_psp_id, v_type_id, '45563', '41598'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 331: MEHMET ALİ KUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ALİ KUTLU', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 55000, 0, 55000, 'TL', v_psp_id, v_type_id, '46533', '42580'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 332: MUHAMMED ERTEKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ERTEKIN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 250, 0, 250, 'USD', v_psp_id, v_type_id, '44833', '24867'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 333: ADNAN TUNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ADNAN TUNÇ', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 21590, 0, 21590, 'TL', v_psp_id, v_type_id, '43872', '22881'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 334: FURKAN ERBİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN ERBİL', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '45823', '41858'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 335: GÖKHAN ÜNAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKHAN ÜNAL', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -370, 0, -370, 'USD', v_psp_id, v_type_id, '46065', '42109'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 336: AYTEN AYDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYTEN AYDOĞAN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 21600, 0, 21600, 'TL', v_psp_id, v_type_id, '46544', '42592'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 337: İBRAHİM ŞAHİN ÖZÇİMEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM ŞAHİN ÖZÇİMEN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 21590, 0, 21590, 'TL', v_psp_id, v_type_id, '45556', '42591'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 338: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -125900, 0, -125900, 'TL', v_psp_id, v_type_id, '44548', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 339: HATICE YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATICE YILMAZ', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -1200, 0, -1200, 'TL', v_psp_id, v_type_id, '45783', '41818'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 340: BURAK YURT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURAK YURT', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -36.48, 0, -36.48, 'USD', v_psp_id, v_type_id, '44602', '24633'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 341: BURCU KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU KOTİL', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 14450, 0, 14450, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 342: BURCU KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU KOTİL', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 2000, 0, 2000, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 343: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 344: YILMAZ YÜKSEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YILMAZ YÜKSEL', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, -109, 0, -109, 'USD', v_psp_id, v_type_id, '22531', '42175'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 345: HALİL TÜRKYILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİL TÜRKYILMAZ', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 6686.42, 0, 6686.42, 'USD', v_psp_id, v_type_id, '46550', '42598'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 346: ABDÜLSAMET AKDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDÜLSAMET AKDOĞAN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46542', '42590'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 347: SIBEL  OCAKCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SIBEL  OCAKCI', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 90000, 0, 90000, 'TL', v_psp_id, v_type_id, '45959', '42002'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 348: EVLİYA AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EVLİYA AKIN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 64383, 0, 64383, 'TL', v_psp_id, v_type_id, '46560', '42608'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 349: GAMZE YURDAER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GAMZE YURDAER', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 21610, 0, 21610, 'TL', v_psp_id, v_type_id, '46559', '42607'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 350: OMER SACIT CAN ABAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER SACIT CAN ABAY', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '45990', '42033'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 351: SELİM ALTIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELİM ALTIN', v_payment_method_id, '2026-01-15'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46566', '42614'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 352: AKGÜN BALIKÇIOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AKGÜN BALIKÇIOĞLU', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 4320, 0, 4320, 'TL', v_psp_id, v_type_id, '46207', '42253'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 353: PINAR KURAĞI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PINAR KURAĞI', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -15000, 0, -15000, 'TL', v_psp_id, v_type_id, '45450', '41485'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 354: ERSEL ÇİNKILIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERSEL ÇİNKILIÇ', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46569', '42617'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 355: CANER ÖZATİKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CANER ÖZATİKE', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -25967, 0, -25967, 'TL', v_psp_id, v_type_id, '45351', '41386'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 356: MELİK ŞAHIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MELİK ŞAHIN', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '46582', '42630'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 357: İBRAHİM ZENGİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM ZENGİN', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -700, 0, -700, 'USD', v_psp_id, v_type_id, '42260', '22619'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 358: MURAT KILIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT KILIÇ', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -35000, 0, -35000, 'TL', v_psp_id, v_type_id, '45303', '41338'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 359: SAMET YEŞİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET YEŞİL', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46308', '42354'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 360: AHMET ACAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET ACAR', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -36584, 0, -36584, 'TL', v_psp_id, v_type_id, '44579', '24610'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 361: YUSUF YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF YILDIRIM', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -1000, 0, -1000, 'USD', v_psp_id, v_type_id, '45047', '41081'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 362: AYŞENUR YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYŞENUR YILMAZ', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -2500, 0, -2500, 'TL', v_psp_id, v_type_id, '44708', '24740'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 363: BURAK GÖZÜKARA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURAK GÖZÜKARA', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 21620, 0, 21620, 'TL', v_psp_id, v_type_id, '44508', '24539'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 364: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46584', '42632'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 365: MERYEM RIZAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERYEM RIZAOĞLU', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 21615, 0, 21615, 'TL', v_psp_id, v_type_id, '46585', '42633'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 366: EMRE BOLAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE BOLAT', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 43278, 0, 43278, 'TL', v_psp_id, v_type_id, '46443', '42489'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 367: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 360000, 0, 360000, 'TL', v_psp_id, v_type_id, '44543', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 368: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 108, 0, 108, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 369: TAYYİP YALÇIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAYYİP YALÇIN', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '22731', '42397'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 370: EFKAN ALPER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EFKAN ALPER', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -250, 0, -250, 'USD', v_psp_id, v_type_id, '44381', '24411'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 371: ÇÖMER ÇELEBİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÇÖMER ÇELEBİ', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, -10000, 0, -10000, 'TL', v_psp_id, v_type_id, '44672', '24704'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 372: YUSUF SAMİ SAĞINÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF SAMİ SAĞINÇ', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46586', '42634'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 373: YASIN AKOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASIN AKOVA', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 21630, 0, 21630, 'TL', v_psp_id, v_type_id, '46472', '42518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 374: CİHANGİR ŞENGÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHANGİR ŞENGÜL', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 8459, 0, 8459, 'TL', v_psp_id, v_type_id, '44328', '24358'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 375: EMRAH BAHADIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRAH BAHADIR', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46589', '42637'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 376: ŞAHİN EMRE ÇOLAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞAHİN EMRE ÇOLAK', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 19016, 0, 19016, 'TL', v_psp_id, v_type_id, '45585', '41620'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 377: SÜLEYMAN SAMET GÖÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SÜLEYMAN SAMET GÖÇER', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 73000, 0, 73000, 'TL', v_psp_id, v_type_id, '44770', '24803'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 378: GÜLAY ÖZSOY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜLAY ÖZSOY', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 43300, 0, 43300, 'TL', v_psp_id, v_type_id, '46591', '42639'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 379: EFE CAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EFE CAN', v_payment_method_id, '2026-01-16'::timestamptz,
    v_category_id, 8920, 0, 8920, 'TL', v_psp_id, v_type_id, '46056', '42100'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 380: SERVET CESUR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERVET CESUR', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 320, 0, 320, 'USD', v_psp_id, v_type_id, '46596', '42644'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 381: MUHAMMED ERTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ERTEKİN', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 748, 0, 748, 'USD', v_psp_id, v_type_id, '44833', '24867'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 382: SERKAN AYRANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERKAN AYRANCI', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 43200, 0, 43200, 'TL', v_psp_id, v_type_id, '46540', '42588'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 383: YASİN GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YASİN GÜLER', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 21700, 0, 21700, 'TL', v_psp_id, v_type_id, '46593', '42641'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 384: BAYBARS ŞOLT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAYBARS ŞOLT', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46600', '42648'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 385: ENGİN ŞAHİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ENGİN ŞAHİN', v_payment_method_id, '2026-01-17'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46601', '42649'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 386: MEHMET NUR GÜNEŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET NUR GÜNEŞ', v_payment_method_id, '2026-01-18'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46608', '42656'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 387: YAĞIZ KAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAĞIZ KAYA', v_payment_method_id, '2026-01-18'::timestamptz,
    v_category_id, 2000, 0, 2000, 'TL', v_psp_id, v_type_id, '46549', '42597'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 388: YAĞIZ KAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAĞIZ KAYA', v_payment_method_id, '2026-01-18'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '46549', '42597'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 389: EMRAH ÜÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY 10';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRAH ÜÇER', v_payment_method_id, '2026-01-18'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46610', '42658'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 390: ÖZKAN TOPUZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZKAN TOPUZ', v_payment_method_id, '2026-01-18'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46434', '42480'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 391: SÜLEYMAN SAMET GÖÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SÜLEYMAN SAMET GÖÇER', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 82200, 0, 82200, 'TL', v_psp_id, v_type_id, '44770', '24803'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 392: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -95000, 0, -95000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 393: CEREN ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CEREN ÇELİK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 21650, 0, 21650, 'TL', v_psp_id, v_type_id, '46616', '42664'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 394: ENES METİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ENES METİN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -2163, 0, -2163, 'TL', v_psp_id, v_type_id, '45046', '41080'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 395: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 396: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 44000, 0, 44000, 'TL', v_psp_id, v_type_id, '44543', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 397: GÜLEY ÖZSOY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜLEY ÖZSOY', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 86550, 0, 86550, 'TL', v_psp_id, v_type_id, '46591', '42639'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 398: YAKUP AĞGÜN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YAKUP AĞGÜN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '42661', '42662'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 399: SELÇUK KOTO
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELÇUK KOTO', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '45116', '41151'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 400: GÜLŞEN ÇAĞLAYAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜLŞEN ÇAĞLAYAN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46394', '42440'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 401: ALİ İHSAN AŞBAŞARAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ İHSAN AŞBAŞARAN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 86550, 0, 86550, 'TL', v_psp_id, v_type_id, '46584', '42632'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 402: SELMA KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELMA KOÇ', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 116000, 0, 116000, 'TL', v_psp_id, v_type_id, '22489', '42148'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 403: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -379, 0, -379, 'USD', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 404: MAHMUT ALİ ÇOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MAHMUT ALİ ÇOL', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 260000, 0, 260000, 'TL', v_psp_id, v_type_id, '44739', '24772'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 405: MURAT BAZANCİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT BAZANCİR', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 8500, 0, 8500, 'TL', v_psp_id, v_type_id, '43966', '22975'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 406: İBRAHİM DEĞİRMENCİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM DEĞİRMENCİ', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 43378, 0, 43378, 'TL', v_psp_id, v_type_id, '46607', '42655'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 407: MUHAMMED ENES AKTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ENES AKTAŞ', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '45825', '41861'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 408: DERVİŞ KIRMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞ KIRMAZ', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 290, 0, 290, 'USD', v_psp_id, v_type_id, '46628', '42677'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 409: CANER ÖZATİKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CANER ÖZATİKE', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 21650, 0, 21650, 'TL', v_psp_id, v_type_id, '45351', '41386'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 410: MUHAMMET ARİF ORHAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET ARİF ORHAN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 30, 0, 30, 'USD', v_psp_id, v_type_id, '46627', '42675'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 411: İSMAİL ŞİMŞEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL ŞİMŞEK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '45180', '41215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 412: MUHAMMET ARİF ORHAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET ARİF ORHAN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -30, 0, -30, 'USD', v_psp_id, v_type_id, '46627', '42675'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 413: ZEKİYE IRMAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ZEKİYE IRMAK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 21675, 0, 21675, 'TL', v_psp_id, v_type_id, '46625', '42673'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 414: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -7700, 0, -7700, 'TL', v_psp_id, v_type_id, '22804', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 415: SALİH BİLGEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SALİH BİLGEL', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, -3649, 0, -3649, 'USD', v_psp_id, v_type_id, '45036', '41070'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 416: HÜSAM SEVBAN ARIKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSAM SEVBAN ARIKAN', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46474', '42520'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 417: MEHMET KALAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET KALAY', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 16500, 0, 16500, 'TL', v_psp_id, v_type_id, '42062', '42106'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 418: MELİS KONUK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MELİS KONUK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 865500, 0, 865500, 'TL', v_psp_id, v_type_id, '44114', '24134'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 419: RECEP YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RECEP YILMAZ', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 110, 0, 110, 'USD', v_psp_id, v_type_id, '46477', '42523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 420: ONUR KANLIOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR KANLIOĞLU', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 503, 0, 503, 'USD', v_psp_id, v_type_id, '46637', '42687'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 421: ERAY ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERAY ÇELİK', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '44729', '24762'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 422: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-19'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 423: BURCİL KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCİL KOTİL', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 37000, 0, 37000, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 424: AYŞENUR YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYŞENUR YILMAZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -6000, 0, -6000, 'TL', v_psp_id, v_type_id, '44329', '24740'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 425: MELİH ASMA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MELİH ASMA', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -2200, 0, -2200, 'USD', v_psp_id, v_type_id, '45430', '41465'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 426: HATİP HÜSEYIN AKYÜZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATİP HÜSEYIN AKYÜZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -41775, 0, -41775, 'TL', v_psp_id, v_type_id, '46521', '42569'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 427: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 428: NURCAN DEMİRCİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NURCAN DEMİRCİ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 7500, 0, 7500, 'TL', v_psp_id, v_type_id, '46287', '42333'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 429: UĞUR SAĞLAM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞUR SAĞLAM', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46100', '42144'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 430: TAYYİP YALÇIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAYYİP YALÇIN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 22.3, 0, 22.3, 'USD', v_psp_id, v_type_id, '22731', '42397'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 431: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 2300, 0, 2300, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 432: SERVET OKTAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERVET OKTAY', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -45, 0, -45, 'USD', v_psp_id, v_type_id, '44720', '24752'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 433: GAMZE YUDAER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GAMZE YUDAER', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -5000, 0, -5000, 'TL', v_psp_id, v_type_id, '46559', '42607'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 434: MEHMET NUR GÜNEŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET NUR GÜNEŞ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 761, 0, 761, 'USD', v_psp_id, v_type_id, '46608', '42656'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 435: GÖKMEN TAMER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKMEN TAMER', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46354', '42400'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 436: BOĞAÇHAN ULUKAYAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BOĞAÇHAN ULUKAYAOĞLU', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 216500, 0, 216500, 'TL', v_psp_id, v_type_id, '46475', '42521'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 437: FIRAT YILDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FIRAT YILDIZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -150, 0, -150, 'USD', v_psp_id, v_type_id, '46103', '42147'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 438: İBRAHİM KARAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM KARAMAN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '1837', '42405'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 439: MEHMET UĞUR SÜRÜM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET UĞUR SÜRÜM', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '46608', '42656'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 440: OSMAN YASİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OSMAN YASİN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46541', '42589'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 441: ALİ İHSAN AŞBAŞARAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ İHSAN AŞBAŞARAN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 43300, 0, 43300, 'TL', v_psp_id, v_type_id, '46584', '42632'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 442: BORA TEZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BORA TEZER', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46649', '42699'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 443: SİNAN KUZUCU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİNAN KUZUCU', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46652', '42702'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 444: BAYRAM ALİ KOŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAYRAM ALİ KOŞ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 21650, 0, 21650, 'TL', v_psp_id, v_type_id, '46612', '42660'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 445: KAHRAMAN PIRNAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAHRAMAN PIRNAZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46007', '42051'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 446: İYİDOGAN TURGAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İYİDOGAN TURGAY', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46492', '42538'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 447: SUAT BULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SUAT BULUT', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 8700, 0, 8700, 'TL', v_psp_id, v_type_id, '45897', '41937'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 448: BATYR GURBANOV
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BATYR GURBANOV', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46570', '42618'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 449: FURKAN DANACI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN DANACI', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -10382, 0, -10382, 'TL', v_psp_id, v_type_id, '45506', '41541'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 450: RECEP YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RECEP YILMAZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 40000, 0, 40000, 'TL', v_psp_id, v_type_id, '46477', '42523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 451: BELİS YORGANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BELİS YORGANCI', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 3311, 0, 3311, 'USD', v_psp_id, v_type_id, '45313', '41348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 452: MEHMET NUR GÜNEŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET NUR GÜNEŞ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 996.75, 0, 996.75, 'USD', v_psp_id, v_type_id, '46608', '42656'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 453: SİNAN KUZUCU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİNAN KUZUCU', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -5000, 0, -5000, 'TL', v_psp_id, v_type_id, '46652', '42702'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 454: EVLİYA AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EVLİYA AKIN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -39000, 0, -39000, 'TL', v_psp_id, v_type_id, '46560', '42608'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 455: HÜSEYİN KARTA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN KARTA', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -14349, 0, -14349, 'TL', v_psp_id, v_type_id, '44761', '24794'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 456: GAMZE YURDAER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GAMZE YURDAER', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '46559', '42607'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 457: GÜLBAHAR ÖNAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜLBAHAR ÖNAL', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 333, 0, 333, 'USD', v_psp_id, v_type_id, '46479', '42525'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 458: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 459: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 460: MUHAMMET BACAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET BACAK', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 50000, 0, 50000, 'TL', v_psp_id, v_type_id, '46656', '42706'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 461: SAVAŞ AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAVAŞ AKIN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46150', '42195'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 462: NASRETTİN DEMİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NASRETTİN DEMİR', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 86600, 0, 86600, 'TL', v_psp_id, v_type_id, '44166', '24187'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 463: CİHANGİR YENİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHANGİR YENİ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 17327, 0, 17327, 'TL', v_psp_id, v_type_id, '46658', '42708'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 464: ONUR YORUK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR YORUK', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46123', '42167'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 465: SALİH FAKAZLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SALİH FAKAZLI', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 21750, 0, 21750, 'TL', v_psp_id, v_type_id, '46397', '42443'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 466: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 467: HÜSEYİN ONAÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN ONAÇ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 115.16, 0, 115.16, 'USD', v_psp_id, v_type_id, '45509', '41544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 468: FIRAT YILDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FIRAT YILDIZ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 161, 0, 161, 'USD', v_psp_id, v_type_id, '46103', '42147'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 469: İLHAN ELİTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLHAN ELİTAŞ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 1849, 0, 1849, 'USD', v_psp_id, v_type_id, '46524', '42572'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 470: FEYZİ KURT BOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FEYZİ KURT BOĞAN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 599, 0, 599, 'USD', v_psp_id, v_type_id, '46654', '42704'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 471: TETHER ALIM MALİYETİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'TETHER ALIM MALİYETİ', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, -15000, 0, -15000, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 472: MERYEM  RIZAOGLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERYEM  RIZAOGLU', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 58500, 0, 58500, 'TL', v_psp_id, v_type_id, '46585', '42633'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 473: MEHMET SAİD SARIHAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET SAİD SARIHAN', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46604', '42652'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 474: ŞİYAR KEPİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞİYAR KEPİR', v_payment_method_id, '2026-01-20'::timestamptz,
    v_category_id, 8655, 0, 8655, 'TL', v_psp_id, v_type_id, '45898', '41938'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 475: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 16000, 0, 16000, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 476: NAZAN DEMİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAZAN DEMİR', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 86600, 0, 86600, 'TL', v_psp_id, v_type_id, '46655', '42705'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 477: RECEP YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RECEP YILMAZ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '46477', '42523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 478: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 479: BARAN KAYRANCIOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARAN KAYRANCIOĞLU', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 6600, 0, 6600, 'TL', v_psp_id, v_type_id, '46599', '42647'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 480: YUSUF APAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF APAK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '44472', '24503'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 481: TUĞŞAT BAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TUĞŞAT BAŞ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 22460, 0, 22460, 'TL', v_psp_id, v_type_id, '45345', '41380'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 482: RABİYE PARLAK AKTOP
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RABİYE PARLAK AKTOP', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '43882', '22892'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 483: ÇİĞDEM TAYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÇİĞDEM TAYLAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 20550, 0, 20550, 'TL', v_psp_id, v_type_id, '44306', '24336'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 484: MUSTAFA DORUKHAN EROL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA DORUKHAN EROL', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 216.43, 0, 216.43, 'USD', v_psp_id, v_type_id, '46671', '42721'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 485: TAYYİP YALÇIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAYYİP YALÇIN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -9.43, 0, -9.43, 'USD', v_psp_id, v_type_id, '46351', '42397'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 486: NURCAN DEMİRCİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NURCAN DEMİRCİ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -10000, 0, -10000, 'TL', v_psp_id, v_type_id, '46287', '42333'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 487: HATICE YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATICE YILMAZ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '45783', '41818'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 488: ONUR YÖRÜK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR YÖRÜK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '46123', '42167'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 489: KAZIM GENÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAZIM GENÇ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 21650, 0, 21650, 'TL', v_psp_id, v_type_id, '44686', '24718'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 490: SİBEL OCAKCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİBEL OCAKCI', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '45959', '42002'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 491: LEYLA CEYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'LEYLA CEYLAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46672', '42722'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 492: LEYLA CEYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'LEYLA CEYLAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 3000, 0, 3000, 'TL', v_psp_id, v_type_id, '46672', '42722'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 493: KAZIM GENÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAZIM GENÇ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 24075, 0, 24075, 'TL', v_psp_id, v_type_id, '44686', '24718'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 494: ELİF TAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ELİF TAŞ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -4329, 0, -4329, 'TL', v_psp_id, v_type_id, '44471', '24502'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 495: BOĞAÇHAN ULUKAYAOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BOĞAÇHAN ULUKAYAOĞLU', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 152000, 0, 152000, 'TL', v_psp_id, v_type_id, '46475', '42521'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 496: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 497: İSMAİL ALPEREN YİLDİRİM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL ALPEREN YİLDİRİM', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '22645', '42305'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 498: AHMET SELÇUK GÜLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET SELÇUK GÜLER', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46643', '42693'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 499: MUHAMMET MURAT YAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET MURAT YAMAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -1000, 0, -1000, 'TL', v_psp_id, v_type_id, '45754', '41789'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 500: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, -4000, 0, -4000, 'TL', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 501: AYHAN ÖZSOY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, meta_id
  ) values (
    v_org_id, 'AYHAN ÖZSOY', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 86606, 0, 86606, 'TL', v_psp_id, v_type_id, '42639'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 502: İLKER İBRAHİM BALABAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLKER İBRAHİM BALABAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 43000, 0, 43000, 'TL', v_psp_id, v_type_id, '46404', '42450'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 503: AYHAN KIRTAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYHAN KIRTAY', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 299, 0, 299, 'USD', v_psp_id, v_type_id, '46677', '42727'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 504: İSMAİL ŞİMŞEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL ŞİMŞEK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 40000, 0, 40000, 'TL', v_psp_id, v_type_id, '45180', '41215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 505: SELAHATTİN YAPAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELAHATTİN YAPAR', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 450, 0, 450, 'USD', v_psp_id, v_type_id, '46424', '42470'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 506: VOLKAN ÖZDEMİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'VOLKAN ÖZDEMİR', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 90000, 0, 90000, 'TL', v_psp_id, v_type_id, '44982', '41016'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 507: TARKAN YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TARKAN YILDIRIM', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 278.51, 0, 278.51, 'USD', v_psp_id, v_type_id, '45051', '41085'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 508: TARKAN YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TARKAN YILDIRIM', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 274.98, 0, 274.98, 'USD', v_psp_id, v_type_id, '45051', '41085'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 509: GÖKÇE ASLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ASLAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 21680, 0, 21680, 'TL', v_psp_id, v_type_id, '46499', '42546'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 510: FURKAN MEYDANCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN MEYDANCI', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 433690, 0, 433690, 'TL', v_psp_id, v_type_id, '44543', '24574'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 511: NACİ MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NACİ MERT', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 4001, 0, 4001, 'USD', v_psp_id, v_type_id, '46084', '42128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 512: ALPEREN KARABACAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALPEREN KARABACAK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 4360, 0, 4360, 'TL', v_psp_id, v_type_id, '44682', '24714'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 513: ARİF AYAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ARİF AYAN', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 193500, 0, 193500, 'TL', v_psp_id, v_type_id, '45332', '41367'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 514: CEMİL TOPRAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CEMİL TOPRAK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46686', '42736'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 515: NACİ MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NACİ MERT', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46084', '42128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 516: İSMAİL YILDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL YILDIZ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 21750, 0, 21750, 'TL', v_psp_id, v_type_id, '45974', '42017'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 517: MERT AYOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERT AYOĞLU', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46484', '42530'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 518: NACİ MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NACİ MERT', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46084', '42128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 519: NACİ MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NACİ MERT', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 60000, 0, 60000, 'TL', v_psp_id, v_type_id, '46084', '42128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 520: BURCU KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU KOTİL', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 40155, 0, 40155, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 521: SERVET CESUR TIRYAKI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERVET CESUR TIRYAKI', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '46596', '42644'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 522: ÜMİT SELİM ALPAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÜMİT SELİM ALPAY', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '46674', '42724'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 523: SELAHADDİN YAPAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELAHADDİN YAPAR', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 2830, 0, 2830, 'USD', v_psp_id, v_type_id, '46424', '42470'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 524: BERKAY KARAADUÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAY KARAADUÇ', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 4360, 0, 4360, 'TL', v_psp_id, v_type_id, '46682', '42732'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 525: MURAT ÖZİŞLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZİŞLER', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 2204, 0, 2204, 'USD', v_psp_id, v_type_id, '45917', '41958'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 526: TALHA KEMAL ABAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TALHA KEMAL ABAK', v_payment_method_id, '2026-01-21'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '42184', '22542'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 527: BAYRAM MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAYRAM MERT', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -93000, 0, -93000, 'TL', v_psp_id, v_type_id, '44349', '24379'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 528: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -6500, 0, -6500, 'TL', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 529: GÖKHAN ÜNAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKHAN ÜNAL', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -194, 0, -194, 'USD', v_psp_id, v_type_id, '46065', '42109'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 530: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 531: EMANET YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMANET YILMAZ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 25150, 0, 25150, 'TL', v_psp_id, v_type_id, '44379', '24409'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 532: FATMA PEKER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATMA PEKER', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 21650, 0, 21650, 'TL', v_psp_id, v_type_id, '45453', '41488'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 533: SARKAN SARTAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SARKAN SARTAN', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46635', '42685'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 534: ONUR ALSAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ALSAN', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -14000, 0, -14000, 'TL', v_psp_id, v_type_id, '44487', '24518'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 535: PELİN KARABEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PELİN KARABEL', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '44191', '24215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 536: EFE CAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EFE CAN', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -8300, 0, -8300, 'TL', v_psp_id, v_type_id, '46056', '42100'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 537: HALIL ARAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALIL ARAT', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 21500, 0, 21500, 'TL', v_psp_id, v_type_id, '46381', '42427'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 538: AHMET EREN DİNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET EREN DİNÇ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46669', '42719'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 539: ÇAĞLAR HÜNERÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÇAĞLAR HÜNERÖZ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, -40000, 0, -40000, 'TL', v_psp_id, v_type_id, '44589', '24620'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 540: CEMİL TOPRAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CEMİL TOPRAK', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46686', '42736'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 541: ARZU SERTKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ARZU SERTKAYA', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 11000, 0, 11000, 'TL', v_psp_id, v_type_id, '46699', '42749'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 542: DERVİŞ KIRMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞ KIRMAZ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 1500, 0, 1500, 'USD', v_psp_id, v_type_id, '46628', '42677'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 543: ÜMİT PORDEL KHAKİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÜMİT PORDEL KHAKİ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 4360, 0, 4360, 'TL', v_psp_id, v_type_id, '46206', '42252'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 544: HASAN ÇIFTÇI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN ÇIFTÇI', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46099', '42143'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 545: CABİR SARAÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CABİR SARAÇ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 199, 0, 199, 'USD', v_psp_id, v_type_id, '46694', '42744'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 546: SAVAŞ AKIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAVAŞ AKIN', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46150', '42195'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 547: OMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER EMRE AKKAR', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 548: OMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER EMRE AKKAR', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 549: OMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER EMRE AKKAR', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 550: OMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER EMRE AKKAR', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 70000, 0, 70000, 'TL', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 551: OMER EMRE AKKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OMER EMRE AKKAR', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 80000, 0, 80000, 'TL', v_psp_id, v_type_id, '46420', '42466'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 552: SİNAN BÜYÜKEREN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİNAN BÜYÜKEREN', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 43373, 0, 43373, 'TL', v_psp_id, v_type_id, '46707', '42757'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 553: MUHAMMED ENES GİRAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ENES GİRAY', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '46702', '42752'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 554: MUHAMMED ENES GİRAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ENES GİRAY', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 28500, 0, 28500, 'TL', v_psp_id, v_type_id, '46702', '42752'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 555: MUHAMMED ENES AKTAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ENES AKTAŞ', v_payment_method_id, '2026-01-22'::timestamptz,
    v_category_id, 5200, 0, 5200, 'TL', v_psp_id, v_type_id, '45825', '41861'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 556: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -60, 0, -60, 'USD', v_psp_id, v_type_id, '42192', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 557: ERAY ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERAY ÇELİK', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '44729', '24762'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 558: BAYRAM MERT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BAYRAM MERT', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '44349', '24379'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 559: KEREM KARA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KEREM KARA', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46668', '42718'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 560: SELMA KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELMA KOÇ', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 125000, 0, 125000, 'TL', v_psp_id, v_type_id, '46104', '42148'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 561: HASAN MERT SAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT SAVAK', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -7700, 0, -7700, 'TL', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 562: DERVİŞHAN YAŞLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DERVİŞHAN YAŞLI', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -42, 0, -42, 'USD', v_psp_id, v_type_id, '46233', '42279'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 563: ABDULLAH YÜKSEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDULLAH YÜKSEL', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 87000, 0, 87000, 'TL', v_psp_id, v_type_id, '45492', '41527'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 564: MUHAMMED ÖMER YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ÖMER YILMAZ', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 49000, 0, 49000, 'TL', v_psp_id, v_type_id, '42477', '42477'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 565: FERHAT KADİR EROĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FERHAT KADİR EROĞLU', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -45000, 0, -45000, 'TL', v_psp_id, v_type_id, '46384', '42430'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 566: CEREN ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CEREN ÇELİK', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 449.36, 0, 449.36, 'USD', v_psp_id, v_type_id, '46616', '42664'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 567: PINAR KURAĞI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PINAR KURAĞI', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '45450', '41485'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 568: BEDİRHAN ERDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BEDİRHAN ERDOĞAN', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 174.75, 0, 174.75, 'USD', v_psp_id, v_type_id, '46690', '42740'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 569: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 570: YUSUF YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'YUSUF YILDIRIM', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -1000, 0, -1000, 'USD', v_psp_id, v_type_id, '45047', '41081'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 571: MUSTAFA DORUKHAN EROL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA DORUKHAN EROL', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46671', '42721'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 572: NAİLE FELEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAİLE FELEK', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, -8700, 0, -8700, 'TL', v_psp_id, v_type_id, '43362', '22695'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 573: BURCU KOTİL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BURCU KOTİL', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 32500, 0, 32500, 'TL', v_psp_id, v_type_id, '1888', '42560'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 574: SİBEL OCAKCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİBEL OCAKCI', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 60000, 0, 60000, 'TL', v_psp_id, v_type_id, '45959', '42002'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 575: FATİH COŞKUN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH COŞKUN', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '43982', '22992'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 576: MURAT ÇIMEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÇIMEN', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '45399', '41434'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 577: BARIŞ EGE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARIŞ EGE', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 30000, 0, 30000, 'USD', v_psp_id, v_type_id, '44396', '24426'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 578: NAZAN DEMIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAZAN DEMIR', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 76000, 0, 76000, 'TL', v_psp_id, v_type_id, '46655', '42705'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 579: NAZAN DEMIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAZAN DEMIR', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 100000, 0, 100000, 'TL', v_psp_id, v_type_id, '46655', '42705'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 580: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 581: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 922, 0, 922, 'USD', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 582: TİMUR ORAKÇI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TİMUR ORAKÇI', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 187, 0, 187, 'USD', v_psp_id, v_type_id, '46722', '42772'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 583: MİTHAT HARRAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MİTHAT HARRAN', v_payment_method_id, '2026-01-23'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46723', '42773'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 584: FARUK UMUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FARUK UMUT', v_payment_method_id, '2026-01-24'::timestamptz,
    v_category_id, 9000, 0, 9000, 'TL', v_psp_id, v_type_id, '46602', '42650'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 585: CİHANGİR TURANOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHANGİR TURANOĞLU', v_payment_method_id, '2026-01-24'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '44399', '24429'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 586: KEREM AĞCA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KEREM AĞCA', v_payment_method_id, '2026-01-25'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46687', '42737'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 587: SÖNMEZ SARIBOĞA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SÖNMEZ SARIBOĞA', v_payment_method_id, '2026-01-25'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46735', '42785'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 588: İLYAS ÇALIŞKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLYAS ÇALIŞKAN', v_payment_method_id, '2026-01-25'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '46496', '42542'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 589: ALİ RIZA BAKİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ RIZA BAKİ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 44200, 0, 44200, 'TL', v_psp_id, v_type_id, '44116', '24136'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 590: ENGİN AYKAÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ENGİN AYKAÇ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 21715, 0, 21715, 'TL', v_psp_id, v_type_id, '46717', '42767'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 591: İBRAHİM KARAGÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM KARAGÜL', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '45406', '41441'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 592: KAZIM GENÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KAZIM GENÇ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '44686', '24718'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 593: SALİH FAKAZLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SALİH FAKAZLI', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -92, 0, -92, 'USD', v_psp_id, v_type_id, '46397', '42443'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 594: ENES METİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ENES METİN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '45046', '41080'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 595: SIYAR KEPIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SIYAR KEPIR', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '45898', '41938'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 596: AYHAN KIRTAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYHAN KIRTAY', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 223.27, 0, 223.27, 'USD', v_psp_id, v_type_id, '46677', '42727'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 597: ADEM KARAKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ADEM KARAKAYA', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '24312', '24312'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 598: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 49000, 0, 49000, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 599: ADEM KARAKAYA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ADEM KARAKAYA', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 1700, 0, 1700, 'TL', v_psp_id, v_type_id, '44284', '24312'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 600: FATİH İŞLEYEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH İŞLEYEN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -16500, 0, -16500, 'TL', v_psp_id, v_type_id, '45647', '41682'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 601: MEHMET CAN AYKIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET CAN AYKIR', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46500', '42547'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 602: ALPER ÇITIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALPER ÇITIR', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46512', '42559'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 603: ŞERAFETTİN ÖZTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ŞERAFETTİN ÖZTÜRK', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -332.38, 0, -332.38, 'USD', v_psp_id, v_type_id, '45607', '41642'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 604: AYHAN BÜYÜK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYHAN BÜYÜK', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 499, 0, 499, 'USD', v_psp_id, v_type_id, '46462', '42508'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 605: ÖMER UZUN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖMER UZUN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -43377, 0, -43377, 'TL', v_psp_id, v_type_id, '1993', '24074'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 606: SELAHATTİN YAPAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELAHATTİN YAPAR', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 200000, 0, 200000, 'TL', v_psp_id, v_type_id, '46424', '42470'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 607: ABDURRAHMAN YASASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YASASIN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 133500, 0, 133500, 'TL', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 608: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 609: AYŞENUR YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYŞENUR YILMAZ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -6600, 0, -6600, 'TL', v_psp_id, v_type_id, '44708', '24740'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 610: KEREM ÜNLÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KEREM ÜNLÜ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46749', '42799'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 611: HAKAN ÖZTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HAKAN ÖZTÜRK', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -50765, 0, -50765, 'TL', v_psp_id, v_type_id, '45653', '41688'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 612: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 976000, 0, 976000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 613: SEDAT ŞAHİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEDAT ŞAHİN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 21700, 0, 21700, 'TL', v_psp_id, v_type_id, '46743', '42793'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 614: MUSTAN DEMİRKOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAN DEMİRKOL', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46760', '42810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 615: MEHMET GÜNDÜZOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET GÜNDÜZOĞLU', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '46762', '42813'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 616: EROL TURGUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EROL TURGUT', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 12500, 0, 12500, 'TL', v_psp_id, v_type_id, '45576', '41611'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 617: CİHANGİR YENİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CİHANGİR YENİ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '46658', '42708'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 618: SELİN ATAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SELİN ATAŞ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 800000, 0, 800000, 'TL', v_psp_id, v_type_id, '43986', '42811'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 619: İSA ERDEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSA ERDEN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 8200, 0, 8200, 'TL', v_psp_id, v_type_id, '46726', '42776'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 620: CEMİL DEMİRDAĞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CEMİL DEMİRDAĞ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46767', '42818'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 621: TRX ALIM MALİYETİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#70 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'TRX ALIM MALİYETİ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, -1540, 0, -1540, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 622: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 9000, 0, 9000, 'TL', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 623: ÖZLEM YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZLEM YILMAZ', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46771', '42822'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 624: GÜRİ ESMER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜRİ ESMER', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 22, 0, 22, 'USD', v_psp_id, v_type_id, '44655', '24686'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 625: İBRAHİM BALANTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM BALANTEKİN', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '46733', '42783'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 626: GÜRİ ESMER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜRİ ESMER', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 80, 0, 80, 'USD', v_psp_id, v_type_id, '44655', '24686'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 627: FURKAN AYKANAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FURKAN AYKANAT', v_payment_method_id, '2026-01-26'::timestamptz,
    v_category_id, 3000, 0, 3000, 'TL', v_psp_id, v_type_id, '46485', '42531'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 628: BATUHAN YAPAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BATUHAN YAPAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46775', '42826'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 629: EMRE DİNÇER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE DİNÇER', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '45405', '41440'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 630: HASAN MERT SAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT SAVAK', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -101, 0, -101, 'USD', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 631: ERAY MUSLUKAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERAY MUSLUKAL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -20000, 0, -20000, 'TL', v_psp_id, v_type_id, '44831', '24865'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 632: HALİSE CANASLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİSE CANASLAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -100000, 0, -100000, 'TL', v_psp_id, v_type_id, '44018', '24029'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 633: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 1497000, 0, 1497000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 634: MİKAİL SANDAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MİKAİL SANDAL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -1000, 0, -1000, 'USD', v_psp_id, v_type_id, '44921', '24955'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 635: OKAN ÖNER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'OKAN ÖNER', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -39, 0, -39, 'USD', v_psp_id, v_type_id, '46379', '42425'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 636: MURAT ARSLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ARSLAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44299', '24329'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 637: MURAT ARSLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ARSLAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '44299', '24329'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 638: GAMZE YURDAER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GAMZE YURDAER', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 45000, 0, 45000, 'TL', v_psp_id, v_type_id, '46559', '42607'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 639: MUHAMMET KIZMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET KIZMAZ', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 43400, 0, 43400, 'TL', v_psp_id, v_type_id, '46778', '42829'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 640: GULARA SAMADARAVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'ÖDEME';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'GULARA SAMADARAVA', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -32800, 0, -32800, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 641: GULARA SAMADARAVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'ÖDEME';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'GULARA SAMADARAVA', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -30000, 0, -30000, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 642: AHMET EREN DİNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET EREN DİNÇ', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -50, 0, -50, 'USD', v_psp_id, v_type_id, '46669', '42719'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 643: ERHAN BAYOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERHAN BAYOL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -86375, 0, -86375, 'TL', v_psp_id, v_type_id, '43968', '22977'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 644: İSA ERDEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSA ERDEN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -188, 0, -188, 'USD', v_psp_id, v_type_id, '46726', '42776'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 645: PELİN KARABEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PELİN KARABEL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '44191', '24215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 646: MUHAMMET BACAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMET BACAK', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, -105, 0, -105, 'USD', v_psp_id, v_type_id, '46656', '42706'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 647: HAKAN ÇAKMAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HAKAN ÇAKMAK', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 86807, 0, 86807, 'TL', v_psp_id, v_type_id, '45472', '41507'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 648: BARIŞ AKGÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARIŞ AKGÜL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46714', '42764'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 649: HASAN YAYMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN YAYMAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46728', '42778'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 650: BARIŞ AKGÜL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BARIŞ AKGÜL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46714', '42764'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 651: HÜSEYİN MUTLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN MUTLU', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 105, 0, 105, 'USD', v_psp_id, v_type_id, '44954', '24988'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 652: MEHMET CAN AYKIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET CAN AYKIR', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46500', '42547'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 653: VEDAT DİNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'VEDAT DİNÇ', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 13050, 0, 13050, 'TL', v_psp_id, v_type_id, '46784', '42835'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 654: PELİN KARABEL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'PELİN KARABEL', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '44191', '24215'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 655: ÖZLEM KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZLEM KOÇ', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 12000, 0, 12000, 'TL', v_psp_id, v_type_id, '46358', '42404'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 656: EMRE AYKUTALPOĞLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE AYKUTALPOĞLU', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46782', '42833'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 657: İBRAHİM ZENGİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM ZENGİN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 100, 0, 100, 'USD', v_psp_id, v_type_id, '42260', '22619'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 658: HÜSEYİN GAMTÜRK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HÜSEYİN GAMTÜRK', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 1475, 0, 1475, 'USD', v_psp_id, v_type_id, '44189', '24213'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 659: METIN USLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'METIN USLU', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 60000, 0, 60000, 'TL', v_psp_id, v_type_id, '44555', '24586'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 660: AYSEGÜL MERAN BAYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYSEGÜL MERAN BAYLAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 43044, 0, 43044, 'TL', v_psp_id, v_type_id, '45094', '41128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 661: SONMEZ SARIBOGA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SONMEZ SARIBOGA', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 39000, 0, 39000, 'TL', v_psp_id, v_type_id, '46735', '42785'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 662: KADİR CAN AKINCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'KADİR CAN AKINCI', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 4400, 0, 4400, 'TL', v_psp_id, v_type_id, '46750', '42800'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 663: İBRAHİM SATAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM SATAN', v_payment_method_id, '2026-01-27'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46795', '42846'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 664: SERTUĞ ERDENİZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERTUĞ ERDENİZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46765', '42816'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 665: NECAT BAYVAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NECAT BAYVAL', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 5230, 0, 5230, 'TL', v_psp_id, v_type_id, '46343', '42389'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 666: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -49000, 0, -49000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 667: ERAY ÇELİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERAY ÇELİK', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -17322, 0, -17322, 'TL', v_psp_id, v_type_id, '44729', '24762'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 668: ÖZLEM KOÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZLEM KOÇ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 49000, 0, 49000, 'TL', v_psp_id, v_type_id, '46358', '42404'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 669: ALİ YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ YILMAZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 200, 0, 200, 'USD', v_psp_id, v_type_id, '45535', '41570'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 670: EMRE ERKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EMRE ERKE', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 113.62, 0, 113.62, 'USD', v_psp_id, v_type_id, '46235', '42281'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 671: SUAT BULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SUAT BULUT', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21700, 0, 21700, 'TL', v_psp_id, v_type_id, '45897', '41937'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 672: İSMAİL YILDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL YILDIZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21750, 0, 21750, 'TL', v_psp_id, v_type_id, '45974', '42017'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 673: MUSTAFA ÖZPOLAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA ÖZPOLAT', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 7000, 0, 7000, 'USD', v_psp_id, v_type_id, '46157', '42202'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 674: BİLAL KURU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, meta_id
  ) values (
    v_org_id, 'BİLAL KURU', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 4200, 0, 4200, 'TL', v_psp_id, v_type_id, '42848'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 675: İBRAHİM YÜZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM YÜZER', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 34600, 0, 34600, 'TL', v_psp_id, v_type_id, '45798', '41833'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 676: MUHAMMED ERTEKİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUHAMMED ERTEKİN', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 350, 0, 350, 'USD', v_psp_id, v_type_id, '44833', '24867'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 677: MUSTAN DEMİRKOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAN DEMİRKOL', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 8750, 0, 8750, 'TL', v_psp_id, v_type_id, '46760', '42810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 678: SAMET KÖYLÜ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET KÖYLÜ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46801', '42852'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 679: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 680: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 1000000, 0, 1000000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 681: GÖKMEN TAMER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKMEN TAMER', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 8700, 0, 8700, 'TL', v_psp_id, v_type_id, '46354', '42400'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 682: BORA TEZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BORA TEZER', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 14000, 0, 14000, 'TL', v_psp_id, v_type_id, '46649', '42699'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 683: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 526000, 0, 526000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 684: LEYLA CEYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'LEYLA CEYLAN', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21000, 0, 21000, 'TL', v_psp_id, v_type_id, '41807', '42722'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 685: DUYGU KARA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'DUYGU KARA', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46713', '42763'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 686: ALİ ZIVLAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ ZIVLAK', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21700, 0, 21700, 'TL', v_psp_id, v_type_id, '46300', '42346'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 687: BATUHAN YAPAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BATUHAN YAPAN', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -115, 0, -115, 'USD', v_psp_id, v_type_id, '46775', '42826'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 688: TUĞŞAT BAŞ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TUĞŞAT BAŞ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -9594, 0, -9594, 'TL', v_psp_id, v_type_id, '45345', '41380'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 689: MUSTAFA DEMİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA DEMİR', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -325.51, 0, -325.51, 'USD', v_psp_id, v_type_id, '45347', '41382'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 690: HATİCE YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATİCE YILMAZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21700, 0, 21700, 'TL', v_psp_id, v_type_id, '45783', '41818'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 691: ÖNDER DANACI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖNDER DANACI', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '46798', '42849'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 692: HASAN SERİNKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN SERİNKAN', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 598, 0, 598, 'USD', v_psp_id, v_type_id, '46158', '42203'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 693: EBUBEKİR KEMİK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EBUBEKİR KEMİK', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -9985, 0, -9985, 'TL', v_psp_id, v_type_id, '44658', '24690'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 694: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 7000, 0, 7000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 695: BERKAN GÖĞTEPE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAN GÖĞTEPE', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -8683, 0, -8683, 'TL', v_psp_id, v_type_id, '46302', '42348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 696: SALİH FAKAZLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SALİH FAKAZLI', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '46397', '42443'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 697: BOGACHAN ULUKAYAOGLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BOGACHAN ULUKAYAOGLU', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 450000, 0, 450000, 'TL', v_psp_id, v_type_id, '46475', '42521'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 698: RECEP YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'RECEP YILMAZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 1000, 0, 1000, 'USD', v_psp_id, v_type_id, '46477', '42523'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 699: ÖNDER DANACI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖNDER DANACI', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 4800, 0, 4800, 'TL', v_psp_id, v_type_id, '42207', '22566'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 700: ONUR ERDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ERDOĞAN', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '46798', '42849'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 701: BERKAN GÖĞTEPE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAN GÖĞTEPE', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21707, 0, 21707, 'TL', v_psp_id, v_type_id, '46302', '42348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 702: SEÇİL KAYGISIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEÇİL KAYGISIZ', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 14000, 0, 14000, 'TL', v_psp_id, v_type_id, '46805', '42856'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 703: ERDAL ÇAKAR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERDAL ÇAKAR', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44539', '24570'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 704: ARDA ÖNDER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ARDA ÖNDER', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -500, 0, -500, 'USD', v_psp_id, v_type_id, '45325', '41360'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 705: MURAT ÖZİŞLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZİŞLER', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 4398, 0, 4398, 'USD', v_psp_id, v_type_id, '45917', '41958'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 706: BEDİRHAN BEDRAM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BEDİRHAN BEDRAM', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 43480, 0, 43480, 'TL', v_psp_id, v_type_id, '44400', '24430'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 707: SIBEL  OCAKCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SIBEL  OCAKCI', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, 21660, 0, 21660, 'TL', v_psp_id, v_type_id, '45959', '42002'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 708: MUSTAN DEMİRKOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAN DEMİRKOL', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 8700, 0, 8700, 'TL', v_psp_id, v_type_id, '46760', '42810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 709: GÖKÇE ASLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ASLAN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '46499', '42546'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 710: İSMAİL YILDIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSMAİL YILDIZ', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 30500, 0, 30500, 'TL', v_psp_id, v_type_id, '45974', '42017'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 711: MERT URUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERT URUT', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46820', '42871'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 712: MURAT BAZANCİR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT BAZANCİR', v_payment_method_id, '2026-01-28'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '43966', '22975'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 713: SERHAT YILDIRIM
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SERHAT YILDIRIM', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46425', '42471'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 714: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, -101, 0, -101, 'USD', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 715: SEÇİL KAYGISIZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEÇİL KAYGISIZ', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, -55, 0, -55, 'USD', v_psp_id, v_type_id, '46423', '42856'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 716: İZZETTİN İNAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İZZETTİN İNAL', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, -300, 0, -300, 'USD', v_psp_id, v_type_id, '46348', '42394'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 717: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 8684, 0, 8684, 'TL', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 718: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 34800, 0, 34800, 'TL', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 719: MUSTAN DEMİRKOL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAN DEMİRKOL', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 8700, 0, 8700, 'TL', v_psp_id, v_type_id, '46760', '42810'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 720: MUSTAFA KAHRAMAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA KAHRAMAN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 102.5, 0, 102.5, 'USD', v_psp_id, v_type_id, '46776', '42827'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 721: MİTHAT HARRAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MİTHAT HARRAN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, -435, 0, -435, 'USD', v_psp_id, v_type_id, '46723', '42773'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 722: ABDULLAH TUSKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDULLAH TUSKAN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46823', '42874'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 723: SEDAT SAHIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEDAT SAHIN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 895.77, 0, 895.77, 'USD', v_psp_id, v_type_id, '46743', '42793'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 724: ZEYNEP AYDIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ZEYNEP AYDIN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '46740', '42790'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 725: MURAT ÖZER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MURAT ÖZER', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 52000, 0, 52000, 'TL', v_psp_id, v_type_id, '46303', '42349'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 726: SEDAT ŞAHIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEDAT ŞAHIN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 11000, 0, 11000, 'TL', v_psp_id, v_type_id, '46743', '42793'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 727: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 6000, 0, 6000, 'TL', v_psp_id, v_type_id, '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 728: VEDAT DİNÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'VEDAT DİNÇ', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 17400, 0, 17400, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 729: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 730: SİBEL OCAKCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SİBEL OCAKCI', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 43400, 0, 43400, 'TL', v_psp_id, v_type_id, '45959', '42002'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 731: ILKER BIRINCI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ILKER BIRINCI', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 9000, 0, 9000, 'TL', v_psp_id, v_type_id, '44791', '24824'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 732: MERYEM RIZAOGLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERYEM RIZAOGLU', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 65200, 0, 65200, 'TL', v_psp_id, v_type_id, '46585', '42633'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 733: EYÜP GÜNEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EYÜP GÜNEN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '45234', '41269'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 734: EYÜP GÜNEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'EYÜP GÜNEN', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 19, 0, 19, 'USD', v_psp_id, v_type_id, '45234', '41269'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 735: MESUT KORKMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MESUT KORKMAZ', v_payment_method_id, '2026-01-29'::timestamptz,
    v_category_id, 37000, 0, 37000, 'TL', v_psp_id, v_type_id, '44563', '24594'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 736: UĞURCAN UYSAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'UĞURCAN UYSAL', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 6558, 0, 6558, 'TL', v_psp_id, v_type_id, '46791', '42842'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 737: İSA ERDEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İSA ERDEN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '46726', '42776'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 738: ERAY MUSLUKAL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERAY MUSLUKAL', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '44831', '24865'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 739: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '45900', '41940'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 740: HASAN ÇİFTÇİ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, meta_id
  ) values (
    v_org_id, 'HASAN ÇİFTÇİ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, -15000, 0, -15000, 'TL', v_psp_id, v_type_id, '42143'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 741: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 6000, 0, 6000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 742: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 743: MEHMET GÜRCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET GÜRCAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 41900, 0, 41900, 'TL', v_psp_id, v_type_id, '46306', '42352'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 744: İLYAS ÇALIŞKAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İLYAS ÇALIŞKAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 222.51, 0, 222.51, 'USD', v_psp_id, v_type_id, '46496', '42542'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 745: HASAN MERT ŞAVAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN MERT ŞAVAK', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, -190, 0, -190, 'USD', v_psp_id, v_type_id, '46423', '42469'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 746: LEVENT DEMİRHAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'LEVENT DEMİRHAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 515.79, 0, 515.79, 'USD', v_psp_id, v_type_id, '46829', '42880'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 747: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 748: TAHİR ENGİN NAMLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TAHİR ENGİN NAMLI', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 500, 0, 500, 'USD', v_psp_id, v_type_id, '46129', '42173'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 749: SEDAT ŞAHİN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SEDAT ŞAHİN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 324.53, 0, 324.53, 'USD', v_psp_id, v_type_id, '46743', '42793'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 750: AHMET YAPÇA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YAPÇA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, -21000, 0, -21000, 'TL', v_psp_id, v_type_id, '46497', '42544'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 751: AYŞEGÜL MERAN BAYLAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AYŞEGÜL MERAN BAYLAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 60000, 0, 60000, 'TL', v_psp_id, v_type_id, '45094', '41128'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 752: ERSEL CİNKILIÇ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '70 BLOKE';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'BLOKE HESAP';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ERSEL CİNKILIÇ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46569', '42617'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 753: SALİH FAKAZLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SALİH FAKAZLI', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, -349, 0, -349, 'USD', v_psp_id, v_type_id, '46397', '42443'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 754: ÜMİT SELİM ALPAY
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÜMİT SELİM ALPAY', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 25000, 0, 25000, 'TL', v_psp_id, v_type_id, '46674', '42724'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 755: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 20000, 0, 20000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 756: CANBERK FATİH
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'CANBERK FATİH', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 43500, 0, 43500, 'TL', v_psp_id, v_type_id, '44593', '24624'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 757: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 758: HAKAN ÇAKMAK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HAKAN ÇAKMAK', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 217492, 0, 217492, 'TL', v_psp_id, v_type_id, '45472', '41507'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 759: HATİCE YILMAZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HATİCE YILMAZ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 21800, 0, 21800, 'TL', v_psp_id, v_type_id, '45783', '41818'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 760: MEHMET ALİ BAYINDIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET ALİ BAYINDIR', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 23000, 0, 23000, 'TL', v_psp_id, v_type_id, '46110', '42154'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 761: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 762: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'ÇEKME';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, -100, 0, -100, 'USD', v_psp_id, v_type_id, '42680', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 763: TUGAY TEZCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'TUGAY TEZCAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 300, 0, 300, 'USD', v_psp_id, v_type_id, '46835', '42886'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 764: MELİH ASMA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MELİH ASMA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 700, 0, 700, 'USD', v_psp_id, v_type_id, '45430', '41465'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 765: ALİ İHSAN AŞBARAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALİ İHSAN AŞBARAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 88000, 0, 88000, 'TL', v_psp_id, v_type_id, '46584', '42632'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 766: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id, '42464', '22798'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 767: ONUR ERDOGAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ERDOGAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '46067', '42111'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 768: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 1000000, 0, 1000000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 769: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 1100000, 0, 1100000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 770: HALİL ARAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HALİL ARAT', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 8700, 0, 8700, 'TL', v_psp_id, v_type_id, '46381', '42427'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 771: BERKAN GOGTEPE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'BERKAN GOGTEPE', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10875, 0, 10875, 'TL', v_psp_id, v_type_id, '22047', '22348'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 772: NAİLE FELEK
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'NAİLE FELEK', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 8715, 0, 8715, 'TL', v_psp_id, v_type_id, '42362', '22695'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 773: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 998953, 0, 998953, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 774: MERYEM RIZAOGLU
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MERYEM RIZAOGLU', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 118000, 0, 118000, 'TL', v_psp_id, v_type_id, '46838', '42633'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 775: SAMET YESIL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET YESIL', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46308', '42354'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 776: SAMET YESIL
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAMET YESIL', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46308', '42354'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 777: ASLI KARABULUT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id
  ) values (
    v_org_id, 'ASLI KARABULUT', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 4500, 0, 4500, 'TL', v_psp_id, v_type_id
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 778: GÖKÇE ELİF KARAGÖZ
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÖKÇE ELİF KARAGÖZ', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 1250000, 0, 1250000, 'TL', v_psp_id, v_type_id, '45772', '41807'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 779: GÜNEŞ GÜVENENLER
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'GÜNEŞ GÜVENENLER', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10000, 0, 10000, 'TL', v_psp_id, v_type_id, '46708', '42758'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 780: ABDURRAHMAN YAŞASIN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ABDURRAHMAN YAŞASIN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 99980, 0, 99980, 'TL', v_psp_id, v_type_id, '45978', '42021'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 781: ÖZKAN VARLI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ÖZKAN VARLI', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 4350, 0, 4350, 'TL', v_psp_id, v_type_id, '44561', '24592'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 782: ONUR ERDOĞAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ONUR ERDOĞAN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 13000, 0, 13000, 'TL', v_psp_id, v_type_id, '46067', '42111'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 783: FATİH İŞLEYEN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'FATİH İŞLEYEN', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 15000, 0, 15000, 'TL', v_psp_id, v_type_id, '45647', '41682'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 784: MUSTAFA OZPOLAT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'Tether';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = 'TETHER';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MUSTAFA OZPOLAT', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 10000, 0, 10000, 'USD', v_psp_id, v_type_id, '46157', '42202'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 785: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 9000, 0, 9000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 786: AHMET YALOVA
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'AHMET YALOVA', v_payment_method_id, '2026-01-30'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46147', '42192'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 787: SAFAK BAYCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAFAK BAYCAN', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 30000, 0, 30000, 'TL', v_psp_id, v_type_id, '46256', '42302'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 788: ALTAN TÖKE
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'ALTAN TÖKE', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 8000, 0, 8000, 'TL', v_psp_id, v_type_id, '46631', '42680'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 789: HASAN SARI
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'HASAN SARI', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 22000, 0, 22000, 'TL', v_psp_id, v_type_id, '46325', '42371'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 790: MEHMET CAN AYKIR
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'MEHMET CAN AYKIR', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 5000, 0, 5000, 'TL', v_psp_id, v_type_id, '46500', '42547'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 791: SAFAK BAYCAN
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'SAFAK BAYCAN', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 13500, 0, 13500, 'TL', v_psp_id, v_type_id, '46256', '42302'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  -- Row 792: İBRAHİM BAYYURT
  select id into v_payment_method_id from public.payment_methods where organization_id = v_org_id and name = 'BANKA';
  select id into v_category_id from public.transfer_categories where organization_id = v_org_id and name = 'YATIRIM';
  select id into v_psp_id from public.psps where organization_id = v_org_id and name = '#72 CRYPPAY';
  select id into v_type_id from public.transfer_types where organization_id = v_org_id and name = 'MÜŞTERİ';
  
  insert into public.transfers (
    organization_id, full_name, payment_method_id, transfer_date, 
    category_id, amount, commission, net, currency, psp_id, type_id, crm_id, meta_id
  ) values (
    v_org_id, 'İBRAHİM BAYYURT', v_payment_method_id, '2026-01-31'::timestamptz,
    v_category_id, 8685, 0, 8685, 'TL', v_psp_id, v_type_id, '45223', '41258'
  );

  v_counter := v_counter + 1;
  if v_counter % 100 = 0 then
    raise notice 'Imported % transfers...', v_counter;
  end if;

  raise notice 'Successfully imported % transfers from OCAK CSV', v_counter;

exception
  when others then
    raise notice 'Error at row %: %', v_counter + 2, SQLERRM;
    raise;
end $$;
