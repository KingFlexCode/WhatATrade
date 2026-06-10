import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Panel, Button, SectionLabel } from '../components/ui'
import { computePnl, computeRR, fmtPnl } from '../utils/helpers'
import clsx from 'clsx'
import { tradesApi } from '../services/api'

const TICKERS = [
  ['AAPL','Apple Inc'],['MSFT','Microsoft'],['NVDA','NVIDIA'],['TSLA','Tesla'],
  ['AMZN','Amazon'],['GOOGL','Alphabet'],['META','Meta Platforms'],['AMD','AMD'],
  ['SPY','SPDR S&P 500 ETF'],['QQQ','Invesco QQQ'],['IWM','iShares Russell 2000'],
  ['GLD','SPDR Gold'],['TLT','iShares 20yr Treasury'],['COIN','Coinbase'],
  ['PLTR','Palantir'],['HOOD','Robinhood'],['RIVN','Rivian'],['UBER','Uber'],
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

  const [form, setForm] = useState({
    symbol:'', date: new Date().toISOString().slice(0,10), direction:'Long',
    setup:'Breakout', instrument:'Stock', qty:'', entry:'', exit:'', stopLoss:'', commission:'',
    emotion:'', tags:[], notes:'',
  })

  function setF(k) { return (e) => setForm((p) => ({ ...p, [k]: e.target.value })) }
  function toggleTag(t)  { setForm((p) => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter((x) => x !== t) : [...p.tags, t] })) }
  function setEmotion(e) { setForm((p) => ({ ...p, emotion: p.emotion === e ? '' : e })) }

  function onSymInput(val) {
    setSymInput(val)
    const q = val.toUpperCase()
    if (!q) { setDropdown([]); return }
    setDropdown(TICKERS.filter(([s, n]) => s.startsWith(q) || n.toUpperCase().includes(q)).slice(0, 6))
  }

  function selectSym(sym) {
    setSymInput(sym)
    setForm((p) => ({ ...p, symbol: sym }))
    setDropdown([])
    if (apiKey) fetchQuote(sym)
  }

  async function fetchQuote(sym) {
    if (!apiKey) return
    setLoading(true); setQuoteErr('')
    try {
      const res  = await fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${apiKey}`)
      const data = await res.json()
      if (!data.c || data.c === 0) { setQuoteErr(`No price found for "${sym}"`); setQuote(null) }
      else { setQuote({ sym, price: data.c, high: data.h, low: data.l, open: data.o, prev: data.pc, change: data.d, pct: data.dp }) }
    } catch { setQuoteErr('Request failed — check your API key.') }
    setLoading(false)
  }

  const pnl = computePnl({ direction: form.direction, quantity: +form.qty, entry: +form.entry, exit: +form.exit, commission: +form.commission })
  const rr  = computeRR({ direction: form.direction, entry: +form.entry, exit: +form.exit, stopLoss: +form.stopLoss })

  // Position sizer
  const riskAmt   = settings.accountBalance * (settings.riskPerTrade / 100)
  const stopDist  = form.stopLoss && form.entry ? Math.abs(+form.entry - +form.stopLoss) : 0
  const suggestQty = stopDist > 0 ? Math.floor(riskAmt / stopDist) : null

  async function handleSave() {
  if (!form.symbol || !form.qty || !form.entry) {
    alert('Symbol, quantity and entry price are required.')
    return
  }
  try {
    await tradesApi.create({
      symbol:     form.symbol.toUpperCase(),
      direction:  form.direction,
      quantity:   +form.qty,
      entry_price: +form.entry,
      exit_price:  +form.exit || null,
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
    navigate('/trades')
  } catch (err) {
    console.error('Save trade error:', err)
    alert('Failed to save trade. Check console for details.')
  }
}

  return (
    <div>
      <button onClick={() => navigate('/trades')}
        className="flex items-center gap-1.5 text-[12.5px] text-[var(--txt-2)] hover:text-[var(--txt-0)] mb-4 transition-colors">
        <i className="ti ti-arrow-left text-[14px]" /> Back
      </button>

      <div className="grid grid-cols-[1fr_320px] gap-3">
        {/* Main form */}
        <Panel title="Log a trade">
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">

              {/* Symbol with search */}
              <div className="relative col-span-2">
                <SectionLabel>Symbol</SectionLabel>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input value={symInput} onChange={(e) => onSymInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && selectSym(symInput.toUpperCase())}
                      placeholder="AAPL, TSLA, SPY…"
                      className="uppercase tracking-[0.05em] placeholder:normal-case placeholder:tracking-normal" />
                    {dropdown.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-2)] border border-[var(--border-2)] rounded-xl z-20 overflow-hidden">
                        {dropdown.map(([s, n]) => (
                          <div key={s} onClick={() => selectSym(s)}
                            className="flex gap-3 items-center px-3.5 py-2.5 text-[12.5px] cursor-pointer hover:bg-[var(--bg-3)] transition-colors">
                            <span className="font-medium text-[var(--txt-0)] min-w-[56px]">{s}</span>
                            <span className="text-[var(--txt-2)] text-[11.5px] truncate">{n}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => fetchQuote(symInput.toUpperCase())} disabled={loading}>
                    {loading ? <span className="spinner" /> : <><i className="ti ti-search text-[12px]" /> Quote</>}
                  </Button>
                </div>
                {quoteErr && <div className="text-[11.5px] text-[var(--red)] mt-1">{quoteErr}</div>}
              </div>

              <div><SectionLabel>Date</SectionLabel><input type="date" value={form.date} onChange={setF('date')} /></div>
              <div><SectionLabel>Direction</SectionLabel>
                <select value={form.direction} onChange={setF('direction')}>
                  <option>Long</option><option>Short</option>
                </select>
              </div>
              <div><SectionLabel>Instrument</SectionLabel>
                <select value={form.instrument} onChange={setF('instrument')}>
                  <option>Stock</option><option>Options</option><option>Futures</option><option>ETF</option><option>Forex</option>
                </select>
              </div>
              <div><SectionLabel>Setup</SectionLabel>
                <select value={form.setup} onChange={setF('setup')}>
                  {SETUPS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <SectionLabel>Entry price</SectionLabel>
                <input type="number" step="0.01" value={form.entry} onChange={setF('entry')} placeholder="0.00" />
                {quote && (
                  <button onClick={() => setForm((p) => ({ ...p, entry: quote.price.toFixed(2) }))}
                    className="text-[11px] text-[var(--accent)] mt-1 flex items-center gap-1 hover:underline">
                    <i className="ti ti-bolt text-[11px]" /> Use live ${quote.price.toFixed(2)}
                  </button>
                )}
              </div>
              <div><SectionLabel>Exit price</SectionLabel><input type="number" step="0.01" value={form.exit} onChange={setF('exit')} placeholder="0.00 (leave blank if open)" /></div>
              <div>
                <SectionLabel>Quantity / shares</SectionLabel>
                <input type="number" value={form.qty} onChange={setF('qty')} placeholder="100" />
                {suggestQty && <div className="text-[10.5px] text-[var(--txt-2)] mt-1">Suggested: <button onClick={() => setForm((p) => ({...p, qty: suggestQty}))} className="text-[var(--accent)] hover:underline">{suggestQty} shares</button> (1% risk)</div>}
              </div>
              <div><SectionLabel>Stop loss</SectionLabel><input type="number" step="0.01" value={form.stopLoss} onChange={setF('stopLoss')} placeholder="0.00" /></div>
              <div><SectionLabel>Commission ($)</SectionLabel><input type="number" step="0.01" value={form.commission} onChange={setF('commission')} placeholder="0.00" /></div>
            </div>

            <SectionLabel>Emotion</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {EMOTIONS.map((e) => (
                <button key={e} onClick={() => setEmotion(e)}
                  className={clsx('px-3 py-1 rounded-full text-[11px] border transition-all',
                    form.emotion === e
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                      : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)]'
                  )}>
                  {e}
                </button>
              ))}
            </div>

            <SectionLabel>Tags</SectionLabel>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {ALL_TAGS.map((tag) => (
                <button key={tag} onClick={() => toggleTag(tag)}
                  className={clsx('px-3 py-1 rounded-full text-[11px] border transition-all',
                    form.tags.includes(tag)
                      ? 'bg-[var(--accent-dim)] text-[var(--accent)] border-[var(--accent-border)]'
                      : 'bg-[var(--bg-3)] text-[var(--txt-2)] border-[var(--border)]'
                  )}>
                  {tag}
                </button>
              ))}
            </div>

            <SectionLabel>Notes</SectionLabel>
            <textarea value={form.notes} onChange={setF('notes')} rows={4} className="resize-none mb-4"
              placeholder="What did you see? What happened? What will you do differently?" />

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => navigate('/trades')}>Cancel</Button>
              <Button variant="accent" onClick={handleSave}><i className="ti ti-check text-[12px]" /> Save trade</Button>
            </div>
          </div>
        </Panel>

        {/* Right: live quote + P&L preview */}
        <div className="flex flex-col gap-3">
          {/* Finnhub key */}
          <Panel title="Live quote">
            <div className="p-3.5">
              <div className="text-[11.5px] text-[var(--txt-2)] mb-2">
                Free at <a href="https://finnhub.io" target="_blank" className="text-[var(--accent)]">finnhub.io</a>
              </div>
              <div className="flex gap-2">
                <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key…" className="text-[12px] font-mono" />
              </div>
              {quote && (
                <div className="mt-3 p-3 bg-[var(--bg-3)] border border-[var(--border)] rounded-xl">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-[15px] font-semibold">{quote.sym}</div>
                    <div className="text-right">
                      <div className="text-[18px] font-mono font-medium">${quote.price.toFixed(2)}</div>
                      <div className="text-[11px] font-mono" style={{ color: quote.change >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        {quote.change >= 0 ? '▲' : '▼'} {Math.abs(quote.change).toFixed(2)} ({Math.abs(quote.pct).toFixed(2)}%)
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
                    {[['Open', quote.open],['High', quote.high],['Low', quote.low],['Prev', quote.prev]].map(([l,v]) => (
                      <div key={l} className="flex justify-between">
                        <span className="text-[var(--txt-2)]">{l}</span>
                        <span className="font-mono">${v?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>

          {/* P&L preview */}
          <Panel title="P&L preview">
            <div className="p-3.5">
              <div className={clsx(
                'rounded-xl p-3 border',
                pnl === null ? 'bg-[var(--bg-3)] border-[var(--border)]' : pnl >= 0 ? 'bg-[var(--green-dim)] border-[var(--green-border)]' : 'bg-[var(--red-dim)] border-[var(--red-border)]'
              )}>
                <div className="text-[11px] text-[var(--txt-2)] mb-1">Estimated P&L (after fees)</div>
                <div className="text-[20px] font-medium font-mono" style={{ color: pnl === null ? 'var(--txt-1)' : pnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {pnl !== null ? fmtPnl(pnl) : 'Fill entry, exit & qty'}
                </div>
                {rr !== null && <div className="text-[11.5px] font-mono mt-1" style={{ color: rr >= 0 ? 'var(--green)' : 'var(--red)' }}>{rr.toFixed(2)}R risk/reward</div>}
              </div>

              {/* Position sizer summary */}
              {suggestQty && (
                <div className="mt-3 text-[11.5px] space-y-1.5">
                  <div className="flex justify-between text-[var(--txt-2)]"><span>Risk amount (1%)</span><span className="font-mono text-[var(--txt-0)]">${riskAmt.toFixed(0)}</span></div>
                  <div className="flex justify-between text-[var(--txt-2)]"><span>Suggested shares</span><span className="font-mono text-[var(--txt-0)]">{suggestQty}</span></div>
                  <div className="flex justify-between text-[var(--txt-2)]"><span>Position size</span><span className="font-mono text-[var(--txt-0)]">${(suggestQty * +form.entry).toFixed(0)}</span></div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
