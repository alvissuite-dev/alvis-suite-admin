import { MapPin, Mail, Phone, Instagram } from 'lucide-react'

export default function FooterSection() {
  return (
    <footer id="contact" className="bg-charcoal-950 border-t border-charcoal-800">
      {/* About strip */}
      <div id="about" className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* Brand */}
          <div>
            <div className="mb-5">
              <span className="font-display text-3xl font-light tracking-widest text-gold">ALVIS</span>
              <span className="block text-xs font-light tracking-[0.4em] text-charcoal-400 uppercase mt-1">Suite</span>
            </div>
            <p className="text-charcoal-400 text-sm leading-relaxed mb-5">
              A curated collection of luxury serviced apartments managed with discretion and care.
              Direct booking. No intermediaries.
            </p>
            <div className="divider-gold" />
          </div>

          {/* Locations */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold mb-5">Our Cities</h4>
            <div className="space-y-3">
              {[
                { city: 'Dubai, UAE',       units: '18 suites' },
                { city: 'Lahore, Pakistan', units: '12 suites' },
                { city: 'Karachi, Pakistan',units: '7 suites'  },
              ].map((loc) => (
                <div key={loc.city} className="flex items-center gap-2 text-sm">
                  <MapPin size={13} className="text-gold/60" />
                  <span className="text-charcoal-300">{loc.city}</span>
                  <span className="text-charcoal-600 ml-auto">{loc.units}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs tracking-[0.2em] uppercase text-gold mb-5">Contact</h4>
            <div className="space-y-3 text-sm">
              <a href="mailto:hello@alvissuite.com" className="flex items-center gap-2 text-charcoal-400 hover:text-gold transition-colors">
                <Mail size={13} className="text-gold/60" />
                hello@alvissuite.com
              </a>
              <a href="https://wa.me/971500000000" className="flex items-center gap-2 text-charcoal-400 hover:text-gold transition-colors">
                <Phone size={13} className="text-gold/60" />
                +971 50 000 0000
              </a>
              <a href="#" className="flex items-center gap-2 text-charcoal-400 hover:text-gold transition-colors">
                <Instagram size={13} className="text-gold/60" />
                @alvissuite
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-charcoal-800 px-6 py-5">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-charcoal-600">
          <p>© {new Date().getFullYear()} Alvis Suite. All rights reserved.</p>
          <div className="flex gap-5">
            <a href="#" className="hover:text-charcoal-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-charcoal-400 transition-colors">Terms of Service</a>
            <a href="/admin/login" className="hover:text-charcoal-400 transition-colors">Admin</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
