import { createClient } from '@/lib/supabase/server'
import { getApartments } from '@/services/apartments'
import PublicNav from '@/components/public/PublicNav'
import HeroSection from '@/components/public/HeroSection'
import ApartmentGrid from '@/components/public/ApartmentGrid'
import FooterSection from '@/components/public/FooterSection'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createClient()
  const apartments = await getApartments(supabase, { activeOnly: true })

  return (
    <main className="min-h-screen bg-charcoal-900">
      <PublicNav />
      <HeroSection />
      <ApartmentGrid apartments={apartments} />
      <FooterSection />
    </main>
  )
}
