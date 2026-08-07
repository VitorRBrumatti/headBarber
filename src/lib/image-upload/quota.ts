import type { SupabaseClient } from '@supabase/supabase-js'

export interface ImageUploadQuota {
  allowed: boolean
  retryAfterSeconds: number
}

interface ImageUploadQuotaRow {
  allowed: boolean
  retry_after_seconds: number
}

export async function consumeImageUploadQuota(
  supabase: SupabaseClient,
  barbershopId: string,
): Promise<ImageUploadQuota> {
  const { data, error } = await supabase.rpc('consume_image_upload_quota', {
    p_barbershop_id: barbershopId,
  })

  if (error) {
    throw new Error('Não foi possível validar o limite de uploads.')
  }

  const row = Array.isArray(data)
    ? (data[0] as ImageUploadQuotaRow | undefined)
    : undefined

  if (!row || typeof row.allowed !== 'boolean') {
    throw new Error('Não foi possível validar o limite de uploads.')
  }

  return {
    allowed: row.allowed,
    retryAfterSeconds: Math.max(0, Number(row.retry_after_seconds) || 0),
  }
}
