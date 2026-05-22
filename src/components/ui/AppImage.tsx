import type { ComponentProps } from 'react'
import Image from 'next/image'

// fill은 항상 고정, unoptimized는 next.config.ts의 remotePatterns로 대체
type AppImageProps = Omit<ComponentProps<typeof Image>, 'fill' | 'unoptimized'>

export default function AppImage({
  alt,
  sizes,
  ...props
}: AppImageProps) {
  return <Image fill alt={alt} sizes={sizes} {...props} />
}
