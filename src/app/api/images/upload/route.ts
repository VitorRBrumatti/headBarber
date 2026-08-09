import { uploadToImgBb } from '@/lib/image-upload/imgbb'
import { consumeImageUploadQuota } from '@/lib/image-upload/quota'
import { handleImageUpload } from '@/lib/image-upload/route-handler'
import { getBarbershopId } from '@/utils/get-barbershop'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  return handleImageUpload(request, {
    getContext: getBarbershopId,
    isConfigured: () => Boolean(process.env.IMGBB_API_KEY),
    consumeQuota: consumeImageUploadQuota,
    upload: (file) => {
      const apiKey = process.env.IMGBB_API_KEY
      if (!apiKey) throw new Error('MISCONFIGURED')
      return uploadToImgBb({ file, apiKey })
    },
  })
}
