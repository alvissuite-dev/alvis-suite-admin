'use client'
import { useEffect, useMemo, useState } from 'react'
import { Search, Users, Mail, Phone, CalendarCheck, X, Loader2, AlertTriangle, DollarSign } from 'lucide-react'
import { getBookings } from '@/services/bookings'
import { Booking } from '@/types'
import { formatPrice, formatDate, getStatusColor, getStatusDot } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface GuestRecord {
  name:               string
  email:              string
  phone:              string | null
  total_bookings:     number
  confirmed_bookings: number
  total_spent:        number      // Confirmed spend only
  potential_spent:    number      // Confirmed + pending spend
  last_stay:          string
  bookings:           Booking[]
  user_id?:           string
}

function buildGuestRecords(bookings: Booking[], profilesMap: Map<string, any>): GuestRecord[] {
  const map = new Map<string, GuestRecord>()
  const safeMap = profilesMap || new Map()

  for (const b of bookings) {
    const emailKey = b.guest_email || 'no-email'
    const profile = safeMap.get(b.user_id) || safeMap.get(b.guest_email)

    if (!map.has(emailKey)) {
      map.set(emailKey, {
        name:               profile?.full_name || b.guest_name || 'Unknown',
        email:              b.guest_email || 'No email',
        phone:              (profile?.phone || (b as any).phone || b.guest_phone) ?? null,
        total_bookings:     0,
        confirmed_bookings: 0,
        total_spent:        0,
        potential_spent:    0,
        last_stay:          b.check_out,
        bookings:           [],
        user_id:            profile?.id || b.user_id,
      })
    }
    const rec = map.get(emailKey)!

    if (profile?.full_name) rec.name = profile.full_name
    if (profile?.phone) rec.phone = profile.phone
    if (!rec.user_id && (profile?.id || b.user_id)) rec.user_id = profile?.id || b.user_id

    rec.total_bookings += 1
    rec.potential_spent += b.total_price

    // Check if booking is confirmed / approved (adjust status string if your DB uses something else like 'approved')
    const isConfirmed = b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'approved'
    if (isConfirmed) {
      rec.confirmed_bookings += 1
      rec.total_spent += b.total_price
    }

    if (b.check_out > rec.last_stay) rec.last_stay = b.check_out
    rec.bookings.push(b)
  }
  return Array.from(map.values()).sort((a, b) => b.total_spent - a.total_spent)
}

