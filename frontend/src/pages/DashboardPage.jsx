import React, { useMemo, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer
} from 'recharts'
import { useStore } from '../store/useStore'
import { KPICard, Panel, Badge, EmptyState } from '../components/ui'
import { fmtPnl, fmtPrice, fmtDateShort } from '../utils/helpers'
import { tradesApi } from '../services/api'

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
      fontFamily: 'DM Mono, monospace'
    }}>
      <div style={{ color: 'var(--txt-2)', marginBottom: 2 }}>{label}</div>
      <div style={{ color: val >= 0 ? 'var(--green)' : 'var(--red)' }}>
        {val >= 0 ? '+' : ''}${Math.abs(val).toLocaleString()}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { trades, getSummary, brokers, setTrades } = useStore()
  const navigate  = useNavigate()
  const summary   = getSummary()
  const [loading, setLoading] = useState(true)

  // Load real trades from backend on mount
  useEffect(() => {
    async function loadTrades() {
      try {
        const res = await tradesApi.list()
        setTrades(res.data.trades || [])
      } catch (err) {
        console.error('Failed to load trades:', err)
      } finally {
        setLoading(false)
      }
    }
    loadTrades()
  }, [])

  // Equity curve — cumulative P&L
  const equityData = useMemo(() => {
    const sorted = [...trades]
      .filter(t => t.pnl)
      .sort((a, b) => (a.trade_date || a.date || '').localeCompare(b.trade_date || b.date || ''))
    let cum = +summary.netPnl === 0 ? 10000 : 10000
    const result = []
    sorted.forEach(t => {
      cum += t.pnl
      result.push({
        date:  fmtDateShort(t.trade_date || t.date),
        value: Math.round(cum),
      })
    })
    return result
  }, [trades])

  // Daily P&L
  const dailyData = useMemo(() => {
    const map = {}
    trades.filter(t => t.pnl).forEach(t => {
      const d = (t.trade_date || t.date || '').slice(0, 10)
      map[d] = (map[d] || 0) + t.pnl
    })
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date:  fmtDateShort(date),
        value: Math.round(value),
      }))
  }, [trades])

  const recent = trades.slice(0, 6)

  const kpis = [
    { label: 'Net P&L',       value: <span style={{ color: +summary.netPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtPnl(+summary.netPnl)}</span>, sub: `${summary.total} trades total` },
    { label: 'Win rate',      value: `${summary.winRate}%`,       sub: `${summary.wins}W / ${summary.losses}L` },
    { label: 'Profit factor', value: summary.profitFactor,        sub: 'Target ≥ 2.0' },
    { label: 'Avg R:R',       value: '—',                         sub: 'Log more trades' },
    { label: 'Max drawdown',  value: '—',                         sub: 'Calculated live' },
    { label: 'Streak',        value: '—',                         sub: 'Log more trades' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* KPIs */}
      <div className="grid grid-cols-6 gap-2.5 mb-3">
        {kpis.map((k) => <KPICard key={k.label} {...k} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-[2fr_1fr] gap-3 mb-3">
        <Panel
          title="Equity curve"
          action={
            <span style={{
              fontSize: 11,
              color: +summary.netPnl >= 0 ? 'var(--green)' : 'var(--red)',
              fontFamily: 'DM Mono, monospace'
            }}>
              {fmtPnl(+summary.netPnl)}
            </span>
          }
        >
          <div className="p-4 pt-3">
            {equityData.length === 0 ? (
              <div style={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--txt-2)',
                fontSize: 13
              }}>
                Log your first trade to see your equity curve
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={equityData}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#378ADD" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#378ADD" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: '#5c6285' }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#5c6285', fontFamily: 'DM Mono' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    width={45}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#378ADD"
                    strokeWidth={2}
                    fill="url(#eqGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>

        <Panel title="Daily P&L">
          <div className="p-4 pt-3">
            {dailyData.length === 0 ? (
              <div style={{
                height: 140,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--txt-2)',
                fontSize: 13
              }}>
                No data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={dailyData} barSize={8}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: '#5c6285' }}
                    axisLine={false}
                    tickLine={false}
                    interval={2}
                  />
                  <YAxis hide />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar
                    dataKey="value"
                    radius={[3, 3, 0, 0]}
                    shape={(props) => {
                      const { x, y, width, height, value } = props
                      const h  = Math.abs(height)
                      const yy = value >= 0 ? y : y + height
                      return (
                        <rect
                          x={x} y={yy}
                          width={width} height={h}
                          rx={3}
                          fill={value >= 0 ? '#22d87a' : '#f05b6b'}
                          fillOpacity={0.8}
                        />
                      )
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      {/* Broker status */}
      <div className="grid grid-cols-4 gap-2.5 mb-3">
        {Object.entries(brokers).map(([name, b]) => (
          <div key={name}
            className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl px-3.5 py-3 flex items-center gap-2.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${b.connected ? 'live-dot' : 'bg-[var(--purple)]'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-medium text-[var(--txt-0)] capitalize">{name}</div>
              <div className="text-[10.5px] text-[var(--txt-2)]">
                {b.connected
                  ? `Synced ${b.lastSync ? new Date(b.lastSync).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}`
                  : 'Not connected'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent trades */}
      <Panel
        title="Recent trades"
        action={
          <button
            onClick={() => navigate('/trades')}
            className="text-[12px] text-[var(--accent)] hover:underline"
          >
            View all →
          </button>
        }
      >
        {recent.length === 0 ? (
          <EmptyState
            icon="chart-line"
            title="No trades yet"
            body="Click 'Log trade' to add your first trade."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  {['Date', 'Symbol', 'Side', 'Setup', 'Entry', 'Exit', 'P&L', 'R:R'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-[10px] font-medium text-[var(--txt-2)] uppercase tracking-[0.07em]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => navigate(`/trades/${t.id}`)}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--bg-3)] cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5 text-[var(--txt-2)] text-[11.5px]">
                      {fmtDateShort(t.trade_date || t.date)}
                    </td>
                    <td className="px-3 py-2.5 font-medium">{t.symbol}</td>
                    <td className="px-3 py-2.5">
                      <Badge variant={t.direction === 'Long' ? 'long' : 'short'}>
                        {t.direction}
                      </Badge>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="setup">{t.setup}</Badge>
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px]">
                      {fmtPrice(t.entry_price || t.entry)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px]">
                      {fmtPrice(t.exit_price || t.exit)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px]"
                      style={{ color: t.pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {fmtPnl(t.pnl)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11.5px]"
                      style={{ color: t.rr >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {t.rr ? `${t.rr > 0 ? '+' : ''}${t.rr.toFixed(1)}R` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}