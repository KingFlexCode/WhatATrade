const express     = require('express')
const router      = express.Router()
const Groq        = require('groq-sdk')
const supabase    = require('../lib/supabase')
const requireAuth = require('../middleware/requireAuth')

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

router.use(requireAuth)

// POST /insights/analyze — analyze trades and return insights
router.post('/analyze', async (req, res) => {
  try {
    // 1. Fetch user's trades from Supabase
    let trades = []
    if (supabase) {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('user_id', req.userId)
        .not('pnl', 'is', null)
        .order('trade_date', { ascending: false })
        .limit(100)

      if (error) throw error
      trades = data
    }

    if (trades.length === 0) {
      return res.status(400).json({
        error: 'Not enough trade data. Log at least a few trades first.'
      })
    }

    // 2. Build a clean summary to send to Groq
    const summary = buildTradeSummary(trades)

    // 3. Ask Groq to analyze
    const completion = await groq.chat.completions.create({
        model: 'llama-3.1-8b-instant',
        temperature:  0.7,
        max_tokens:   1500,
        messages: [
        {
          role:    'system',
          content: `You are an expert trading coach and performance analyst. 
You analyze a trader's journal data and provide specific, actionable insights.
Be direct, honest, and data-driven. Focus on patterns that actually matter.
Always respond in valid JSON format exactly as specified.
Never make up data — only use what is provided.`,
        },
        {
          role:    'user',
          content: `Analyze this trader's performance data and return exactly 4 insights as JSON.

TRADE DATA:
${JSON.stringify(summary, null, 2)}

Return ONLY a JSON object in this exact format, no other text:
{
  "insights": [
    {
      "type": "positive|negative|warning|info",
      "title": "Short title (max 8 words)",
      "body": "Specific actionable insight with numbers from the data (2-3 sentences)",
      "metric": "Key metric or stat (e.g. 71% win rate)",
      "action": "One specific thing they should do"
    }
  ],
  "summary": "One paragraph overall assessment of this trader (3-4 sentences)",
  "score": 75
}

The score should be 0-100 representing overall trading performance.
Types: positive=good pattern, negative=bad pattern, warning=risk alert, info=neutral observation.`,
        },
      ],
    })

    // 4. Parse Groq response
    const raw  = completion.choices[0]?.message?.content || ''
    let parsed
    try {
      // Strip any markdown code blocks if present
      const clean = raw.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      console.error('Failed to parse Groq response:', raw)
      return res.status(500).json({ error: 'AI response was not valid JSON. Try again.' })
    }

    // 5. Save insights to Supabase for rule building
    if (supabase && parsed.insights) {
      const rows = parsed.insights.map((ins) => ({
        user_id:    req.userId,
        type:       ins.type,
        title:      ins.title,
        body:       ins.body,
        metric:     ins.metric,
        action:     ins.action,
        score:      parsed.score,
        trade_count: trades.length,
        created_at: new Date().toISOString(),
      }))

      await supabase.from('ai_insights').insert(rows)
    }

    // 6. Return insights to frontend
    res.json({
      insights: parsed.insights || [],
      summary:  parsed.summary  || '',
      score:    parsed.score    || 0,
      tradeCount: trades.length,
      generatedAt: new Date().toISOString(),
    })

  } catch (err) {
    console.error('[Insights] Error:', err.message)
    res.status(500).json({ error: 'Analysis failed. Please try again.' })
  }
})

// GET /insights/history — get past insights
router.get('/history', async (req, res) => {
  try {
    if (!supabase) return res.json({ insights: [] })

    const { data, error } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    res.json({ insights: data || [] })
  } catch (err) {
    console.error('[Insights] History error:', err.message)
    res.status(500).json({ error: 'Failed to load insights history.' })
  }
})

