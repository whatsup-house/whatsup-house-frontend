import Image from 'next/image'

/** 후기 카드에서 사진이 없을 때 보여줄 브랜드(파비콘) 플레이스홀더. */
export default function ReviewImageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-tag-bg">
      <Image src="/favicon.png" alt="" width={80} height={80} className="opacity-60" />
    </div>
  )
}
