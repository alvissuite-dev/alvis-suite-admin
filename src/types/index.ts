export type ApartmentStatus = 'active' | 'inactive'
export type BookingStatus   = 'pending' | 'confirmed' | 'cancelled'

export interface Apartment {
  id:              string
  reference_id?:    string
  name:            string
  slug:            string
  description:     string
  location:        string
  price_per_night: number
  bedrooms:        number
  bathrooms:       number
  max_guests:      number
  amenities:       string[]
  images:          string[]
  is_active:       boolean
  created_at:      string
}

export interface BlockedDate {
  id:           string
  apartment_id: string
  blocked_date: string
  reason:       string | null
}

export interface Booking {
  id:               string
  apartment_id:     string
  guest_name:       string
  guest_email:      string
  guest_phone:      string | null
  user_id:          string | null
  check_in:         string
  check_out:        string
  num_guests:       number
  num_nights:       number
  total_price:      number
  status:           BookingStatus
  special_requests: string | null
  created_at:       string
  // additional fields from migration_02
  arrival_time?:    string
  arrival_note?:    string
  addons?:          string[]
  promo_code?:      string
  // joined
  apartment_name?:     string
  apartment_location?: string
  price_per_night?:    number
  city?:               string
  country?:            string
  neighborhood?:       string
}

export interface BookingFormData {
  apartment_id:     string
  guest_name:       string
  guest_email:      string
  guest_phone:      string
  check_in:         string
  check_out:        string
  num_guests:       number
  special_requests: string
}

export interface DashboardStats {
  total_bookings:    number
  pending_bookings:  number
  confirmed_bookings:number
  total_revenue:     number
  checkins_today:    number
  checkouts_today:   number
}
