import { useState } from 'react'
import { uploadImage } from '@/lib/api/upload'

interface UseUploadImageResult {
  upload: (blob: Blob, filename?: string) => Promise<string>
  isUploading: boolean
  error: string | null
  reset: () => void
}

export function useUploadImage(): UseUploadImageResult {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = async (blob: Blob, filename?: string): Promise<string> => {
    setIsUploading(true)
    setError(null)
    try {
      const url = await uploadImage(blob, filename)
      return url
    } catch (err) {
      const msg = err instanceof Error ? err.message : '이미지 업로드에 실패했습니다'
      setError(msg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const reset = () => {
    setIsUploading(false)
    setError(null)
  }

  return { upload, isUploading, error, reset }
}
