// ── WhatATrade! Backend ───────────────────────────────────────
require('dotenv').config()
const express      = require('express')
const cors         = require('cors')
const cookieParser = require('cookie-parser')

// Routes
const authRoutes     = require('./routes/auth')
const schwabRoutes   = require('./routes/schwab')
const webullRoutes   = require('./routes/webull')
const csvRoutes      = require('./routes/csv')
const tradesRoutes   = require('./routes/trades')
const insightsRoutes = require('./routes/insights')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'https://whatatrade.netlify.app',
]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

// ── Routes ────────────────────────────────────────────────────
app.use('/insights',     insightsRoutes)
app.use('/auth',         authRoutes)
app.use('/auth/schwab',  schwabRoutes)
app.use('/auth/webull',  webullRoutes)
app.use('/import/csv',   csvRoutes)
app.use('/trades',       tradesRoutes)

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  const supabase = require('./lib/supabase')
  res.json({
    status:   'ok',
    app:      'WhatATrade!',
    time:     new Date().toISOString(),
    database: !!supabase ? 'connected' : 'not configured',
    brokers: {
      schwab: !!process.env.SCHWAB_CLIENT_ID && process.env.SCHWAB_CLIENT_ID !== 'YOUR_SCHWAB_CLIENT_ID_HERE',
      webull: !!process.env.WEBULL_APP_KEY   && process.env.WEBULL_APP_KEY   !== 'YOUR_WEBULL_APP_KEY_HERE',
    },
  })
})

// ── Broker connection status ──────────────────────────────────
app.get('/status', (req, res) => {
  res.json({
    schwab: { connected: false, lastSync: null },
    webull: { connected: false, lastSync: null },
  })
})

// ── 404 handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` })
})

// ── Global error handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err.message)
  res.status(500).json({ error: 'Internal server error' })
})

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  WhatATrade! backend running on http://localhost:${PORT}`)
  console.log(`   Health:  http://localhost:${PORT}/health\n`)
  const db = !!process.env.SUPABASE_URL
  const sb = process.env.SCHWAB_CLIENT_ID !== 'YOUR_SCHWAB_CLIENT_ID_HERE'
  const wb = process.env.WEBULL_APP_KEY   !== 'YOUR_WEBULL_APP_KEY_HERE'
  console.log(`   Database: ${db ? '✅  Supabase connected'  : '⏳  Add SUPABASE_URL to .env'}`)
  console.log(`   Schwab:   ${sb ? '✅  Ready'               : '⏳  Add keys after developer.schwab.com signup'}`)
  console.log(`   Webull:   ${wb ? '✅  Ready'               : '⏳  Add keys after developer.webull.com signup'}\n`)
})