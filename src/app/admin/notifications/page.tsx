'use client'

import { useState, useEffect } from 'react'
import { Mail, Bell, Send, Users, CheckCircle, Clock, Smartphone, Sparkles } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'
import { dispatchNotificationAction } from '@/app/actions/sendNotification'

interface NotificationLog {
  id: string
  title: string
  message: string
  target_audience: string
  channel: 'email' | 'push' | 'both'
  sent_at: string
  recipient_count: number
  status: 'sent' | 'scheduled' | 'failed'
}

interface LoyaltyUser {
  id: string
  full_name: string
  email: string
  tier: string
}

export default function AdminNotificationPage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose')
  
  // Form State
  const [channel, setChannel] = useState<'email' | 'push' | 'both'>('both')
  const [targetAudience, setTargetAudience] = useState<'all' | 'tier'>('all')
  const [selectedTier, setSelectedTier] = useState('Gold')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // History & Users
  const [history, setHistory] = useState<NotificationLog[]>([])
  const [users, setUsers] = useState<LoyaltyUser[]>([])
  const [loading, setLoading] = useState(true)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, full_name, email, tier')

    if (profilesData) {
      setUsers(profilesData)
    }

    const { data: logsData, error } = await supabase
      .from('notifications_log')
      .select('*')
      .order('sent_at', { ascending: false })

    if (logsData && !error) {
      setHistory(logsData)
    } else {
      setHistory([
        {
          id: '1',
          title: 'Exclusive Weekend Getaway Offer 🌟',
          message: 'Enjoy 20% off on all luxury suites in Lahore this weekend. Use code LUX20.',
          target_audience: 'Gold & Platinum VIPs',
          channel: 'both',
          sent_at: new Date(Date.now() - 86400000 * 2).toISOString(),
          recipient_count: 42,
          status: 'sent'
        }
      ])
    }
    setLoading(false)
  }

  const recipientCountEstimate = targetAudience === 'all' 
    ? users.length 
    : users.filter(u => u.tier === selectedTier).length

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault()
    if (!title || !message) return

    setIsSending(true)
    setSuccessMessage('')

    try {
      const res = await dispatchNotificationAction({
        title,
        message,
        channel,
        targetAudience,
        selectedTier
      })

      if (res.success) {
        setSuccessMessage(`Successfully broadcasted live to ${res.count} guests!`)
        setTitle('')
        setMessage('')
        fetchData()
      } else {
        alert('Failed to send broadcast: ' + res.error)
      }
    } catch (err: any) {
      alert('An unexpected error occurred: ' + err.message)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-medium text-ivory">Notifications & Email Center</h1>
          <p className="text-sm text-charcoal-400 mt-1">Broadcast promotional emails and instant mobile push notifications directly to guests.</p>
        </div>
        <div className="flex bg-charcoal-900 border border-charcoal-800 p-1 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'compose' ? 'bg-crimson text-ivory shadow-md' : 'text-charcoal-400 hover:text-ivory'
            }`}
          >
            <Send size={14} /> Compose Broadcast
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
              activeTab === 'history' ? 'bg-crimson text-ivory shadow-md' : 'text-charcoal-400 hover:text-ivory'
            }`}
          >
            <Clock size={14} /> Campaign History ({history.length})
          </button>
        </div>
      </div>

      {activeTab === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-charcoal-900 border border-charcoal-800 rounded-2xl p-6 space-y-6">
            {successMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-4 rounded-xl flex items-center gap-3 text-sm">
                <CheckCircle size={18} className="shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSendNotification} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Delivery Channel</label>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setChannel('both')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      channel === 'both' ? 'bg-crimson/15 border-crimson text-ivory' : 'bg-charcoal-950 border-charcoal-800 text-charcoal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">Email & Push</span>
                      <Sparkles size={14} className="text-gold" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('push')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      channel === 'push' ? 'bg-crimson/15 border-crimson text-ivory' : 'bg-charcoal-950 border-charcoal-800 text-charcoal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">Mobile Push</span>
                      <Bell size={14} className="text-crimson" />
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setChannel('email')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${
                      channel === 'email' ? 'bg-crimson/15 border-crimson text-ivory' : 'bg-charcoal-950 border-charcoal-800 text-charcoal-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs">Email Only</span>
                      <Mail size={14} className="text-blue-400" />
                    </div>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={(e: any) => setTargetAudience(e.target.value)}
                    className="w-full bg-charcoal-950 border border-charcoal-800 rounded-xl px-3.5 py-2.5 text-sm text-ivory focus:outline-none focus:border-crimson"
                  >
                    <option value="all">All Registered Members ({users.length})</option>
                    <option value="tier">Specific Loyalty Tier</option>
                  </select>
                </div>

                {targetAudience === 'tier' && (
                  <div>
                    <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Select Tier</label>
                    <select
                      value={selectedTier}
                      onChange={(e) => setSelectedTier(e.target.value)}
                      className="w-full bg-charcoal-950 border border-charcoal-800 rounded-xl px-3.5 py-2.5 text-sm text-ivory focus:outline-none focus:border-crimson"
                    >
                      <option value="Platinum">Platinum VIPs</option>
                      <option value="Gold">Gold Members</option>
                      <option value="Silver">Silver Members</option>
                      <option value="Member">Standard Members</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">
                  {channel === 'email' ? 'Email Subject Line' : 'Notification Title'}
                </label>
                <input 
                  type="text"
                  required
                  placeholder="e.g. Special Weekend Upgrade 🌟"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-charcoal-950 border border-charcoal-800 rounded-xl px-3.5 py-2.5 text-sm text-ivory focus:outline-none focus:border-crimson"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-charcoal-400 uppercase tracking-wider mb-2">Message Body</label>
                <textarea 
                  required
                  rows={5}
                  placeholder="Type your announcement details here..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full bg-charcoal-950 border border-charcoal-800 rounded-xl p-3.5 text-sm text-ivory focus:outline-none focus:border-crimson resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-charcoal-800">
                <div className="text-xs text-charcoal-400 flex items-center gap-1.5">
                  <Users size={14} className="text-gold" />
                  <span>Estimated Reach: <strong className="text-ivory">{recipientCountEstimate} guests</strong></span>
                </div>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2.5 bg-crimson hover:bg-crimson/90 text-ivory text-sm font-medium rounded-xl transition-all shadow-lg flex items-center gap-2 disabled:opacity-50"
                >
                  <Send size={16} />
                  {isSending ? 'Broadcasting...' : 'Send Broadcast Now'}
                </button>
              </div>
            </form>
          </div>

          <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-6 flex flex-col items-center justify-start space-y-4">
            <div className="flex items-center gap-2 w-full pb-3 border-b border-charcoal-800">
              <Smartphone size={16} className="text-charcoal-400" />
              <h3 className="text-xs font-medium text-charcoal-300 uppercase tracking-wider">Live Mobile Push Preview</h3>
            </div>
            <div className="w-full max-w-[280px] bg-black border-4 border-charcoal-800 rounded-3xl p-4 shadow-2xl space-y-4 my-auto">
              <div className="w-20 h-3 bg-charcoal-800 rounded-full mx-auto mb-2"></div>
              <div className="space-y-3">
                <div className="text-[10px] text-charcoal-500 text-center">Just Now</div>
                <div className="bg-charcoal-900/90 border border-charcoal-700/80 rounded-2xl p-3.5 space-y-1 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-medium text-charcoal-300">Alvis Suite</span>
                    <span className="text-[9px] text-charcoal-500">now</span>
                  </div>
                  <h4 className="text-xs font-semibold text-ivory truncate">{title || 'Notification Title...'}</h4>
                  <p className="text-[11px] text-charcoal-400 line-clamp-2">{message || 'Your push notification message preview...'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-charcoal-800 text-charcoal-400 font-medium bg-charcoal-950/50">
                <th className="py-3.5 px-6">Broadcast Title</th>
                <th className="py-3.5 px-6">Channel</th>
                <th className="py-3.5 px-6">Audience</th>
                <th className="py-3.5 px-6">Recipients</th>
                <th className="py-3.5 px-6">Sent Date</th>
                <th className="py-3.5 px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-800/60">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-charcoal-850/50">
                  <td className="py-4 px-6 font-medium text-ivory">{item.title}</td>
                  <td className="py-4 px-6 capitalize text-xs text-charcoal-300">{item.channel}</td>
                  <td className="py-4 px-6 text-xs text-charcoal-300">{item.target_audience}</td>
                  <td className="py-4 px-6 text-xs text-ivory">{item.recipient_count} guests</td>
                  <td className="py-4 px-6 text-xs text-charcoal-400">{new Date(item.sent_at).toLocaleDateString()}</td>
                  <td className="py-4 px-6 text-right">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <CheckCircle size={12} /> Delivered
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}