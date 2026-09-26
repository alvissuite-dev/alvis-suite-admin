'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

export default function PublicNav() {
  const [scrolled,  setScrolled]  = useState(false)
  const [menuOpen,  setMenuOpen]  = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled ? 'bg-charcoal-950/95 backdrop-blur-md border-b border-charcoal-700/50 shadow-dark' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex flex-col leading-none">
          <span className="font-display text-2xl font-light tracking-widest text-gold">ALVIS</span>
          <span className="text-[10px] font-light tracking-[0.4em] text-charcoal-300 uppercase">Suite</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {[
            { label: 'Our Suites', href: '#suites'   },
            { label: 'About',      href: '#about'    },
            { label: 'Contact',    href: '#contact'  },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-charcoal-300 hover:text-gold tracking-wide transition-colors duration-200"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/admin/login"
            className="text-sm border border-charcoal-600 hover:border-gold/50 text-charcoal-300 hover:text-gold px-4 py-2 rounded-lg transition-all duration-200"
          >
            Admin
          </Link>
        </nav>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-charcoal-300 hover:text-gold transition-colors"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-charcoal-950/98 backdrop-blur-md border-t border-charcoal-700/50 px-6 py-4 flex flex-col gap-3 animate-fade-in">
          {['#suites', '#about', '#contact'].map((href) => (
            <a
              key={href}
              href={href}
              onClick={() => setMenuOpen(false)}
              className="text-charcoal-300 hover:text-gold py-2 transition-colors capitalize"
            >
              {href.slice(1)}
            </a>
          ))}
          <Link href="/admin/login" className="text-charcoal-300 hover:text-gold py-2 transition-colors">
            Admin Portal
          </Link>
        </div>
      )}
    </header>
  )
}
