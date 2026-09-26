'use client'
import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X, Save, Loader2, Building2, Upload } from 'lucide-react'
import Image from 'next/image'
import {
  getApartments, createApartment, updateApartment,
  toggleApartmentActive, deleteApartment,
} from '@/services/apartments'
import { Apartment } from '@/types'
import { formatPrice, bedroomLabel, detectCurrency } from '@/lib/utils'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseKey)

const EMPTY: Omit<Apartment, 'id' | 'created_at'> = {
  name: '', slug: '', description: '', location: '',
  price_per_night: 0, bedrooms: 1, bathrooms: 1, max_guests: 2,
  total_units: 20, amenities: [], house_rules: [], images: [], is_active: true,
}

const AMENITY_PRESETS = [
  'High-speed WiFi', 'Smart TV', 'Full kitchen', 'Private balcony',
  'Pool access', 'Gym', 'Parking', 'Concierge', 'City view',
  'Sea view', 'Generator backup', 'Air conditioning', 'Rooftop',
  'Dedicated staff', 'Secure parking', 'Keyless entry', 'Espresso machine',
]

const HOUSE_RULE_PRESETS = [
  'No smoking', 'No pets', 'No parties or events',
  'Quiet hours 10pm-8am', 'No unauthorized guests', 'Remove shoes indoors',
]

// Client-side image compression utility to handle heavy PNG files (15-18MB -> lightweight WebP)
const compressImage = async (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new window.Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1920
        const scaleSize = MAX_WIDTH / img.width
        canvas.width = MAX_WIDTH
        canvas.height = img.height > img.width ? img.height * scaleSize : (img.height * scaleSize) || img.height

        if (img.width < MAX_WIDTH) {
          canvas.width = img.width
          canvas.height = img.height
        }

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas blob creation failed'))
              return
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '') + '.webp', {
              type: 'image/webp',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/webp',
          0.8
        )
      }
    }
    reader.onerror = (error) => reject(error)
  })
}

