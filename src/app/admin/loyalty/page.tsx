'use client'

import { useState, useEffect } from 'react'
import { Award, Search, PlusCircle, MinusCircle, Shield, UserCheck, Star, Settings, Gift, Trash2, Tag, Clock, CheckCircle } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface LoyaltyTransaction {
  id: string
  user_id: string
  booking_id?: string
  amount: number
  type: string
  description?: string
  status: string
  created_at: string
  guest_name?: string
  check_in?: string
  check_out?: string
  num_nights?: number
  total_price?: number
  booking_status?: string
  loyalty_points_used?: number
  reward_points?: number
  coupon_code?: string
  discount_type?: string
  discount_value?: number
}

interface LoyaltyUser {
  id: string
  full_name: string
  email: string
  phone: string
  completed_stays: number
  loyalty_points: number
  points_used: number
  tier: string
  nationality?: string
  is_admin?: boolean
  push_token?: string
  claimed_rewards?: string[]
  transactions: LoyaltyTransaction[]
}

interface LoyaltyTier {
  id: string
  tier_name: string
  min_stays: number
  privileges: string[]
}

interface LoyaltyMilestone {
  id: string
  milestone_title: string
  required_stays: number
  reward_type: 'points' | 'coupon'
  reward_points: number
  coupon_code?: string
  reward_description: string
  discount_type?: string
  discount_value?: number
  is_active: boolean
}

