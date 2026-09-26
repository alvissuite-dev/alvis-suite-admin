'use client';
import React, { useEffect, useState } from 'react';
import { Search, Phone, Mail, CheckCircle2, XCircle, MonitorSmartphone, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface UserDirectoryItem {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  platform_source?: string;
  total_bookings: number;
  total_spent: number;
  total_nights: number;
  last_booking_date?: string;
  account_status?: string;
  days_since_activity?: number;
  is_email_verified?: boolean;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserDirectoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('admin_user_directory')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching user directory:', error);
    } else {
      const enriched = (data || []).map((user: any) => {
        const lastActivityDate = user.last_booking_date || user.last_sign_in_at || user.created_at;
        const daysSinceActivity = Math.floor((new Date().getTime() - new Date(lastActivityDate).getTime()) / (1000 * 60 * 60 * 24));

        return {
          ...user,
          account_status: user.email_confirmed_at ? 'Active' : 'Unverified',
          days_since_activity: daysSinceActivity >= 0 ? daysSinceActivity : 0,
          is_email_verified: Boolean(user.email_confirmed_at),
          platform_source: user.platform_source || 'Mobile App (Expo)'
        };
      });

      setUsers(enriched);
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });
    if (error) {
      alert('Error sending reset link: ' + error.message);
    } else {
      alert(`Secure password reset instructions sent successfully to ${email}`);
    }
  };

  const handleImpersonate = (user: UserDirectoryItem) => {
    localStorage.setItem('impersonating_user', JSON.stringify(user));
    alert(`Simulating portal session for ${user.full_name || user.email}. Opening preview mode...`);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery)
  );

  const totalRegistered = users.length;
  const activeWithBookings = users.filter((u) => u.total_bookings > 0).length;
  const overallRevenue = users.reduce((sum, u) => sum + Number(u.total_spent || 0), 0);

  return (
    <div className="p-8 bg-[#0B0B0B] min-h-screen text-[#FFF8EF]">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-wide text-[#D4AF37]">All Registered Users</h1>
        <p className="text-base text-gray-400 mt-1">Complete operational directory tracking guest accounts, verification states, and booking analytics</p>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-[#141414] border border-[#222] p-6 rounded-xl shadow-lg">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Total Registered</p>
          <p className="text-3xl font-bold mt-2 text-[#FFF8EF]">{totalRegistered}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] p-6 rounded-xl shadow-lg">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Users with Bookings</p>
          <p className="text-3xl font-bold mt-2 text-[#FFF8EF]">{activeWithBookings}</p>
        </div>
        <div className="bg-[#141414] border border-[#222] p-6 rounded-xl shadow-lg">
          <p className="text-xs uppercase tracking-wider text-gray-400 font-medium">Total Revenue Generated</p>
          <p className="text-3xl font-bold mt-2 text-[#D4AF37]">
            PKR {overallRevenue.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-[#141414] border border-[#222] rounded-xl pl-12 pr-4 py-3.5 text-base text-[#FFF8EF] placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]"
        />
      </div>

      {/* Data Table with Smooth Horizontal Scrolling */}
      <div className="bg-[#141414] border border-[#222] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-[#222] text-xs uppercase tracking-wider text-gray-400 bg-[#111]">
                <th className="py-4 px-6 font-semibold">User Profile</th>
                <th className="py-4 px-6 font-semibold">Contact & Verification</th>
                <th className="py-4 px-6 font-semibold">Activity Status</th>
                <th className="py-4 px-6 font-semibold">Lifetime Metrics</th>
                <th className="py-4 px-6 font-semibold">Platform Source</th>
                <th className="py-4 px-6 text-right font-semibold">Admin Controls</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#222] text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-base">
                    Loading user directory telemetry...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 text-base">
                    No users found matching your search criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-[#1a1a1a] transition-colors">
                    {/* User Profile & Status */}
                    <td className="py-5 px-6">
                      <div className="flex items-center space-x-3.5">
                        <div className="w-10 h-10 rounded-full bg-[#222] border border-[#333] flex items-center justify-center text-[#D4AF37] font-bold text-sm shrink-0">
                          {user.full_name ? user.full_name.substring(0, 2).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <p className="font-semibold text-base text-[#FFF8EF]">{user.full_name || 'Unnamed User'}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`inline-block px-2.5 py-0.5 text-xs uppercase font-bold tracking-wide rounded-full border ${
                              user.account_status === 'Active' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800' :
                              'bg-amber-950/60 text-amber-400 border-amber-800'
                            }`}>
                              {user.account_status}
                            </span>
                            <span className="text-xs text-gray-400">
                              Joined {new Date(user.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Contact & Verification */}
                    <td className="py-5 px-6 text-gray-300">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
                            <span className="font-medium">{user.email}</span>
                          </div>
                          <span title={user.is_email_verified ? "Email Confirmed" : "Email Unconfirmed"}>
                            {user.is_email_verified ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400 ml-2 inline" />
                            ) : (
                              <XCircle className="h-4 w-4 text-rose-400 ml-2 inline" />
                            )}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Phone className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>{user.phone || 'No phone provided'}</span>
                        </div>
                      </div>
                    </td>

                    {/* Activity Status */}
                    <td className="py-5 px-6">
                      <div className="space-y-1.5 text-sm">
                        <div className="text-gray-200 flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                          <span>Active {user.days_since_activity} days ago</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          Last sign-in: {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Never'}
                        </div>
                      </div>
                    </td>

                    {/* Lifetime Financial Metrics */}
                    <td className="py-5 px-6">
                      <div className="font-bold text-base text-[#D4AF37]">
                        PKR {Number(user.total_spent || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1 font-medium">
                        {user.total_bookings} bookings • {user.total_nights || 0} nights
                      </div>
                    </td>

                    {/* Platform Source */}
                    <td className="py-5 px-6 text-sm text-gray-300 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <MonitorSmartphone className="h-4 w-4 text-[#D4AF37] shrink-0" />
                        <span className="font-medium">{user.platform_source}</span>
                      </div>
                    </td>

                    {/* Admin Action Buttons */}
                    <td className="py-5 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2.5">
                        <button
                          onClick={() => handleImpersonate(user)}
                          title="Simulate User Portal View"
                          className="px-3 py-2 bg-[#222] hover:bg-[#333] text-xs font-semibold rounded-lg border border-[#444] text-white transition shadow"
                        >
                          🔍 View As
                        </button>
                        <button
                          onClick={() => handleResetPassword(user.email)}
                          title="Send Secure Password Reset Link"
                          className="px-3 py-2 bg-rose-950/40 hover:bg-rose-900/50 text-xs font-semibold rounded-lg border border-rose-900 text-rose-300 transition shadow"
                        >
                          🔑 Reset PW
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}