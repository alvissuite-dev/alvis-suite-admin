'use client'
import { useState } from 'react'
import { X, Calendar, Users, User, Mail, Phone, MessageSquare, CheckCircle, Loader2 } from 'lucide-react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format, differenceInCalendarDays, startOfToday } from 'date-fns'
import { Apartment } from '@/types'
import { formatPrice, detectCurrency } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { createBooking } from '@/services/bookings'

interface Props {
  apartment: Apartment
  onClose: () => void
}

type Step = 'dates' | 'details' | 'confirm' | 'success'

export default function BookingModal({ apartment, onClose }: Props) {
  const [step, setStep] = useState<Step>('dates')
  const [range, setRange] = useState<DateRange | undefined>()
  const [guests, setGuests] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [form, setForm] = useState({
    guest_name: '',
    guest_email: '',
    guest_phone: '',
    special_requests: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  const currency = detectCurrency(apartment.location)
  const today = startOfToday()
  
  // Calculate nights safely (default to 1 if same day selected, or actual difference)
  const rawNights = range?.from && range?.to ? differenceInCalendarDays(range.to, range.from) : 0
  const nights = rawNights === 0 && range?.from && range?.to ? 1 : rawNights
  const totalPrice = Math.max(1, nights) * apartment.price_per_night

  const updateForm = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (errors[k]) {
      setErrors(errs => ({ ...errs, [k]: '' }))
    }
  }

  const validateDetails = () => {
    const e: Record<string, string> = {}
    if (!form.guest_name.trim()) e.guest_name = 'Name is required'
    if (!form.guest_email.match(/\S+@\S+\.\S+/)) e.guest_email = 'Valid email required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!range?.from) return
    const checkOutDate = range.to || range.from
    setLoading(true)
    setSubmitError('')
    try {
      await createBooking({
        apartment_id: apartment.id,
        guest_name: form.guest_name,
        guest_email: form.guest_email,
        guest_phone: form.guest_phone,
        check_in: format(range.from, 'yyyy-MM-dd'),
        check_out: format(checkOutDate, 'yyyy-MM-dd'),
        num_guests: guests,
        special_requests: form.special_requests,
        total_price: totalPrice,
      })
      setStep('success')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong submitting your booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-charcoal-950/90 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-xl bg-charcoal-800 border border-charcoal-600 rounded-2xl shadow-dark-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-700">
          <div>
            <p className="text-xs text-gold tracking-widest uppercase mb-0.5">Reserve your stay</p>
            <h3 className="font-display text-xl text-charcoal-50">{apartment.name}</h3>
          </div>
          <button onClick={onClose} className="text-charcoal-400 hover:text-charcoal-100 transition-colors p-1">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        {step !== 'success' && (
          <div className="flex px-6 pt-4 gap-2">
            {(['dates', 'details', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                  step === s ? 'bg-gold text-charcoal-950' :
                  ['dates','details','confirm'].indexOf(step) > i ? 'bg-gold/30 text-gold border border-gold/50' :
                  'bg-charcoal-700 text-charcoal-500'
                )}>
                  {i + 1}
                </div>
                <span className={cn('text-xs capitalize hidden sm:block', step === s ? 'text-gold' : 'text-charcoal-500')}>
                  {s}
                </span>
                {i < 2 && <div className="flex-1 h-px bg-charcoal-700 ml-2" />}
              </div>
            ))}
          </div>
        )}

        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">

          {/* ── STEP 1: DATES ── */}
          {step === 'dates' && (
            <div>
              <p className="text-sm text-charcoal-400 mb-4">Select your check-in and check-out dates</p>
              <div className="flex justify-center mb-4">
                <DayPicker
                  mode="range"
                  selected={range}
                  onSelect={setRange}
                  disabled={{ before: today }}
                  numberOfMonths={1}
                />
              </div>

              {/* Selected dates summary */}
              {range?.from && (
                <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl p-4 mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <div className="text-center">
                      <p className="text-charcoal-500 text-xs mb-1">Check-in</p>
                      <p className="text-charcoal-100 font-medium">
                        {format(range.from, 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center">
                      <div className="h-px w-10 bg-gold/30" />
                      <div className="mx-2 text-xs text-gold">
                        {nights > 0 ? `${nights}n` : '→'}
                      </div>
                      <div className="h-px w-10 bg-gold/30" />
                    </div>
                    <div className="text-center">
                      <p className="text-charcoal-500 text-xs mb-1">Check-out</p>
                      <p className={cn('font-medium', range.to ? 'text-charcoal-100' : 'text-charcoal-600')}>
                        {range.to ? format(range.to, 'MMM d, yyyy') : format(range.from, 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="border-t border-charcoal-700 pt-3 mt-2 flex justify-between">
                    <span className="text-sm text-charcoal-400">
                      {formatPrice(apartment.price_per_night, currency)} × {nights} night{nights > 1 ? 's' : ''}
                    </span>
                    <span className="text-gold font-semibold">{formatPrice(totalPrice, currency)}</span>
                  </div>
                </div>
              )}

              {/* Guests */}
              <div className="flex items-center justify-between bg-charcoal-900 border border-charcoal-700 rounded-xl p-4 mb-5">
                <div className="flex items-center gap-2 text-charcoal-300">
                  <Users size={16} className="text-gold/70" />
                  <span className="text-sm">Guests</span>
                  <span className="text-xs text-charcoal-500">(max {apartment.max_guests})</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setGuests(g => Math.max(1, g - 1))}
                    className="w-8 h-8 rounded-full border border-charcoal-600 hover:border-gold/50 text-charcoal-300 hover:text-gold flex items-center justify-center transition-all"
                  >–</button>
                  <span className="w-4 text-center text-charcoal-100 font-semibold">{guests}</span>
                  <button
                    onClick={() => setGuests(g => Math.min(apartment.max_guests, g + 1))}
                    className="w-8 h-8 rounded-full border border-charcoal-600 hover:border-gold/50 text-charcoal-300 hover:text-gold flex items-center justify-center transition-all"
                  >+</button>
                </div>
              </div>

              <button
                onClick={() => setStep('details')}
                disabled={!range?.from}
                className="btn-gold w-full disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 'details' && (
            <div className="space-y-4">
              <p className="text-sm text-charcoal-400 mb-2">Tell us about yourself</p>

              <div>
                <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                  <User size={12} /> Full name <span className="text-gold">*</span>
                </label>
                <input
                  className="input-luxury"
                  placeholder="Sara Al-Hassan"
                  value={form.guest_name}
                  onChange={updateForm('guest_name')}
                />
                {errors.guest_name && <p className="text-red-400 text-xs mt-1">{errors.guest_name}</p>}
              </div>

              <div>
                <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                  <Mail size={12} /> Email address <span className="text-gold">*</span>
                </label>
                <input
                  className="input-luxury"
                  type="email"
                  placeholder="sara@example.com"
                  value={form.guest_email}
                  onChange={updateForm('guest_email')}
                />
                {errors.guest_email && <p className="text-red-400 text-xs mt-1">{errors.guest_email}</p>}
              </div>

              <div>
                <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                  <Phone size={12} /> Phone number <span className="text-charcoal-600 text-xs">(optional)</span>
                </label>
                <input
                  className="input-luxury"
                  type="tel"
                  placeholder="+971 50 000 0000"
                  value={form.guest_phone}
                  onChange={updateForm('guest_phone')}
                />
              </div>

              <div>
                <label className="text-xs text-charcoal-400 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare size={12} /> Special requests <span className="text-charcoal-600 text-xs">(optional)</span>
                </label>
                <textarea
                  className="input-luxury resize-none h-24"
                  placeholder="Late check-in, anniversary setup, dietary preferences..."
                  value={form.special_requests}
                  onChange={updateForm('special_requests')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep('dates')} className="btn-ghost flex-1">
                  Back
                </button>
                <button
                  onClick={() => { if (validateDetails()) setStep('confirm') }}
                  className="btn-gold flex-1"
                >
                  Review booking
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 'confirm' && (
            <div>
              <p className="text-sm text-charcoal-400 mb-5">Please review your booking before confirming</p>

              {/* Summary card */}
              <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl p-5 mb-5 space-y-3">
                <h4 className="font-display text-lg text-charcoal-100">{apartment.name}</h4>
                <p className="text-xs text-charcoal-500">{apartment.location}</p>

                <div className="h-px bg-charcoal-700" />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Check-in</p>
                    <p className="text-charcoal-200">{range?.from ? format(range.from, 'MMM d, yyyy') : ''}</p>
                  </div>
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Check-out</p>
                    <p className="text-charcoal-200">{range?.to ? format(range.to, 'MMM d, yyyy') : (range?.from ? format(range.from, 'MMM d, yyyy') : '')}</p>
                  </div>
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Duration</p>
                    <p className="text-charcoal-200">{nights} night{nights > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Guests</p>
                    <p className="text-charcoal-200">{guests}</p>
                  </div>
                </div>

                <div className="h-px bg-charcoal-700" />

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Name</p>
                    <p className="text-charcoal-200">{form.guest_name}</p>
                  </div>
                  <div>
                    <p className="text-charcoal-500 text-xs mb-0.5">Email</p>
                    <p className="text-charcoal-200 truncate">{form.guest_email}</p>
                  </div>
                </div>

                {form.special_requests && (
                  <>
                    <div className="h-px bg-charcoal-700" />
                    <div>
                      <p className="text-charcoal-500 text-xs mb-0.5">Special requests</p>
                      <p className="text-charcoal-300 text-sm">{form.special_requests}</p>
                    </div>
                  </>
                )}

                <div className="h-px bg-charcoal-700" />

                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-charcoal-500 text-xs">
                      {formatPrice(apartment.price_per_night, currency)} × {nights} night{nights > 1 ? 's' : ''}
                    </p>
                    <p className="text-xs text-charcoal-600 mt-0.5">Status: Pending confirmation</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold font-bold text-xl">{formatPrice(totalPrice, currency)}</p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-charcoal-500 mb-5 text-center">
                By confirming, you agree to the house rules and cancellation policy.
                The host will confirm your booking within 24 hours.
              </p>

              {submitError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm mb-5">
                  {submitError}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('details')} className="btn-ghost flex-1">
                  Edit
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="btn-gold flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                  ) : (
                    'Confirm booking request'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── STEP 4: SUCCESS ── */}
          {step === 'success' && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle size={32} className="text-emerald-400" />
              </div>
              <h3 className="font-display text-3xl text-charcoal-50 mb-3">Request received!</h3>
              <p className="text-charcoal-400 text-sm mb-2 leading-relaxed">
                Thank you, <span className="text-charcoal-200">{form.guest_name}</span>.
                Your booking request for <span className="text-charcoal-200">{apartment.name}</span> has been submitted.
              </p>
              <p className="text-charcoal-500 text-sm mb-8">
                A confirmation will be sent to <span className="text-gold">{form.guest_email}</span> within 24 hours.
              </p>
              <div className="bg-charcoal-900 border border-charcoal-700 rounded-xl p-4 text-left mb-6">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-charcoal-500">Check-in</span>
                  <span className="text-charcoal-200">{range?.from ? format(range.from, 'MMM d, yyyy') : ''}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-charcoal-500">Check-out</span>
                  <span className="text-charcoal-200">{range?.to ? format(range.to, 'MMM d, yyyy') : (range?.from ? format(range.from, 'MMM d, yyyy') : '')}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-charcoal-700 pt-2 mt-2">
                  <span className="text-charcoal-400 font-medium">Total</span>
                  <span className="text-gold font-semibold">{formatPrice(totalPrice, currency)}</span>
                </div>
              </div>
              <button onClick={onClose} className="btn-gold w-full">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}