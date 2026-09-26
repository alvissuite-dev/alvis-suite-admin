'use client'

import React, { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

interface Offer {
  id: string
  title: string
  description: string
  discount_type: string
  discount_value: number
  code: string | null
  valid_until: string
  min_booking: number
  is_featured: boolean
  city: string
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [discountType, setDiscountType] = useState('percent')
  const [discountValue, setDiscountValue] = useState('')
  const [code, setCode] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [minBooking, setMinBooking] = useState('0')
  const [isFeatured, setIsFeatured] = useState(false)
  const [city, setCity] = useState('All')

  const fetchOffers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('offers')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching offers:', error.message)
    } else {
      setOffers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchOffers()
  }, [])

  const handleCreateOffer = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.from('offers').insert([
      {
        title,
        description,
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        code: code.trim() ? code.trim() : null,
        valid_until: validUntil,
        min_booking: parseFloat(minBooking) || 0,
        is_featured: isFeatured,
        city: city,
      },
    ])

    if (error) {
      alert(`Error creating offer: ${error.message}`)
    } else {
      alert('Offer created successfully!')
      setTitle('')
      setDescription('')
      setDiscountValue('')
      setCode('')
      setValidUntil('')
      setMinBooking('0')
      setIsFeatured(false)
      setCity('All')
      fetchOffers()
    }
  }

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this offer?')) return
    const { error } = await supabase.from('offers').delete().eq('id', id)
    if (error) {
      alert(`Error deleting offer: ${error.message}`)
    } else {
      fetchOffers()
    }
  }

  return (
    <div style={{ padding: '30px', fontFamily: 'sans-serif', maxWidth: '1200px', margin: '0 auto', color: '#f3f4f6', background: '#121216', minHeight: '100vh' }}>
      <h1 style={{ color: '#fff' }}>Offers Management</h1>
      <p style={{ color: '#9ca3af', marginBottom: '25px' }}>Manage active and upcoming promotions for Alvis Suite guests.</p>

      {/* Create Offer Form */}
      <div style={{ background: '#1e1e24', padding: '25px', borderRadius: '8px', marginBottom: '35px', border: '1px solid #2d2d38' }}>
        <h3 style={{ marginTop: '0', color: '#e11d48' }}>Add New Offer</h3>
        <form onSubmit={handleCreateOffer} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }} placeholder="e.g. Christmas Special" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Promo Code (Leave blank if auto-applied)</label>
            <input type="text" value={code} onChange={(e) => setCode(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }} placeholder="e.g. XMAS20" />
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff', minHeight: '80px' }} placeholder="Details shown to guests..." />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Discount Value (% or amount)</label>
            <input type="number" step="any" value={discountValue} onChange={(e) => setDiscountValue(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }} placeholder="20" />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Valid Until</label>
            <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Target City</label>
            <select value={city} onChange={(e) => setCity(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }}>
              <option value="All">All Cities (Lahore & Islamabad)</option>
              <option value="Lahore">Lahore Only</option>
              <option value="Islamabad">Islamabad Only</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#d1d5db' }}>Minimum Booking Nights</label>
            <input type="number" value={minBooking} onChange={(e) => setMinBooking(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #374151', background: '#111827', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', alignSelf: 'end' }}>
            <label style={{ fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', color: '#d1d5db' }}>
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} style={{ marginRight: '8px', transform: 'scale(1.1)' }} />
              Featured Offer (Top Banner)
            </label>
          </div>
          <div style={{ gridColumn: 'span 2' }}>
            <button type="submit" style={{ background: '#841A35', color: '#fff', padding: '12px 24px', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Plus size={18} /> Publish Offer
            </button>
          </div>
        </form>
      </div>

      {/* Offers Table */}
      <h3 style={{ color: '#fff' }}>All Offers</h3>
      {loading ? (
        <p style={{ color: '#9ca3af' }}>Loading offers...</p>
      ) : (
        <div style={{ background: '#1e1e24', borderRadius: '8px', border: '1px solid #2d2d38', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#16161a', borderBottom: '2px solid #2d2d38', fontSize: '13px', color: '#9ca3af' }}>
                <th style={{ padding: '12px 16px' }}>Title</th>
                <th style={{ padding: '12px 16px' }}>Code</th>
                <th style={{ padding: '12px 16px' }}>Discount</th>
                <th style={{ padding: '12px 16px' }}>City</th>
                <th style={{ padding: '12px 16px' }}>Valid Until</th>
                <th style={{ padding: '12px 16px' }}>Featured</th>
                <th style={{ padding: '12px 16px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>No offers found. Create your first one above!</td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} style={{ borderBottom: '1px solid #2d2d38', fontSize: '14px', color: '#e5e7eb' }}>
                    <td style={{ padding: '14px 16px', fontWeight: '500' }}>{offer.title}</td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{offer.code || 'Auto-applied'}</td>
                    <td style={{ padding: '14px 16px', color: '#fb7185', fontWeight: 'bold' }}>{offer.discount_value}%</td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{offer.city || 'All'}</td>
                    <td style={{ padding: '14px 16px', color: '#9ca3af' }}>{offer.valid_until}</td>
                    <td style={{ padding: '14px 16px' }}>{offer.is_featured ? 'Yes' : 'No'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={() => handleDeleteOffer(offer.id)} style={{ background: '#dc2626', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}