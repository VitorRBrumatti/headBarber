import { notFound } from 'next/navigation'
import { getBookingPageData } from './actions'
import { BookingClient } from './booking-client'

interface BookingPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function BookingPage({ params }: BookingPageProps) {
  const resolvedParams = await params
  const { slug } = resolvedParams

  try {
    const data = await getBookingPageData(slug)
    
    return (
      <div className="min-h-screen bg-[#1A1A1D] text-white">
        <BookingClient 
          barbershop={data.barbershop}
          services={data.services}
          barbers={data.barbers}
          addOns={data.addOns}
          products={data.products}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading booking page:', error)
    return notFound()
  }
}
