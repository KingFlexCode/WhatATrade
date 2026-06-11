import React, { useMemo, useEffect, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts'
import { useStore } from '../store/useStore'
import { Panel, EmptyState } from '../components/ui'
import { fmtPnl } from '../utils/helpers'
import { tradesApi } from '../services/api'

const COLORS = ['#378ADD', '#22d87a', '#a78bfa', '#f0b45b', '#f05b6b']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value ?? 0
  return (
    <div style={{
      background: 'var(--bg-3)',
      border: '1px solid var(--border-2)',
      borderRadius: 8,
      padding: '6px 10px',
      fontSize: 11,
      fontFamily: 'DM Mono, monospace',
    }}>
      <div style={{ color: 'var(--txt-2)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: val >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {val >= 0 ? '+' : ''}${Math.abs(val).toLocaleString()}
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  const { trades, setTrades } = useStore()
  const [loading, setLoading] = useState(true)

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

  // ── P&L by setup ────────────────────────────────────────────
  const setupData = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      if (!t.setup || t.pnl === null) return
      if (!map[t.setup]) map[t.setup] = { wins: 0, total: 0, pnl: 0 }
      map[t.setup].total++
      map[t.setup].pnl += t.pnl || 0
      if (t.pnl > 0) map[t.setup].wins++
    })
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        winRate: Math.round((d.wins / d.total) * 100),
        pnl:     Math.round(d.pnl),
        trades:  d.total,
        wins:    d.wins,
      }))
      .sort((a, b) => b.pnl - a.pnl)
  }, [trades])

  // ── P&L by day of week ───────────────────────────────────────
  const dowData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    const map  = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0 }
    trades.forEach((t) => {
      if (!t.pnl) return
      const date = new Date((t.trade_date || t.date) + 'T12:00:00')
      const dow  = date.toLocaleDateString('en-US', { weekday: 'short' })
      if (map[dow] !== undefined) map[dow] += t.pnl
    })
    return days.map((d) => ({ day: d, value: Math.round(map[d]) }))
  }, [trades])

  // ── P&L by direction ────────────────────────────────────────
  const directionData = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      if (!t.direction || t.pnl === null) return
      if (!map[t.direction]) map[t.direction] = { wins: 0, total: 0, pnl: 0 }
      map[t.direction].total++
      map[t.direction].pnl += t.pnl || 0
      if (t.pnl > 0) map[t.direction].wins++
    })
    return Object.entries(map).map(([name, d]) => ({
      name,
      winRate: Math.round((d.wins / d.total) * 100),
      pnl:     Math.round(d.pnl),
      trades:  d.total,
    }))
  }, [trades])

  // ── P&L by instrument ────────────────────────────────────────
  const instrumentData = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      const inst = t.instrument || 'Stock'
      if (!map[inst]) map[inst] = { pnl: 0, total: 0 }
      map[inst].total++
      map[inst].pnl += t.pnl || 0
    })
    const total = Object.values(map).reduce((s, d) => s + d.total, 0)
    return Object.entries(map).map(([name, d], i) => ({
      name,
      value: Math.round((d.total / total) * 100),
      pnl:   Math.round(d.pnl),
      fill:  COLORS[i % COLORS.length],
    }))
  }, [trades])

  // ── Emotion performance ──────────────────────────────────────
  const emotionData = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      if (!t.emotion || t.pnl === null) return
      if (!map[t.emotion]) map[t.emotion] = { wins: 0, total: 0, pnl: 0 }
      map[t.emotion].total++
      map[t.emotion].pnl += t.pnl || 0
      if (t.pnl > 0) map[t.emotion].wins++
    })
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        winRate: Math.round((d.wins / d.total) * 100),
        pnl:     Math.round(d.pnl),
        trades:  d.total,
      }))
      .sort((a, b) => b.winRate - a.winRate)
  }, [trades])

  // ── Summary stats ────────────────────────────────────────────
  const stats = useMemo(() => {
    const closed = trades.filter((t) => t.pnl !== null)
    const wins   = closed.filter((t) => t.pnl > 0)
    const losses = closed.filter((t) => t.pnl <= 0)
    const netPnl = closed.reduce((s, t) => s + (t.pnl || 0), 0)
    const avgWin = wins.length
      ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length
      : 0
    const avgLoss = losses.length
      ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length)
      : 0
    const bestTrade  = closed.reduce((b, t) => t.pnl > (b?.pnl ?? -Infinity) ? t : b, null)
    const worstTrade = closed.reduce((w, t) => t.pnl < (w?.pnl ?? Infinity)  ? t : w, null)
    return { netPnl, avgWin, avgLoss, bestTrade, worstTrade, total: closed.length, wins: wins.length, losses: losses.length }
  }, [trades])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <EmptyState
        icon="chart-bar"
        title="No trade data yet"
        body="Log some trades to see your analytics."
      />
    )
  }

  return (
    <div className="space-y-3">

      {/* Summary stats row */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          { label: 'Total trades',  value: stats.total,                   color: null          },
          { label: 'Net P&L',       value: fmtPnl(stats.netPnl),          color: stats.netPnl >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Avg win',       value: `+$${stats.avgWin.toFixed(0)}`, color: 'var(--green)' },
          { label: 'Avg loss',      value: `-$${stats.avgLoss.toFixed(0)}`,color: 'var(--red)'   },
        ].map((s) => (
          <div key={s.label} className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-3.5">
            <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--txt-2)] mb-1.5">{s.label}</div>
            <div className="text-[20px] font-medium font-mono" style={{ color: s.color || 'var(--txt-0)' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* P&L by day of week + Direction */}
      <div className="grid grid-cols-2 gap-3">
        <Panel title="P&L by day of week">
          <div className="p-4 pt-3">
            {dowData.every(d => d.value === 0) ? (
              <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt-2)', fontSize: 13 }}>
                Not enough data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={dowData} barSize={28}>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5c6285' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}
                    shape={(props) => {
                      const { x, y, width, height, value } = props
                      const h  = Math.abs(height)
                      const yy = value >= 0 ? y : y + height
                      return <rect x={x} y={yy} width={width} height={h} rx={5} fill={value >= 0 ? '#22d87a' : '#f05b6b'} fillOpacity={0.8} />
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Long vs Short">
          <div className="p-4 pt-3 space-y-3">
            {directionData.length === 0 ? (
              <div style={{ color: 'var(--txt-2)', fontSize: 13 }}>No data yet</div>
            ) : directionData.map((d, i) => (
              <div key={d.name}>
                <div className="flex justify-between text-[12.5px] mb-1.5">
                  <span className="font-medium" style={{ color: d.name === 'Long' ? 'var(--green)' : 'var(--red)' }}>
                    {d.name}
                  </span>
                  <div className="flex gap-4 text-[var(--txt-2)] text-[11.5px]">
                    <span>{d.trades} trades</span>
                    <span className="font-mono" style={{ color: d.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPnl(d.pnl)}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[var(--bg-4)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${d.winRate}%`,
                      background: d.name === 'Long' ? 'var(--green)' : 'var(--red)',
                    }}
                  />
                </div>
                <div className="text-[10.5px] text-[var(--txt-2)] mt-1">{d.winRate}% win rate</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Performance by setup */}
      <Panel title="Performance by setup">
        {setupData.length === 0 ? (
          <div className="p-4">
            <EmptyState icon="book-2" title="No setup data" body="Add a setup when logging trades to see breakdown here." />
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {setupData.map((s) => (
              <div key={s.name} className="flex items-center gap-3">
                <span className="text-[12.5px] text-[var(--txt-1)] min-w-[130px]">{s.name}</span>
                <div className="flex-1 h-1.5 bg-[var(--bg-4)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width:      `${s.winRate}%`,
                      background: s.winRate >= 60 ? 'var(--green)' : 'var(--amber)',
                    }}
                  />
                </div>
                <span className="text-[11.5px] font-mono text-[var(--txt-2)] min-w-[34px] text-right">
                  {s.winRate}%
                </span>
                <span
                  className="text-[11.5px] font-mono min-w-[64px] text-right"
                  style={{ color: s.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}
                >
                  {fmtPnl(s.pnl)}
                </span>
                <span className="text-[11px] text-[var(--txt-2)] min-w-[20px]">{s.trades}t</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* By instrument + Emotion */}
      <div className="grid grid-cols-2 gap-3">
        <Panel title="By instrument">
          {instrumentData.length === 0 ? (
            <div className="p-4">
              <EmptyState icon="chart-pie" title="No data" body="Log trades with instrument types to see this breakdown." />
            </div>
          ) : (
            <div className="p-4 flex items-center gap-6">
              <ResponsiveContainer width={90} height={90}>
                <PieChart>
                  <Pie
                    data={instrumentData}
                    cx={45} cy={45}
                    innerRadius={28}
                    outerRadius={44}
                    dataKey="value"
                    paddingAngle={2}
                  >
                    {instrumentData.map((e) => <Cell key={e.name} fill={e.fill} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-2 flex-1">
                {instrumentData.map((inst) => (
                  <div key={inst.name} className="flex items-center gap-2 text-[12px]">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: inst.fill }} />
                    <span className="text-[var(--txt-1)] flex-1">{inst.name}</span>
                    <span className="font-mono text-[11px]" style={{ color: inst.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPnl(inst.pnl)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Panel>

        <Panel title="Performance by emotion">
          {emotionData.length === 0 ? (
            <div className="p-4">
              <EmptyState icon="mood-smile" title="No emotion data" body="Tag your emotions when logging trades to see patterns here." />
            </div>
          ) : (
            <div className="p-4 space-y-2.5">
              {emotionData.map((e) => (
                <div key={e.name} className="flex items-center gap-3 text-[12px]">
                  <span className="text-[var(--txt-1)] min-w-[90px]">{e.name}</span>
                  <div className="flex-1 h-1.5 bg-[var(--bg-4)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width:      `${e.winRate}%`,
                        background: e.winRate >= 60 ? 'var(--green)' : e.winRate >= 40 ? 'var(--amber)' : 'var(--red)',
                      }}
                    />
                  </div>
                  <span className="font-mono text-[11px] text-[var(--txt-2)] min-w-[30px] text-right">
                    {e.winRate}%
                  </span>
                  <span className="text-[var(--txt-2)] text-[11px] min-w-[20px]">{e.trades}t</span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Best and worst trades */}
      <div className="grid grid-cols-2 gap-3">
        <Panel title="Best trade">
          <div className="p-4">
            {!stats.bestTrade ? (
              <div style={{ color: 'var(--txt-2)', fontSize: 13 }}>No closed trades yet</div>
            ) : (
              <div className="space-y-2 text-[12.5px]">
                <div className="text-[20px] font-semibold text-[var(--txt-0)]">{stats.bestTrade.symbol}</div>
                <div className="text-[24px] font-medium font-mono text-[var(--green)]">
                  {fmtPnl(stats.bestTrade.pnl)}
                </div>
                {[
                  ['Setup',     stats.bestTrade.setup     || '—'],
                  ['Direction', stats.bestTrade.direction],
                  ['Date',      stats.bestTrade.trade_date || stats.bestTrade.date || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-[var(--border)] pb-1.5 last:border-0">
                    <span className="text-[var(--txt-2)]">{l}</span>
                    <span className="font-mono text-[var(--txt-0)]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Worst trade">
          <div className="p-4">
            {!stats.worstTrade ? (
              <div style={{ color: 'var(--txt-2)', fontSize: 13 }}>No closed trades yet</div>
            ) : (
              <div className="space-y-2 text-[12.5px]">
                <div className="text-[20px] font-semibold text-[var(--txt-0)]">{stats.worstTrade.symbol}</div>
                <div className="text-[24px] font-medium font-mono text-[var(--red)]">
                  {fmtPnl(stats.worstTrade.pnl)}
                </div>
                {[
                  ['Setup',     stats.worstTrade.setup     || '—'],
                  ['Direction', stats.worstTrade.direction],
                  ['Date',      stats.worstTrade.trade_date || stats.worstTrade.date || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="flex justify-between border-b border-[var(--border)] pb-1.5 last:border-0">
                    <span className="text-[var(--txt-2)]">{l}</span>
                    <span className="font-mono text-[var(--txt-0)]">{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

    </div>
  )
}