export default function AdminLoyaltyPage() {
  const [activeTab, setActiveTab] = useState<'members' | 'config'>('members')
  
  const [users, setUsers] = useState<LoyaltyUser[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<LoyaltyUser | null>(null)
  const [adjustmentAmount, setAdjustmentAmount] = useState('')
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'deduct'>('add')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Config State
  const [tiers, setTiers] = useState<LoyaltyTier[]>([])
  const [milestones, setMilestones] = useState<LoyaltyMilestone[]>([])
  const [newTierName, setNewTierName] = useState('')
  const [newTierStays, setNewTierStays] = useState('')
  const [newTierPerks, setNewTierPerks] = useState('')
  
  // Milestone State
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('')
  const [newMilestoneStays, setNewMilestoneStays] = useState('')
  const [newMilestoneRewardType, setNewMilestoneRewardType] = useState<'points' | 'coupon'>('points')
  const [newMilestonePoints, setNewMilestonePoints] = useState('')
  const [newMilestoneCoupon, setNewMilestoneCoupon] = useState('')
  const [newMilestoneDesc, setNewMilestoneDesc] = useState('')
  const [newMilestoneDiscountType, setNewMilestoneDiscountType] = useState<'percent' | 'fixed'>('percent')
  const [newMilestoneDiscountValue, setNewMilestoneDiscountValue] = useState('')

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchLoyaltyData()
    fetchConfigurationData()
  }, [])

  async function fetchLoyaltyData() {
    setLoading(true)
    
    // 1. Fetch all profile data directly from the profiles table
    const { data: profilesData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')

    if (profileErr) {
      console.error('Error fetching profiles:', profileErr.message)
      setLoading(false)
      return
    }

    // 2. Fetch transaction logs from loyalty_transactions
    const { data: txsData } = await supabase
      .from('loyalty_transactions')
      .select('*')
      .order('created_at', { ascending: false })

    const enrichedUsers: LoyaltyUser[] = (profilesData || []).map(p => {
      const userTxs = (txsData || []).filter(t => t.user_id === p.id)

      const calculatedPointsUsed = userTxs
      .filter(t => t.amount < 0)
      .reduce((acc, t) => acc + Math.abs(t.amount), 0)
      
      return {
        id: p.id,
        full_name: p.full_name || 'Unnamed Guest',
        email: p.email || 'No email provided',
        phone: p.phone || 'N/A',
        completed_stays: p.completed_stays || 0,
        loyalty_points: p.loyalty_points || 0,
        points_used: p.points_used > 0 ? p.points_used : calculatedPointsUsed,
        tier: p.tier || 'Member',
        nationality: p.nationality,
        is_admin: p.is_admin,
        push_token: p.push_token,
        claimed_rewards: p.claimed_rewards || [],
        transactions: userTxs
      }
    })

    setUsers(enrichedUsers)

    if (selectedUser) {
      const updatedCurrent = enrichedUsers.find(u => u.id === selectedUser.id)
      if (updatedCurrent) setSelectedUser(updatedCurrent)
    }

    setLoading(false)
  }

  async function fetchConfigurationData() {
    const { data: tiersData } = await supabase.from('loyalty_tiers').select('*').order('min_stays', { ascending: true })
    const { data: milestonesData } = await supabase.from('loyalty_milestones').select('*').order('required_stays', { ascending: true })
    
    if (tiersData) setTiers(tiersData)
    if (milestonesData) setMilestones(milestonesData)
  }

  async function handlePointAdjustment(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUser || !adjustmentAmount) return

    setIsSubmitting(true)
    const amount = parseInt(adjustmentAmount, 10)
    const currentPoints = selectedUser.loyalty_points || 0
    const currentUsed = selectedUser.points_used || 0

    const newPoints = adjustmentType === 'add' ? currentPoints + amount : Math.max(0, currentPoints - amount)
    const newUsed = adjustmentType === 'deduct' ? currentUsed + amount : currentUsed

    // 1. Update profile columns directly
    const { error: updateErr } = await supabase
      .from('profiles')
      .update({
        loyalty_points: newPoints,
        points_used: newUsed
      })
      .eq('id', selectedUser.id)

    if (updateErr) {
      alert('Error updating points: ' + updateErr.message)
      setIsSubmitting(false)
      return
    }

    // 2. Insert corresponding audit trail record into loyalty_transactions
    const { error: txErr } = await supabase.from('loyalty_transactions').insert({
      user_id: selectedUser.id,
      amount: adjustmentType === 'add' ? amount : -amount,
      type: adjustmentType === 'add' ? 'admin_gift' : 'redemption',
      description: reason || (adjustmentType === 'add' ? 'Admin manual point addition' : 'Admin manual point deduction'),
      status: 'completed'
    })

    if (txErr) {
      console.error('Error inserting transaction record:', txErr.message)
    }

    await fetchLoyaltyData()
    setSelectedUser(null)
    setAdjustmentAmount('')
    setReason('')
    setIsSubmitting(false)
  }

  async function handleAddTier(e: React.FormEvent) {
    e.preventDefault()
    if (!newTierName || !newTierStays) return

    const perksArray = newTierPerks.split(',').map(p => p.trim()).filter(Boolean)
    const { error } = await supabase.from('loyalty_tiers').insert({
      tier_name: newTierName,
      min_stays: parseInt(newTierStays, 10),
      privileges: perksArray
    })

    if (!error) {
      setNewTierName('')
      setNewTierStays('')
      setNewTierPerks('')
      fetchConfigurationData()
    } else {
      alert('Error adding tier: ' + error.message)
    }
  }

  async function handleDeleteTier(id: string) {
    const { error } = await supabase.from('loyalty_tiers').delete().eq('id', id)
    if (!error) fetchConfigurationData()
  }

  async function handleAddMilestone(e: React.FormEvent) {
    e.preventDefault()
    if (!newMilestoneTitle || !newMilestoneStays) return

    const { error } = await supabase.from('loyalty_milestones').insert({
      milestone_title: newMilestoneTitle,
      required_stays: parseInt(newMilestoneStays, 10),
      reward_type: newMilestoneRewardType,
      reward_points: newMilestoneRewardType === 'points' ? parseInt(newMilestonePoints || '0', 10) : 0,
      coupon_code: newMilestoneRewardType === 'coupon' ? newMilestoneCoupon : null,
      reward_description: newMilestoneDesc,
      discount_type: newMilestoneRewardType === 'coupon' ? newMilestoneDiscountType : 'percent',
      discount_value: newMilestoneRewardType === 'coupon' ? parseFloat(newMilestoneDiscountValue || '10') : 0,
      is_active: true
    })

    if (!error) {
      setNewMilestoneTitle('')
      setNewMilestoneStays('')
      setNewMilestoneRewardType('points')
      setNewMilestonePoints('')
      setNewMilestoneCoupon('')
      setNewMilestoneDesc('')
      setNewMilestoneDiscountType('percent')
      setNewMilestoneDiscountValue('')
      fetchConfigurationData()
    } else {
      alert('Error adding milestone: ' + error.message)
    }
  }

  async function handleDeleteMilestone(id: string) {
    const { error } = await supabase.from('loyalty_milestones').delete().eq('id', id)
    if (!error) fetchConfigurationData()
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPointsInCirculation = users.reduce((acc, curr) => acc + (curr.loyalty_points || 0), 0)
  const platinumCount = users.filter(u => u.tier === 'Platinum').length
  const goldCount = users.filter(u => u.tier === 'Gold').length
  const silverCount = users.filter(u => u.tier === 'Silver').length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium text-ivory">Loyalty Program Management</h1>
          <p className="text-sm text-charcoal-400 mt-1">Monitor guest tiers, points balances, spend history, and granular ledger audits.</p>
        </div>
        <div className="flex bg-charcoal-900 border border-charcoal-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('members')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'members' ? 'bg-crimson text-ivory shadow-md' : 'text-charcoal-400 hover:text-ivory'
            }`}
          >
            <UserCheck size={14} /> Members Ledger
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'config' ? 'bg-crimson text-ivory shadow-md' : 'text-charcoal-400 hover:text-ivory'
            }`}
          >
            <Settings size={14} /> Tiers & Milestones
          </button>
        </div>
      </div>

      {activeTab === 'members' ? (
        <>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Total Members</p>
    <p className="text-2xl font-display font-semibold text-ivory mt-2">{users.length}</p>
  </div>
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Points in Circulation</p>
    <p className="text-2xl font-display font-semibold text-gold mt-2">{totalPointsInCirculation.toLocaleString()}</p>
  </div>
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Regular Members</p>
    <p className="text-2xl font-display font-semibold text-ivory mt-2">{users.filter(u => (u.completed_stays || 0) < 5).length}</p>
  </div>
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Silver Members</p>
    <p className="text-2xl font-display font-semibold text-ivory mt-2">{silverCount}</p>
  </div>
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Gold Members</p>
    <p className="text-2xl font-display font-semibold text-ivory mt-2">{goldCount}</p>
  </div>
  <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-5">
    <p className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Platinum VIPs</p>
    <p className="text-2xl font-display font-semibold text-ivory mt-2">{platinumCount}</p>
  </div>
</div>

          <div className="relative max-w-md">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-500" />
            <input 
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-charcoal-900 border border-charcoal-800 rounded-lg pl-10 pr-4 py-2 text-sm text-ivory placeholder:text-charcoal-500 focus:outline-none focus:border-crimson"
            />
          </div>

          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-charcoal-800 text-charcoal-400 font-medium bg-charcoal-950/50">
                    <th className="py-3.5 px-6">Guest</th>
                    <th className="py-3.5 px-6">Tier</th>
                    <th className="py-3.5 px-6">Completed Stays</th>
                    <th className="py-3.5 px-6">Available Points</th>
                    <th className="py-3.5 px-6">Points Used</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-charcoal-500">Loading loyalty accounts...</td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-charcoal-500">No members found.</td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-charcoal-850/50 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-medium text-ivory flex items-center gap-2">
                            {user.full_name || 'Unnamed Guest'}
                            {user.is_admin && <span className="text-[10px] bg-crimson/20 text-crimson px-1.5 py-0.5 rounded">Admin</span>}
                          </div>
                          <div className="text-xs text-charcoal-500 mt-0.5">{user.email}</div>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.tier === 'Platinum' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                            user.tier === 'Gold' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            user.tier === 'Silver' ? 'bg-slate-400/10 text-slate-300 border border-slate-400/20' :
                            'bg-charcoal-800 text-charcoal-400'
                          }`}>
                            <Star size={12} />
                            {user.tier || 'Member'}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-charcoal-300">{user.completed_stays || 0}</td>
                        <td className="py-4 px-6 font-medium text-gold">{user.loyalty_points || 0} pts</td>
                        <td className="py-4 px-6 font-medium text-charcoal-300">{user.points_used || 0} pts</td>
                        <td className="py-4 px-6 text-right space-x-2">
                          <button 
                            onClick={() => setSelectedUser(user)}
                            className="px-3 py-1.5 bg-crimson/15 hover:bg-crimson/25 text-ivory text-xs font-medium rounded-md transition-all border border-crimson/30"
                          >
                            Manage Points & Ledger
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="space-y-8">
         {/* Live Tiers & Active Rewards Summary Overview */}
<div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 space-y-6">
  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
    <div>
      <h3 className="text-lg font-display font-medium text-ivory">Tier-wise Active Rewards Summary</h3>
      <p className="text-xs text-charcoal-400 mt-0.5">Overview of active milestone rewards mapped to your mobile app&apos;s fixed stay tiers.</p>
    </div>
    
    {/* Quick Reference Rules Pill for Personal Use */}
    <div className="flex flex-wrap items-center gap-2 text-xs bg-charcoal-950 border border-charcoal-800 px-3 py-2 rounded-lg text-charcoal-300">
      <span className="font-medium text-gold">App Rules:</span>
      <span className="bg-charcoal-800/60 px-1.5 py-0.5 rounded text-ivory">Member: 0–4</span>
      <span className="bg-charcoal-800/60 px-1.5 py-0.5 rounded text-ivory">Silver: 5–11</span>
      <span className="bg-charcoal-800/60 px-1.5 py-0.5 rounded text-ivory">Gold: 12–24</span>
      <span className="bg-charcoal-800/60 px-1.5 py-0.5 rounded text-ivory">Platinum: 25+</span>
    </div>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
    {/* Member Tier (< 5) */}
    <div className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-ivory">Member</h4>
        <span className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded">0–4 Stays</span>
      </div>
      <p className="text-2xl font-bold text-ivory">
        {milestones.filter(m => m.required_stays < 5).length} <span className="text-xs font-normal text-charcoal-400">Rewards</span>
      </p>
    </div>

    {/* Silver Tier (5-11) */}
    <div className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-ivory">Silver</h4>
        <span className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded">5–11 Stays</span>
      </div>
      <p className="text-2xl font-bold text-ivory">
        {milestones.filter(m => m.required_stays >= 5 && m.required_stays < 12).length} <span className="text-xs font-normal text-charcoal-400">Rewards</span>
      </p>
    </div>

    {/* Gold Tier (12-24) */}
    <div className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-ivory">Gold</h4>
        <span className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded">12–24 Stays</span>
      </div>
      <p className="text-2xl font-bold text-ivory">
        {milestones.filter(m => m.required_stays >= 12 && m.required_stays < 25).length} <span className="text-xs font-normal text-charcoal-400">Rewards</span>
      </p>
    </div>

    {/* Platinum Tier (25+) */}
    <div className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-ivory">Platinum</h4>
        <span className="text-xs bg-charcoal-800 text-charcoal-300 px-2 py-0.5 rounded">25+ Stays</span>
      </div>
      <p className="text-2xl font-bold text-ivory">
        {milestones.filter(m => m.required_stays >= 25).length} <span className="text-xs font-normal text-charcoal-400">Rewards</span>
      </p>
    </div>

    {/* Total Summary Box */}
    <div className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl space-y-2">
      <div className="flex justify-between items-start">
        <h4 className="font-medium text-ivory">Total Active</h4>
        <span className="text-xs bg-charcoal-800 text-gold px-2 py-0.5 rounded">All Tiers</span>
      </div>
      <p className="text-2xl font-bold text-ivory">
        {milestones.length} <span className="text-xs font-normal text-charcoal-400">Milestones</span>
      </p>
    </div>
  </div>
</div>
          {/* Milestones Management Section */}
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-display font-medium text-ivory">Milestone Rewards</h3>
              <p className="text-xs text-charcoal-400 mt-0.5">Set up stay milestones that automatically grant points or coupon codes when guests reach them.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestones.map((m) => (
                <div key={m.id} className="bg-charcoal-950 border border-charcoal-800 p-4 rounded-xl flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Gift size={16} className="text-gold" />
                      <h4 className="font-medium text-ivory">{m.milestone_title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-semibold ${
                        m.reward_type === 'coupon' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-gold/20 text-gold border border-gold/30'
                      }`}>
                        {m.reward_type || 'points'}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-400">Target Stays: <span className="text-ivory font-medium">{m.required_stays}</span></p>
                    <p className="text-xs text-charcoal-400">
                      Reward: {m.reward_type === 'coupon' ? (
                        <span className="text-blue-400 font-mono font-medium">
                          {m.coupon_code} ({m.discount_value}{m.discount_type === 'fixed' ? ' PKR' : '%'} off)
                        </span>
                      ) : (
                        <span className="text-gold font-medium">{m.reward_points} pts</span>
                      )} ({m.reward_description})
                    </p>
                  </div>
                  <button onClick={() => handleDeleteMilestone(m.id)} className="text-charcoal-500 hover:text-red-400 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddMilestone} className="pt-4 border-t border-charcoal-800 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-1">Milestone Title</label>
                  <input 
                    type="text" 
                    placeholder="5th Stay Bonus" 
                    value={newMilestoneTitle} 
                    onChange={e => setNewMilestoneTitle(e.target.value)}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-1">Required Stays</label>
                  <input 
                    type="number" 
                    placeholder="5" 
                    value={newMilestoneStays} 
                    onChange={e => setNewMilestoneStays(e.target.value)}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-1">Reward Type</label>
                  <select
                    value={newMilestoneRewardType}
                    onChange={(e) => setNewMilestoneRewardType(e.target.value as 'points' | 'coupon')}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                  >
                    <option value="points">Points Reward</option>
                    <option value="coupon">Coupon Code</option>
                  </select>
                </div>
              </div>

              {newMilestoneRewardType === 'points' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Reward Points</label>
                    <input 
                      type="number" 
                      placeholder="1000" 
                      value={newMilestonePoints} 
                      onChange={e => setNewMilestonePoints(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Description</label>
                    <input 
                      type="text" 
                      placeholder="Bonus points for your stay" 
                      value={newMilestoneDesc} 
                      onChange={e => setNewMilestoneDesc(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Coupon Code</label>
                    <input 
                      type="text" 
                      placeholder="WELCOME50" 
                      value={newMilestoneCoupon} 
                      onChange={e => setNewMilestoneCoupon(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory uppercase focus:outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Discount Type</label>
                    <select
                      value={newMilestoneDiscountType}
                      onChange={(e) => setNewMilestoneDiscountType(e.target.value as 'percent' | 'fixed')}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Discount Value</label>
                    <input 
                      type="number" 
                      step="0.01"
                      placeholder="10 or 500" 
                      value={newMilestoneDiscountValue} 
                      onChange={e => setNewMilestoneDiscountValue(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 mb-1">Description</label>
                    <input 
                      type="text" 
                      placeholder="Free night credit or discount" 
                      value={newMilestoneDesc} 
                      onChange={e => setNewMilestoneDesc(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3 py-2 text-sm text-ivory focus:outline-none focus:border-crimson"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button type="submit" className="px-6 py-2 bg-crimson hover:bg-crimson/90 text-ivory text-sm font-medium rounded-lg transition-all h-10">
                  Add Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl w-full max-w-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-charcoal-800 pb-4">
              <div>
                <h3 className="font-display text-lg font-medium text-ivory">Guest Loyalty Ledger & Audit Trail</h3>
                <p className="text-xs text-charcoal-400 mt-0.5">{selectedUser.full_name} ({selectedUser.email}) • {selectedUser.phone}</p>
              </div>
              <button 
                onClick={() => setSelectedUser(null)}
                className="text-charcoal-500 hover:text-ivory text-sm"
              >
                ✕
              </button>
            </div>

            <div className="bg-charcoal-950 p-4 rounded-xl border border-charcoal-800 grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-charcoal-400">Available Balance</p>
                <p className="text-xl font-display font-semibold text-gold mt-0.5">{selectedUser.loyalty_points || 0} pts</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-400">Total Points Spent</p>
                <p className="text-xl font-display font-semibold text-ivory mt-0.5">{selectedUser.points_used || 0} pts</p>
              </div>
              <div>
                <p className="text-xs text-charcoal-400">Completed Stays</p>
                <p className="text-xl font-display font-semibold text-ivory mt-0.5">{selectedUser.completed_stays || 0}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Transaction History & Ledger Logs</h4>
              
              {selectedUser.transactions.length === 0 ? (
                <div className="p-8 text-center bg-charcoal-950 border border-charcoal-800 rounded-xl text-xs text-charcoal-500 italic">
                  No transaction ledger entries recorded yet.
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {selectedUser.transactions.map(tx => {
                    const isPositive = tx.amount > 0

                    return (
                      <div key={tx.id} className="p-4 rounded-xl border border-charcoal-800 bg-charcoal-950 space-y-2.5">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-emerald-950 text-emerald-300 border border-emerald-800">
                                {tx.type || 'adjustment'}
                              </span>
                              <span className="text-[11px] text-charcoal-500">
                                {new Date(tx.created_at).toLocaleDateString()} at {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="text-xs text-charcoal-300">{tx.description || 'No description provided'}</p>
                          </div>
                          <div className={`text-right font-bold text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isPositive ? `+${tx.amount}` : tx.amount} pts
                          </div>
                        </div>

                        {/* Snapshot Booking Fields */}
                        {tx.guest_name && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-charcoal-800/60 text-[11px] text-charcoal-400">
                            <div>Guest: <span className="text-ivory">{tx.guest_name}</span></div>
                            <div>Dates: <span className="text-ivory">{tx.check_in} to {tx.check_out}</span></div>
                            <div>Nights / Price: <span className="text-ivory">{tx.num_nights}N ({tx.total_price} PKR)</span></div>
                            <div>Points Used: <span className="text-gold">{tx.loyalty_points_used || 0} pts</span></div>
                          </div>
                        )}

                        {/* Snapshot Milestone Fields */}
                        {tx.coupon_code && (
                          <div className="pt-1.5 border-t border-charcoal-800/40 text-[11px] text-blue-400 font-mono flex items-center justify-between">
                            <span>Milestone Unlocked: <strong>{tx.coupon_code}</strong> ({tx.discount_value}{tx.discount_type === 'fixed' ? ' PKR' : '%'} off)</span>
                            {tx.reward_points ? <span className="text-gold font-sans">+{tx.reward_points} Milestone Pts</span> : null}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <form onSubmit={handlePointAdjustment} className="space-y-4 pt-3 border-t border-charcoal-800">
              <h4 className="text-xs font-medium text-charcoal-400 uppercase tracking-wider">Quick Manual Point Adjustment</h4>
              <div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('add')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${
                      adjustmentType === 'add' 
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' 
                        : 'bg-charcoal-950 border-charcoal-800 text-charcoal-400'
                    }`}
                  >
                    <PlusCircle size={14} /> Add Points
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType('deduct')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 border transition-all ${
                      adjustmentType === 'deduct' 
                        ? 'bg-red-500/20 border-red-500 text-red-400' 
                        : 'bg-charcoal-950 border-charcoal-800 text-charcoal-400'
                    }`}
                  >
                    <MinusCircle size={14} /> Deduct Points
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-1">Points Amount</label>
                  <input 
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 500"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3.5 py-2 text-sm text-ivory placeholder:text-charcoal-600 focus:outline-none focus:border-crimson"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 mb-1">Reason / Note</label>
                  <input 
                    type="text"
                    required
                    placeholder="e.g. Promotional bonus or manual adjustment"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-lg px-3.5 py-2 text-sm text-ivory placeholder:text-charcoal-600 focus:outline-none focus:border-crimson"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg text-xs text-charcoal-400 hover:bg-charcoal-800 transition-all"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-crimson hover:bg-crimson/90 text-ivory text-xs font-medium rounded-lg transition-all shadow-lg shadow-crimson/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}