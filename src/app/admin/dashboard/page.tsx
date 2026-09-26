import {
  CalendarCheck, CalendarClock, TrendingUp, Building2,
  LogIn, LogOut, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getDashboardStats, getBookings } from '@/services/bookings'
import { getApartments } from '@/services/apartments'
import { formatPrice, formatDate, getStatusColor, getStatusDot, todayStr } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const [stats, bookings, apartments] = await Promise.all([
    getDashboardStats(supabase),
    getBookings(supabase),
    getApartments(supabase),
  ])

  const recentBookings = bookings.slice(0, 5)
  const today = todayStr()
  const checkinsToday = bookings.filter(b => b.status === 'confirmed' && b.check_in === today)
  const checkoutsToday = bookings.filter(b => b.status === 'confirmed' && b.check_out === today)

  const KPI_CARDS = [
    {
      label:  'Total bookings',
      value:  stats.total_bookings,
      icon:   CalendarCheck,
      color:  'text-blue-400',
      bg:     'bg-blue-400/10',
      border: 'border-blue-400/20',
    },
    {
      label:  'Pending review',
      value:  stats.pending_bookings,
      icon:   CalendarClock,
      color:  'text-gold',
      bg:     'bg-gold/10',
      border: 'border-gold/20',
      link:   '/admin/bookings?status=pending',
    },
    {
      label:  'Total revenue',
      value:  formatPrice(stats.total_revenue, 'PKR'),
      icon:   TrendingUp,
      color:  'text-emerald-400',
      bg:     'bg-emerald-400/10',
      border: 'border-emerald-400/20',
    },
    {
      label:  'Active properties',
      value:  apartments.filter(a => a.is_active).length,
      icon:   Building2,
      color:  'text-purple-400',
      bg:     'bg-purple-400/10',
      border: 'border-purple-400/20',
    },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome */}
      <div>
        <h2 className="font-display text-3xl text-charcoal-100 mb-1">
          Good morning, Alvis Suite
        </h2>
        <p className="text-charcoal-500 text-sm">
          Here's what's happening across your properties today.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {KPI_CARDS.map((card) => (
          <div
            key={card.label}
            className={`bg-charcoal-800 border ${card.border} rounded-xl p-5 hover:border-charcoal-600 transition-all`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                <card.icon size={18} className={card.color} />
              </div>
            </div>
            <p className="text-charcoal-500 text-xs mb-1">{card.label}</p>
            <p className={`text-2xl font-semibold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Today's activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LogIn size={16} className="text-emerald-400" />
            <h3 className="text-sm font-medium text-charcoal-200">Check-ins today</h3>
            <span className="ml-auto text-xl font-semibold text-emerald-400">{checkinsToday.length}</span>
          </div>
          {checkinsToday.length === 0 ? (
            <p className="text-charcoal-600 text-sm text-center py-4">No check-ins today</p>
          ) : (
            checkinsToday.slice(0, 2).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-t border-charcoal-700">
                <div className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center text-xs text-charcoal-300 font-medium">
                  {(b.guest_name || 'Unknown').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal-200 truncate">{b.guest_name || 'Unknown'}</p>
                  <p className="text-xs text-charcoal-500 truncate">{b.apartment_name}</p>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <LogOut size={16} className="text-gold" />
            <h3 className="text-sm font-medium text-charcoal-200">Check-outs today</h3>
            <span className="ml-auto text-xl font-semibold text-gold">{checkoutsToday.length}</span>
          </div>
          {checkoutsToday.length === 0 ? (
            <p className="text-charcoal-600 text-sm text-center py-4">No check-outs today</p>
          ) : (
            checkoutsToday.slice(0, 2).map(b => (
              <div key={b.id} className="flex items-center gap-3 py-2 border-t border-charcoal-700">
                <div className="w-8 h-8 rounded-full bg-charcoal-700 flex items-center justify-center text-xs text-charcoal-300 font-medium">
                  {(b.guest_name || 'Unknown').split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-charcoal-200 truncate">{b.guest_name || 'Unknown'}</p>
                  <p className="text-xs text-charcoal-500 truncate">{b.apartment_name}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent bookings table */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-700">
          <h3 className="font-medium text-charcoal-200">Recent bookings</h3>
          <Link
            href="/admin/bookings"
            className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors"
          >
            View all <ArrowRight size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700">
                {['Guest', 'Property', 'Dates', 'Nights', 'Total', 'Status'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700/50">
              {recentBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-charcoal-600 text-sm">
                    No bookings yet
                  </td>
                </tr>
              ) : (
                recentBookings.map(b => (
                  <tr key={b.id} className="hover:bg-charcoal-700/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-charcoal-200 font-medium">{b.guest_name || 'Unknown'}</p>
                      <p className="text-charcoal-500 text-xs">{b.guest_email || 'No email'}</p>
                      {b.guest_phone && <p className="text-charcoal-500 text-xs">{b.guest_phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-charcoal-300">{b.apartment_name}</p>
                      <p className="text-charcoal-500 text-xs">{b.apartment_location}</p>
                    </td>
                    <td className="px-5 py-3.5 text-charcoal-400 whitespace-nowrap">
                      {formatDate(b.check_in)} → {formatDate(b.check_out)}
                    </td>
                    <td className="px-5 py-3.5 text-charcoal-400 text-center">{b.num_nights}</td>
                    <td className="px-5 py-3.5 text-gold font-medium whitespace-nowrap">
                      {formatPrice(b.total_price)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`badge ${getStatusColor(b.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(b.status)}`} />
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Property quick view */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-700">
          <h3 className="font-medium text-charcoal-200">Properties overview</h3>
          <Link href="/admin/properties" className="flex items-center gap-1 text-xs text-gold hover:text-gold-light transition-colors">
            Manage <ArrowRight size={12} />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-charcoal-700">
          {apartments.length === 0 ? (
            <p className="col-span-full text-center text-charcoal-600 text-sm py-8">No properties yet</p>
          ) : (
            apartments.map(apt => (
              <div key={apt.id} className="p-5">
                <p className="text-charcoal-200 font-medium text-sm mb-1 line-clamp-1">{apt.name}</p>
                <p className="text-charcoal-500 text-xs mb-3">{apt.location}</p>
                <div className="flex items-center justify-between">
                  <span className="text-gold text-sm font-semibold">
                    {apt.price_per_night.toLocaleString()}<span className="text-xs text-charcoal-500">/n</span>
                  </span>
                  <span className={`badge text-xs ${apt.is_active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-charcoal-500 bg-charcoal-700 border-charcoal-600'}`}>
                    {apt.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
