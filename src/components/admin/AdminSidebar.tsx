'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, CalendarCheck, Building2, CalendarX, 
  Users, LogOut, ChevronRight, Tag, Award , Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { label: 'Dashboard',   href: '/admin/dashboard',   icon: LayoutDashboard },
  { label: 'Bookings',    href: '/admin/bookings',    icon: CalendarCheck },
  { label: 'Properties',  href: '/admin/properties',  icon: Building2 },
  { label: 'Availability', href: '/admin/availability', icon: CalendarX },
  { label: 'Guests',      href: '/admin/guests',      icon: Users },
  { label: 'Loyalty',     href: '/admin/loyalty',     icon: Award },
  { label: 'Offers',      href: '/admin/offers',      icon: Tag },
  { label: 'Users Directory', href: '/admin/users', icon: Users },
  { label: 'Notifications', href: '/admin/notifications', icon: Bell },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex flex-col w-60 bg-charcoal-900 border-r border-charcoal-800 min-h-screen">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-charcoal-800">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/images/Logo Transparent.png" 
            alt="Alvis Suite Logo" 
            width={36} 
            height={36} 
            className="object-contain"
          />
          <div>
            <span className="font-display text-xl font-light tracking-widest text-gold">ALVIS</span>
            <span className="block text-[10px] font-light tracking-[0.4em] text-charcoal-500 uppercase mt-0.5">Admin Portal</span>
          </div>
        </Link>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group',
                active
                  ? 'bg-crimson/15 text-ivory border-l-2 border-crimson pl-[10px] font-medium'
                  : 'text-charcoal-400 hover:text-charcoal-200 hover:bg-charcoal-800 border-l-2 border-transparent'
              )}
            >
              <Icon size={17} className={active ? 'text-crimson light:text-crimson-light' : ''} />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight size={13} className="text-crimson" />}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-charcoal-800 space-y-0.5">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:text-charcoal-300 hover:bg-charcoal-800 transition-all"
        >
          <ChevronRight size={17} className="rotate-180" />
          View public site
        </Link>
        <Link
          href="/admin/login"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-charcoal-500 hover:text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={17} />
          Sign out
        </Link>
      </div>
    </aside>
  )
}