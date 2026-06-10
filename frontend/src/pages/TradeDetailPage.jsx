import React, { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import { useStore } from '../store/useStore'
import { Panel, Badge, Button, SectionLabel, Spinner } from '../components/ui'
import { fmtPnl, fmtPrice, fmtDate } from '../utils/helpers'
import { tradesApi } from '../services/api'
import clsx from 'clsx'

const EMOTIONS = [
  'Confident', 'Focused', 'FOMO', 'Fearful',
  'Greedy', 'Disciplined', 'Fatigued', 'Calm',
]

const ALL_TAGS = [
  'followed plan', 'early exit', 'oversize', 'revenge trade',
  'news catalyst', 'gap play', 'VWAP level', 'earnings play',
  'partial exit', 'scaled in', 'stopped out', 'runner',
]

export default function TradeDetailPage() {
  const { id }     = useParams()
  const navigate   = useNavigate()
  const { trades, updateTrade, deleteTrade, setTrades } = useStore()

  const [trade,   setTrade]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [deleting,setDeleting]= useState(false)
  const [saved,   setSaved]   = useState(false)
  const [error,   setError]   = useState('')

  const [notes,   setNotes]   = useState('')
  const [emotion, setEmotion] = useState('')
  const [tags,    setTags]    = useState([])

  // ── Load trade ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')

      // First try the local store (instant)
      const local = trades.find((t) => t.id === id)
      if (local) {
        setTrade(local)
        setNotes(local.notes   || '')
        setEmotion(local.emotion || '')
        setTags(Array.isArray(local.tags) ? local.tags : [])
        setLoading(false)
        return
      }

      // Fall back to fetching all trades from backend
      try {
        const res = await tradesApi.list()
        const all  = res.data.trades || []
        setTrades(all)
        const found = all.find((t) => t.id === id)
        if (found) {
          setTrade(found)
          setNotes(found.notes   || '')
          setEmotion(found.emotion || '')
          setTags(Array.isArray(found.tags) ? found.tags : [])
        } else {
          setError('Trade not found.')
        }
      } catch (err) {
        setError('Failed to load trade.')
        console.error(err)
      }
      setLoading(false)
    }
    load()
  }, [id])

  // ── Helpers ────────────────────────────────────────────────
  // Support both field name formats (Supabase snake_case + old camelCase)
  const entry      = trade?.entry_price  ?? trade?.entry
  const exit       = trade?.exit_price   ?? trade?.exit
  const stop       = trade?.stop_loss    ?? trade?.stopLoss
  const qty        = trade?.quantity     ?? trade?.qty
  const tradeDate  = trade?.trade_date   ?? trade?.date
  const commission = trade?.commission   ?? 0
  const isWin      = (trade?.pnl ?? 0) > 0

  // Mini simulated price chart between entry and exit
  const priceData = useMemo(() => {
    if (!entry) return []
    const exitVal = exit || entry
    return Array.from({ length: 12 }, (_, i) => ({
      i,
      value: +(
        entry +
        (exitVal - entry) * (i / 11) +
        (Math.random() - 0.5) * Math.abs(exitVal - entry) * 0.15
      ).toFixed(2),
    }))
  }, [entry, exit])

  // ── Actions ────────────────────────────────────────────────
  function toggleTag(tag) {
    setTags((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag])
  }

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    try {
      await tradesApi.update(id, { notes, emotion, tags })
      // Update local store
      updateTrade(id, { notes, emotion, tags })
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      console.error('Save journal error:', err)
      alert('Failed to save journal. Please try again.')
    }
    setSaving(false)
  }

  async function handleDelete() {
    if (!window.confirm('Delete this trade? This cannot be undone.')) return
    setDeleting(true)
    try {
      await tradesApi.delete(id)
      deleteTrade(id)
      navigate('/trades')
    } catch (err) {
      console.error('Delete error:', err)
      alert('Failed to delete trade.')
      setDeleting(false)
    }
  }

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner />
      </div>
    )
  }

  // ── Error state ────────────────────────────────────────────
  if (error || !trade) {
    return (
      <div className="text-center py-20">
        <div className="text-[var(--txt-2)] mb-3">{error || 'Trade not found.'}</div>
        <Button variant="ghost" onClick={() => navigate('/trades')}>
          <i className="ti ti-arrow-left text-[12px]" /> Back to trade log
        </Button>
      </div>
    )
  }

  return (
    <div>
      {/* Back button */}
      <button
        onClick={() => navigate('/trades')}
        className="flex items-center gap-1.5 text-[12.5px] text-[var(--txt-2)] hover:text-[var(--txt-0)] mb-4 transition-colors"
      >
        <i className="ti ti-arrow-left text-[14px]" /> Back to trade log
      </button>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div>
          <div className="text-[22px] font-semibold text-[var(--txt-0)]">
            {trade.symbol}
          </div>
          <div className="text-[12px] text-[var(--txt-2)]">
            {trade.direction} · {trade.setup || 'No setup'} · {fmtDate(tradeDate)} · via {trade.broker || 'manual'}
          </div>
        </div>
        <Badge variant={trade.direction === 'Long' ? 'long' : 'short'} className="mt-1">
          {trade.direction}
        </Badge>
        {trade.instrument && trade.instrument !== 'Stock' && (
          <Badge variant="neutral" className="mt-1">{trade.instrument}</Badge>
        )}
        <div className="ml-auto text-right">
          <div
            className="text-[22px] font-medium font-mono"
            style={{ color: isWin ? 'var(--green)' : trade.pnl < 0 ? 'var(--red)' : 'var(--txt-1)' }}
          >
            {trade.pnl !== null ? fmtPnl(trade.pnl) : 'Open'}
          </div>
          <div className="text-[11.5px] text-[var(--txt-2)]">
            {trade.rr ? `${trade.rr > 0 ? '+' : ''}${Number(trade.rr).toFixed(1)}R` : '—'}
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-6 gap-2.5 mb-3">
        {[
          { label: 'Entry',      value: fmtPrice(entry),      color: null         },
          { label: 'Exit',       value: exit ? fmtPrice(exit) : 'Open', color: null },
          { label: 'Quantity',   value: qty || '—',           color: null         },
          { label: 'Stop loss',  value: stop ? fmtPrice(stop) : '—', color: 'var(--red)' },
          { label: 'R:R',        value: trade.rr ? `${trade.rr > 0 ? '+' : ''}${Number(trade.rr).toFixed(1)}R` : '—', color: isWin ? 'var(--green)' : 'var(--red)' },
          { label: 'Commission', value: commission ? `$${Number(commission).toFixed(2)}` : '$0.00', color: null },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-3"
          >
            <div className="text-[10px] uppercase tracking-[0.06em] text-[var(--txt-2)] mb-1.5">
              {s.label}
            </div>
            <div
              className="text-[17px] font-medium font-mono"
              style={{ color: s.color || 'var(--txt-0)' }}
            >
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Chart + Trade info */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {/* Mini price chart */}
        <Panel title="Price chart">
          <div className="p-4 pt-3">
            {!exit ? (
              <div style={{
                height:         110,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                color:          'var(--txt-2)',
                fontSize:        13,
              }}>
                Trade is still open — no exit price yet
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={110}>
                  <AreaChart data={priceData}>
                    <defs>
                      <linearGradient id="tcGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={isWin ? '#22d87a' : '#f05b6b'} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={isWin ? '#22d87a' : '#f05b6b'} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <XAxis hide />
                    <YAxis hide domain={['auto', 'auto']} />
                    <Tooltip
                      formatter={(v) => [`$${v}`, 'Price']}
                      contentStyle={{
                        background:   'var(--bg-3)',
                        border:       '1px solid var(--border-2)',
                        borderRadius:  8,
                        fontFamily:   'DM Mono',
                        fontSize:      11,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke={isWin ? '#22d87a' : '#f05b6b'}
                      strokeWidth={2}
                      fill="url(#tcGrad)"
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                <div className="flex justify-between text-[10.5px] font-mono mt-1">
                  <span className="text-[var(--txt-2)]">Entry {fmtPrice(entry)}</span>
                  <span style={{ color: isWin ? 'var(--green)' : 'var(--red)' }}>
                    Exit {fmtPrice(exit)}
                  </span>
                </div>
              </>
            )}
          </div>
        </Panel>

        {/* Trade summary */}
        <Panel title="Trade summary">
          <div className="p-4 space-y-2.5 text-[12.5px]">
            {[
              { label: 'Symbol',     value: trade.symbol                              },
              { label: 'Direction',  value: trade.direction                           },
              { label: 'Setup',      value: trade.setup      || '—'                  },
              { label: 'Instrument', value: trade.instrument || 'Stock'              },
              { label: 'Broker',     value: trade.broker     || 'manual'             },
              { label: 'Date',       value: fmtDate(tradeDate)                       },
              { label: 'Gross P&L',  value: exit && entry && qty
                  ? fmtPnl((trade.direction === 'Long' ? exit - entry : entry - exit) * qty)
                  : '—'
              },
              { label: 'Net P&L',    value: trade.pnl !== null ? fmtPnl(trade.pnl) : '—' },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between border-b border-[var(--border)] pb-2 last:border-0 last:pb-0">
                <span className="text-[var(--txt-2)]">{label}</span>
                <span className="font-mono text-[var(--txt-0)]">{value}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Journal */}
      <Panel title="Journal & tags">
        <div className="p-4 space-y-4">
          {/* Emotion */}
          <div>
            <SectionLabel>How did you feel?</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {EMOTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmotion(e === emotion ? '' : e)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                    emotion === e
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                      : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)] hover:text-[var(--txt-1)]'
                  )}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={clsx(
                    'px-3 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                    tags.includes(tag)
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                      : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)] hover:text-[var(--txt-1)]'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <SectionLabel>Notes</SectionLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
              className="w-full resize-none"
              style={{
                background:   'var(--bg-3)',
                border:       '1px solid var(--border-2)',
                borderRadius:  9,
                padding:      '9px 11px',
                color:        'var(--txt-0)',
                fontSize:      13,
                fontFamily:   'Outfit, ui-sans-serif',
                outline:      'none',
                lineHeight:    1.6,
              }}
              placeholder="What did you see? What was your thesis? What happened? What will you do differently next time?"
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-between items-center pt-1">
            <Button variant="danger" size="sm" onClick={handleDelete} disabled={deleting}>
              {deleting
                ? <><Spinner /> Deleting…</>
                : <><i className="ti ti-trash text-[12px]" /> Delete trade</>
              }
            </Button>
            <div className="flex items-center gap-2">
              {saved && (
                <span className="text-[11.5px] text-[var(--green)] font-medium">
                  ✓ Journal saved
                </span>
              )}
              <Button variant="accent" size="sm" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><Spinner /> Saving…</>
                  : <><i className="ti ti-check text-[12px]" /> Save journal</>
                }
              </Button>
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}