'use client'
import { useState } from 'react'
import Image from 'next/image'
import { MapPin, Users, Bath, Bed, Wifi, ChevronLeft, ChevronRight, Star } from 'lucide-react'
import { Apartment } from '@/types'
import { formatPrice, bedroomLabel, detectCurrency } from '@/lib/utils'

interface Props {
  apartment: Apartment
  onBook:    () => void
}

const AMENITY_ICONS: Record<string, string> = {
  'WiFi': '📶', 'Smart TV': '📺', 'Kitchen': '🍳', 'Pool': '🏊', 'Gym': '💪',
  'Balcony': '🌅', 'Parking': '🚗', 'Concierge': '🛎️', 'Rooftop': '🏙️',
}

export default function ApartmentCard({ apartment, onBook }: Props) {
  const [imgIdx,    setImgIdx]    = useState(0)
  const [expanded,  setExpanded]  = useState(false)
  const currency = detectCurrency(apartment.location)

  const prevImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i - 1 + apartment.images.length) % apartment.images.length)
  }
  const nextImg = (e: React.MouseEvent) => {
    e.stopPropagation()
    setImgIdx((i) => (i + 1) % apartment.images.length)
  }

  return (
    <div className="card-luxury overflow-hidden group">
      {/* Image carousel */}
      <div className="relative h-72 overflow-hidden">
        <Image
          src={apartment.images[imgIdx]}
          alt={apartment.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 via-transparent to-transparent" />

        {/* Image nav */}
        {apartment.images.length > 1 && (
          <>
            <button
              onClick={prevImg}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-charcoal-950/70 rounded-full flex items-center justify-center text-charcoal-200 hover:bg-charcoal-800 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextImg}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-charcoal-950/70 rounded-full flex items-center justify-center text-charcoal-200 hover:bg-charcoal-800 transition-all opacity-0 group-hover:opacity-100"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {apartment.images.map((_, i) => (
                <button
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setImgIdx(i) }}
                  className={`rounded-full transition-all ${i === imgIdx ? 'w-5 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-charcoal-400'}`}
                />
              ))}
            </div>
          </>
        )}

        {/* Rating badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1 bg-charcoal-950/80 backdrop-blur-sm px-2.5 py-1 rounded-full">
          <Star size={10} className="fill-gold text-gold" />
          <span className="text-xs text-gold font-medium">4.9</span>
        </div>

        {/* Location bottom */}
        <div className="absolute bottom-3 left-4 flex items-center gap-1.5">
          <MapPin size={12} className="text-gold" />
          <span className="text-xs text-charcoal-200">{apartment.location}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Name & price */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display text-2xl text-charcoal-50 font-light leading-tight">
            {apartment.name}
          </h3>
          <div className="text-right flex-shrink-0 ml-4">
            <div className="text-gold font-semibold text-lg">
              {formatPrice(apartment.price_per_night, currency)}
            </div>
            <div className="text-xs text-charcoal-500">per night</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-5 mb-4 text-sm text-charcoal-400">
          <div className="flex items-center gap-1.5">
            <Bed size={14} className="text-gold/70" />
            <span>{bedroomLabel(apartment.bedrooms)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Bath size={14} className="text-gold/70" />
            <span>{apartment.bathrooms} Bath{apartment.bathrooms > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-gold/70" />
            <span>Max {apartment.max_guests}</span>
          </div>
        </div>

        {/* Description */}
        <p className={`text-sm text-charcoal-400 leading-relaxed mb-4 ${expanded ? '' : 'line-clamp-2'}`}>
          {apartment.description}
        </p>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-gold/70 hover:text-gold mb-4 transition-colors"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>

        {/* Amenities */}
        <div className="flex flex-wrap gap-2 mb-5">
          {apartment.amenities.slice(0, 5).map((am) => (
            <span
              key={am}
              className="text-xs px-2.5 py-1 bg-charcoal-700/60 border border-charcoal-600/50 rounded-full text-charcoal-300"
            >
              {am}
            </span>
          ))}
          {apartment.amenities.length > 5 && (
            <span className="text-xs px-2.5 py-1 bg-charcoal-700/60 border border-charcoal-600/50 rounded-full text-charcoal-400">
              +{apartment.amenities.length - 5} more
            </span>
          )}
        </div>

        {/* Book button */}
        <button onClick={onBook} className="btn-gold w-full text-center">
          Book this suite
        </button>
      </div>
    </div>
  )
}
