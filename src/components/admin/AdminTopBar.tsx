'use client'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, LogOut, Menu } from 'lucide-react'
import { signOut } from '@/services/auth'

const TITLES: Record<string, string> = {
  '/admin/dashboard':    'Dashboard',
  '/admin/bookings':     'Bookings',
  '/admin/properties':   'Properties',
  '/admin/availability': 'Availability',
  '/admin/guests':       'Guests',
}

export default function AdminTopBar() {
  const pathname = usePathname()
  const router = useRouter()
  const title = TITLES[pathname] ?? 'Admin'
  const [menuOpen, setMenuOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
      router.push('/admin/login')
      router.refresh()
    } catch (err) {
      console.error('Sign out failed:', err)
      setSigningOut(false)
    }
  }

  return (
    <header className="h-16 bg-charcoal-900 border-b border-charcoal-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        {/* Mobile hamburger */}
        <button className="lg:hidden text-charcoal-400 hover:text-charcoal-200">
          <Menu size={20} />
        </button>
        <div>
          <h1 className="font-display text-xl text-charcoal-100">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-lg bg-charcoal-800 border border-charcoal-700 flex items-center justify-center text-charcoal-400 hover:text-gold hover:border-gold/40 transition-all">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold rounded-full" />
        </button>

        {/* Avatar / account menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-2.5 bg-charcoal-800 border border-charcoal-700 rounded-lg px-3 py-2 hover:border-gold/40 transition-colors"
          >
            <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
              <span className="text-gold text-xs font-semibold">A</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs text-charcoal-200 font-medium">Admin</p>
              <p className="text-[10px] text-charcoal-500">Alvis Suite</p>
            </div>
          </button>

          {menuOpen && (
            <>
              {/* Click-away backdrop */}
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-44 bg-charcoal-800 border border-charcoal-700 rounded-lg shadow-xl z-20 overflow-hidden">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-charcoal-300 hover:bg-charcoal-700 hover:text-red-400 transition-colors disabled:opacity-50"
                >
                  <LogOut size={14} />
                  {signingOut ? 'Signing out...' : 'Sign out'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
