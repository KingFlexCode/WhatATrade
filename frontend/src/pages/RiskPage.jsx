import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Panel } from '../components/ui'
import { fmtPnl } from '../utils/helpers'
import { tradesApi } from '../services/api'

export default function RiskPage() {
  const { trades, setTrades, settings, updateSettings } = useStore()
  const [loading,  setLoading]  = useState(true)
  const [ps,       setPs]       = useState({ entry: '', stop: '', direction: 'Long' })
  const [saved,    setSaved]    = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [editVals, setEditVals] = useState({})

  // Load real trades
  useEffect(() => {
    async function load() {
      try {
        const res = await tradesApi.list()
        setTrades(res.data.trades || [])
      } catch (err) {
        console.error('Failed to load trades:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Real P&L calculations from trade data ─────────────────
  const today = new Date().toISOString().slice(0, 10)

  const todayTrades = useMemo(() =>
    trades.filter((t) => (t.trade_date || t.date || '').slice(0, 10) === today),
    [trades, today]
  )

  const todayPnl = useMemo(() =>
    todayTrades.reduce((s, t) => s + (t.pnl || 0), 0),
    [todayTrades]
  )

  // This week's trades
  const weekStart = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() - d.getDay() + 1)
    return d.toISOString().slice(0, 10)
  }, [])

  const weekTrades = useMemo(() =>
    trades.filter((t) => (t.trade_date || t.date || '').slice(0, 10) >= weekStart),
    [trades, weekStart]
  )

  const weekPnl = useMemo(() =>
    weekTrades.reduce((s, t) => s + (t.pnl || 0), 0),
    [weekTrades]
  )

  // This month's trades
  const monthStart = new Date().toISOString().slice(0, 7)
  const monthTrades = useMemo(() =>
    trades.filter((t) => (t.trade_date || t.date || '').slice(0, 7) === monthStart),
    [trades, monthStart]
  )

  const monthPnl = useMemo(() =>
    monthTrades.reduce((s, t) => s + (t.pnl || 0), 0),
    [monthTrades]
  )

  // Max drawdown — largest peak to trough
  const maxDrawdown = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.pnl !== null)
      .sort((a, b) => (a.trade_date || a.date || '').localeCompare(b.trade_date || b.date || ''))
    let peak = 0, cum = 0, maxDD = 0
    sorted.forEach((t) => {
      cum += t.pnl || 0
      if (cum > peak) peak = cum
      const dd = peak - cum
      if (dd > maxDD) maxDD = dd
    })
    return maxDD
  }, [trades])

  // Consecutive losses
  const streak = useMemo(() => {
    const sorted = [...trades]
      .filter((t) => t.pnl !== null)
      .sort((a, b) => (b.trade_date || b.date || '').localeCompare(a.trade_date || a.date || ''))
    let losses = 0
    for (const t of sorted) {
      if (t.pnl < 0) losses++
      else break
    }
    return losses
  }, [trades])

  // ── Position sizer ────────────────────────────────────────
  const riskAmt  = settings.accountBalance * (settings.riskPerTrade / 100)
  const stopDist = ps.stop && ps.entry ? Math.abs(+ps.entry - +ps.stop) : 0
  const shares   = stopDist > 0 ? Math.floor(riskAmt / stopDist) : null
  const posSize  = shares ? (shares * +ps.entry).toFixed(2) : null
  const rr       = ps.stop && ps.entry && ps.target
    ? Math.abs((+ps.target - +ps.entry) / (+ps.entry - +ps.stop)).toFixed(2)
    : null

  // ── Daily loss limit progress ─────────────────────────────
  const dailyUsedPct = settings.dailyLossLimit > 0
    ? Math.min(100, Math.abs(Math.min(0, todayPnl)) / settings.dailyLossLimit * 100)
    : 0

  const weeklyUsedPct = settings.weeklyDrawdown > 0
    ? Math.min(100, Math.abs(Math.min(0, weekPnl)) / settings.weeklyDrawdown * 100)
    : 0

  // ── Settings edit ─────────────────────────────────────────
  function startEdit() {
    setEditVals({
      accountBalance:  settings.accountBalance,
      riskPerTrade:    settings.riskPerTrade,
      dailyLossLimit:  settings.dailyLossLimit,
      weeklyDrawdown:  settings.weeklyDrawdown,
      maxTradesPerDay: settings.maxTradesPerDay,
    })
    setEditing(true)
  }

  function saveEdit() {
    Object.entries(editVals).forEach(([key, val]) => {
      updateSettings(key, +val)
    })
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inp = {
    padding:      '7px 10px',
    borderRadius:  8,
    border:       '1px solid var(--border-2)',
    background:   'var(--bg-3)',
    color:        'var(--txt-0)',
    fontSize:      12.5,
    fontFamily:   'Outfit, sans-serif',
    outline:      'none',
    width:        '100%',
  }

  const lbl = {
    fontSize:      9.5,
    fontWeight:    500,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    color:         'var(--txt-2)',
    display:       'block',
    marginBottom:   4,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Top row — live stats */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            label: "Today's P&L",
            value: todayTrades.length > 0 ? fmtPnl(todayPnl) : '—',
            sub:   `${todayTrades.length} trades today`,
            color: todayPnl >= 0 ? 'var(--green)' : 'var(--red)',
          },
          {
            label: "This week",
            value: weekTrades.length > 0 ? fmtPnl(weekPnl) : '—',
            sub:   `${weekTrades.length} trades this week`,
            color: weekPnl >= 0 ? 'var(--green)' : 'var(--red)',
          },
          {
            label: "This month",
            value: monthTrades.length > 0 ? fmtPnl(monthPnl) : '—',
            sub:   `${monthTrades.length} trades this month`,
            color: monthPnl >= 0 ? 'var(--green)' : 'var(--red)',
          },
          {
            label: "Max drawdown",
            value: maxDrawdown > 0 ? `-$${Math.round(maxDrawdown).toLocaleString()}` : '—',
            sub:   streak > 0 ? `${streak} loss streak` : 'No losing streak',
            color: maxDrawdown > 0 ? 'var(--red)' : 'var(--txt-1)',
          },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--txt-2)] mb-1.5">{s.label}</div>
            <div className="text-[20px] font-medium font-mono" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10.5px] text-[var(--txt-2)] mt-1">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Loss limits + position sizer */}
      <div className="grid grid-cols-3 gap-3">

        {/* Daily + weekly limits */}
        <Panel title="Loss limits">
          <div className="p-4 space-y-4">
            {/* Daily */}
            <div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-[var(--txt-1)]">Daily loss limit</span>
                <span className="font-mono" style={{
                  color: dailyUsedPct >= 80 ? 'var(--red)' : dailyUsedPct >= 60 ? 'var(--amber)' : 'var(--green)'
                }}>
                  {dailyUsedPct.toFixed(0)}% used
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-4)] rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${dailyUsedPct}%`,
                    background: dailyUsedPct >= 80 ? 'var(--red)' : dailyUsedPct >= 60 ? 'var(--amber)' : 'var(--green)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] text-[var(--txt-2)]">
                <span>Today: {fmtPnl(todayPnl)}</span>
                <span>Limit: -${settings.dailyLossLimit}</span>
              </div>
            </div>

            {/* Weekly */}
            <div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-[var(--txt-1)]">Weekly drawdown</span>
                <span className="font-mono" style={{
                  color: weeklyUsedPct >= 80 ? 'var(--red)' : weeklyUsedPct >= 60 ? 'var(--amber)' : 'var(--green)'
                }}>
                  {weeklyUsedPct.toFixed(0)}% used
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-4)] rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${weeklyUsedPct}%`,
                    background: weeklyUsedPct >= 80 ? 'var(--red)' : weeklyUsedPct >= 60 ? 'var(--amber)' : 'var(--green)',
                  }}
                />
              </div>
              <div className="flex justify-between text-[10.5px] text-[var(--txt-2)]">
                <span>This week: {fmtPnl(weekPnl)}</span>
                <span>Limit: -${settings.weeklyDrawdown}</span>
              </div>
            </div>

            {/* Trades today */}
            <div>
              <div className="flex justify-between text-[12px] mb-2">
                <span className="text-[var(--txt-1)]">Trades today</span>
                <span className="font-mono" style={{
                  color: todayTrades.length >= settings.maxTradesPerDay ? 'var(--red)' : 'var(--green)'
                }}>
                  {todayTrades.length} / {settings.maxTradesPerDay}
                </span>
              </div>
              <div className="h-2 bg-[var(--bg-4)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width:      `${Math.min(100, (todayTrades.length / settings.maxTradesPerDay) * 100)}%`,
                    background: todayTrades.length >= settings.maxTradesPerDay ? 'var(--red)' : 'var(--accent)',
                  }}
                />
              </div>
            </div>

            {/* Status alert */}
            {(dailyUsedPct >= 80 || weeklyUsedPct >= 80 || todayTrades.length >= settings.maxTradesPerDay) && (
              <div style={{
                padding:      '10px 12px',
                borderRadius:  9,
                background:   'rgba(240,91,107,.10)',
                border:       '1px solid rgba(240,91,107,.25)',
                fontSize:      12,
                color:        'var(--red)',
                display:      'flex',
                alignItems:   'center',
                gap:           8,
              }}>
                <i className="ti ti-alert-triangle text-[14px]" />
                {todayTrades.length >= settings.maxTradesPerDay
                  ? 'Max trades reached for today.'
                  : 'Approaching loss limit — consider stopping.'}
              </div>
            )}
          </div>
        </Panel>

        {/* Position sizer */}
        <Panel title="Position sizer">
          <div className="p-4 space-y-3">
            <div>
              <label style={lbl}>Direction</label>
              <select
                style={inp}
                value={ps.direction}
                onChange={(e) => setPs((p) => ({ ...p, direction: e.target.value }))}
              >
                <option>Long</option>
                <option>Short</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Entry price</label>
              <input
                type="number" step="0.01" style={inp}
                placeholder="185.00" value={ps.entry}
                onChange={(e) => setPs((p) => ({ ...p, entry: e.target.value }))}
              />
            </div>
            <div>
              <label style={lbl}>Stop loss</label>
              <input
                type="number" step="0.01" style={inp}
                placeholder="182.50" value={ps.stop}
                onChange={(e) => setPs((p) => ({ ...p, stop: e.target.value }))}
              />
            </div>
            <div>
              <label style={lbl}>Target (optional)</label>
              <input
                type="number" step="0.01" style={inp}
                placeholder="190.00" value={ps.target || ''}
                onChange={(e) => setPs((p) => ({ ...p, target: e.target.value }))}
              />
            </div>

            {shares && (
              <div style={{
                background:   'var(--bg-3)',
                border:       '1px solid var(--border)',
                borderRadius:  10,
                padding:      '12px 13px',
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--txt-2)', marginBottom: 8 }}>
                  Recommended size
                </div>
                {[
                  ['Max risk',      `$${riskAmt.toFixed(0)}`,  'var(--red)'    ],
                  ['Shares / units', shares,                    'var(--txt-0)'  ],
                  ['Position size', `$${posSize}`,              'var(--accent)' ],
                  rr ? ['R:R ratio', `${rr}R`,                  +rr >= 2 ? 'var(--green)' : 'var(--amber)'] : null,
                ].filter(Boolean).map(([l, v, col]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: 'var(--txt-2)' }}>{l}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', color: col }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        {/* Risk parameters */}
        <Panel
          title="Risk parameters"
          action={
            !editing ? (
              <button
                onClick={startEdit}
                className="text-[11.5px] text-[var(--accent)] hover:underline cursor-pointer"
              >
                Edit
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {saved && <span className="text-[11px] text-[var(--green)]">Saved ✓</span>}
                <button
                  onClick={saveEdit}
                  style={{
                    padding: '3px 10px', borderRadius: 7,
                    background: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: 11.5, cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  style={{
                    padding: '3px 10px', borderRadius: 7,
                    background: 'transparent',
                    border: '1px solid var(--border-2)',
                    color: 'var(--txt-2)', fontSize: 11.5,
                    cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  Cancel
                </button>
              </div>
            )
          }
        >
          <div className="p-4 space-y-3">
            {[
              { key: 'accountBalance',  label: 'Account balance ($)', prefix: '$' },
              { key: 'riskPerTrade',    label: 'Risk per trade (%)',   suffix: '%' },
              { key: 'dailyLossLimit',  label: 'Daily loss limit ($)', prefix: '$' },
              { key: 'weeklyDrawdown',  label: 'Weekly drawdown ($)',  prefix: '$' },
              { key: 'maxTradesPerDay', label: 'Max trades / day',     prefix: ''  },
            ].map(({ key, label, prefix, suffix }) => (
              <div key={key} className="flex justify-between items-center border-b border-[var(--border)] pb-2.5 last:border-0 last:pb-0">
                <span className="text-[12px] text-[var(--txt-2)]">{label}</span>
                {editing ? (
                  <input
                    type="number"
                    value={editVals[key] ?? ''}
                    onChange={(e) => setEditVals((p) => ({ ...p, [key]: e.target.value }))}
                    style={{
                      ...inp,
                      width:     90,
                      textAlign: 'right',
                      fontSize:  12,
                      padding:   '4px 8px',
                    }}
                  />
                ) : (
                  <span className="font-mono text-[12.5px] text-[var(--txt-0)]">
                    {prefix}{Number(settings[key]).toLocaleString()}{suffix || ''}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Recent trades today */}
      {todayTrades.length > 0 && (
        <Panel title="Today's trades">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Symbol', 'Side', 'Setup', 'Entry', 'Exit', 'P&L', 'R:R'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-[var(--txt-2)] uppercase tracking-[0.07em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayTrades.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                    <td className="px-3 py-2.5">
                      <span style={{
                        fontSize: 10, fontWeight: 500,
                        padding: '2px 7px', borderRadius: 20,
                        background: t.direction === 'Long' ? 'rgba(34,216,122,.12)' : 'rgba(240,91,107,.12)',
                        color:      t.direction === 'Long' ? 'var(--green)' : 'var(--red)',
                        border:    `1px solid ${t.direction === 'Long' ? 'rgba(34,216,122,.25)' : 'rgba(240,91,107,.25)'}`,
                      }}>
                        {t.direction}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--txt-2)]">{t.setup || '—'}</td>
                    <td className="px-3 py-2.5 font-mono">${Number(t.entry_price || t.entry).toFixed(2)}</td>
                    <td className="px-3 py-2.5 font-mono">{t.exit_price || t.exit ? `$${Number(t.exit_price || t.exit).toFixed(2)}` : 'Open'}</td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: (t.pnl || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.pnl !== null ? fmtPnl(t.pnl) : '—'}
                    </td>
                    <td className="px-3 py-2.5 font-mono" style={{ color: (t.rr || 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.rr ? `${t.rr > 0 ? '+' : ''}${Number(t.rr).toFixed(1)}R` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

    </div>
  )
}