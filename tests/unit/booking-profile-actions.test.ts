import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ context: vi.fn(), revalidate: vi.fn() }))
vi.mock('@/utils/get-barbershop', () => ({ getBarbershopId: mocks.context }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidate }))
import { updateBarbershopBookingProfileAction } from '@/app/dashboard/configuracoes/actions'

const query = (data: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn().mockResolvedValue({ data, error: null }),
})

describe('booking profile authorization and persistence', () => {
  let profile: ReturnType<typeof query>
  let updateQuery: ReturnType<typeof query>
  let update: ReturnType<typeof vi.fn>
  beforeEach(() => {
    vi.clearAllMocks()
    profile = query({ role: 'owner', demo_mode: false })
    updateQuery = query({ slug: 'my-shop' })
    update = vi.fn().mockReturnValue(updateQuery)
    mocks.context.mockResolvedValue({
      barbershopId: 'shop-A',
      supabase: {
        auth: {
          getUser: vi
            .fn()
            .mockResolvedValue({ data: { user: { id: 'owner-A' } } }),
        },
        from: vi.fn((table: string) =>
          table === 'profiles' ? profile : { update },
        ),
      },
    })
  })

  it('writes only normalized presentation fields for the authenticated tenant', async () => {
    const form = new FormData()
    form.set('address', ' Rua A, 10 ')
    form.set('barbershop_id', 'another-shop')
    await updateBarbershopBookingProfileAction(form)
    expect(update).toHaveBeenCalledWith({
      booking_address: 'Rua A, 10',
      booking_avatar_url: null,
      booking_banner_url: null,
    })
    expect(updateQuery.eq).toHaveBeenCalledWith('id', 'shop-A')
    expect(profile.eq).toHaveBeenCalledWith('id', 'owner-A')
    expect(profile.eq).toHaveBeenCalledWith('barbershop_id', 'shop-A')
    expect(mocks.revalidate).toHaveBeenCalledWith('/booking/my-shop')
  })

  it.each([
    { role: 'barber', demo_mode: false },
    { role: 'owner', demo_mode: true },
  ])('blocks unauthorized profile changes: %j', async (value) => {
    profile.single.mockResolvedValue({ data: value, error: null })
    await expect(
      updateBarbershopBookingProfileAction(new FormData()),
    ).rejects.toThrow()
    expect(update).not.toHaveBeenCalled()
  })

  it('does not write an invalid upload URL or report success after a failed update', async () => {
    const form = new FormData()
    form.set('image_url', 'javascript:alert(1)')
    await expect(updateBarbershopBookingProfileAction(form)).rejects.toThrow(
      'imagem',
    )
    expect(update).not.toHaveBeenCalled()
    updateQuery.single.mockResolvedValue({ data: null, error: null })
    await expect(
      updateBarbershopBookingProfileAction(new FormData()),
    ).rejects.toThrow('salvar')
    expect(mocks.revalidate).not.toHaveBeenCalled()
  })
})
