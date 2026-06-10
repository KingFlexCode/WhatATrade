import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Panel, Button, SectionLabel } from '../components/ui'
import { computePnl, computeRR, fmtPnl } from '../utils/helpers'
import { tradesApi } from '../services/api'
import clsx from 'clsx'

const TICKERS = [
  ['AAPL','Apple Inc'],['MSFT','Microsoft'],['NVDA','NVIDIA'],['TSLA','Tesla'],
  ['AMZN','Amazon'],['GOOGL','Alphabet'],['META','Meta'],['AMD','AMD'],
  ['SPY','SPDR S&P 500 ETF'],['QQQ','Invesco QQQ'],['IWM','iShares Russell 2000'],
  ['GLD','SPDR Gold'],['TLT','iShares 20yr Treasury'],['COIN','Coinbase'],
  ['PLTR','Palantir'],['HOOD','Robinhood'],['RIVN','Rivian'],['UBER','Uber'],
  ['DIS','Disney'],['NFLX','Netflix'],['BABA','Alibaba'],['NIO','NIO'],
  ['SHOP','Shopify'],['SQ','Block Inc'],['RBLX','Roblox'],
]

const EMOTIONS = ['Confident','Focused','FOMO','Fearful','Greedy','Disciplined']
const ALL_TAGS  = ['followed plan','early exit','oversize','revenge trade','news catalyst','gap play']
const SETUPS    = ['Breakout','Mean reversion','VWAP bounce','Trend follow','Custom']

