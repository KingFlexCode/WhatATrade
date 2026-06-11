import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Panel, EmptyState } from '../components/ui'
import { fmtPnl } from '../utils/helpers'
import { tradesApi } from '../services/api'
import {
  format, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, parseISO,
  addMonths, subMonths
} from 'date-fns'

export default function CalendarPage() {
  const { trades, setTrades } = useStore()
  const [loading, setLoading] = useState(true)
  const [month, setMonth]     = useState(new Date())

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

  // Group trades by date
  const byDate = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      const key = (t.trade_date || t.date || '').slice(0, 10)
      if (!key) return
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [trades])

  // All days in current month
  const days = useMemo(() => {
    return eachDayOfInterval({
      start: startOfMonth(month),
      end:   endOfMonth(month),
    })
  }, [month])

  // First day offset (Monday = 0)
  const firstDow = useMemo(() => {
    return (getDay(days[0]) + 6) % 7
  }, [days])

  // Monthly summary
  const monthStats = useMemo(() => {
    let totalPnl   = 0
    let tradeDays  = 0
    let winDays    = 0
    let totalTrades = 0

    days.forEach((day) => {
      const key    = format(day, 'yyyy-MM-dd')
      const dayTrades = byDate[key] || []
      if (dayTrades.length === 0) return
      const dayPnl = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
      totalPnl    += dayPnl
      totalTrades += dayTrades.length
      tradeDays++
      if (dayPnl > 0) winDays++
    })

    return {
      totalPnl,
      tradeDays,
      winDays,
      lossDays:    tradeDays - winDays,
      totalTrades,
      winDayRate:  tradeDays ? Math.round((winDays / tradeDays) * 100) : 0,
    }
  }, [days, byDate])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div className="space-y-3">

      {/* Month summary stats */}
      <div className="grid grid-cols-4 gap-2.5">
        {[
          {
            label: 'Monthly P&L',
            value: fmtPnl(monthStats.totalPnl),
            color: monthStats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
          },
          {
            label: 'Trading days',
            value: monthStats.tradeDays,
            color: null,
          },
          {
            label: 'Winning days',
            value: `${monthStats.winDays} (${monthStats.winDayRate}%)`,
            color: 'var(--green)',
          },
          {
            label: 'Losing days',
            value: monthStats.lossDays,
            color: monthStats.lossDays > 0 ? 'var(--red)' : 'var(--txt-1)',
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-3.5"
          >
            <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--txt-2)] mb-1.5">
              {s.label}
            </div>
            <div
              className="text-[20px] font-medium font-mono"
              style={{ color: s.color || 'var(--txt-0)' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <Panel
        title={format(month, 'MMMM yyyy')}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth(subMonths(month, 1))}
              className="w-7 h-7 rounded-lg border border-[var(--border-2)] flex items-center justify-center text-[var(--txt-1)] hover:bg-[var(--bg-3)] hover:text-[var(--txt-0)] transition-all text-[13px]"
            >
              ‹
            </button>
            <button
              onClick={() => setMonth(new Date())}
              className="text-[11px] text-[var(--txt-2)] hover:text-[var(--accent)] transition-colors px-1"
            >
              Today
            </button>
            <button
              onClick={() => setMonth(addMonths(month, 1))}
              className="w-7 h-7 rounded-lg border border-[var(--border-2)] flex items-center justify-center text-[var(--txt-1)] hover:bg-[var(--bg-3)] hover:text-[var(--txt-0)] transition-all text-[13px]"
            >
              ›
            </button>
          </div>
        }
      >
        <div className="p-4">
          {/* Day of week headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1.5">
            {/* Empty cells before first day */}
            {Array(firstDow).fill(null).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

            {/* Day cells */}
            {days.map((day) => {
              const key       = format(day, 'yyyy-MM-dd')
              const dayTrades = byDate[key] || []
              const dayPnl    = dayTrades.reduce((s, t) => s + (t.pnl || 0), 0)
              const hasData   = dayTrades.length > 0
              const isPos     = hasData && dayPnl > 0
              const isNeg     = hasData && dayPnl < 0
              const isToday   = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

              return (
                <div
                  key={key}
                  style={{
                    borderRadius:  8,
                    padding:       '6px 4px',
                    minHeight:     52,
                    display:       'flex',
                    flexDirection: 'column',
                    alignItems:    'center',
                    border:        `1px solid ${
                      isToday ? 'var(--accent)' :
                      isPos   ? 'rgba(34,216,122,0.25)' :
                      isNeg   ? 'rgba(240,91,107,0.25)' :
                      'transparent'
                    }`,
                    background:
                      isPos ? 'rgba(34,216,122,0.08)' :
                      isNeg ? 'rgba(240,91,107,0.08)' :
                      'transparent',
                    cursor: hasData ? 'pointer' : 'default',
                    transition: 'all 0.15s',
                  }}
                >
                  {/* Day number */}
                  <div style={{
                    fontSize:   11,
                    fontWeight: isToday ? 600 : 400,
                    color:
                      isToday ? 'var(--accent)' :
                      isPos   ? 'var(--green)' :
                      isNeg   ? 'var(--red)' :
                      'var(--txt-2)',
                  }}>
                    {format(day, 'd')}
                  </div>

                  {/* P&L if trades exist */}
                  {hasData && (
                    <>
                      <div style={{
                        fontSize:   9.5,
                        fontFamily: 'DM Mono, monospace',
                        fontWeight: 500,
                        marginTop:  2,
                        color: isPos ? 'var(--green)' : 'var(--red)',
                      }}>
                        {dayPnl >= 0 ? '+' : ''}${Math.abs(Math.round(dayPnl))}
                      </div>
                      <div style={{
                        fontSize: 9,
                        color:    'var(--txt-2)',
                        marginTop: 1,
                      }}>
                        {dayTrades.length}t
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Panel>

      {/* Legend + monthly breakdown */}
      <div className="grid grid-cols-2 gap-3">

        {/* Legend */}
        <Panel title="Legend">
          <div className="p-4 space-y-3">
            {[
              { color: 'rgba(34,216,122,0.08)',  border: 'rgba(34,216,122,0.25)', label: 'Profitable day',  sub: 'Net P&L positive' },
              { color: 'rgba(240,91,107,0.08)',  border: 'rgba(240,91,107,0.25)', label: 'Loss day',         sub: 'Net P&L negative' },
              { color: 'transparent',             border: 'var(--accent)',          label: 'Today',            sub: 'Current date'      },
              { color: 'transparent',             border: 'transparent',            label: 'No trades',        sub: 'Day off'           },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-3">
                <div style={{
                  width:        28,
                  height:       28,
                  borderRadius:  6,
                  background:    l.color,
                  border:       `1px solid ${l.border}`,
                  flexShrink:    0,
                }} />
                <div>
                  <div className="text-[12.5px] text-[var(--txt-0)]">{l.label}</div>
                  <div className="text-[11px] text-[var(--txt-2)]">{l.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Best and worst days this month */}
        <Panel title="This month">
          <div className="p-4 space-y-2.5 text-[12.5px]">
            {monthStats.tradeDays === 0 ? (
              <div style={{ color: 'var(--txt-2)', fontSize: 13 }}>
                No trades logged this month yet.
              </div>
            ) : (
              <>
                {/* Best day */}
                {(() => {
                  let bestDay = null, bestPnl = -Infinity
                  days.forEach((day) => {
                    const key    = format(day, 'yyyy-MM-dd')
                    const dayPnl = (byDate[key] || []).reduce((s, t) => s + (t.pnl || 0), 0)
                    if ((byDate[key]||[]).length > 0 && dayPnl > bestPnl) {
                      bestPnl = dayPnl
                      bestDay = key
                    }
                  })
                  return bestDay ? (
                    <div className="flex justify-between border-b border-[var(--border)] pb-2">
                      <span className="text-[var(--txt-2)]">Best day</span>
                      <div className="text-right">
                        <div className="font-mono text-[var(--green)]">+${Math.round(bestPnl).toLocaleString()}</div>
                        <div className="text-[10.5px] text-[var(--txt-2)]">{format(parseISO(bestDay), 'MMM d')}</div>
                      </div>
                    </div>
                  ) : null
                })()}

                {/* Worst day */}
                {(() => {
                  let worstDay = null, worstPnl = Infinity
                  days.forEach((day) => {
                    const key    = format(day, 'yyyy-MM-dd')
                    const dayPnl = (byDate[key] || []).reduce((s, t) => s + (t.pnl || 0), 0)
                    if ((byDate[key]||[]).length > 0 && dayPnl < worstPnl) {
                      worstPnl = dayPnl
                      worstDay = key
                    }
                  })
                  return worstDay ? (
                    <div className="flex justify-between border-b border-[var(--border)] pb-2">
                      <span className="text-[var(--txt-2)]">Worst day</span>
                      <div className="text-right">
                        <div className="font-mono text-[var(--red)]">${Math.round(worstPnl).toLocaleString()}</div>
                        <div className="text-[10.5px] text-[var(--txt-2)]">{format(parseISO(worstDay), 'MMM d')}</div>
                      </div>
                    </div>
                  ) : null
                })()}

                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--txt-2)]">Trades logged</span>
                  <span className="font-mono text-[var(--txt-0)]">{monthStats.totalTrades}</span>
                </div>
                <div className="flex justify-between border-b border-[var(--border)] pb-2">
                  <span className="text-[var(--txt-2)]">Days traded</span>
                  <span className="font-mono text-[var(--txt-0)]">{monthStats.tradeDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--txt-2)]">Win day rate</span>
                  <span
                    className="font-mono"
                    style={{ color: monthStats.winDayRate >= 50 ? 'var(--green)' : 'var(--red)' }}
                  >
                    {monthStats.winDayRate}%
                  </span>
                </div>
              </>
            )}
          </div>
        </Panel>
      </div>

    </div>
  )
}