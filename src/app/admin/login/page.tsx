'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react'
import { signIn } from '@/services/auth'

export const dynamic = 'force-dynamic'

export default function AdminLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await signIn(email, password)
      const redirectTo = searchParams.get('redirectedFrom') || '/admin/dashboard'
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex">
      {/* Left — branding */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=1200&q=80)', backgroundSize: 'cover', backgroundPosition: 'center' }}
      >
        <div className="absolute inset-0 bg-charcoal-950/75" />
        <div className="relative z-10">
          <div>
            <span className="font-display text-4xl font-light tracking-widest text-gold">ALVIS</span>
            <span className="block text-xs font-light tracking-[0.4em] text-charcoal-300 uppercase mt-1">Suite</span>
          </div>
        </div>
        <div className="relative z-10">
          <p className="font-display text-4xl text-charcoal-100 font-light leading-tight mb-4">
            Host portal.<br />Your properties,<br />your way.
          </p>
          <div className="divider-gold mb-4" />
          <p className="text-charcoal-400 text-sm">
            Manage bookings, properties, and guests from one dashboard.
          </p>
        </div>
      </div>

      {/* Right — login form */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-10">
            <span className="font-display text-3xl font-light tracking-widest text-gold">ALVIS</span>
            <span className="block text-xs font-light tracking-[0.3em] text-charcoal-400 uppercase mt-1">Suite Admin</span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-3xl text-charcoal-50 mb-2">Sign in</h1>
            <p className="text-charcoal-500 text-sm">Access the Alvis Suite host dashboard</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                <Mail size={11} /> Email
              </label>
              <input
                type="email"
                required
                className="input-luxury"
                placeholder="admin@alvissuite.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                <Lock size={11} /> Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  required
                  className="input-luxury pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-500 hover:text-charcoal-300"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <><Loader2 size={16} className="animate-spin" /> Signing in...</> : 'Sign in'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <a href="/" className="text-xs text-charcoal-600 hover:text-charcoal-400 transition-colors">
              ← Back to public site
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
