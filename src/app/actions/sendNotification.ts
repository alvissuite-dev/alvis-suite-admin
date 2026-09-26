'use server'

import { Resend } from 'resend'
import { Expo } from 'expo-server-sdk'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)
const expo = new Expo()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface SendPayload {
  title: string
  message: string
  channel: 'email' | 'push' | 'both'
  targetAudience: string
  selectedTier: string
}

export async function dispatchNotificationAction(payload: SendPayload) {
  try {
    let query = supabase.from('profiles').select('id, email, push_token, tier')
    
    if (payload.targetAudience === 'tier') {
      query = query.eq('tier', payload.selectedTier)
    }

    const { data: users, error } = await query
    if (error) throw error

    let totalRecipients = 0
    const emailList: any[] = []
    const pushMessages: any[] = []

    users?.forEach((user) => {
      let sentToUser = false

      if ((payload.channel === 'email' || payload.channel === 'both') && user.email) {
        emailList.push({
            from: 'Alvis Suite <onboarding@resend.dev>',
          to: user.email,
          subject: payload.title,
          html: `<div style="font-family: sans-serif; background: #0f0f0f; color: #fffefb; padding: 24px; border-radius: 12px;">
            <h2 style="color: #d4af37;">${payload.title}</h2>
            <p>${payload.message}</p>
            <hr style="border-color: #333;" />
            <p style="font-size: 11px; color: #888;">Alvis Suite Hospitality • Luxury Short-Term Rentals</p>
          </div>`
        })
        sentToUser = true
      }

      if ((payload.channel === 'push' || payload.channel === 'both') && user.push_token && Expo.isExpoPushToken(user.push_token)) {
        pushMessages.push({
          to: user.push_token,
          sound: 'default',
          title: payload.title,
          body: payload.message,
        })
        sentToUser = true
      }

      if (sentToUser) {
        totalRecipients++
      }
    })

    if (emailList.length > 0) {
      await resend.batch.send(emailList)
    }

    if (pushMessages.length > 0) {
      const chunks = expo.chunkPushNotifications(pushMessages)
      for (const chunk of chunks) {
        await expo.sendPushNotificationsAsync(chunk)
      }
    }

    await supabase.from('notifications_log').insert([{
      title: payload.title,
      message: payload.message,
      target_audience: payload.targetAudience === 'all' ? 'All Members' : `${payload.selectedTier} Members`,
      channel: payload.channel,
      recipient_count: totalRecipients,
      status: 'sent'
    }])

    return { success: true, count: totalRecipients }
  } catch (err: any) {
    console.error('Broadcast Error:', err)
    return { success: false, error: err.message }
  }
}