import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Button, Spinner } from '../components/ui'
import { LogoAuth } from '../components/ui/Logo'
import { authApi } from '../services/api'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const { login } = useStore()
  const navigate  = useNavigate()

async function handleSubmit(e) {
  e.preventDefault()
  setError('')
  if (!email || !password) { setError('Please fill in all fields.'); return }
  setLoading(true)
  try {
    const res = await authApi.login(email, password)
    login(res.data.user)
    navigate('/')
  } catch (err) {
    setError(err.response?.data?.error || 'Login failed. Please try again.')
  }
  setLoading(false)
}

  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <LogoAuth />
        </div>

        <div className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-8">
          <h1 className="text-[19px] font-semibold text-center text-[var(--txt-0)] mb-1">Welcome back</h1>
          <p className="text-[12.5px] text-center text-[var(--txt-2)] mb-6">Sign in to your journal</p>

          {error && (
            <div className="bg-[var(--red-dim)] border border-[var(--red-border)] rounded-lg px-3 py-2 text-[12.5px] text-[var(--red)] mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            <Button variant="accent" size="lg" className="w-full justify-center mt-1" disabled={loading}>
              {loading ? <Spinner /> : 'Sign in'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-[11px] text-[var(--txt-2)]">or continue with</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleSubmit}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--border-2)] bg-[var(--bg-3)] text-[var(--txt-1)] text-[12px] hover:border-[var(--border-3)] hover:text-[var(--txt-0)] transition-all">
              <i className="ti ti-bolt text-[14px] text-[var(--green)]" /> thinkorswim
            </button>
            <button onClick={handleSubmit}
              className="flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--border-2)] bg-[var(--bg-3)] text-[var(--txt-1)] text-[12px] hover:border-[var(--border-3)] hover:text-[var(--txt-0)] transition-all">
              <i className="ti ti-bolt text-[14px] text-[#00b4d8]" /> Webull
            </button>
          </div>

          <p className="text-center text-[12px] text-[var(--txt-2)] mt-5">
            New to WhatATrade!?{' '}
            <Link to="/signup" className="text-[var(--accent)] hover:underline">Create a free account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
