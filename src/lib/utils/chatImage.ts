const MAX_EDGE = 1080
export const CHAT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

// 긴 변 1080px 이하로 줄여 webp(0.8)로 인코딩한다. webp 인코딩 미지원 브라우저는 png를 돌려주므로 jpeg(0.85)로 폴백.
export async function compressChatImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('Canvas not supported')
  }
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const webp = await canvasToBlob(canvas, 'image/webp', 0.8)
  if (webp?.type === 'image/webp') return webp
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', 0.85)
  if (!jpeg) throw new Error('Image encoding failed')
  return jpeg
}
