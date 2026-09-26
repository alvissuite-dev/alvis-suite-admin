import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, differenceInCalendarDays, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPrice(amount: number, currency = 'PKR'): string {
  if (currency === 'AED') {
    return `AED ${amount.toLocaleString('en-AE')}`
  }
  return `PKR ${amount.toLocaleString('en-PK')}`
}

export function formatDate(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d, yyyy')
}

export function formatDateShort(dateStr: string): string {
  return format(parseISO(dateStr), 'MMM d')
}

export function calcNights(checkIn: string, checkOut: string): number {
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn))
}

export function detectCurrency(location: string): string {
  if (location.includes('AE') || location.includes('Dubai') || location.includes('Abu Dhabi')) {
    return 'AED'
  }
  return 'PKR'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'confirmed': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20'
    case 'pending':   return 'text-gold bg-gold/10 border-gold/20'
    case 'cancelled': return 'text-red-400 bg-red-400/10 border-red-400/20'
    default:          return 'text-charcoal-300 bg-charcoal-700 border-charcoal-600'
  }
}

export function getStatusDot(status: string): string {
  switch (status) {
    case 'confirmed': return 'bg-emerald-400'
    case 'pending':   return 'bg-gold'
    case 'cancelled': return 'bg-red-400'
    default:          return 'bg-charcoal-400'
  }
}

export function bedroomLabel(n: number): string {
  return n === 0 ? 'Studio' : `${n} Bed${n > 1 ? 's' : ''}`
}

export function todayStr(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function tomorrowStr(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return format(d, 'yyyy-MM-dd')
}