export default function PropertiesPage() {
  const [apartments,    setApartments]   = useState<Apartment[]>([])
  const [pageLoading,  setPageLoading]  = useState(true)
  const [pageError,    setPageError]    = useState('')
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState<Apartment | null>(null)
  const [form,         setForm]         = useState<Omit<Apartment, 'id' | 'created_at'>>(EMPTY)
  const [loading,      setLoading]      = useState(false)
  const [toggleId,     setToggleId]     = useState<string | null>(null)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [newAmenity,   setNewAmenity]   = useState('')
  const [newRule,      setNewRule]      = useState('')
  const [uploadingImg, setUploadingImg] = useState(false)
  const [bookedUnitsMap, setBookedUnitsMap] = useState<Record<string, number>>({})

  useEffect(() => {
    let cancelled = false
    setPageLoading(true)
    
    const today = new Date().toISOString().split('T')[0]

    // Fetch apartments and active bookings in parallel with date range matching SQL query
    Promise.all([
      getApartments(),
      supabase
        .from('bookings')
        .select('apartment_id, status, check_in, check_out')
        .in('status', ['confirmed', 'active', 'approved'])
        .lte('check_in', today)
        .gt('check_out', today)
    ])
      .then(([aptData, bookingRes]) => {
        if (cancelled) return
        setApartments(aptData)
        
        if (bookingRes.data) {
          const counts: Record<string, number> = {}
          bookingRes.data.forEach(b => {
            if (b.apartment_id) {
              counts[b.apartment_id] = (counts[b.apartment_id] || 0) + 1
            }
          })
          setBookedUnitsMap(counts)
        }
      })
      .catch(err => { if (!cancelled) setPageError(err instanceof Error ? err.message : 'Failed to load properties') })
      .finally(() => { if (!cancelled) setPageLoading(false) })

    return () => { cancelled = true }
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY)
    setShowForm(true)
  }

  const openEdit = (apt: Apartment) => {
    setEditing(apt)
    setForm({
      name: apt.name, slug: apt.slug, description: apt.description,
      location: apt.location, price_per_night: apt.price_per_night,
      bedrooms: apt.bedrooms, bathrooms: apt.bathrooms,
      max_guests: apt.max_guests, total_units: apt.total_units ?? 20,
      amenities: [...apt.amenities], house_rules: [...(apt.house_rules || [])], images: [...apt.images], is_active: apt.is_active,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.location || !form.price_per_night) return
    setLoading(true)
    try {
      if (editing) {
        const updated = await updateApartment(editing.id, form)
        setApartments(prev => prev.map(a => a.id === editing.id ? updated : a))
      } else {
        const created = await createApartment(form)
        setApartments(prev => [created, ...prev])
      }
      setShowForm(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save property')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this property? This cannot be undone.')) return
    setDeletingId(id)
    try {
      await deleteApartment(id)
      setApartments(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete property. It may have existing bookings.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleToggleActive = async (apt: Apartment) => {
    setToggleId(apt.id)
    try {
      const updated = await toggleApartmentActive(apt.id, !apt.is_active)
      setApartments(prev => prev.map(a => a.id === apt.id ? updated : a))
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update property status')
    } finally {
      setToggleId(null)
    }
  }

  const toggleAmenity = (am: string) => {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(am)
        ? f.amenities.filter(a => a !== am)
        : [...f.amenities, am],
    }))
  }

  const addCustomAmenity = () => {
    if (!newAmenity.trim()) return
    setForm(f => ({ ...f, amenities: [...f.amenities, newAmenity.trim()] }))
    setNewAmenity('')
  }

  const toggleRule = (rule: string) => {
    setForm(f => ({
      ...f,
      house_rules: f.house_rules.includes(rule)
        ? f.house_rules.filter(r => r !== rule)
        : [...f.house_rules, rule],
    }))
  }

  const addCustomRule = () => {
    if (!newRule.trim()) return
    setForm(f => ({ ...f, house_rules: [...f.house_rules, newRule.trim()] }))
    setNewRule('')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    const files = Array.from(e.target.files)
    setUploadingImg(true)

    try {
      const uploadedUrls: string[] = []
      for (const file of files) {
        const compressedFile = await compressImage(file)
        const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.webp`
        const filePath = `${fileName}`
    
        const { error: uploadError } = await supabase.storage
          .from('apartment-images')
          .upload(filePath, compressedFile)
    
        if (uploadError) {
          throw new Error(`Upload error: ${uploadError.message}`)
        }
    
        const { data } = supabase.storage
          .from('apartment-images')
          .getPublicUrl(filePath)
    
        if (data?.publicUrl) {
          uploadedUrls.push(data.publicUrl)
        }
      }
    
      setForm(f => ({ ...f, images: [...f.images, ...uploadedUrls] }))
    } catch (err: any) {
      alert(err.message || 'Failed to upload images')
    } finally {
      setUploadingImg(false)
      e.target.value = ''
    }
  }

  const removeImage = (idx: number) => {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== idx) }))
  }

  const upd = (k: keyof typeof EMPTY) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm(f => ({ ...f, [k]: e.target.type === 'number' ? Number(e.target.value) : e.target.value }))
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-charcoal-100">Properties</h2>
          <p className="text-charcoal-500 text-sm mt-0.5">{apartments.length} properties · {apartments.filter(a => a.is_active).length} active</p>
        </div>
        <button onClick={openCreate} className="btn-gold flex items-center gap-2 px-4 py-2.5 text-sm">
          <Plus size={16} /> Add property
        </button>
      </div>

      {pageError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
          {pageError}
        </div>
      )}

      {pageLoading ? (
        <div className="flex items-center justify-center py-16 text-charcoal-500">
          <Loader2 size={20} className="animate-spin mr-2" /> Loading properties...
        </div>
      ) : apartments.length === 0 ? (
        <div className="text-center py-16 text-charcoal-600 bg-charcoal-800 border border-charcoal-700 rounded-xl">
          No properties yet. Add your first one to get started.
        </div>
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {apartments.map(apt => {
          const currency = detectCurrency(apt.location)
          const totalUnits = apt.total_units ?? 20
          const occupiedUnits = bookedUnitsMap[apt.id] || 0
          const remainingUnits = Math.max(0, totalUnits - occupiedUnits)

          return (
            <div key={apt.id} className="bg-charcoal-800 border border-charcoal-700 rounded-xl overflow-hidden hover:border-charcoal-600 transition-all">
              {/* Image */}
              <div className="relative h-44">
                {apt.images[0] ? (
                  <Image src={apt.images[0]} alt={apt.name} fill className="object-cover" sizes="50vw" />
                ) : (
                  <div className="w-full h-full bg-charcoal-700 flex items-center justify-center">
                    <Building2 size={32} className="text-charcoal-600" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal-950/80 to-transparent" />
                <div className="absolute top-3 right-3 flex gap-2">
                  <span className={`badge text-xs ${apt.is_active ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-charcoal-500 bg-charcoal-800 border-charcoal-600'}`}>
                    {apt.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-4">
                  <p className="font-display text-lg text-white">{apt.name}</p>
                  <p className="text-xs text-charcoal-300">{apt.location}</p>
                </div>
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex gap-3 text-sm text-charcoal-400 items-center flex-wrap">
                    <span>{bedroomLabel(apt.bedrooms)}</span>
                    <span>{apt.bathrooms} Bath</span>
                    <span>Max {apt.max_guests}</span>
                    <span className="bg-amber-900/30 text-amber-400 border border-amber-700/50 text-xs px-2.5 py-0.5 rounded-full font-medium flex items-center gap-1">
                      <span className="text-amber-200 font-bold">{remainingUnits}</span>/{totalUnits} Units
                    </span>
                  </div>
                  <span className="text-gold font-semibold">{formatPrice(apt.price_per_night, currency)}<span className="text-xs text-charcoal-500 font-normal">/night</span></span>
                </div>

                {/* Amenities preview */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {apt.amenities.slice(0, 4).map(am => (
                    <span key={am} className="text-xs px-2 py-0.5 bg-charcoal-700 rounded-full text-charcoal-400">{am}</span>
                  ))}
                  {apt.amenities.length > 4 && (
                    <span className="text-xs px-2 py-0.5 bg-charcoal-700 rounded-full text-charcoal-500">+{apt.amenities.length - 4}</span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(apt)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-charcoal-600 text-charcoal-400 hover:border-gold/40 hover:text-gold text-sm transition-all"
                  >
                    <Pencil size={13} /> Edit
                  </button>
                  <button
                    onClick={() => handleToggleActive(apt)}
                    disabled={toggleId === apt.id}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border border-charcoal-600 text-charcoal-400 hover:border-charcoal-500 hover:text-charcoal-200 text-sm transition-all disabled:opacity-50"
                  >
                    {toggleId === apt.id ? <Loader2 size={13} className="animate-spin" /> : (apt.is_active ? 'Deactivate' : 'Activate')}
                  </button>
                  <button
                    onClick={() => handleDelete(apt.id)}
                    disabled={deletingId === apt.id}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-charcoal-600 text-charcoal-500 hover:border-red-500/40 hover:text-red-400 transition-all disabled:opacity-50"
                  >
                    {deletingId === apt.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}

      {/* Add/Edit form drawer */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-charcoal-950/80 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative w-full max-w-lg bg-charcoal-900 border-l border-charcoal-700 h-full overflow-y-auto shadow-dark-lg">
            {/* Drawer header */}
            <div className="sticky top-0 bg-charcoal-900 border-b border-charcoal-800 px-6 py-4 flex items-center justify-between z-10">
              <h3 className="font-display text-xl text-charcoal-100">
                {editing ? 'Edit property' : 'Add new property'}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-charcoal-500 hover:text-charcoal-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Basic info */}
              <FormSection title="Basic information">
                <FormField label="Property name *">
                  <input className="input-luxury text-sm" placeholder="The Obsidian Studio" value={form.name}
                    onChange={upd('name')} />
                </FormField>
                <FormField label="URL slug *">
                  <input className="input-luxury text-sm" placeholder="obsidian-studio" value={form.slug}
                    onChange={upd('slug')} />
                </FormField>
                <FormField label="Location *">
                  <input className="input-luxury text-sm" placeholder="Downtown Dubai, UAE" value={form.location}
                    onChange={upd('location')} />
                </FormField>
                <FormField label="Description">
                  <textarea className="input-luxury text-sm resize-none h-24" placeholder="Describe this property..."
                    value={form.description} onChange={upd('description')} />
                </FormField>
              </FormSection>

              {/* Pricing & capacity */}
              <FormSection title="Pricing & capacity">
                <FormField label="Price per night *">
                  <input className="input-luxury text-sm" type="number" min={0} placeholder="320"
                    value={form.price_per_night || ''} onChange={upd('price_per_night')} />
                </FormField>
                <div className="grid grid-cols-3 gap-3">
                  <FormField label="Bedrooms">
                    <input className="input-luxury text-sm" type="number" min={0} max={10}
                      value={form.bedrooms} onChange={upd('bedrooms')} />
                  </FormField>
                  <FormField label="Bathrooms">
                    <input className="input-luxury text-sm" type="number" min={1} max={10}
                      value={form.bathrooms} onChange={upd('bathrooms')} />
                  </FormField>
                  <FormField label="Max guests">
                    <input className="input-luxury text-sm" type="number" min={1} max={20}
                      value={form.max_guests} onChange={upd('max_guests')} />
                  </FormField>
                </div>
                <FormField label="Total Units Capacity">
                  <input className="input-luxury text-sm" type="number" min={1} max={100}
                    value={form.total_units} onChange={upd('total_units')} />
                </FormField>
              </FormSection>

              {/* Amenities */}
              <FormSection title="Amenities">
                <div className="flex flex-wrap gap-2 mb-3">
                  {AMENITY_PRESETS.map(am => (
                    <button
                      key={am}
                      type="button"
                      onClick={() => toggleAmenity(am)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                        form.amenities.includes(am)
                          ? 'bg-gold/20 border-gold/50 text-gold'
                          : 'bg-charcoal-800 border-charcoal-600 text-charcoal-400 hover:border-charcoal-500'
                      }`}
                    >
                      {am}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input-luxury text-sm flex-1"
                    placeholder="Custom amenity..."
                    value={newAmenity}
                    onChange={e => setNewAmenity(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomAmenity()}
                  />
                  <button type="button" onClick={addCustomAmenity} className="btn-ghost px-3 py-2 text-sm">Add</button>
                </div>
                {form.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.amenities.map(am => (
                      <span key={am} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gold/10 border border-gold/30 text-gold rounded-full">
                        {am}
                        <button type="button" onClick={() => toggleAmenity(am)} className="hover:text-gold-light">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* House Rules */}
              <FormSection title="House Rules">
                <div className="flex flex-wrap gap-2 mb-3">
                  {HOUSE_RULE_PRESETS.map(rule => (
                    <button
                      key={rule}
                      type="button"
                      onClick={() => toggleRule(rule)}
                      className={`px-2.5 py-1 rounded-full text-xs border transition-all ${
                        form.house_rules.includes(rule)
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-charcoal-800 border-charcoal-600 text-charcoal-400 hover:border-charcoal-500'
                      }`}
                    >
                      {rule}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className="input-luxury text-sm flex-1"
                    placeholder="Custom house rule..."
                    value={newRule}
                    onChange={e => setNewRule(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addCustomRule())}
                  />
                  <button type="button" onClick={addCustomRule} className="btn-ghost px-3 py-2 text-sm">Add</button>
                </div>
                {form.house_rules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.house_rules.map(rule => (
                      <span key={rule} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full">
                        {rule}
                        <button type="button" onClick={() => toggleRule(rule)} className="hover:text-white">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </FormSection>

              {/* Images File Upload */}
              <FormSection title="Property Pictures">
                <div className="border-2 border-dashed border-charcoal-700 rounded-xl p-6 text-center hover:border-gold/50 transition-all bg-charcoal-950/40">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="property-image-upload"
                  />
                  <label htmlFor="property-image-upload" className="cursor-pointer flex flex-col items-center justify-center">
                    {uploadingImg ? (
                      <Loader2 className="animate-spin text-gold mb-2" size={24} />
                    ) : (
                      <Upload className="text-gold mb-2" size={24} />
                    )}
                    <p className="text-sm text-charcoal-200 font-medium">
                      {uploadingImg ? 'Compressing & uploading pictures...' : 'Click to browse or drag and drop images'}
                    </p>
                    <p className="text-xs text-charcoal-500 mt-1">Heavy PNGs auto-compressed to WebP</p>
                  </label>
                </div>

                {form.images.length > 0 && (
  <div className="space-y-2 mt-3">
    {form.images.map((url, i) => (
      <div key={i} className="flex items-center gap-2 bg-charcoal-800 border border-charcoal-700 rounded-lg p-2">
        <div className="relative w-12 h-10 rounded overflow-hidden flex-shrink-0">
          <Image src={url} alt="" fill className="object-cover" sizes="48px" />
          {i === 0 && (
            <span className="absolute bottom-0 inset-x-0 bg-gold/90 text-charcoal-950 text-[9px] font-bold text-center">
              COVER
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <p className="text-xs text-charcoal-400 truncate flex-1">{url}</p>
        </div>

        {/* Position Input Controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xs text-charcoal-500">Pos:</span>
          <input
            type="number"
            min={1}
            max={form.images.length}
            value={i + 1}
            onChange={(e) => {
              const targetPos = parseInt(e.target.value)
              if (!isNaN(targetPos) && targetPos >= 1 && targetPos <= form.images.length) {
                if (targetPos - 1 !== i) {
                  const newImages = [...form.images]
                  const [moved] = newImages.splice(i, 1)
                  newImages.splice(targetPos - 1, 0, moved)
                  setForm(f => ({ ...f, images: newImages })) // Updates state instantly!
                }
              }
            }}
            className="w-12 bg-charcoal-900 border border-charcoal-600 rounded text-center text-xs text-gold py-1 focus:border-gold focus:outline-none"
          />

          {i !== 0 && (
            <button
              type="button"
              onClick={() => {
                const newImages = [...form.images]
                const [moved] = newImages.splice(i, 1)
                newImages.unshift(moved)
                setForm(f => ({ ...f, images: newImages }))
              }}
              className="text-[10px] bg-charcoal-700 hover:bg-gold/20 hover:text-gold text-charcoal-300 px-2 py-1.5 rounded transition-all"
              title="Make Cover Photo"
            >
              Cover
            </button>
          )}

          <button
            type="button"
            onClick={() => removeImage(i)}
            className="text-charcoal-600 hover:text-red-400 p-1 transition-all ml-1"
            title="Delete Image"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    ))}
  </div>
)}
              </FormSection>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-charcoal-800 border border-charcoal-700 rounded-xl p-4">
                <div>
                  <p className="text-sm text-charcoal-200 font-medium">Active listing</p>
                  <p className="text-xs text-charcoal-500 mt-0.5">Visible to guests on the public site</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                  className={`relative w-11 h-6 rounded-full transition-all ${form.is_active ? 'bg-gold' : 'bg-charcoal-600'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.is_active ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>

              {/* Save button */}
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !form.name || !form.location || !form.price_per_night}
                className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> {editing ? 'Save changes' : 'Create property'}</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-xs text-gold tracking-wider uppercase mb-3">{title}</h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-charcoal-400 mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}