import { MapPin, Map } from 'lucide-react'
import { ImageWithFallback } from '@/components/ui/image-with-fallback'
import { getGoogleMapsUrl, type BookingProfile } from '@/lib/booking-profile'
import styles from './booking.module.css'

export function BookingShopProfile({
  shop,
}: {
  shop: { name: string } & Partial<BookingProfile>
}) {
  const mapsUrl = getGoogleMapsUrl(shop.booking_address)
  const initials = shop.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toLocaleUpperCase('pt-BR')
  const defaultBanner = <ImageWithFallback src="/brand/booking-default.webp" alt="Imagem padrão da barbearia" className={`${styles.bannerImage} ${styles.defaultBanner}`} fallback={<div className={styles.bannerFallback} />} />
  return (
    <div className={styles.shopProfile}>
        <div className={styles.shopBanner}>
          <ImageWithFallback
            src={shop.booking_banner_url ?? null}
            alt={`Ambiente da ${shop.name}`}
            className={styles.bannerImage}
            fallback={defaultBanner}
          />
        </div>
      <div
        className={`${styles.shopIdentity} ${styles.withBanner}`}
      >
        <div className={styles.shopAvatar}>
          <ImageWithFallback
            src={shop.booking_avatar_url ?? null}
            alt={`Foto de perfil da ${shop.name}`}
            className={styles.avatarImage}
            fallback={
              <span role="img" aria-label={`Iniciais de ${shop.name}`}>{initials}</span>
            }
          />
        </div>
        <h1>{shop.name}</h1>
        {shop.name.includes('Demo') && <p className="mt-2 text-sm text-[#bfc1bc]">Barbearia de demonstração<span className="sr-only">. Imagens e endereço ilustrativos.</span></p>}
      </div>
      {mapsUrl && (
        <a
          className={styles.shopLocation}
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MapPin aria-hidden="true" size={21} />
          <span className={styles.address}>{shop.booking_address}</span>
          <span className={styles.mapsAction}>
            <Map aria-hidden="true" size={16} /> Abrir no Google Maps
          </span>
          <span className="sr-only">(abre em nova aba)</span>
        </a>
      )}
    </div>
  )
}
