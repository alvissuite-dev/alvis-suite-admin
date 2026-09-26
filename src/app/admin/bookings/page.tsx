'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter, ChevronDown, CheckCircle, XCircle, Clock, Eye, X, Loader2, Download } from 'lucide-react'
import { getBookings, updateBookingStatus } from '@/services/bookings'
import { Booking, BookingStatus } from '@/types'
import { formatPrice, formatDate, getStatusColor, getStatusDot } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()

const STATUSES: { value: string; label: string }[] = [
  { value: 'all',       label: 'All bookings' },
  { value: 'pending',   label: 'Pending'      },
  { value: 'confirmed', label: 'Confirmed'    },
  { value: 'cancelled', label: 'Cancelled'    },
]

export default function BookingsPage() {
  const searchParams = useSearchParams()
  const [bookings,      setBookings]      = useState<Booking[]>([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [statusFilter,  setStatusFilter]  = useState(searchParams.get('status') || 'all')
  const [search,        setSearch]        = useState('')
  const [selectedBk,    setSelectedBk]    = useState<Booking | null>(null)
  const [updatingId,    setUpdatingId]    = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getBookings()
    .then(data => { 
      if (!cancelled) setBookings(data); 
    })
    .catch(err => { 
      if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load bookings'); 
    })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const filtered = bookings.filter(b => {
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    const q = search.toLowerCase()
    const matchSearch = !q || (b.guest_name || '').toLowerCase().includes(q) ||
      (b.guest_email || '').toLowerCase().includes(q) ||
      (b.guest_phone?.toLowerCase().includes(q) ?? false) ||
      (b.apartment_name ?? '').toLowerCase().includes(q)
    return matchStatus && matchSearch
  })

  const updateStatus = async (id: string, status: BookingStatus) => {
    setUpdatingId(id)
    try {
      let assignedUnitId = null;
      let targetBooking = null; // Keep track of the target booking record

      // If confirming the booking, automatically find and assign an available physical unit
      if (status === 'confirmed') {
        targetBooking = bookings.find(b => b.id === id);
        if (!targetBooking) throw new Error('Booking not found');

        const apartmentId = targetBooking.apartment_id;
        const checkInDate = targetBooking.check_in;
        const checkOutDate = targetBooking.check_out;

        // 1. Fetch all active units for this apartment type
        const { data: units, error: unitError } = await supabase
          .from('units')
          .select('id, unit_number')
          .eq('apartment_id', apartmentId)
          .eq('status', 'active');
        
        if (unitError || !units.length) {
          throw new Error('No physical units configured for this apartment type yet!');
        }

        // 2. Find units already booked during these dates
        const { data: conflictingBookings } = await supabase
          .from('bookings')
          .select('unit_id')
          .eq('status', 'confirmed')
          .not('unit_id', 'is', null)
          .lte('check_in', checkOutDate)
          .gte('check_out', checkInDate);

        const bookedUnitIds = new Set(conflictingBookings?.map(b => b.unit_id) || []);

        // 3. Find units blocked for maintenance during these dates
        const { data: blockedUnits } = await supabase
          .from('blocked_dates')
          .select('unit_id')
          .not('unit_id', 'is', null)
          .lte('blocked_date', checkOutDate)
          .gte('blocked_date', checkInDate);

        const blockedUnitIds = new Set(blockedUnits?.map(b => b.unit_id) || []);

        // 4. Select the first available unit that has no conflicts
        const availableUnit = units.find(u => !bookedUnitIds.has(u.id) && !blockedUnitIds.has(u.id));

        if (!availableUnit) {
          throw new Error('All physical units for this apartment are fully booked or blocked for these dates!');
        }

        assignedUnitId = availableUnit.id;
      }

      // 5. Update booking status and save the assigned unit_id if confirmed
      const updatePayload: any = { status };
      if (assignedUnitId) {
        updatePayload.unit_id = assignedUnitId;
      }

      // Grab the old record from local state before update
      const oldRecord = bookings.find(b => b.id === id);

      const { error: updateError } = await supabase
        .from('bookings')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) throw updateError;

      // 6. TRIGGER EDGE FUNCTION EMAIL NOTIFICATION IF CONFIRMED
      if (status === 'confirmed' && oldRecord) {
        const updatedRecord = { ...oldRecord, status, ...(assignedUnitId ? { unit_id: assignedUnitId } : {}) };
        
        const { error: functionError } = await supabase.functions.invoke(
          'send-guest-confirmation-email',
          {
            body: { record: updatedRecord, old_record: oldRecord },
          }
        );

        if (functionError) {
          console.error('Failed to trigger confirmation email:', functionError);
        }
      }

      // Update local state
      setBookings(bs => bs.map(b => b.id === id ? { ...b, status, ...(assignedUnitId ? { unit_id: assignedUnitId } : {}) } : b))
      setSelectedBk(prev => prev?.id === id ? { ...prev, status, ...(assignedUnitId ? { unit_id: assignedUnitId } : {}) } : prev)
      
      alert(status === 'confirmed' ? 'Booking confirmed, unit assigned, and confirmation email sent!' : 'Booking status updated.');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update booking status')
    } finally {
      setUpdatingId(null)
    }
  }
  const handleDownloadInvoice = async (b: any) => {
    setDownloadingId(b.id)
    try {
      const html2pdf = (await import('html2pdf.js')).default

      const promoCodeText = b.promo_code || ''
      let promoVal = 0
      let displayDiscountValue: number | null = null
      let isPercentageDiscount = false

      if (promoCodeText) {
        const { data: offerData } = await supabase
          .from('offers')
          .select('discount_type, discount_value')
          .ilike('code', promoCodeText)
          .maybeSingle()

        if (offerData) {
          displayDiscountValue = Number(offerData.discount_value) || 0
          isPercentageDiscount = offerData.discount_type === 'percentage' || offerData.discount_type === '%' || offerData.discount_type === 'percent'
        }
      }

      const addonPrices: { [key: string]: { name: string; price: number } } = {
        'airport_transfer': { name: 'Airport Transfer', price: 4500 },
        'early_checkin': { name: 'Early Check-in', price: 2500 },
        'late_checkout': { name: 'Late Check-out', price: 3000 },
      }

      let addOnsVal = 0
      const activeAddons: { name: string; price: number }[] = []
      
      const addonKeys = Array.isArray(b.addons) 
        ? b.addons 
        : (typeof b.addons === 'string' && b.addons ? b.addons.replace(/[{}]/g, '').split(',').map((s: string) => s.trim().replace(/"/g, '')) : [])

      if (addonKeys.length > 0) {
        addonKeys.forEach((key: string) => {
          const addonInfo = addonPrices[key]
          if (addonInfo) {
            addOnsVal += addonInfo.price
            activeAddons.push(addonInfo)
          } else if (key) {
            activeAddons.push({ name: key, price: 0 })
          }
        })
      }

      const nightsNum = Number(b.num_nights || 1)
      const baseVal = Number(b.price_per_night || 0) * nightsNum
      const serviceVal = Math.round(baseVal * 0.08)

      if (promoCodeText && displayDiscountValue !== null) {
        if (isPercentageDiscount) {
          promoVal = Math.round(baseVal * (displayDiscountValue / 100))
        } else {
          promoVal = displayDiscountValue
        }
      }

      // Loyalty points calculation (assuming 1 point = 1 PKR deduction)
      const loyaltyPointsUsed = Number(b.loyalty_points_used || 0)
      const loyaltyVal = loyaltyPointsUsed

      const subtotalVal = (baseVal + addOnsVal + serviceVal) - promoVal - loyaltyVal
      const total = subtotalVal
      
      const refText = b.reference_id || b.booking_reference || b.reference || `AS-2026-${b.id ? b.id.substring(0, 6) : '272073'}`

      const promoDisplayString = isPercentageDiscount && displayDiscountValue !== null
        ? `- PKR ${promoVal.toLocaleString()} (${displayDiscountValue}%)`
        : `- PKR ${promoVal.toLocaleString()}`

      const invoiceElement = document.createElement('div')
      invoiceElement.innerHTML = `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2C2C2C; padding: 24px; background-color: #FFF8EF; margin: 0; width: 100%; box-sizing: border-box;">
          <div style="background: #FFFFFF; padding: 30px; border-radius: 12px; width: 100%; box-sizing: border-box; border: 1px solid rgba(132, 26, 53, 0.1);">
           
            <table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid #841A35; padding-bottom: 16px; margin-bottom: 20px;">
              <tr>
                <td style="vertical-align: middle; text-align: left; padding-bottom: 16px; width: 60%;">
                  <table style="border-collapse: collapse;">
                    <tr>
                      <td style="vertical-align: middle; padding-right: 12px;">
                        <img src="${b.logo_url || '/images/Logo Transparent.png'}" width="55" height="55" style="object-fit: contain; display: block;" crossorigin="anonymous" alt="Alvis Suite Logo" />
                      </td>
                      <td style="vertical-align: middle;">
                        <h1 style="color: #841A35; margin: 0 0 3px 0; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">Where Every Suite Is A Sweet Surprise!</h1>
                        <p style="color: #666; font-size: 9px; margin: 0; text-transform: uppercase; letter-spacing: 0.8px;">Luxury Short-Term Rentals & Hospitality</p>
                      </td>
                    </tr>
                  </table>
                </td>
                <td style="vertical-align: middle; text-align: right; padding-bottom: 16px; width: 40%;">
  <div style="font-size: 16px; color: #000000; font-weight: 700; margin-bottom: 6px; letter-spacing: 0.5px;">INVOICE</div>
  <div style="text-align: right;">
    <div style="display: inline-block; background: #FFF8EF; color: #841A35; padding: 4px 10px; border-radius: 12px; font-size: 8px; font-weight: 700; border: 1px solid rgba(132, 26, 53, 0.2); white-space: nowrap; letter-spacing: 0.5px;">
      <span style="position: relative; top: -4px;">OFFICIAL RECEIPT</span>
    </div>
  </div>
</td>
              </tr>
            </table>

            <div style="margin-bottom: 20px;">
              <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #841A35; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px;">Booking Details</h3>
             
              <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                <tr>
                  <td style="color: #666; padding-bottom: 6px; width: 38%;">Reference:</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right; word-break: break-all;">${refText}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Guest Name:</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">${b.guest_name || ''}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Property:</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">${b.apartment_name || ''}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Check-in / Check-out:</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">${b.check_in || ''} → ${b.check_out || ''}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Payment Method:</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">${b.payment_method || 'Direct Bank Transfer'}</td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #841A35; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; letter-spacing: 0.5px;">Stay & Service Charges</h3>
             
              <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px;">
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Accommodation (${nightsNum} nights):</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">PKR ${baseVal.toLocaleString()}</td>
                </tr>
                ${activeAddons.length > 0 ? activeAddons.map(item => `
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Add-on (${item.name}):</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">PKR ${item.price.toLocaleString()}</td>
                </tr>
                `).join('') : ''}
                ${promoVal > 0 ? `
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Promo Discount (${promoCodeText}):</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">${promoDisplayString}</td>
                </tr>
                ` : ''}
                ${loyaltyVal > 0 ? `
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Loyalty Points Redeemed (${loyaltyPointsUsed} pts):</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">- PKR ${loyaltyVal.toLocaleString()}</td>
                </tr>
                ` : ''}
                <tr>
                  <td style="color: #666; padding-bottom: 6px;">Service Fee (8%):</td>
                  <td style="font-weight: 600; color: #111; padding-bottom: 6px; text-align: right;">PKR ${serviceVal.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="color: #666; padding-top: 6px; border-top: 1px solid #eee; font-weight: 600;">Subtotal:</td>
                  <td style="font-weight: 600; color: #111; padding-top: 6px; border-top: 1px solid #eee; text-align: right;">PKR ${subtotalVal.toLocaleString()}</td>
                </tr>
              </table>

              <table style="width: 100%; border-collapse: collapse; border-top: 2px solid #841A35; padding-top: 10px; font-size: 14px; font-weight: 700; color: #841A35;">
                <tr>
                  <td style="padding-top: 10px;">Total Amount</td>
                  <td style="text-align: right; padding-top: 10px;">PKR ${total.toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <table style="width: 100%; border-collapse: collapse; border-top: 1px solid #eee; padding-top: 16px; margin-top: 20px;">
              <tr>
                <td style="font-size: 8.5px; color: #888; line-height: 1.4; text-align: left; vertical-align: middle; width: 68%;">
                  Thank you for choosing Alvis Suite.<br />
                  For support, contact us via WhatsApp.<br />
                  This is a system-generated digital invoice.
                </td>
                <td style="text-align: right; vertical-align: middle; width: 32%;">
                  <img src="${b.stamp_url || '/images/stamp1.png'}" width="75" height="75" style="object-fit: contain; display: inline-block;" crossorigin="anonymous" alt="Alvis Suite Stamp" />
                </td>
              </tr>
            </table>

          </div>
        </div>
      `

      const opt = {
        margin:      5,
        filename:    `Alvis-Receipt-${refText}.pdf`,
        image:       { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }

      await html2pdf().from(invoiceElement).set(opt).save()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to download invoice PDF')
    } finally {
      setDownloadingId(null)
    }
  }


  function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
      <div className="flex justify-between text-sm">
        <span className="text-charcoal-500">{label}</span>
        <span className={highlight ? 'text-gold font-semibold' : 'text-charcoal-200'}>{value}</span>
      </div>
    )
  }


  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl text-charcoal-100">Bookings</h2>
          <p className="text-charcoal-500 text-sm mt-0.5">{bookings.length} total · {bookings.filter(b => b.status === 'pending').length} pending review</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-charcoal-500" />
          <input
            className="input-luxury pl-9 h-10 text-sm"
            placeholder="Search guest name, email, phone, or property..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {STATUSES.map(s => (
            <button
              key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                statusFilter === s.value
                  ? 'bg-gold text-charcoal-950 border-gold'
                  : 'border-charcoal-700 text-charcoal-400 hover:border-charcoal-600 hover:text-charcoal-200 bg-charcoal-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal-700">
                {['Guest', 'Property', 'Check-in', 'Check-out', 'Nights', 'Total', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs text-charcoal-500 font-medium uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-700/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-charcoal-500">
                    <Loader2 size={18} className="animate-spin inline mr-2" /> Loading bookings...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-charcoal-600">
                    No bookings match your filters
                  </td>
                </tr>
              ) : filtered.map(b => (
                <tr key={b.id} className="hover:bg-charcoal-700/30 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="text-charcoal-200 font-medium whitespace-nowrap">{b.guest_name || 'Unknown'}</p>
                    <p className="text-charcoal-500 text-xs">{b.guest_email || 'No email'}</p>
                    {b.guest_phone && <p className="text-charcoal-500 text-xs">{b.guest_phone}</p>}
                  </td>
                  <td className="px-5 py-3.5">
                    <p className="text-charcoal-300 whitespace-nowrap">{b.apartment_name}</p>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-400 whitespace-nowrap">{formatDate(b.check_in)}</td>
                  <td className="px-5 py-3.5 text-charcoal-400 whitespace-nowrap">{formatDate(b.check_out)}</td>
                  <td className="px-5 py-3.5 text-charcoal-400 text-center">{b.num_nights}</td>
                  <td className="px-5 py-3.5 text-gold font-medium whitespace-nowrap">{formatPrice(b.total_price)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`badge ${getStatusColor(b.status)}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(b.status)}`} />
                      {b.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setSelectedBk(b)}
                        className="w-7 h-7 rounded bg-charcoal-700 hover:bg-charcoal-600 flex items-center justify-center text-charcoal-400 hover:text-charcoal-100 transition-all"
                        title="View details"
                      >
                        <Eye size={13} />
                      </button>
                      <button
                        onClick={() => handleDownloadInvoice(b)}
                        disabled={downloadingId === b.id}
                        className="w-7 h-7 rounded bg-gold/10 hover:bg-gold/20 flex items-center justify-center text-gold transition-all disabled:opacity-50"
                        title="Download Invoice PDF"
                      >
                        {downloadingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                      </button>
                      {b.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(b.id, 'confirmed')}
                            disabled={updatingId === b.id}
                            className="w-7 h-7 rounded bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-all disabled:opacity-50"
                            title="Confirm"
                          >
                            {updatingId === b.id ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle size={13} />}
                          </button>
                          <button
                            onClick={() => updateStatus(b.id, 'cancelled')}
                            disabled={updatingId === b.id}
                            className="w-7 h-7 rounded bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all disabled:opacity-50"
                            title="Cancel"
                          >
                            <XCircle size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedBk && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-charcoal-950/70 backdrop-blur-sm" onClick={() => setSelectedBk(null)} />
          <div className="relative w-full max-w-md bg-charcoal-900 border-l border-charcoal-700 h-full overflow-y-auto shadow-dark-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-800 sticky top-0 bg-charcoal-900">
              <h3 className="font-display text-xl text-charcoal-100">Booking detail</h3>
              <button onClick={() => setSelectedBk(null)} className="text-charcoal-500 hover:text-charcoal-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`badge ${getStatusColor(selectedBk.status)}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(selectedBk.status)}`} />
                    {selectedBk.status}
                  </span>
                  <span className="text-charcoal-500 text-xs">#{selectedBk.id}</span>
                </div>
                <button
                  onClick={() => handleDownloadInvoice(selectedBk)}
                  disabled={downloadingId === selectedBk.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold/10 hover:bg-gold/20 text-gold text-xs font-medium border border-gold/30 transition-all disabled:opacity-50"
                >
                  {downloadingId === selectedBk.id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  Invoice PDF
                </button>
              </div>

              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs text-gold tracking-wider uppercase mb-3">Guest</h4>
                <DetailRow label="Name"  value={selectedBk.guest_name || 'Unknown'} />
                <DetailRow label="Email" value={selectedBk.guest_email || 'No email'} />
                {selectedBk.guest_phone && <DetailRow label="Phone" value={selectedBk.guest_phone} />}
                {selectedBk.special_requests && (
                  <div>
                    <p className="text-xs text-charcoal-500 mb-1">Special requests</p>
                    <p className="text-charcoal-300 text-sm bg-charcoal-900 rounded p-2">{selectedBk.special_requests}</p>
                  </div>
                )}
              </div>

              <div className="bg-charcoal-800 border border-charcoal-700 rounded-xl p-4 space-y-3">
                <h4 className="text-xs text-gold tracking-wider uppercase mb-3">Stay</h4>
                <DetailRow label="Property"  value={selectedBk.apartment_name ?? ''} />
                <DetailRow label="Location"  value={selectedBk.apartment_location ?? ''} />
                <DetailRow label="Check-in"  value={formatDate(selectedBk.check_in)} />
                <DetailRow label="Check-out" value={formatDate(selectedBk.check_out)} />
                <DetailRow label="Nights"    value={String(selectedBk.num_nights)} />
                <DetailRow label="Guests"    value={String(selectedBk.num_guests)} />
                <div className="border-t border-charcoal-700 pt-3">
                  <DetailRow label="Total price" value={formatPrice(selectedBk.total_price)} highlight />
                </div>
              </div>

              {selectedBk.status === 'pending' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => updateStatus(selectedBk.id, 'confirmed')}
                    disabled={updatingId === selectedBk.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    {updatingId === selectedBk.id ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle size={15} />} Confirm
                  </button>
                  <button
                    onClick={() => updateStatus(selectedBk.id, 'cancelled')}
                    disabled={updatingId === selectedBk.id}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                  >
                    <XCircle size={15} /> Cancel
                  </button>
                </div>
              )}
              {selectedBk.status === 'confirmed' && (
                <button
                  onClick={() => updateStatus(selectedBk.id, 'cancelled')}
                  disabled={updatingId === selectedBk.id}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 rounded-lg py-2.5 text-sm font-medium transition-all disabled:opacity-50"
                >
                  {updatingId === selectedBk.id ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />} Cancel booking
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-charcoal-500">{label}</span>
      <span className={highlight ? 'text-gold font-semibold' : 'text-charcoal-200'}>{value}</span>
    </div>
  )
}