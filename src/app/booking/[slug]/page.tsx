import { notFound } from 'next/navigation'
import { getBookingPageData } from './actions'
import { BookingClient } from './booking-client'
import styles from './booking.module.css'

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
    <div className={styles.appearance}>
      <BookingClient
        barbershop={data.barbershop}
        barbers={data.barbers}
        products={data.products}
      />
    </div>
  )
}
