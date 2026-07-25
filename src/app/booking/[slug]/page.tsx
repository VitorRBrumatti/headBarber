import { notFound } from 'next/navigation'
import { getBookingPageData } from './actions'
import { BookingClient } from './booking-client'

interface BookingPageProps {
  params: Promise<{
    slug: string
  }>
}

async function loadBookingPageData(slug: string) {
  try {
    return await getBookingPageData(slug)
  } catch (error) {
    console.error('Error loading booking page:', error)
    return null
  }
}

export default async function BookingPage({ params }: BookingPageProps) {
  const { slug } = await params
  const data = await loadBookingPageData(slug)

  if (!data) notFound()

  return (
    <div className="min-h-screen bg-[#1A1A1D] text-white">
      <BookingClient
        barbershop={data.barbershop}
        barbers={data.barbers}
        products={data.products}
      />
    </div>
  )
}
