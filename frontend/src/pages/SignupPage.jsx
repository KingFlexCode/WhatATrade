import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { Button, Spinner } from '../components/ui'
import { LogoAuth } from '../components/ui/Logo'
import clsx from 'clsx'
import { authApi } from '../services/api'

const PLANS = [
  { id:'free', name:'Free',  price:'$0 / month',  perks:'50 trades/mo · CSV import' },
  { id:'pro',  name:'Pro',   price:'$19 / month', perks:'Unlimited · Auto-sync · AI insights', popular:true },
]

export default function SignupPage() {
  const [form,    setForm]    = useState({ firstName:'', lastName:'', email:'', password:'' })
  const [plan,    setPlan]    = useState('pro')
  const [loading, setLoading] = useState(false)
  const { login } = useStore()
  const navigate  = useNavigate()

  const setF = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }))

async function handleSubmit(e) {
  e.preventDefault()
  setLoading(true)
  try {
    const res = await authApi.signup({
      firstName: form.firstName,
      lastName:  form.lastName,
      email:     form.email,
      password:  form.password,
      plan,
    })
    login(res.data.user)
    navigate('/onboarding')
  } catch (err) {
    alert(err.response?.data?.error || 'Signup failed.')
  }
  setLoading(false)
}

  return (
    <div className="min-h-screen bg-[var(--bg-0)] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <LogoAuth />
        </div>

        <div className="bg-[var(--bg-2)] border border-[var(--border-2)] rounded-2xl p-8">
          <h1 className="text-[19px] font-semibold text-center text-[var(--txt-0)] mb-1">Create your account</h1>
          <p className="text-[12.5px] text-center text-[var(--txt-2)] mb-6">Start trading smarter today</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">First name</label>
                <input type="text" value={form.firstName} onChange={setF('firstName')} placeholder="Alex" required />
              </div>
              <div>
                <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">Last name</label>
                <input type="text" value={form.lastName} onChange={setF('lastName')} placeholder="Rivera" required />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">Email</label>
              <input type="email" value={form.email} onChange={setF('email')} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-1.5">Password</label>
              <input type="password" value={form.password} onChange={setF('password')} placeholder="Min 8 characters" required />
            </div>

            <div>
              <label className="block text-[10px] font-medium uppercase tracking-[0.07em] text-[var(--txt-2)] mb-2">Choose your plan</label>
              <div className="grid grid-cols-2 gap-2">
                {PLANS.map((p) => (
                  <div key={p.id} onClick={() => setPlan(p.id)}
                    className={clsx('border rounded-xl p-3 cursor-pointer transition-all',
                      plan === p.id ? 'border-[var(--accent)] bg-[var(--accent-dim)]' : 'border-[var(--border)] hover:border-[var(--border-2)]')}>
                    {p.popular && (
                      <div className="text-[9px] bg-[var(--accent-dim)] text-[var(--accent)] border border-[var(--accent-border)] rounded px-1.5 py-0.5 inline-block mb-1.5 font-medium">Popular</div>
                    )}
                    <div className="text-[13px] font-medium text-[var(--txt-0)]">{p.name}</div>
                    <div className="text-[10.5px] font-mono text-[var(--txt-2)] mb-1">{p.price}</div>
                    <div className="text-[10.5px] text-[var(--txt-2)]">{p.perks}</div>
                  </div>
                ))}
              </div>
            </div>

            <Button variant="accent" size="lg" className="w-full justify-center mt-1" disabled={loading}>
              {loading ? <Spinner /> : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-[12px] text-[var(--txt-2)] mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-[var(--accent)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
