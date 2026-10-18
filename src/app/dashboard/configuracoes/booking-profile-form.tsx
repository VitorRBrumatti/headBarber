'use client'

import { useState, useTransition } from 'react'
import { Check, LoaderCircle, MapPin, Save } from 'lucide-react'
import { ImageUpload } from '@/components/ui/image-upload'
import { Button } from '@/components/ui/button'
import { getGoogleMapsUrl, type BookingProfile } from '@/lib/booking-profile'
import { updateBarbershopBookingProfileAction } from './actions'

export function BookingProfileForm({
  profile,
  onSaved,
  submitLabel = 'Salvar perfil público',
}: {
  profile: BookingProfile | null
  onSaved?: () => void
  submitLabel?: string
}) {
  const [address, setAddress] = useState(profile?.booking_address ?? '')
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [saving, startSaving] = useTransition()
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const mapsUrl = getGoogleMapsUrl(address)

  if (!profile)
    return (
      <p role="status" className="max-w-xl text-sm text-[#625f59]">
        O perfil público ficará disponível após a atualização do sistema.
      </p>
    )

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setSaved(false)
    startSaving(async () => {
      try {
        await updateBarbershopBookingProfileAction(form)
        setSaved(true)
        onSaved?.()
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o perfil público.',
        )
      }
    })
  }

  return (
    <form
      onSubmit={save}
      onClickCapture={() => setSaved(false)}
      className="max-w-[760px]"
    >
      <fieldset disabled={saving} className="min-w-0 space-y-6">
        <section
          className="rounded-md border border-[#e2ded7] bg-white"
          aria-labelledby="booking-profile-title"
        >
          <div className="border-b border-[#e2ded7] px-5 py-4">
            <h2
              id="booking-profile-title"
              className="font-montserrat text-sm font-bold text-[#242321]"
            >
              Sua barbearia no agendamento
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#625f59]">
              Estas imagens e o endereço aparecem para seus clientes na escolha
              do profissional.
            </p>
          </div>
          <div className="space-y-7 p-5">
            <ImageUpload
              name="image_url"
              label="Banner da barbearia"
              initialUrl={profile.booking_banner_url}
              onUploadingChange={setBannerUploading}
            />
            <p className="-mt-4 text-xs leading-5 text-[#625f59]">
              Prefira uma foto horizontal do espaço. A imagem será recortada
              para preencher o banner.
            </p>
            <ImageUpload
              name="avatar_url"
              label="Foto de perfil da barbearia"
              initialUrl={profile.booking_avatar_url}
              shape="circle"
              onUploadingChange={setAvatarUploading}
            />
            <p className="-mt-4 text-xs leading-5 text-[#625f59]">
              Use o logotipo ou uma foto que identifique sua barbearia. As fotos
              dos profissionais são configuradas em Barbeiros.
            </p>
          </div>
        </section>
        <section
          className="rounded-md border border-[#e2ded7] bg-white p-5"
          aria-labelledby="booking-address-title"
        >
          <h2
            id="booking-address-title"
            className="font-montserrat text-sm font-bold text-[#242321]"
          >
            Localização
          </h2>
          <label
            htmlFor="booking-address"
            className="mb-2 mt-4 block text-xs font-semibold text-[#47423c]"
          >
            Endereço completo
          </label>
          <input
            id="booking-address"
            name="address"
            autoComplete="street-address"
            maxLength={300}
            value={address}
            onChange={(event) => {
              setAddress(event.target.value)
              setSaved(false)
            }}
            placeholder="Rua, número, bairro, cidade e estado"
            className="h-11 w-full rounded-md border border-[#d9d3ca] bg-white px-3 text-sm text-[#242321] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C79A4A]"
          />
          <p className="mt-2 text-xs leading-5 text-[#625f59]">
            O botão do agendamento abre este endereço no Google Maps. Confira o
            resultado antes de salvar.
          </p>
          {mapsUrl && (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[#795A29] underline underline-offset-4"
            >
              <MapPin size={16} aria-hidden="true" />
              Conferir no Google Maps{' '}
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          )}
        </section>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        {saved && (
          <p
            role="status"
            className="flex items-center gap-2 text-sm text-emerald-800"
          >
            <Check size={16} aria-hidden="true" />
            Perfil público salvo.
          </p>
        )}
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving || avatarUploading || bannerUploading}
            className="min-h-11 gap-2"
          >
            {saving ? (
              <LoaderCircle
                className="size-4 animate-spin motion-reduce:animate-none"
                aria-hidden="true"
              />
            ) : (
              <Save size={16} aria-hidden="true" />
            )}
            {saving ? 'Salvando…' : submitLabel}
          </Button>
        </div>
      </fieldset>
    </form>
  )
}
