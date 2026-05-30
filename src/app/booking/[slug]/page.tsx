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
      <div className="min-h-screen bg-neutral-950 text-neutral-100">
        <BookingClient 
          barbershop={data.barbershop}
          services={data.services}
          barbers={data.barbers}
          addOns={data.addOns}
        />
      </div>
    )
  } catch (error) {
    console.error('Error loading booking page:', error)
    return notFound()
  }
}