// GET /insights/rules — get confirmed rules (patterns seen 3+ times)
router.get('/rules', async (req, res) => {
  try {
    if (!supabase) return res.json({ rules: [] })

    const { data, error } = await supabase
      .from('ai_insights')
      .select('title, type, body, action, metric')
      .eq('user_id', req.userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by title similarity — if same insight appears 3+ times it becomes a rule
    const counts = {}
    ;(data || []).forEach((ins) => {
      const key = ins.title.toLowerCase().slice(0, 30)
      if (!counts[key]) counts[key] = { ...ins, count: 0 }
      counts[key].count++
    })

    const rules = Object.values(counts)
      .filter((r) => r.count >= 2)
      .sort((a, b) => b.count - a.count)
      .map((r) => ({ ...r, confirmed: r.count >= 3 }))

    res.json({ rules })
  } catch (err) {
    console.error('[Insights] Rules error:', err.message)
    res.status(500).json({ error: 'Failed to load rules.' })
  }
})

// ── Helper — build trade summary for AI ──────────────────────
function buildTradeSummary(trades) {
  const wins   = trades.filter((t) => t.pnl > 0)
  const losses = trades.filter((t) => t.pnl <= 0)
  const netPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0)

  // P&L by setup
  const bySetup = {}
  trades.forEach((t) => {
    if (!t.setup) return
    if (!bySetup[t.setup]) bySetup[t.setup] = { wins: 0, total: 0, pnl: 0 }
    bySetup[t.setup].total++
    bySetup[t.setup].pnl += t.pnl || 0
    if (t.pnl > 0) bySetup[t.setup].wins++
  })

  // P&L by emotion
  const byEmotion = {}
  trades.forEach((t) => {
    if (!t.emotion) return
    if (!byEmotion[t.emotion]) byEmotion[t.emotion] = { wins: 0, total: 0, pnl: 0 }
    byEmotion[t.emotion].total++
    byEmotion[t.emotion].pnl += t.pnl || 0
    if (t.pnl > 0) byEmotion[t.emotion].wins++
  })

  // P&L by day of week
  const byDow = {}
  trades.forEach((t) => {
    const date = new Date((t.trade_date || t.date) + 'T12:00:00')
    const dow  = date.toLocaleDateString('en-US', { weekday: 'long' })
    if (!byDow[dow]) byDow[dow] = { pnl: 0, total: 0 }
    byDow[dow].total++
    byDow[dow].pnl += t.pnl || 0
  })

  // Common tags on losing trades
  const lossTags = {}
  losses.forEach((t) => {
    ;(t.tags || []).forEach((tag) => {
      lossTags[tag] = (lossTags[tag] || 0) + 1
    })
  })

  return {
    totalTrades:  trades.length,
    wins:         wins.length,
    losses:       losses.length,
    winRate:      `${Math.round((wins.length / trades.length) * 100)}%`,
    netPnl:       `$${netPnl.toFixed(2)}`,
    avgWin:       wins.length   ? `$${(wins.reduce((s,t)=>s+t.pnl,0)/wins.length).toFixed(2)}`   : '$0',
    avgLoss:      losses.length ? `$${(losses.reduce((s,t)=>s+t.pnl,0)/losses.length).toFixed(2)}` : '$0',
    bySetup:      Object.entries(bySetup).map(([name, d]) => ({
      setup:   name,
      winRate: `${Math.round((d.wins/d.total)*100)}%`,
      pnl:     `$${d.pnl.toFixed(2)}`,
      trades:  d.total,
    })),
    byEmotion: Object.entries(byEmotion).map(([emotion, d]) => ({
      emotion,
      winRate: `${Math.round((d.wins/d.total)*100)}%`,
      pnl:     `$${d.pnl.toFixed(2)}`,
      trades:  d.total,
    })),
    byDayOfWeek: Object.entries(byDow).map(([day, d]) => ({
      day,
      pnl:    `$${d.pnl.toFixed(2)}`,
      trades: d.total,
    })),
    commonTagsOnLosers: Object.entries(lossTags)
      .sort(([,a],[,b]) => b-a)
      .slice(0, 5)
      .map(([tag, count]) => ({ tag, count })),
    recentTrades: trades.slice(0, 10).map((t) => ({
      symbol:    t.symbol,
      direction: t.direction,
      setup:     t.setup,
      pnl:       `$${(t.pnl||0).toFixed(2)}`,
      emotion:   t.emotion,
      date:      t.trade_date || t.date,
    })),
  }
}

module.exports = router