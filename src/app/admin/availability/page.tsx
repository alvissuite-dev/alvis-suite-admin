'use client'
import { useEffect, useState } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parseISO, isSameDay } from 'date-fns'
import { CalendarX, CalendarCheck, Loader2, X, Info } from 'lucide-react'
import { getApartments } from '@/services/apartments'
import { getBlockedDates, blockDate, unblockDate } from '@/services/blockedDates'
import { Apartment, BlockedDate } from '@/types'
import { cn } from '@/lib/utils'

const REASONS = ['Maintenance', 'Owner use', 'Deep cleaning', 'Renovation', 'Reserved', 'Other']

export default function AvailabilityPage() {
  const [apartments,    setApartments]    = useState<Apartment[]>([])
  const [selectedAptId, setSelectedAptId] = useState<string | null>(null)
  const [blockedDates,  setBlockedDates]  = useState<BlockedDate[]>([])
  const [selectedDays,  setSelectedDays]  = useState<Date[]>([])
  const [reason,        setReason]        = useState('Maintenance')
  const [loading,       setLoading]       = useState(false)
  const [pageLoading,   setPageLoading]   = useState(true)
  const [pageError,     setPageError]     = useState('')
  const [unblockingId,  setUnblockingId]  = useState<string | null>(null)
  const [clearingAll,   setClearingAll]   = useState(false)

  useEffect(() => {
    let cancelled = false
    setPageLoading(true)
    Promise.all([getApartments(), getBlockedDates()])
      .then(([apts, blocked]) => {
        if (cancelled) return
        setApartments(apts)
        setBlockedDates(blocked)
        if (apts.length > 0) setSelectedAptId(apts[0].id)
      })
      .catch(err => { if (!cancelled) setPageError(err instanceof Error ? err.message : 'Failed to load availability data') })
      .finally(() => { if (!cancelled) setPageLoading(false) })
    return () => { cancelled = true }
  }, [])

  const apt = apartments.find(a => a.id === selectedAptId)
  const aptBlocked = blockedDates.filter(b => b.apartment_id === selectedAptId)
  const blockedParsed = aptBlocked.map(b => parseISO(b.blocked_date))

  const isBlocked = (d: Date) => blockedParsed.some(bd => isSameDay(bd, d))
  const isSelected = (d: Date) => selectedDays.some(sd => isSameDay(sd, d))

  const toggleDay = async (day: Date) => {
    if (!selectedAptId) return
    if (isBlocked(day)) {
      const match = aptBlocked.find(b => isSameDay(parseISO(b.blocked_date), day))
      if (!match) return
      setUnblockingId(match.id)
      try {
        await unblockDate(match.id)
        setBlockedDates(prev => prev.filter(b => b.id !== match.id))
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to unblock date')
      } finally {
        setUnblockingId(null)
      }
      return
    }
    setSelectedDays(prev =>
      prev.some(d => isSameDay(d, day))
        ? prev.filter(d => !isSameDay(d, day))
        : [...prev, day]
    )
  }

  const handleBlock = async () => {
    if (!selectedDays.length || !selectedAptId) return
    setLoading(true)
    try {
      const created = await Promise.all(
        selectedDays.map(d => blockDate(selectedAptId, format(d, 'yyyy-MM-dd'), reason))
      )
      setBlockedDates(prev => [...prev, ...created])
      setSelectedDays([])
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to block dates')
    } finally {
      setLoading(false)
    }
  }

  const unblockAll = async () => {
    if (!selectedAptId || !aptBlocked.length) return
    if (!confirm(`Unblock all ${aptBlocked.length} dates for this property?`)) return
    setClearingAll(true)
    try {
      await Promise.all(aptBlocked.map(b => unblockDate(b.id)))
      setBlockedDates(prev => prev.filter(b => b.apartment_id !== selectedAptId))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to clear blocked dates')
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl text-charcoal-100">Availability</h2>
        <p className="text-charcoal-500 text-sm mt-0.5">Block or unblock dates for each property</p>
      </div>

      {pageError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {pageError}
        </div>
      )}

      {pageLoading ? (
        <div className="flex items-center justify-center py-16 text-charcoal-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading availability...
        </div>
      ) : !apt ? (
        <div className="text-center py-16 text-charcoal-600 bg-charcoal-800 border border-charcoal-700 rounded-xl">
          Add a property first to manage its availability.
        </div>
      ) : (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left — property selector + controls */}
        <div className="space-y-4">
          {/* Property selector */}
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
            <h3 className="text-xs text-gold tracking-wider uppercase mb-3">Select property</h3>
            <div className="space-y-2">
              {apartments.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setSelectedAptId(a.id); setSelectedDays([]) }}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all border',
                    selectedAptId === a.id
                      ? 'bg-gold/10 border-gold/40 text-gold'
                      : 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-600 hover:text-charcoal-200'
                  )}
                >
                  <p className="font-medium truncate">{a.name}</p>
                  <p className="text-xs opacity-60 mt-0.5">{a.location}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Block reason */}
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
            <h3 className="text-xs text-gold tracking-wider uppercase mb-3">Block reason</h3>
            <div className="space-y-1.5">
              {REASONS.map(r => (
                <button
                  key={r}
                  onClick={() => setReason(r)}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg text-sm transition-all border',
                    reason === r
                      ? 'bg-gold/10 border-gold/40 text-gold'
                      : 'border-transparent text-charcoal-400 hover:text-charcoal-200'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Info box */}
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
            <div className="flex items-start gap-2 mb-3">
              <Info size={14} className="text-gold mt-0.5 flex-shrink-0" />
              <p className="text-xs text-charcoal-400 leading-relaxed">
                Click dates on the calendar to select them, then press <strong className="text-charcoal-200">Block dates</strong>.
                Click a blocked (red) date to immediately unblock it.
              </p>
            </div>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-500/30 border border-red-500/50" />
                <span className="text-charcoal-400">Blocked date</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-gold/30 border border-gold/50" />
                <span className="text-charcoal-400">Selected to block</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-charcoal-600 border border-charcoal-500" />
                <span className="text-charcoal-400">Available</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center — calendar */}
        <div className="xl:col-span-2 space-y-4">
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-charcoal-100 font-medium">{apt.name}</h3>
                <p className="text-xs text-charcoal-500">{apt.location} · {aptBlocked.length} blocked dates</p>
              </div>
              {aptBlocked.length > 0 && (
                <button
                  onClick={unblockAll}
                  disabled={clearingAll}
                  className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  {clearingAll ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />} Clear all
                </button>
              )}
            </div>

            <DayPicker
              mode="multiple"
              selected={selectedDays}
              onDayClick={toggleDay}
              numberOfMonths={2}
              modifiers={{ blocked: blockedParsed }}
              modifiersStyles={{
                blocked: {
                  backgroundColor: 'rgba(239,68,68,0.2)',
                  color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.4)',
                  borderRadius: '6px',
                },
              }}
            />
          </div>

          {/* Action bar */}
          <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              {selectedDays.length > 0 ? (
                <div>
                  <p className="text-sm text-charcoal-200 font-medium">
                    {selectedDays.length} date{selectedDays.length > 1 ? 's' : ''} selected
                  </p>
                  <p className="text-xs text-charcoal-500 mt-0.5">
                    Reason: <span className="text-gold">{reason}</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm text-charcoal-500">No dates selected — click dates on the calendar</p>
              )}
            </div>
            <div className="flex gap-3">
              {selectedDays.length > 0 && (
                <button
                  onClick={() => setSelectedDays([])}
                  className="btn-ghost text-sm px-4 py-2"
                >
                  Clear selection
                </button>
              )}
              <button
                onClick={handleBlock}
                disabled={!selectedDays.length || loading}
                className="btn-gold text-sm px-5 py-2.5 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading
                  ? <><Loader2 size={14} className="animate-spin" /> Blocking...</>
                  : <><CalendarX size={14} /> Block {selectedDays.length > 0 ? `${selectedDays.length} date${selectedDays.length > 1 ? 's' : ''}` : 'dates'}</>
                }
              </button>
            </div>
          </div>

          {/* Blocked dates list */}
          {aptBlocked.length > 0 && (
            <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-charcoal-700">
                <h3 className="text-sm text-charcoal-300 font-medium">Blocked dates for {apt.name}</h3>
              </div>
              <div className="divide-y divide-charcoal-700/50 max-h-64 overflow-y-auto">
                {aptBlocked
                  .sort((a, b) => a.blocked_date.localeCompare(b.blocked_date))
                  .map(bd => (
                    <div key={bd.id} className="flex items-center justify-between px-5 py-3 hover:bg-charcoal-700/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <CalendarX size={14} className="text-red-400" />
                        <div>
                          <p className="text-sm text-charcoal-200">
                            {format(parseISO(bd.blocked_date), 'EEEE, MMMM d, yyyy')}
                          </p>
                          {bd.reason && (
                            <p className="text-xs text-charcoal-500">{bd.reason}</p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          setUnblockingId(bd.id)
                          try {
                            await unblockDate(bd.id)
                            setBlockedDates(prev => prev.filter(b => b.id !== bd.id))
                          } catch (err) {
                            alert(err instanceof Error ? err.message : 'Failed to unblock date')
                          } finally {
                            setUnblockingId(null)
                          }
                        }}
                        disabled={unblockingId === bd.id}
                        className="w-7 h-7 rounded flex items-center justify-center text-charcoal-600 hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                      >
                        {unblockingId === bd.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />}
                      </button>
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}