export default function LogTradePage() {
  const navigate = useNavigate()
  const { addTrade, settings } = useStore()

  const [apiKey,   setApiKey]   = useState('')
  const [symInput, setSymInput] = useState('')
  const [dropdown, setDropdown] = useState([])
  const [quote,    setQuote]    = useState(null)
  const [loading,  setLoading]  = useState(false)
  const [quoteErr, setQuoteErr] = useState('')
  const [saving,   setSaving]   = useState(false)

  const [form, setForm] = useState({
    symbol:     '',
    date:       new Date().toISOString().slice(0, 10),
    direction:  'Long',
    setup:      'Breakout',
    instrument: 'Stock',
    qty:        '',
    entry:      '',
    exit:       '',
    stopLoss:   '',
    commission: '',
    emotion:    '',
    tags:       [],
    notes:      '',
  })

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

  function toggleTag(t) {
    setForm((p) => ({
      ...p,
      tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t],
    }))
  }

  function setEmotion(e) {
    setForm((p) => ({ ...p, emotion: p.emotion === e ? '' : e }))
  }

  function onSymInput(val) {
    setSymInput(val)
    const q = val.toUpperCase()
    if (!q) { setDropdown([]); return }
    setDropdown(
      TICKERS.filter(([s, n]) => s.startsWith(q) || n.toUpperCase().includes(q)).slice(0, 6)
    )
  }

  function selectSym(sym) {
    setSymInput(sym)
    setForm((p) => ({ ...p, symbol: sym }))
    setDropdown([])
    if (apiKey) fetchQuote(sym)
  }

  async function fetchQuote(sym) {
    if (!apiKey) return
    setLoading(true)
    setQuoteErr('')
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`)
      const data = await res.json()
      if (!data.c || data.c === 0) {
        setQuoteErr(`No price found for "${sym}"`)
        setQuote(null)
      } else {
        setQuote({
          sym,
          price:  data.c,
          high:   data.h,
          low:    data.l,
          open:   data.o,
          prev:   data.pc,
          change: data.d,
          pct:    data.dp,
        })
      }
    } catch {
      setQuoteErr('Request failed — check your API key.')
    }
    setLoading(false)
  }

  const pnl = useMemo(() => computePnl({
    direction: form.direction,
    quantity:  +form.qty,
    entry:     +form.entry,
    exit:      +form.exit,
    commission:+form.commission,
  }), [form])

  const rr = useMemo(() => computeRR({
    direction: form.direction,
    entry:     +form.entry,
    exit:      +form.exit,
    stopLoss:  +form.stopLoss,
  }), [form])

  const riskAmt    = settings.accountBalance * (settings.riskPerTrade / 100)
  const stopDist   = form.stopLoss && form.entry ? Math.abs(+form.entry - +form.stopLoss) : 0
  const suggestQty = stopDist > 0 ? Math.floor(riskAmt / stopDist) : null

  async function handleSave() {
    if (!form.symbol || !form.qty || !form.entry) {
      alert('Symbol, quantity and entry price are required.')
      return
    }
    setSaving(true)
    try {
      const res = await tradesApi.create({
        symbol:      form.symbol.toUpperCase(),
        direction:   form.direction,
        quantity:    +form.qty,
        entry_price: +form.entry,
        exit_price:  +form.exit     || null,
        stop_loss:   +form.stopLoss || null,
        commission:  +form.commission || 0,
        setup:       form.setup,
        instrument:  form.instrument,
        emotion:     form.emotion,
        tags:        form.tags,
        notes:       form.notes,
        trade_date:  form.date,
        broker:      'manual',
      })
      // Add to local store immediately so it shows in list right away
      const saved = res.data?.trades?.[0]
      if (saved) addTrade(saved)
      navigate('/trades')
    } catch (err) {
      console.error('Save trade error:', err)
      alert(err.response?.data?.error || 'Failed to save trade.')
    }
    setSaving(false)
  }

  const inp = {
    padding:     '8px 11px',
    borderRadius: 9,
    border:      '1px solid var(--border-2)',
    background:  'var(--bg-3)',
    color:       'var(--txt-0)',
    fontSize:    13,
    fontFamily:  'Outfit, sans-serif',
    outline:     'none',
    width:       '100%',
  }

  const lbl = {
    fontSize:      10,
    fontWeight:    500,
    textTransform: 'uppercase',
    letterSpacing: '.07em',
    color:         'var(--txt-2)',
    display:       'block',
    marginBottom:  4,
  }

  return (
    <div>
      <button
        onClick={() => navigate('/trades')}
        className="flex items-center gap-1.5 text-[12.5px] text-[var(--txt-2)] hover:text-[var(--txt-0)] mb-4 transition-colors"
      >
        <i className="ti ti-arrow-left text-[14px]" /> Back
      </button>

      <div className="grid grid-cols-[1fr_300px] gap-3">
        {/* Main form */}
        <Panel title="Log a trade">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">

              {/* Symbol search */}
              <div className="relative col-span-2">
                <SectionLabel>Symbol</SectionLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={symInput}
                      onChange={(e) => onSymInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && selectSym(symInput.toUpperCase())}
                      placeholder="AAPL, TSLA, SPY…"
                      style={{ ...inp, textTransform: 'uppercase' }}
                    />
                    {dropdown.length > 0 && (
                      <div style={{
                        position:   'absolute',
                        top:        '100%',
                        left:        0,
                        right:       0,
                        marginTop:   4,
                        background: 'var(--bg-2)',
                        border:     '1px solid var(--border-2)',
                        borderRadius: 9,
                        zIndex:      20,
                        overflow:   'hidden',
                      }}>
                        {dropdown.map(([s, n]) => (
                          <div
                            key={s}
                            onClick={() => selectSym(s)}
                            style={{
                              display:    'flex',
                              gap:         12,
                              alignItems: 'center',
                              padding:    '10px 14px',
                              fontSize:    12.5,
                              cursor:     'pointer',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-3)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <span style={{ fontWeight: 500, color: 'var(--txt-0)', minWidth: 56 }}>{s}</span>
                            <span style={{ color: 'var(--txt-2)', fontSize: 11.5 }}>{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchQuote(symInput.toUpperCase())}
                    disabled={loading}
                  >
                    {loading
                      ? <span className="spinner" />
                      : <><i className="ti ti-search text-[12px]" /> Quote</>
                    }
                  </Button>
                </div>
                {quoteErr && (
                  <div style={{ fontSize: 11.5, color: 'var(--red)', marginTop: 4 }}>{quoteErr}</div>
                )}
              </div>

              <div>
                <label style={lbl}>Date</label>
                <input type="date" style={inp} value={form.date} onChange={setF('date')} />
              </div>

              <div>
                <label style={lbl}>Direction</label>
                <select style={inp} value={form.direction} onChange={setF('direction')}>
                  <option>Long</option>
                  <option>Short</option>
                </select>
              </div>

              <div>
                <label style={lbl}>Instrument</label>
                <select style={inp} value={form.instrument} onChange={setF('instrument')}>
                  <option>Stock</option>
                  <option>Options</option>
                  <option>Futures</option>
                  <option>ETF</option>
                  <option>Forex</option>
                </select>
              </div>

              <div>
                <label style={lbl}>Setup</label>
                <select style={inp} value={form.setup} onChange={setF('setup')}>
                  {SETUPS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label style={lbl}>Entry price</label>
                <input
                  type="number" step="0.01" style={inp}
                  placeholder="0.00" value={form.entry} onChange={setF('entry')}
                />
                {quote && (
                  <button
                    onClick={() => setForm((p) => ({ ...p, entry: quote.price.toFixed(2) }))}
                    style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                  >
                    <i className="ti ti-bolt text-[11px]" /> Use live ${quote.price.toFixed(2)}
                  </button>
                )}
              </div>

              <div>
                <label style={lbl}>Exit price</label>
                <input
                  type="number" step="0.01" style={inp}
                  placeholder="0.00 (leave blank if open)"
                  value={form.exit} onChange={setF('exit')}
                />
              </div>

              <div>
                <label style={lbl}>Quantity / shares</label>
                <input
                  type="number" style={inp}
                  placeholder="100" value={form.qty} onChange={setF('qty')}
                />
                {suggestQty && (
                  <div style={{ fontSize: 10.5, color: 'var(--txt-2)', marginTop: 3 }}>
                    Suggested:{' '}
                    <button
                      onClick={() => setForm((p) => ({ ...p, qty: String(suggestQty) }))}
                      style={{ color: 'var(--accent)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontSize: 10.5 }}
                    >
                      {suggestQty} shares
                    </button>{' '}
                    (1% risk)
                  </div>
                )}
              </div>

              <div>
                <label style={lbl}>Stop loss</label>
                <input
                  type="number" step="0.01" style={inp}
                  placeholder="0.00" value={form.stopLoss} onChange={setF('stopLoss')}
                />
              </div>

              <div>
                <label style={lbl}>Commission ($)</label>
                <input
                  type="number" step="0.01" style={inp}
                  placeholder="0.00" value={form.commission} onChange={setF('commission')}
                />
              </div>

              {/* Emotion */}
              <div className="col-span-2">
                <SectionLabel>Emotion</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {EMOTIONS.map((e) => (
                    <button
                      key={e}
                      onClick={() => setEmotion(e)}
                      className={clsx(
                        'px-3 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                        form.emotion === e
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                          : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)]'
                      )}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="col-span-2">
                <SectionLabel>Tags</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={clsx(
                        'px-3 py-1 rounded-full text-[11px] border transition-all cursor-pointer',
                        form.tags.includes(tag)
                          ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                          : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)]'
                      )}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="col-span-2">
                <SectionLabel>Notes</SectionLabel>
                <textarea
                  value={form.notes}
                  onChange={setF('notes')}
                  rows={4}
                  style={{ ...inp, resize: 'vertical', minHeight: 80 }}
                  placeholder="What did you see? What happened? What will you do differently?"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => navigate('/trades')}>Cancel</Button>
              <Button variant="accent" onClick={handleSave} disabled={saving}>
                {saving
                  ? <><span className="spinner" /> Saving…</>
                  : <><i className="ti ti-check text-[12px]" /> Save trade</>
                }
              </Button>
            </div>
          </div>
        </Panel>

        {/* Right panel — live quote + P&L preview */}
        <div className="flex flex-col gap-3">
          {/* Finnhub key */}
          <Panel title="Live quote (optional)">
            <div className="p-3.5">
              <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 8 }}>
                Free API key at{' '}
                <a href="https://finnhub.io" target="_blank" style={{ color: 'var(--accent)' }}>
                  finnhub.io
                </a>
              </div>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Paste Finnhub API key…"
                style={{ ...inp, fontSize: 12, fontFamily: 'DM Mono, monospace' }}
              />
              {quote && (
                <div style={{
                  marginTop:    12,
                  padding:      12,
                  background:  'var(--bg-3)',
                  border:      '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{quote.sym}</div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 18, fontFamily: 'DM Mono, monospace', fontWeight: 500 }}>
                        ${quote.price.toFixed(2)}
                      </div>
                      <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: quote.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {quote.change >= 0 ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.pct).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', fontSize: 11 }}>
                    {[['Open', quote.open],['High', quote.high],['Low', quote.low],['Prev', quote.prev]].map(([l, v]) => (
                      <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--txt-2)' }}>{l}</span>
                        <span style={{ fontFamily: 'DM Mono, monospace' }}>${v?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* P&L Preview */}
          <Panel title="P&L preview">
            <div className="p-3.5">
              <div style={{
                borderRadius: 9,
                padding:      '10px 12px',
                border:      `1px solid ${pnl === null ? 'var(--border)' : pnl >= 0 ? 'var(--green-border)' : 'var(--red-border)'}`,
                background:   pnl === null ? 'var(--bg-3)' : pnl >= 0 ? 'var(--green-dim)' : 'var(--red-dim)',
              }}>
                <div style={{ fontSize: 10.5, color: 'var(--txt-2)', marginBottom: 4 }}>
                  Estimated P&L (after fees)
                </div>
                <div style={{
                  fontSize:    20,
                  fontWeight:  500,
                  fontFamily: 'DM Mono, monospace',
                  color:       pnl === null ? 'var(--txt-1)' : pnl >= 0 ? 'var(--green)' : 'var(--red)',
                }}>
                  {pnl !== null ? fmtPnl(pnl) : 'Fill entry, exit & qty'}
                </div>
                {rr !== null && (
                  <div style={{
                    fontSize:   11.5,
                    fontFamily:'DM Mono, monospace',
                    marginTop:  4,
                    color:      rr >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {rr.toFixed(2)}R risk/reward
                  </div>
                )}
              </div>

              {/* Position sizer */}
              {suggestQty && (
                <div style={{ marginTop: 12, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[
                    ['Max risk (1%)',   `$${riskAmt.toFixed(0)}`,             'var(--red)'],
                    ['Suggested shares', suggestQty,                          'var(--txt-0)'],
                    ['Position size',   `$${(suggestQty * +form.entry).toFixed(0)}`, 'var(--accent)'],
                  ].map(([l, v, col]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--txt-2)' }}>{l}</span>
                      <span style={{ fontFamily: 'DM Mono, monospace', color: col }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}