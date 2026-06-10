import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useStore = create(
  persist(
    (set, get) => ({
      // ── Auth ────────────────────────────────────────────────
      user: null,
      isAuthenticated: false,
      login: (userData) => set({ user: userData, isAuthenticated: true }),
      logout: () => set({
        user: null,
        isAuthenticated: false,
        trades: [],
        onboardingComplete: false,
      }),

      // ── Onboarding ──────────────────────────────────────────
      onboardingComplete: false,
      completeOnboarding: () => set({ onboardingComplete: true }),

      // ── Trades ──────────────────────────────────────────────
      trades: [],
      setTrades: (trades) => set({ trades }),
      addTrade: (trade) => set((s) => ({
        trades: [trade, ...s.trades],
      })),
      updateTrade: (id, updates) => set((s) => ({
        trades: s.trades.map((t) => t.id === id ? { ...t, ...updates } : t),
      })),
      deleteTrade: (id) => set((s) => ({
        trades: s.trades.filter((t) => t.id !== id),
      })),
      importTrades: (newTrades) => set((s) => ({
        trades: [
          ...newTrades.map((t, i) => ({ ...t, id: `import-${Date.now()}-${i}` })),
          ...s.trades,
        ],
      })),

      // ── Broker connections ───────────────────────────────────
      brokers: {
        thinkorswim: { connected: false, lastSync: null, accountMask: null, method: 'oauth' },
        webull:      { connected: false, lastSync: null, accountMask: null, method: 'oauth' },
        robinhood:   { connected: false, lastSync: null, accountMask: null, method: 'csv'   },
        sofi:        { connected: false, lastSync: null, accountMask: null, method: 'csv'   },
      },
      updateBroker: (name, data) => set((s) => ({
        brokers: { ...s.brokers, [name]: { ...s.brokers[name], ...data } },
      })),

      // ── Notifications ────────────────────────────────────────
      notifications: [],
      markAllRead: () => set((s) => ({
        notifications: s.notifications.map((n) => ({ ...n, read: true })),
      })),
      addNotification: (n) => set((s) => ({
        notifications: [{ ...n, id: Date.now().toString(), read: false }, ...s.notifications],
      })),

      // ── Settings ─────────────────────────────────────────────
      settings: {
        accountBalance:  10000,
        riskPerTrade:    1,
        dailyLossLimit:  500,
        weeklyDrawdown:  1500,
        maxTradesPerDay: 5,
        syncFrequency:   '15min',
        notifications: {
          syncComplete:   true,
          dailyLossAlert: true,
          aiInsight:      true,
          goalMilestone:  false,
          weeklyReport:   true,
        },
        appearance: {
          accentColor: '#378ADD',
          compactMode: false,
          showCents:   true,
          currency:    'USD',
        },
      },
      updateSettings: (path, value) => set((s) => {
        const parts = path.split('.')
        const newSettings = JSON.parse(JSON.stringify(s.settings))
        let obj = newSettings
        for (let i = 0; i < parts.length - 1; i++) obj = obj[parts[i]]
        obj[parts[parts.length - 1]] = value
        return { settings: newSettings }
      }),

      // ── Computed helpers ─────────────────────────────────────
      getSummary: () => {
        const trades  = get().trades.filter((t) => t.exit_price && t.pnl !== null)
        const wins    = trades.filter((t) => t.pnl > 0)
        const losses  = trades.filter((t) => t.pnl <= 0)
        const netPnl  = trades.reduce((s, t) => s + (t.pnl || 0), 0)
        const avgWin  = wins.length   ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length   : 0
        const avgLoss = losses.length ? losses.reduce((s, t) => s + t.pnl, 0) / losses.length : 0
        return {
          total:        trades.length,
          wins:         wins.length,
          losses:       losses.length,
          winRate:      trades.length ? (wins.length / trades.length * 100).toFixed(1) : '0',
          netPnl:       netPnl.toFixed(2),
          avgWin:       avgWin.toFixed(2),
          avgLoss:      avgLoss.toFixed(2),
          profitFactor: avgLoss ? Math.abs(avgWin / avgLoss).toFixed(2) : 'N/A',
        }
      },
    }),
    {
      name: 'whatatrade-auth',
      partialize: (state) => ({
        user:               state.user,
        isAuthenticated:    state.isAuthenticated,
        onboardingComplete: state.onboardingComplete,
        settings:           state.settings,
      }),
    }
  )
)