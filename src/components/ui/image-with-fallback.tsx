'use client'

import { useState, type ReactNode } from 'react'

interface ImageWithFallbackProps {
  src: string | null
  alt: string
  className: string
  fallback: ReactNode
}

export function ImageWithFallback({
  src,
  alt,
  className,
  fallback,
}: ImageWithFallbackProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null)

  if (!src || failedSrc === src) return fallback

  return (
    // Tenant-managed URLs can use different image hosts.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  )
}
