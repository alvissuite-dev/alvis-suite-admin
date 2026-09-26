'use client'
import { useState } from 'react'
import { Apartment } from '@/types'
import ApartmentCard from './ApartmentCard'
import BookingModal from './BookingModal'

interface Props { apartments: Apartment[] }

export default function ApartmentGrid({ apartments }: Props) {
  const [selectedApt, setSelectedApt] = useState<Apartment | null>(null)
  const [cityFilter,  setCityFilter]  = useState('all')

  const cities = ['all', ...Array.from(new Set(apartments.map(a => {
    if (a.location.includes('Dubai'))   return 'Dubai'
    if (a.location.includes('Lahore'))  return 'Lahore'
    if (a.location.includes('Karachi')) return 'Karachi'
    return 'Other'
  })))]

  const filtered = cityFilter === 'all'
    ? apartments
    : apartments.filter(a => a.location.toLowerCase().includes(cityFilter.toLowerCase()))

  return (
    <section id="suites" className="py-24 px-6 bg-charcoal-900">
      <div className="max-w-7xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-16">
          <p className="text-xs tracking-[0.3em] uppercase text-gold mb-4">The Collection</p>
          <h2 className="font-display text-5xl md:text-6xl font-light text-charcoal-50 mb-5">
            Our Suites
          </h2>
          <div className="divider-gold mx-auto mb-5" />
          <p className="text-charcoal-400 max-w-lg mx-auto text-base leading-relaxed">
            Each property is personally selected, inspected, and maintained to the
            standard Alvis Suite guests expect.
          </p>
        </div>

        {/* City filter pills */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          {cities.map((city) => (
            <button
              key={city}
              onClick={() => setCityFilter(city)}
              className={`px-5 py-2 rounded-full text-sm transition-all duration-200 border ${
                cityFilter === city
                  ? 'bg-gold text-charcoal-950 border-gold font-semibold'
                  : 'border-charcoal-600 text-charcoal-400 hover:border-gold/40 hover:text-charcoal-200'
              }`}
            >
              {city === 'all' ? 'All cities' : city}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
          {filtered.map((apt) => (
            <ApartmentCard
              key={apt.id}
              apartment={apt}
              onBook={() => setSelectedApt(apt)}
            />
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-charcoal-500">
            <p className="font-display text-3xl mb-2">No suites found</p>
            <p className="text-sm">Try selecting a different city</p>
          </div>
        )}
      </div>

      {/* Booking modal */}
      {selectedApt && (
        <BookingModal
          apartment={selectedApt}
          onClose={() => setSelectedApt(null)}
        />
      )}
    </section>
  )
}