export default function GuestsPage() {
  const [bookings,    setBookings]    = useState<Booking[]>([])
  const [pageLoading, setPageLoading] = useState(true)
  const [pageError,   setPageError]   = useState('')
  const [search,      setSearch]      = useState('')
  const [selected,    setSelected]    = useState<GuestRecord | null>(null)

  // Granular data cleanup states
  const [clearBookings, setClearBookings] = useState(false)
  const [clearPoints,   setClearPoints]   = useState(false)
  const [clearTier,     setClearTier]     = useState(false)
  const [clearProfile,  setClearProfile]  = useState(false)
  const [isClearing,    setIsClearing]    = useState(false)

  const supabase = createClient()
  const [profilesMap, setProfilesMap] = useState<Map<string, any>>(new Map())

  const loadData = async () => {
    try {
      const [bookingsData, { data: profilesData }] = await Promise.all([
        getBookings(),
        supabase.from('profiles').select('*')
      ])

      const map = new Map<string, any>()
      if (profilesData) {
        profilesData.forEach(p => {
          if (p.id) map.set(p.id, p)
          if (p.email) map.set(p.email, p)
        })
      }
      setProfilesMap(map)
      setBookings(bookingsData || [])
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load guests')
    } finally {
      setPageLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    setPageLoading(true)

    loadData().then(() => {
      if (!cancelled) setPageLoading(false)
    })

    return () => { cancelled = true }
  }, [])

  const guests = useMemo(() => buildGuestRecords(bookings, profilesMap), [bookings, profilesMap])

  const filtered = guests.filter(g => {
    const q = search.toLowerCase()
    return !q || (g.name || '').toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q)
  })

  // Global metrics calculations
  const totalConfirmedBookingsCount = bookings.filter(b => b.status?.toLowerCase() === 'confirmed' || b.status?.toLowerCase() === 'approved').length
  const totalConfirmedSpendAllGuests = guests.reduce((s, g) => s + g.total_spent, 0)
  const totalPotentialEarningsAllGuests = guests.reduce((s, g) => s + g.potential_spent, 0)

  const handleExecuteClear = async () => {
    if (!selected) return
    if (!clearBookings && !clearPoints && !clearTier && !clearProfile) {
      alert('Please select at least one control option to clear.')
      return
    }

    if (!confirm(`Are you sure you want to execute data clearing for ${selected.name}? This cannot be undone.`)) return

    setIsClearing(true)
    try {
      if (clearBookings) {
        if (selected.user_id) {
          const { error: userDelErr } = await supabase
            .from('bookings')
            .delete()
            .eq('user_id', selected.user_id)
          if (userDelErr) console.warn('Warning on user_id booking delete:', userDelErr.message)
        }

        if (selected.email && selected.email !== 'No email') {
          const { error: emailDelErr } = await supabase
            .from('bookings')
            .delete()
            .eq('guest_email', selected.email)
          if (emailDelErr) console.warn('Warning on guest_email booking delete:', emailDelErr.message)
        }
      }

      if (clearProfile && selected.user_id) {
        const { error: profDelError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', selected.user_id)
        if (profDelError) throw profDelError
      } else {
        const profileUpdates: any = {}
        if (clearPoints) {
          profileUpdates.loyalty_points = 0
          profileUpdates.points_used = 0
        }
        if (clearTier) {
          profileUpdates.tier = 'Member'
        }

        if (Object.keys(profileUpdates).length > 0 && selected.email) {
          let pQuery = supabase.from('profiles').update(profileUpdates)
          if (selected.user_id) {
            pQuery = pQuery.eq('id', selected.user_id)
          } else {
            pQuery = pQuery.eq('email', selected.email)
          }
          const { error: pError } = await pQuery
          if (pError) throw pError
        }
      }

      alert('Selected guest data cleared successfully from database!')
      setSelected(null)
      setClearBookings(false)
      setClearPoints(false)
      setClearTier(false)
      setClearProfile(false)
      setPageLoading(true)
      await loadData()
    } catch (err: any) {
      console.error('Error clearing data:', err)
      alert(`Failed to clear data: ${err.message || err}`)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-charcoal-100">Guests</h2>
          <p className="text-charcoal-500 text-sm mt-0.5">{guests.length} unique guests</p>
        </div>
      </div>

      {pageError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {pageError}
        </div>
      )}

      {/* Stats row - Updated to show confirmed vs potential values */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total guests',          value: guests.length,                                                                                  icon: Users },
          { label: 'Bookings (Conf. / Tot)',value: `${totalConfirmedBookingsCount} / ${bookings.length}`,                                        icon: CalendarCheck },
          { label: 'Avg. confirmed spend',  value: guests.length ? `PKR ${Math.round(totalConfirmedSpendAllGuests / guests.length).toLocaleString()}` : 'PKR 0', icon: DollarSign },
          { label: 'Potential earnings',    value: `PKR ${Math.round(totalPotentialEarningsAllGuests).toLocaleString()}`,                          icon: DollarSign },
        ].map(s => (
          <div key={s.label} className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
            <p className="text-xs text-charcoal-500 mb-1">{s.label}</p>
            <p className="text-xl font-semibold text-gold">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
        <input
          className="input-luxury pl-9 h-10 text-sm"
          placeholder="Search by name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Guest table */}
      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700">
                {['Guest', 'Contact', 'Bookings', 'Confirmed spend', 'Last stay', ''].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700/50">
              {pageLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-charcoal-500">
                    <Loader2 size={18} className="animate-spin inline mr-2" /> Loading guests...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-charcoal-600">No guests found</td>
                </tr>
              ) : filtered.map(g => (
                <tr key={g.email || 'no-email'} className="hover:bg-charcoal-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-gold text-xs font-semibold">
                          {(g.name || 'Unknown').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-charcoal-200 font-medium">{g.name || 'Unknown'}</p>
                        {g.confirmed_bookings > 1 && (
                          <span className="text-xs text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">Repeat guest</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col gap-0.5">
                      <a href={`mailto:${g.email}`} className="text-charcoal-400 hover:text-gold flex items-center gap-1 transition-colors text-xs">
                        <Mail size={11} /> {g.email}
                      </a>
                      {g.phone && (
                        <a href={`tel:${g.phone}`} className="text-charcoal-500 hover:text-charcoal-300 flex items-center gap-1 transition-colors text-xs">
                          <Phone size={11} /> {g.phone}
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <span className="text-charcoal-200 font-semibold">{g.confirmed_bookings} / {g.total_bookings}</span>
                    <span className="block text-[10px] text-charcoal-500">Conf / Total</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-gold font-semibold">{formatPrice(g.total_spent)}</span>
                    <span className="block text-[10px] text-charcoal-500">Potential: {formatPrice(g.potential_spent)}</span>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-400 whitespace-nowrap">
                    {formatDate(g.last_stay)}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelected(g)}
                      className="text-xs text-charcoal-500 hover:text-gold transition-colors"
                    >
                      View history
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Guest detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-charcoal-950/80 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-charcoal-900 border-l border-charcoal-700 h-full overflow-y-auto shadow-dark-lg">
            <div className="sticky top-0 bg-charcoal-900 border-b border-charcoal-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-display text-xl text-charcoal-100">Guest profile</h3>
              <button onClick={() => setSelected(null)} className="text-charcoal-500 hover:text-charcoal-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Avatar + name */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                  <span className="text-gold text-xl font-semibold">
                    {(selected.name || 'Unknown').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <h4 className="font-display text-xl text-charcoal-100">{selected.name || 'Unknown'}</h4>
                  {selected.confirmed_bookings > 1 && (
                    <span className="text-xs text-gold bg-gold/10 border border-gold/20 px-2 py-0.5 rounded-full">
                      Repeat guest · {selected.confirmed_bookings} confirmed stays
                    </span>
                  )}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
                <h5 className="text-xs text-gold tracking-wider uppercase">Contact</h5>
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-charcoal-500" />
                  <a href={`mailto:${selected.email}`} className="text-charcoal-300 hover:text-gold transition-colors">
                    {selected.email}
                  </a>
                </div>
                {selected.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone size={14} className="text-charcoal-500" />
                    <a href={`tel:${selected.phone}`} className="text-charcoal-300 hover:text-gold transition-colors">
                      {selected.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
                  <p className="text-2xl font-semibold text-gold">{selected.confirmed_bookings} <span className="text-sm font-normal text-charcoal-500">/ {selected.total_bookings}</span></p>
                  <p className="text-xs text-charcoal-500 mt-1">Confirmed / Total Stays</p>
                </div>
                <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 text-center">
                  <p className="text-lg font-semibold text-gold">{formatPrice(selected.total_spent)}</p>
                  <p className="text-xs text-charcoal-500 mt-1">Confirmed Spent (Pot: {formatPrice(selected.potential_spent)})</p>
                </div>
              </div>

              {/* Booking history */}
              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-charcoal-700 flex items-center justify-between">
                  <h5 className="text-xs text-gold tracking-wider uppercase">Booking history</h5>
                  <span className="text-[10px] text-charcoal-400">Includes pending, approved & cancelled</span>
                </div>
                <div className="divide-y divide-charcoal-700/50 max-h-60 overflow-y-auto">
                  {selected.bookings.length === 0 ? (
                    <p className="p-4 text-xs text-charcoal-500 text-center">No bookings recorded</p>
                  ) : (
                    selected.bookings.map(b => (
                      <div key={b.id} className="p-4 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-charcoal-200 font-medium">{b.apartment_name}</p>
                          <span className={`badge text-xs ${getStatusColor(b.status)}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(b.status)}`} />
                            {b.status}
                          </span>
                        </div>
                        <p className="text-xs text-charcoal-500">
                          {formatDate(b.check_in)} → {formatDate(b.check_out)} · {b.num_nights} nights
                        </p>
                        <p className="text-sm text-gold font-medium">{formatPrice(b.total_price)}</p>
                        {b.special_requests && (
                          <p className="text-xs text-charcoal-500 italic">{b.special_requests}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Master Data Control / Danger Zone */}
              <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400 text-xs font-semibold uppercase tracking-wider">
                  <AlertTriangle size={14} /> User Control & Data Deletion
                </div>
                <p className="text-xs text-charcoal-400">
                  Select precisely which records to wipe out for complete control over this user:
                </p>
                
                <div className="space-y-2.5 pt-1 text-xs text-charcoal-300">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearBookings}
                      onChange={e => setClearBookings(e.target.checked)}
                      className="rounded border-charcoal-700 text-red-500 focus:ring-0"
                    />
                    Wipe ALL Bookings (Pending, Approved, Cancelled, & Earnings)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearPoints}
                      onChange={e => setClearPoints(e.target.checked)}
                      className="rounded border-charcoal-700 text-red-500 focus:ring-0"
                    />
                    Reset Loyalty Points & Points Used back to 0
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearTier}
                      onChange={e => setClearTier(e.target.checked)}
                      className="rounded border-charcoal-700 text-red-500 focus:ring-0"
                    />
                    Reset Tier back to Member
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clearProfile}
                      onChange={e => setClearProfile(e.target.checked)}
                      className="rounded border-charcoal-700 text-red-500 focus:ring-0"
                    />
                    <span className="text-red-400 font-medium">Delete entire User Profile row from database</span>
                  </label>
                </div>

                <button
                  onClick={handleExecuteClear}
                  disabled={isClearing || (!clearBookings && !clearPoints && !clearTier && !clearProfile)}
                  className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isClearing ? <Loader2 size={13} className="animate-spin" /> : null}
                  Execute Selected Deletion / Reset
                </button>
              </div>

              {/* Quick actions */}
              <div className="space-y-2 pt-2">
                <a
                  href={`mailto:${selected.email}`}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-charcoal-600 text-charcoal-400 hover:border-gold/40 hover:text-gold text-sm transition-all"
                >
                  <Mail size={14} /> Send email
                </a>
                {selected.phone && (
                  <a
                    href={`https://wa.me/${selected.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-charcoal-600 text-charcoal-400 hover:border-green-500/40 hover:text-green-400 text-sm transition-all"
                  >
                    <Phone size={14} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}