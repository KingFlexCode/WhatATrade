import React, { useState, useMemo, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Panel, Button, EmptyState } from '../components/ui'
import { fmtPnl } from '../utils/helpers'
import { tradesApi } from '../services/api'
import clsx from 'clsx'

const COLORS = [
  '#378ADD', '#22d87a', '#a78bfa', '#f0b45b',
  '#f05b6b', '#00b4d8', '#ff7f50', '#7b6eff',
]

const DEFAULT_SETUPS = [
  'Breakout', 'Mean reversion', 'VWAP bounce',
  'Trend follow', 'Gap and go', 'Reversal',
]

function PlaybookForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:  initial?.name  || '',
    desc:  initial?.desc  || '',
    rules: initial?.rules || '',
    color: initial?.color || COLORS[0],
  })

  const inp = {
    padding:      '8px 11px',
    borderRadius:  9,
    border:       '1px solid var(--border-2)',
    background:   'var(--bg-3)',
    color:        'var(--txt-0)',
    fontSize:      13,
    fontFamily:   'Outfit, sans-serif',
    outline:      'none',
    width:        '100%',
  }

  const lbl = {
    fontSize:      10,
    fontWeight:    500,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    color:         'var(--txt-2)',
    display:       'block',
    marginBottom:   4,
  }

  return (
    <div style={{
      background:   'var(--bg-2)',
      border:       '1px solid var(--border-2)',
      borderRadius:  14,
      padding:      '18px 20px',
      marginBottom:  12,
    }}>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 14 }}>
        {initial ? 'Edit playbook' : 'New playbook'}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 14 }}>
        <div>
          <label style={lbl}>Setup name</label>
          <input
            style={inp}
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Breakout, VWAP bounce, Mean reversion…"
            list="setup-suggestions"
          />
          <datalist id="setup-suggestions">
            {DEFAULT_SETUPS.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>

        <div>
          <label style={lbl}>Description</label>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 64, lineHeight: 1.6 }}
            value={form.desc}
            onChange={(e) => setForm((p) => ({ ...p, desc: e.target.value }))}
            placeholder="What is this setup? When do you use it?"
          />
        </div>

        <div>
          <label style={lbl}>Entry rules</label>
          <textarea
            style={{ ...inp, resize: 'vertical', minHeight: 80, lineHeight: 1.6 }}
            value={form.rules}
            onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))}
            placeholder="1. Price breaks above resistance on volume&#10;2. RSI > 60&#10;3. Entry on pullback to breakout level"
          />
        </div>

        <div>
          <label style={lbl}>Color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setForm((p) => ({ ...p, color: c }))}
                style={{
                  width:        24,
                  height:       24,
                  borderRadius: '50%',
                  background:    c,
                  border:       `2px solid ${form.color === c ? '#fff' : 'transparent'}`,
                  cursor:       'pointer',
                  transition:   'border .15s',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => {
            if (!form.name.trim()) { alert('Playbook name is required.'); return }
            onSave(form)
          }}
          style={{
            padding:    '7px 16px',
            borderRadius: 9,
            background: 'var(--accent)',
            color:      '#fff',
            border:     'none',
            fontSize:    13,
            fontFamily: 'Outfit, sans-serif',
            fontWeight:  500,
            cursor:     'pointer',
            display:    'flex',
            alignItems: 'center',
            gap:         6,
          }}
        >
          <i className="ti ti-check text-[12px]" />
          {initial ? 'Save changes' : 'Create playbook'}
        </button>
        <button
          onClick={onCancel}
          style={{
            padding:    '7px 14px',
            borderRadius: 9,
            border:     '1px solid var(--border-2)',
            background: 'transparent',
            color:      'var(--txt-2)',
            fontSize:    13,
            fontFamily: 'Outfit, sans-serif',
            cursor:     'pointer',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function PlaybooksPage() {
  const { trades, setTrades } = useStore()
  const [playbooks, setPlaybooks] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [creating,  setCreating]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [expanded,  setExpanded]  = useState(null)

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

  // Load saved playbooks from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('whatatrade-playbooks')
      if (saved) setPlaybooks(JSON.parse(saved))
    } catch {}
  }, [])

  function save(pbs) {
    setPlaybooks(pbs)
    try { localStorage.setItem('whatatrade-playbooks', JSON.stringify(pbs)) } catch {}
  }

  function handleCreate(form) {
    const newPb = {
      id:        Date.now().toString(),
      name:      form.name.trim(),
      desc:      form.desc.trim(),
      rules:     form.rules.trim(),
      color:     form.color,
      createdAt: new Date().toISOString(),
    }
    save([...playbooks, newPb])
    setCreating(false)
    setExpanded(newPb.id)
  }

  function handleEdit(form) {
    save(playbooks.map((pb) => pb.id === editing.id
      ? { ...pb, name: form.name, desc: form.desc, rules: form.rules, color: form.color }
      : pb
    ))
    setEditing(null)
  }

  function handleDelete(id) {
    if (!window.confirm('Delete this playbook?')) return
    save(playbooks.filter((pb) => pb.id !== id))
    if (expanded === id) setExpanded(null)
  }

  // Compute real stats per setup from trade data
  const statsBySetup = useMemo(() => {
    const map = {}
    trades.forEach((t) => {
      if (!t.setup || t.pnl === null) return
      if (!map[t.setup]) map[t.setup] = { wins: 0, total: 0, pnl: 0, rrs: [] }
      map[t.setup].total++
      map[t.setup].pnl += t.pnl || 0
      if (t.pnl > 0) map[t.setup].wins++
      if (t.rr) map[t.setup].rrs.push(+t.rr)
    })
    const result = {}
    Object.entries(map).forEach(([setup, d]) => {
      const avgRR = d.rrs.length
        ? (d.rrs.reduce((s, r) => s + r, 0) / d.rrs.length).toFixed(1)
        : null
      result[setup] = {
        wins:    d.wins,
        total:   d.total,
        pnl:     d.pnl,
        winRate: Math.round((d.wins / d.total) * 100),
        avgRR,
      }
    })
    return result
  }, [trades])

  // Also build stats for setups in trades that don't have a playbook yet
  const unlinkedSetups = useMemo(() => {
    const pbNames = new Set(playbooks.map((pb) => pb.name.toLowerCase()))
    return Object.keys(statsBySetup).filter((s) => !pbNames.has(s.toLowerCase()))
  }, [playbooks, statsBySetup])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--txt-2)' }}>
          Define your setups. Stats update automatically from your trade log.
        </div>
        {!creating && (
          <button
            onClick={() => { setCreating(true); setEditing(null) }}
            style={{
              padding:    '6px 14px',
              borderRadius: 9,
              background: 'var(--accent)',
              color:      '#fff',
              border:     'none',
              fontSize:    13,
              fontFamily: 'Outfit, sans-serif',
              fontWeight:  500,
              cursor:     'pointer',
              display:    'flex',
              alignItems: 'center',
              gap:         6,
            }}
          >
            <i className="ti ti-plus text-[12px]" /> New playbook
          </button>
        )}
      </div>

      {/* Create form */}
      {creating && (
        <PlaybookForm
          onSave={handleCreate}
          onCancel={() => setCreating(false)}
        />
      )}

      {/* Playbook list */}
      {playbooks.length === 0 && !creating ? (
        <div style={{
          textAlign:    'center',
          padding:      '48px 24px',
          background:   'var(--bg-2)',
          border:       '1px solid var(--border)',
          borderRadius:  14,
        }}>
          <i className="ti ti-book-2" style={{ fontSize: 32, color: 'var(--txt-2)', display: 'block', marginBottom: 10 }} />
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 6 }}>
            No playbooks yet
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
            Create your first playbook to define and track your trading setups.
          </div>
          <button
            onClick={() => setCreating(true)}
            style={{
              padding:    '7px 16px',
              borderRadius: 9,
              background: 'var(--accent)',
              color:      '#fff',
              border:     'none',
              fontSize:    13,
              fontFamily: 'Outfit, sans-serif',
              cursor:     'pointer',
            }}
          >
            Create first playbook
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {playbooks.map((pb) => {
            const stats   = statsBySetup[pb.name] || null
            const isOpen  = expanded === pb.id
            const isEdit  = editing?.id === pb.id

            if (isEdit) {
              return (
                <PlaybookForm
                  key={pb.id}
                  initial={pb}
                  onSave={handleEdit}
                  onCancel={() => setEditing(null)}
                />
              )
            }

            return (
              <div
                key={pb.id}
                style={{
                  background:   'var(--bg-2)',
                  border:      `1px solid ${isOpen ? 'var(--border-2)' : 'var(--border)'}`,
                  borderRadius:  14,
                  overflow:     'hidden',
                  transition:   'border-color .15s',
                }}
              >
                {/* Header row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : pb.id)}
                  style={{
                    padding:    '14px 16px',
                    cursor:     'pointer',
                    display:    'flex',
                    alignItems: 'center',
                    gap:         12,
                  }}
                >
                  {/* Color dot */}
                  <span style={{
                    width:        8, height: 8,
                    borderRadius: '50%',
                    background:    pb.color,
                    flexShrink:    0,
                  }} />

                  {/* Name + desc */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)' }}>
                      {pb.name}
                    </div>
                    {pb.desc && (
                      <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {pb.desc}
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  {stats ? (
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', fontSize: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', color: stats.winRate >= 60 ? 'var(--green)' : 'var(--amber)', fontWeight: 500 }}>
                          {stats.winRate}%
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Win rate</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', color: 'var(--txt-0)', fontWeight: 500 }}>
                          {stats.total}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Trades</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontFamily: 'DM Mono, monospace', color: stats.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                          {fmtPnl(Math.round(stats.pnl))}
                        </div>
                        <div style={{ fontSize: 9.5, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Net P&L</div>
                      </div>
                      {stats.avgRR && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', color: 'var(--txt-0)', fontWeight: 500 }}>
                            {stats.avgRR}R
                          </div>
                          <div style={{ fontSize: 9.5, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Avg R</div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11.5, color: 'var(--txt-2)', fontStyle: 'italic' }}>
                      No trades logged yet
                    </div>
                  )}

                  {/* Chevron */}
                  <i
                    className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`}
                    style={{ fontSize: 14, color: 'var(--txt-2)', flexShrink: 0 }}
                  />
                </div>

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px 16px' }}>

                    {/* Win rate bar */}
                    {stats && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, marginBottom: 5 }}>
                          <span style={{ color: 'var(--txt-2)' }}>{stats.wins}W / {stats.total - stats.wins}L</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', color: stats.winRate >= 60 ? 'var(--green)' : 'var(--amber)' }}>
                            {stats.winRate}% win rate
                          </span>
                        </div>
                        <div style={{ height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height:     '100%',
                            width:      `${stats.winRate}%`,
                            background:  stats.winRate >= 60 ? 'var(--green)' : 'var(--amber)',
                            borderRadius: 3,
                            transition: 'width .3s',
                          }} />
                        </div>
                      </div>
                    )}

                    {/* Description */}
                    {pb.desc && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--txt-2)', marginBottom: 4 }}>
                          About
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--txt-1)', lineHeight: 1.6 }}>
                          {pb.desc}
                        </div>
                      </div>
                    )}

                    {/* Rules */}
                    {pb.rules && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.07em', color: 'var(--txt-2)', marginBottom: 6 }}>
                          Entry rules
                        </div>
                        <div style={{
                          background:   'var(--bg-3)',
                          border:       '1px solid var(--border)',
                          borderRadius:  9,
                          padding:      '10px 12px',
                          fontSize:      12.5,
                          color:        'var(--txt-1)',
                          lineHeight:    1.7,
                          whiteSpace:   'pre-line',
                        }}>
                          {pb.rules}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={() => setEditing(pb)}
                        style={{
                          padding:    '5px 12px',
                          borderRadius: 8,
                          border:     '1px solid var(--border-2)',
                          background: 'var(--bg-3)',
                          color:      'var(--txt-1)',
                          fontSize:    12,
                          cursor:     'pointer',
                          fontFamily: 'Outfit, sans-serif',
                          display:    'flex',
                          alignItems: 'center',
                          gap:         5,
                        }}
                      >
                        <i className="ti ti-pencil text-[11px]" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(pb.id)}
                        style={{
                          padding:    '5px 12px',
                          borderRadius: 8,
                          border:     '1px solid rgba(240,91,107,.3)',
                          background: 'rgba(240,91,107,.08)',
                          color:      'var(--red)',
                          fontSize:    12,
                          cursor:     'pointer',
                          fontFamily: 'Outfit, sans-serif',
                          display:    'flex',
                          alignItems: 'center',
                          gap:         5,
                        }}
                      >
                        <i className="ti ti-trash text-[11px]" /> Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Unlinked setups — trades logged with a setup that has no playbook */}
      {unlinkedSetups.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 10 }}>
            <i className="ti ti-info-circle text-[13px]" style={{ marginRight: 5 }} />
            You have trades with these setups but no matching playbook:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {unlinkedSetups.map((setup) => {
              const stats = statsBySetup[setup]
              return (
                <div
                  key={setup}
                  style={{
                    padding:      '8px 12px',
                    borderRadius:  10,
                    background:   'var(--bg-2)',
                    border:       '1px solid var(--border)',
                    fontSize:      12.5,
                  }}
                >
                  <div style={{ fontWeight: 500, color: 'var(--txt-0)', marginBottom: 3 }}>{setup}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt-2)', fontFamily: 'DM Mono, monospace' }}>
                    {stats.total}t · {stats.winRate}% WR · {fmtPnl(Math.round(stats.pnl))}
                  </div>
                  <button
                    onClick={() => {
                      setCreating(true)
                    }}
                    style={{
                      marginTop:  6,
                      fontSize:   10.5,
                      color:      'var(--accent)',
                      background: 'none',
                      border:     'none',
                      cursor:     'pointer',
                      fontFamily: 'Outfit, sans-serif',
                      padding:    0,
                    }}
                  >
                    + Create playbook →
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}