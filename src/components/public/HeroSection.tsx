'use client'
import { ChevronDown, MapPin, Star } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80)' }}
      />
      {/* Dark gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-charcoal-950/70 via-charcoal-950/50 to-charcoal-950/95" />
      <div className="absolute inset-0 bg-gradient-to-r from-charcoal-950/60 via-transparent to-charcoal-950/60" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto animate-slide-up">
        {/* Eyebrow */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/60" />
          <div className="flex items-center gap-1.5">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} className="fill-gold text-gold" />
            ))}
          </div>
          <span className="text-xs font-light tracking-[0.3em] uppercase text-gold">Luxury Stays</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/60" />
        </div>

        {/* Main heading */}
        <h1 className="font-display text-6xl md:text-8xl font-light text-charcoal-50 leading-[0.9] mb-6 tracking-tight">
          Stay in{' '}
          <span className="text-gold-gradient italic">Silence</span>
          <br />& Splendour
        </h1>

        {/* Sub heading */}
        <p className="text-lg md:text-xl text-charcoal-300 font-light max-w-xl mx-auto mb-4 leading-relaxed">
          Handpicked serviced apartments across Dubai, Lahore, and Karachi —
          crafted for those who know the difference.
        </p>

        {/* Locations */}
        <div className="flex items-center justify-center gap-6 mb-12 text-sm text-charcoal-400">
          {['Dubai', 'Lahore', 'Karachi'].map((city) => (
            <div key={city} className="flex items-center gap-1.5">
              <MapPin size={12} className="text-gold" />
              <span>{city}</span>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a
            href="#suites"
            className="btn-gold text-base px-10 py-4 inline-flex items-center gap-2"
          >
            Browse Suites
          </a>
          <a
            href="#about"
            className="btn-ghost text-base px-10 py-4 inline-flex items-center gap-2"
          >
            Learn more
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-charcoal-500 animate-bounce">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <ChevronDown size={16} />
      </div>

      {/* Floating stats */}
      <div className="absolute bottom-16 right-8 hidden lg:flex flex-col gap-3">
        {[
          { num: '35+', label: 'Properties' },
          { num: '3',   label: 'Cities'     },
          { num: '4.9', label: 'Rating'     },
        ].map((stat) => (
          <div key={stat.label} className="bg-charcoal-800/80 backdrop-blur-sm border border-charcoal-700/50 rounded-lg px-4 py-3 text-center">
            <div className="font-display text-2xl text-gold font-medium">{stat.num}</div>
            <div className="text-xs text-charcoal-400 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
