-- 113_ozet_summary.sql
-- Cross-PSP monthly ÖZET summary RPC
-- Returns daily aggregates for ALL active PSPs in one call,
-- enabling the frontend to build the full ÖZET grid
-- (DEVİR, deposits, withdrawals, commission, net, settlement, KASA TOP, finans %).

CREATE OR REPLACE FUNCTION public.get_ozet_summary(
  _org_id uuid,
  _year   int,
  _month  int
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
SET timezone = 'Europe/Istanbul'
AS $$
DECLARE
  _start date;
  _end   date;
  _result json;
BEGIN
  _start := make_date(_year, _month, 1);
  _end   := (_start + interval '1 month')::date;

  WITH
  /* ── Active PSPs for this org ─────────────────────────────────── */
  org_psps AS (
    SELECT id AS psp_id, name AS psp_name, commission_rate,
           coalesce(initial_balance, 0) AS initial_balance
    FROM   public.psps
    WHERE  organization_id = _org_id
      AND  is_active = true
    ORDER  BY name
  ),

  /* ── All calendar days in the month ───────────────────────────── */
  cal AS (
    SELECT d::date AS day
    FROM   generate_series(_start, _end - 1, '1 day'::interval) d
  ),

  /* ── Daily transfer aggregates per PSP ────────────────────────── */
  transfers_agg AS (
    SELECT
      tr.psp_id,
      tr.transfer_date::date AS day,
      sum(CASE WHEN tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS deposits,
      sum(CASE WHEN NOT tc.is_deposit THEN abs(tr.amount) ELSE 0 END) AS withdrawals,
      sum(CASE WHEN tc.is_deposit THEN tr.commission ELSE 0 END) AS commission,
      sum(tr.net) AS net,
      count(*) AS transfer_count
    FROM   public.transfers tr
    JOIN   public.transfer_categories tc ON tc.id = tr.category_id
    JOIN   public.transfer_types tt ON tt.id = tr.type_id
    WHERE  tr.organization_id = _org_id
      AND  tr.psp_id IS NOT NULL
      AND  tr.transfer_date >= _start
      AND  tr.transfer_date < _end
      AND  NOT coalesce(tt.is_excluded, false)
      AND  tr.deleted_at IS NULL
    GROUP  BY tr.psp_id, tr.transfer_date::date
  ),

  /* ── Daily settlement aggregates per PSP ──────────────────────── */
  settlements_agg AS (
    SELECT
      ps.psp_id,
      ps.settlement_date AS day,
      sum(ps.amount) AS settlement
    FROM   public.psp_settlements ps
    WHERE  ps.organization_id = _org_id
      AND  ps.settlement_date >= _start
      AND  ps.settlement_date < _end
    GROUP  BY ps.psp_id, ps.settlement_date
  ),

  /* ── Merge: every PSP × every day in month ────────────────────── */
  grid AS (
    SELECT
      p.psp_id,
      p.psp_name,
      p.commission_rate,
      p.initial_balance,
      c.day,
      coalesce(t.deposits, 0)       AS deposits,
      coalesce(t.withdrawals, 0)    AS withdrawals,
      coalesce(t.commission, 0)     AS commission,
      coalesce(t.net, 0)            AS net,
      coalesce(s.settlement, 0)     AS settlement,
      coalesce(t.transfer_count, 0) AS transfer_count
    FROM   org_psps p
    CROSS  JOIN cal c
    LEFT   JOIN transfers_agg  t ON t.psp_id = p.psp_id AND t.day = c.day
    LEFT   JOIN settlements_agg s ON s.psp_id = p.psp_id AND s.day = c.day
  ),

  /* ── Pre-month carry-over: transfers + settlements before _start ── */
  pre_month AS (
    SELECT
      p.psp_id,
      coalesce(sum(tr.net), 0) AS pre_net,
      coalesce((
        SELECT sum(ps2.amount)
        FROM   public.psp_settlements ps2
        WHERE  ps2.psp_id = p.psp_id
          AND  ps2.organization_id = _org_id
          AND  ps2.settlement_date < _start
      ), 0) AS pre_settlement
    FROM   org_psps p
    LEFT   JOIN public.transfers tr
      ON   tr.psp_id = p.psp_id
      AND  tr.organization_id = _org_id
      AND  tr.transfer_date < _start
      AND  tr.deleted_at IS NULL
    LEFT   JOIN public.transfer_types tt ON tt.id = tr.type_id
    WHERE  coalesce(tt.is_excluded, false) = false OR tr.id IS NULL
    GROUP  BY p.psp_id
  ),

  /* ── Per-PSP totals for the month ─────────────────────────────── */
  psp_totals AS (
    SELECT
      g.psp_id,
      sum(g.deposits)       AS total_deposits,
      sum(g.withdrawals)    AS total_withdrawals,
      sum(g.commission)     AS total_commission,
      sum(g.net)            AS total_net,
      sum(g.settlement)     AS total_settlement,
      sum(g.transfer_count) AS total_transfers
    FROM   grid g
    GROUP  BY g.psp_id
  ),

  /* ── Grand totals across all PSPs per day ─────────────────────── */
  daily_grand AS (
    SELECT
      g.day,
      sum(g.deposits)       AS deposits,
      sum(g.withdrawals)    AS withdrawals,
      sum(g.commission)     AS commission,
      sum(g.net)            AS net,
      sum(g.settlement)     AS settlement,
      sum(g.transfer_count) AS transfer_count
    FROM   grid g
    GROUP  BY g.day
    ORDER  BY g.day
  )

  SELECT json_build_object(
    'psps', (
      SELECT json_agg(psp_obj ORDER BY psp_obj->>'psp_name')
      FROM (
        SELECT json_build_object(
          'psp_id',          p.psp_id,
          'psp_name',        p.psp_name,
          'commission_rate', p.commission_rate,
          'initial_balance', p.initial_balance,
          'pre_month_balance', p.initial_balance + coalesce(pm.pre_net, 0) - coalesce(pm.pre_settlement, 0),
          'days', (
            SELECT json_agg(
              json_build_object(
                'day',            g.day,
                'deposits',       g.deposits,
                'withdrawals',    g.withdrawals,
                'commission',     g.commission,
                'net',            g.net,
                'settlement',     g.settlement,
                'transfer_count', g.transfer_count
              ) ORDER BY g.day
            )
            FROM grid g
            WHERE g.psp_id = p.psp_id
          ),
          'totals', (
            SELECT json_build_object(
              'deposits',       pt.total_deposits,
              'withdrawals',    pt.total_withdrawals,
              'commission',     pt.total_commission,
              'net',            pt.total_net,
              'settlement',     pt.total_settlement,
              'transfers',      pt.total_transfers
            )
            FROM psp_totals pt
            WHERE pt.psp_id = p.psp_id
          )
        ) AS psp_obj
        FROM org_psps p
        LEFT JOIN pre_month pm ON pm.psp_id = p.psp_id
      ) sub
    ),
    'days', (
      SELECT json_agg(c.day ORDER BY c.day) FROM cal c
    ),
    'grand_totals', (
      SELECT json_agg(
        json_build_object(
          'day',         dg.day,
          'deposits',    dg.deposits,
          'withdrawals', dg.withdrawals,
          'commission',  dg.commission,
          'net',         dg.net,
          'settlement',  dg.settlement,
          'transfer_count', dg.transfer_count
        ) ORDER BY dg.day
      )
      FROM daily_grand dg
    ),
    'month_totals', (
      SELECT json_build_object(
        'deposits',    sum(dg.deposits),
        'withdrawals', sum(dg.withdrawals),
        'commission',  sum(dg.commission),
        'net',         sum(dg.net),
        'settlement',  sum(dg.settlement),
        'transfers',   sum(dg.transfer_count)
      )
      FROM daily_grand dg
    )
  ) INTO _result;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ozet_summary(uuid, int, int) TO authenticated;
