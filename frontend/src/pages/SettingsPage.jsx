import React, { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'
import { useNavigate } from 'react-router-dom'
import { authApi, tradesApi } from '../services/api'
import clsx from 'clsx'

const SECTIONS = [
  'Profile',
  'Notifications',
  'Appearance',
  'Trading rules',
  'Danger zone',
]

function Toggle({ checked, onChange }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width:      34,
        height:     19,
        borderRadius: 10,
        background: checked ? 'var(--accent)' : 'var(--bg-4)',
        border:    `1px solid ${checked ? 'var(--accent)' : 'var(--border-2)'}`,
        position:  'relative',
        cursor:    'pointer',
        transition:'background .18s',
        flexShrink: 0,
      }}
    >
      <div style={{
        position:   'absolute',
        top:         2,
        left:        checked ? 15 : 2,
        width:       13,
        height:      13,
        borderRadius:'50%',
        background: '#fff',
        transition: 'left .18s',
      }} />
    </div>
  )
}

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

function SaveBtn({ saved, saving, onClick, label = 'Save changes' }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
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
        opacity:    saving ? 0.7 : 1,
      }}
    >
      {saving ? (
        <><span className="spinner" /> Saving…</>
      ) : saved ? (
        <><i className="ti ti-check text-[13px]" /> Saved!</>
      ) : (
        label
      )}
    </button>
  )
}

