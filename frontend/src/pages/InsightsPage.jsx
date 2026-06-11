import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { Panel, Button } from '../components/ui'
import api from '../services/api'

const TYPE_STYLES = {
  positive: { bg: 'rgba(34,216,122,.10)',  border: 'rgba(34,216,122,.25)', color: '#22d87a', icon: 'ti-trending-up'    },
  negative: { bg: 'rgba(240,91,107,.10)',  border: 'rgba(240,91,107,.25)', color: '#f05b6b', icon: 'ti-trending-down'  },
  warning:  { bg: 'rgba(240,180,91,.10)',  border: 'rgba(240,180,91,.25)', color: '#f0b45b', icon: 'ti-alert-triangle' },
  info:     { bg: 'rgba(55,138,221,.10)',  border: 'rgba(55,138,221,.25)', color: '#378ADD', icon: 'ti-bulb'           },
}

function ScoreRing({ score }) {
  const r   = 36
  const circ = 2 * Math.PI * r
  const fill = ((score || 0) / 100) * circ
  const color = score >= 70 ? '#22d87a' : score >= 40 ? '#f0b45b' : '#f05b6b'

  return (
    <div style={{ position: 'relative', width: 96, height: 96, flexShrink: 0 }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="var(--bg-4)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="7"
          strokeDasharray={`${fill} ${circ}`} strokeLinecap="round" />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ fontSize: 22, fontWeight: 600, fontFamily: 'DM Mono', color }}>{score}</div>
        <div style={{ fontSize: 9, color: 'var(--txt-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>score</div>
      </div>
    </div>
  )
}

export default function InsightsPage() {
  const { trades } = useStore()
  const [insights,    setInsights]    = useState([])
  const [summary,     setSummary]     = useState('')
  const [score,       setScore]       = useState(null)
  const [rules,       setRules]       = useState([])
  const [history,     setHistory]     = useState([])
  const [loading,     setLoading]     = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)
  const [error,       setError]       = useState('')
  const [tradeCount,  setTradeCount]  = useState(0)
  const [generatedAt, setGeneratedAt] = useState(null)
  const [activeTab,   setActiveTab]   = useState('insights')

  // Load history and rules on mount
  useEffect(() => {
    async function init() {
      try {
        const [histRes, rulesRes] = await Promise.all([
          api.get('/insights/history'),
          api.get('/insights/rules'),
        ])
        setHistory(histRes.data.insights  || [])
        setRules(rulesRes.data.rules      || [])

        // If we have past insights show the most recent ones
        const past = histRes.data.insights || []
        if (past.length > 0) {
          // Group latest batch — same created_at minute
          const latestTime = past[0].created_at?.slice(0, 16)
          const latest     = past.filter((i) => i.created_at?.slice(0, 16) === latestTime)
          setInsights(latest)
          setGeneratedAt(past[0].created_at)
        }
      } catch (err) {
        console.error('Failed to load insights:', err)
      }
      setLoadingInit(false)
    }
    init()
  }, [])

  async function analyze() {
    if (trades.length === 0) {
      setError('Log at least a few trades first before analyzing.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await api.post('/insights/analyze')
      setInsights(res.data.insights   || [])
      setSummary(res.data.summary     || '')
      setScore(res.data.score         ?? null)
      setTradeCount(res.data.tradeCount || 0)
      setGeneratedAt(res.data.generatedAt)
      setActiveTab('insights')

      // Refresh rules after new analysis
      const rulesRes = await api.get('/insights/rules')
      setRules(rulesRes.data.rules || [])
    } catch (err) {
      console.error('Analysis error:', err)
      setError(err.response?.data?.error || 'Analysis failed. Please try again.')
    }
    setLoading(false)
  }

  function fmtTime(iso) {
    if (!iso) return ''
    try {
      return new Date(iso).toLocaleString('en-US', {
        month:  'short', day: 'numeric',
        hour:   '2-digit', minute: '2-digit',
      })
    } catch { return '' }
  }

  const tabs = [
    { id: 'insights', label: 'Insights',      icon: 'ti-brain'      },
    { id: 'rules',    label: `Rules (${rules.length})`, icon: 'ti-shield-check' },
    { id: 'history',  label: 'History',        icon: 'ti-history'    },
  ]

  return (
    <div className="space-y-3">

      {/* Header card */}
      <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: 'rgba(55,138,221,.12)',
                border: '1px solid rgba(55,138,221,.22)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className="ti ti-brain" style={{ fontSize: 14, color: '#378ADD' }} />
              </div>
              <div className="text-[14px] font-semibold text-[var(--txt-0)]">AI Trade Coach</div>
              <span style={{
                fontSize: 9.5, fontWeight: 500,
                padding: '2px 7px', borderRadius: 10,
                background: 'rgba(34,216,122,.12)',
                color: '#22d87a',
                border: '1px solid rgba(34,216,122,.22)',
              }}>
                Powered by Groq
              </span>
            </div>
            <p className="text-[12.5px] text-[var(--txt-2)] leading-relaxed mb-4">
              Analyzes your trade history and finds patterns in your setups, emotions, timing, and risk management.
              The more trades you log, the smarter the insights get.
            </p>
            <div className="flex items-center gap-3">
              <Button variant="accent" onClick={analyze} disabled={loading}>
                {loading
                  ? <><span className="spinner" /> Analyzing your trades…</>
                  : <><i className="ti ti-sparkles text-[13px]" /> Analyze my trades</>
                }
              </Button>
              {generatedAt && (
                <span className="text-[11px] text-[var(--txt-2)]">
                  Last run: {fmtTime(generatedAt)}
                </span>
              )}
            </div>
            {error && (
              <div style={{
                marginTop: 10, fontSize: 12.5,
                color: 'var(--red)',
                background: 'rgba(240,91,107,.10)',
                border: '1px solid rgba(240,91,107,.25)',
                borderRadius: 8, padding: '8px 12px',
              }}>
                {error}
              </div>
            )}
          </div>

          {/* Score ring */}
          {score !== null && (
            <div className="flex flex-col items-center gap-1.5">
              <ScoreRing score={score} />
              <div className="text-[10.5px] text-[var(--txt-2)] text-center">
                Performance<br />score
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {summary && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            fontSize: 13, lineHeight: 1.65,
            color: 'var(--txt-1)',
          }}>
            <div style={{ fontSize: 9.5, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--txt-2)', marginBottom: 6 }}>
              Overall assessment
            </div>
            {summary}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            style={{
              padding: '8px 14px',
              fontSize: 12.5,
              fontFamily: 'Outfit, sans-serif',
              fontWeight: activeTab === t.id ? 500 : 400,
              color: activeTab === t.id ? 'var(--accent)' : 'var(--txt-2)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all .15s',
              marginBottom: -1,
            }}
          >
            <i className={`ti ${t.icon} text-[13px]`} />
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Insights tab ── */}
      {activeTab === 'insights' && (
        <div>
          {loadingInit ? (
            <div className="flex items-center justify-center h-40">
              <div className="spinner" />
            </div>
          ) : insights.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <i className="ti ti-brain" style={{ fontSize: 32, color: 'var(--txt-2)', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 6 }}>
                No insights yet
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 16 }}>
                Click "Analyze my trades" to generate your first AI insights.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {tradeCount > 0 && (
                <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 4 }}>
                  Based on {tradeCount} trades
                </div>
              )}
              {insights.map((ins, i) => {
                const style = TYPE_STYLES[ins.type] || TYPE_STYLES.info
                return (
                  <div
                    key={i}
                    style={{
                      background:   style.bg,
                      border:      `1px solid ${style.border}`,
                      borderRadius: 13,
                      padding:     '14px 16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 8,
                        background: style.bg,
                        border: `1px solid ${style.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <i className={`ti ${style.icon}`} style={{ fontSize: 14, color: style.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 4 }}>
                          {ins.title}
                        </div>
                        <div style={{ fontSize: 12.5, color: 'var(--txt-1)', lineHeight: 1.6, marginBottom: ins.metric || ins.action ? 8 : 0 }}>
                          {ins.body}
                        </div>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                          {ins.metric && (
                            <span style={{
                              fontSize: 11, fontFamily: 'DM Mono, monospace',
                              padding: '2px 8px', borderRadius: 20,
                              background: 'var(--bg-3)',
                              color: style.color,
                              border: `1px solid ${style.border}`,
                            }}>
                              {ins.metric}
                            </span>
                          )}
                          {ins.action && (
                            <span style={{
                              fontSize: 11.5,
                              color: 'var(--txt-2)',
                              display: 'flex', alignItems: 'center', gap: 4,
                            }}>
                              <i className="ti ti-arrow-right text-[11px]" />
                              {ins.action}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Rules tab ── */}
      {activeTab === 'rules' && (
        <div>
          {rules.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <i className="ti ti-shield-check" style={{ fontSize: 32, color: 'var(--txt-2)', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 6 }}>
                No confirmed rules yet
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)' }}>
                Run the analysis a few times. When the AI finds the same pattern repeatedly it becomes a confirmed rule.
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginBottom: 4 }}>
                Patterns confirmed across multiple analyses
              </div>
              {rules.map((rule, i) => {
                const style   = TYPE_STYLES[rule.type] || TYPE_STYLES.info
                const isConfirmed = rule.confirmed
                return (
                  <div
                    key={i}
                    style={{
                      background: isConfirmed ? style.bg : 'var(--bg-2)',
                      border: `1px solid ${isConfirmed ? style.border : 'var(--border)'}`,
                      borderRadius: 13,
                      padding: '13px 15px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                    }}
                  >
                    <div style={{
                      width: 28, height: 28, borderRadius: 7,
                      background: style.bg,
                      border: `1px solid ${style.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <i className={`ti ${style.icon}`} style={{ fontSize: 13, color: style.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--txt-0)' }}>
                          {rule.title}
                        </div>
                        {isConfirmed && (
                          <span style={{
                            fontSize: 9.5, fontWeight: 500,
                            padding: '1px 6px', borderRadius: 10,
                            background: 'rgba(34,216,122,.12)',
                            color: '#22d87a',
                            border: '1px solid rgba(34,216,122,.22)',
                          }}>
                            ✓ Confirmed
                          </span>
                        )}
                        <span style={{ fontSize: 10.5, color: 'var(--txt-2)' }}>
                          seen {rule.count}x
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--txt-2)', lineHeight: 1.5 }}>
                        {rule.action}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── History tab ── */}
      {activeTab === 'history' && (
        <div>
          {history.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '48px 24px',
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              borderRadius: 14,
            }}>
              <i className="ti ti-history" style={{ fontSize: 32, color: 'var(--txt-2)', display: 'block', marginBottom: 10 }} />
              <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 6 }}>
                No history yet
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)' }}>
                Past analyses will appear here after you run your first one.
              </div>
            </div>
          ) : (
            <Panel title="Past analyses">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Date', 'Insight', 'Type', 'Action'].map((h) => (
                        <th key={h} style={{
                          padding: '7px 12px', textAlign: 'left',
                          fontSize: 9.5, fontWeight: 500,
                          color: 'var(--txt-2)',
                          textTransform: 'uppercase',
                          letterSpacing: '.07em',
                        }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((ins, i) => {
                      const style = TYPE_STYLES[ins.type] || TYPE_STYLES.info
                      return (
                        <tr
                          key={i}
                          style={{ borderBottom: '1px solid var(--border)' }}
                        >
                          <td style={{ padding: '9px 12px', color: 'var(--txt-2)', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {fmtTime(ins.created_at)}
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--txt-0)', fontWeight: 500 }}>
                            {ins.title}
                          </td>
                          <td style={{ padding: '9px 12px' }}>
                            <span style={{
                              fontSize: 10, fontWeight: 500,
                              padding: '2px 7px', borderRadius: 10,
                              background: style.bg,
                              color: style.color,
                              border: `1px solid ${style.border}`,
                            }}>
                              {ins.type}
                            </span>
                          </td>
                          <td style={{ padding: '9px 12px', color: 'var(--txt-2)', fontSize: 11.5 }}>
                            {ins.action}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </div>
      )}

    </div>
  )
}