export default function SettingsPage() {
  const { settings, updateSettings, user, login, logout } = useStore()
  const navigate = useNavigate()
  const [section, setSection] = useState('Profile')

  // Profile form
  const [profile, setProfile] = useState({
    firstName: user?.firstName || user?.name?.split(' ')[0] || '',
    lastName:  user?.lastName  || user?.name?.split(' ')[1] || '',
    email:     user?.email     || '',
    timezone:  'America/New_York',
  })
  const [profileSaved,  setProfileSaved]  = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)

  // Password form
  const [pwForm,   setPwForm]   = useState({ current: '', next: '', confirm: '' })
  const [pwSaved,  setPwSaved]  = useState(false)
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError,  setPwError]  = useState('')

  // Trading rules form
  const [rules,       setRules]       = useState({ ...settings })
  const [rulesSaved,  setRulesSaved]  = useState(false)
  const [rulesSaving, setRulesSaving] = useState(false)

  // Danger zone
  const [exporting,   setExporting]   = useState(false)
  const [clearing,    setClearing]    = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  // Sync rules form with store
  useEffect(() => {
    setRules({
      accountBalance:  settings.accountBalance,
      riskPerTrade:    settings.riskPerTrade,
      dailyLossLimit:  settings.dailyLossLimit,
      weeklyDrawdown:  settings.weeklyDrawdown,
      maxTradesPerDay: settings.maxTradesPerDay,
    })
  }, [])

  async function saveProfile() {
    setProfileSaving(true)
    try {
      // Update local store
      login({
        ...user,
        name:      `${profile.firstName} ${profile.lastName}`,
        firstName:  profile.firstName,
        lastName:   profile.lastName,
        email:      profile.email,
        initials:  `${profile.firstName[0]||'W'}${profile.lastName[0]||'T'}`.toUpperCase(),
      })
      setProfileSaved(true)
      setTimeout(() => setProfileSaved(false), 2500)
    } catch (err) {
      console.error('Profile save error:', err)
      alert('Failed to save profile.')
    }
    setProfileSaving(false)
  }

  async function savePassword() {
    setPwError('')
    if (!pwForm.current || !pwForm.next || !pwForm.confirm) {
      setPwError('All fields are required.'); return
    }
    if (pwForm.next.length < 8) {
      setPwError('Password must be at least 8 characters.'); return
    }
    if (pwForm.next !== pwForm.confirm) {
      setPwError('New passwords do not match.'); return
    }
    setPwSaving(true)
    try {
      await new Promise((r) => setTimeout(r, 600))
      setPwSaved(true)
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwSaved(false), 2500)
    } catch (err) {
      setPwError('Failed to change password.')
    }
    setPwSaving(false)
  }

  function saveNotification(key, val) {
    updateSettings(`notifications.${key}`, val)
  }

  function saveAppearance(key, val) {
    updateSettings(`appearance.${key}`, val)
    if (key === 'accentColor') {
      document.documentElement.style.setProperty('--accent', val)
    }
  }

  function saveRules() {
    setRulesSaving(true)
    Object.entries(rules).forEach(([key, val]) => {
      updateSettings(key, +val)
    })
    setTimeout(() => {
      setRulesSaving(false)
      setRulesSaved(true)
      setTimeout(() => setRulesSaved(false), 2500)
    }, 400)
  }

  async function exportCSV() {
    setExporting(true)
    try {
      const res   = await tradesApi.list()
      const trades = res.data.trades || []
      if (trades.length === 0) {
        alert('No trades to export.')
        setExporting(false)
        return
      }
      const headers = ['Date','Symbol','Direction','Setup','Qty','Entry','Exit','P&L','R:R','Emotion','Tags','Notes','Broker']
      const rows    = trades.map((t) => [
        t.trade_date || t.date,
        t.symbol,
        t.direction,
        t.setup || '',
        t.quantity || t.qty || '',
        t.entry_price || t.entry || '',
        t.exit_price  || t.exit  || '',
        t.pnl  || '',
        t.rr   || '',
        t.emotion || '',
        (t.tags || []).join(';'),
        (t.notes || '').replace(/,/g, ' '),
        t.broker || '',
      ])
      const csv  = [headers, ...rows].map((r) => r.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `whatatrade-trades-${new Date().toISOString().slice(0,10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Export failed. Please try again.')
    }
    setExporting(false)
  }

  async function clearTrades() {
    if (!window.confirm('Delete ALL trades? This cannot be undone.')) return
    if (!window.confirm('Are you absolutely sure? All trade data will be permanently deleted.')) return
    setClearing(true)
    try {
      const res    = await tradesApi.list()
      const trades = res.data.trades || []
      await Promise.all(trades.map((t) => tradesApi.delete(t.id)))
      alert(`Deleted ${trades.length} trades.`)
    } catch (err) {
      alert('Failed to clear trades.')
    }
    setClearing(false)
  }

  async function deleteAccount() {
    if (!window.confirm('Delete your account? This CANNOT be undone.')) return
    if (!window.confirm('Last chance — are you sure you want to permanently delete your WhatATrade! account?')) return
    setDeleting(true)
    try {
      await new Promise((r) => setTimeout(r, 800))
      logout()
      navigate('/login')
    } catch (err) {
      alert('Failed to delete account.')
      setDeleting(false)
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 16 }}>

      {/* Sidebar */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {SECTIONS.map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            style={{
              textAlign:  'left',
              padding:    '8px 12px',
              borderRadius: 9,
              fontSize:    13,
              fontFamily: 'Outfit, sans-serif',
              border:     'none',
              cursor:     'pointer',
              transition: 'all .12s',
              background: section === s ? 'var(--accent-dim)' : 'transparent',
              color:      section === s ? 'var(--accent)'
                        : s === 'Danger zone' ? 'var(--red)'
                        : 'var(--txt-2)',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Content panel */}
      <div style={{
        background:   'var(--bg-2)',
        border:       '1px solid var(--border)',
        borderRadius:  16,
        padding:      '20px 22px',
      }}>

        {/* ── Profile ── */}
        {section === 'Profile' && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 14 }}>
              Account info
            </div>

            {/* Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg,#378ADD,#22d87a)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, fontWeight: 600, color: '#fff', flexShrink: 0,
              }}>
                {(profile.firstName[0] || 'W')}{(profile.lastName[0] || 'T')}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--txt-0)' }}>
                  {profile.firstName} {profile.lastName}
                </div>
                <div style={{ fontSize: 12, color: 'var(--txt-2)', marginTop: 2 }}>
                  {profile.email}
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <div>
                <label style={lbl}>First name</label>
                <input
                  style={inp}
                  value={profile.firstName}
                  onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                />
              </div>
              <div>
                <label style={lbl}>Last name</label>
                <input
                  style={inp}
                  value={profile.lastName}
                  onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Email</label>
                <input
                  type="email" style={inp}
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={lbl}>Timezone</label>
                <select
                  style={inp}
                  value={profile.timezone}
                  onChange={(e) => setProfile((p) => ({ ...p, timezone: e.target.value }))}
                >
                  <option value="America/New_York">America/New_York (ET)</option>
                  <option value="America/Chicago">America/Chicago (CT)</option>
                  <option value="America/Denver">America/Denver (MT)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                </select>
              </div>
            </div>

            <SaveBtn saved={profileSaved} saving={profileSaving} onClick={saveProfile} />

            {/* Change password */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 14 }}>
                Change password
              </div>
              {pwError && (
                <div style={{ fontSize: 12.5, color: 'var(--red)', background: 'rgba(240,91,107,.10)', border: '1px solid rgba(240,91,107,.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                  {pwError}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
                {[
                  { label: 'Current password', key: 'current', placeholder: '••••••••' },
                  { label: 'New password',      key: 'next',    placeholder: 'Min 8 characters' },
                  { label: 'Confirm new',        key: 'confirm', placeholder: 'Repeat new password' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={lbl}>{label}</label>
                    <input
                      type="password" style={inp}
                      placeholder={placeholder}
                      value={pwForm[key]}
                      onChange={(e) => setPwForm((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
              <SaveBtn saved={pwSaved} saving={pwSaving} onClick={savePassword} label="Change password" />
            </div>
          </div>
        )}

        {/* ── Notifications ── */}
        {section === 'Notifications' && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 4 }}>
              Push notifications
            </div>
            {[
              { key: 'syncComplete',   label: 'Broker sync complete',    sub: 'When new trades are imported'         },
              { key: 'dailyLossAlert', label: 'Daily loss limit warning', sub: 'Alert at 60% and 80% of daily limit' },
              { key: 'aiInsight',      label: 'New AI insight',           sub: 'When a new pattern is detected'      },
              { key: 'goalMilestone',  label: 'Goal milestones',          sub: 'At 50%, 75%, and 100% of goal'       },
              { key: 'weeklyReport',   label: 'Weekly summary report',    sub: 'Every Sunday evening'                },
            ].map((n) => (
              <div key={n.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--txt-0)' }}>{n.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 2 }}>{n.sub}</div>
                </div>
                <Toggle
                  checked={settings.notifications[n.key]}
                  onChange={(v) => saveNotification(n.key, v)}
                />
              </div>
            ))}
          </div>
        )}

        {/* ── Appearance ── */}
        {section === 'Appearance' && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 4 }}>
              Theme & display
            </div>

            {/* Accent color */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--txt-0)' }}>Accent color</div>
                <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 2 }}>App highlight color</div>
              </div>
              <div style={{ display: 'flex', gap: 7 }}>
                {[
                  { color: '#378ADD', label: 'Blue'   },
                  { color: '#22d87a', label: 'Green'  },
                  { color: '#a78bfa', label: 'Purple' },
                  { color: '#f0b45b', label: 'Amber'  },
                  { color: '#f05b6b', label: 'Red'    },
                ].map(({ color, label }) => (
                  <button
                    key={color}
                    title={label}
                    onClick={() => saveAppearance('accentColor', color)}
                    style={{
                      width:       22,
                      height:      22,
                      borderRadius:'50%',
                      background:   color,
                      border:      `2px solid ${settings.appearance.accentColor === color ? '#fff' : 'transparent'}`,
                      cursor:      'pointer',
                      transition:  'border .15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {[
              { key: 'compactMode', label: 'Compact mode',     sub: 'Tighter row spacing in tables'   },
              { key: 'showCents',   label: 'Show cents in P&L', sub: 'e.g. +$740.00 instead of +$740' },
            ].map((item) => (
              <div key={item.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 13, color: 'var(--txt-0)' }}>{item.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 2 }}>{item.sub}</div>
                </div>
                <Toggle
                  checked={settings.appearance[item.key]}
                  onChange={(v) => saveAppearance(item.key, v)}
                />
              </div>
            ))}

            {/* Currency */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0' }}>
              <div>
                <div style={{ fontSize: 13, color: 'var(--txt-0)' }}>Currency</div>
                <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 2 }}>Display currency for P&L</div>
              </div>
              <select
                style={{ ...inp, width: 'auto', fontSize: 12 }}
                value={settings.appearance.currency}
                onChange={(e) => saveAppearance('currency', e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="AUD">AUD (A$)</option>
              </select>
            </div>
          </div>
        )}

        {/* ── Trading rules ── */}
        {section === 'Trading rules' && (
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 14 }}>
              Risk parameters
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              {[
                { label: 'Account balance ($)',      key: 'accountBalance',  type: 'number', step: 100  },
                { label: 'Risk per trade (%)',        key: 'riskPerTrade',    type: 'number', step: 0.1  },
                { label: 'Daily loss limit ($)',      key: 'dailyLossLimit',  type: 'number', step: 50   },
                { label: 'Weekly drawdown limit ($)', key: 'weeklyDrawdown',  type: 'number', step: 100  },
                { label: 'Max trades per day',        key: 'maxTradesPerDay', type: 'number', step: 1    },
              ].map((f) => (
                <div key={f.key}>
                  <label style={lbl}>{f.label}</label>
                  <input
                    type={f.type}
                    step={f.step}
                    style={inp}
                    value={rules[f.key] ?? ''}
                    onChange={(e) => setRules((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>

            {/* Quick presets */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 8 }}>
                Quick presets
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { label: 'Conservative',  vals: { riskPerTrade: 0.5, dailyLossLimit: 200,  weeklyDrawdown: 500  } },
                  { label: 'Moderate',      vals: { riskPerTrade: 1,   dailyLossLimit: 500,  weeklyDrawdown: 1500 } },
                  { label: 'Aggressive',    vals: { riskPerTrade: 2,   dailyLossLimit: 1000, weeklyDrawdown: 3000 } },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setRules((p) => ({ ...p, ...preset.vals }))}
                    style={{
                      padding:    '5px 12px',
                      borderRadius: 8,
                      border:     '1px solid var(--border-2)',
                      background: 'var(--bg-3)',
                      color:      'var(--txt-1)',
                      fontSize:    12,
                      cursor:     'pointer',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <SaveBtn saved={rulesSaved} saving={rulesSaving} onClick={saveRules} label="Save rules" />
          </div>
        )}

        {/* ── Danger zone ── */}
        {section === 'Danger zone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--txt-2)', marginBottom: 2 }}>
              Irreversible actions
            </div>

            {/* Export */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(55,138,221,.08)', border: '1px solid rgba(55,138,221,.22)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--txt-0)', marginBottom: 4 }}>Export all data</div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 12 }}>
                Download a CSV of all your trades and journal entries.
              </div>
              <button
                onClick={exportCSV}
                disabled={exporting}
                style={{
                  padding:    '6px 14px',
                  borderRadius: 8,
                  border:     '1px solid rgba(55,138,221,.3)',
                  background: 'rgba(55,138,221,.12)',
                  color:      'var(--accent)',
                  fontSize:    12.5,
                  cursor:     'pointer',
                  fontFamily: 'Outfit, sans-serif',
                  display:    'flex',
                  alignItems: 'center',
                  gap:         6,
                }}
              >
                <i className="ti ti-download text-[12px]" />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </button>
            </div>

            {/* Clear trades */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(240,91,107,.08)', border: '1px solid rgba(240,91,107,.22)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>Clear all trades</div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 12 }}>
                Permanently delete all trade data. Your account stays active. This cannot be undone.
              </div>
              <button
                onClick={clearTrades}
                disabled={clearing}
                style={{
                  padding:    '6px 14px',
                  borderRadius: 8,
                  border:     '1px solid rgba(240,91,107,.3)',
                  background: 'rgba(240,91,107,.12)',
                  color:      'var(--red)',
                  fontSize:    12.5,
                  cursor:     'pointer',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                {clearing ? 'Clearing…' : 'Clear all trades'}
              </button>
            </div>

            {/* Delete account */}
            <div style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(240,91,107,.08)', border: '1px solid rgba(240,91,107,.22)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--red)', marginBottom: 4 }}>Delete account</div>
              <div style={{ fontSize: 12.5, color: 'var(--txt-2)', marginBottom: 12 }}>
                Permanently delete your WhatATrade! account and all associated data. This cannot be undone.
              </div>
              <button
                onClick={deleteAccount}
                disabled={deleting}
                style={{
                  padding:    '6px 14px',
                  borderRadius: 8,
                  border:     '1px solid rgba(240,91,107,.3)',
                  background: 'rgba(240,91,107,.12)',
                  color:      'var(--red)',
                  fontSize:    12.5,
                  cursor:     'pointer',
                  fontFamily: 'Outfit, sans-serif',
                }}
              >
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}