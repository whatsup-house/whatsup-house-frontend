import { useState } from 'react'
import { uploadImage } from '@/lib/api/upload'
import type { ImageUploadResponse } from '@/lib/api/types'

interface UseUploadImageResult {
  upload: (blob: Blob, filename?: string) => Promise<string>
  uploadWithTempPath: (blob: Blob, filename?: string) => Promise<ImageUploadResponse>
  isUploading: boolean
  error: string | null
  reset: () => void
}

export function useUploadImage(fallbackMessage = 'Image upload failed'): UseUploadImageResult {
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadWithTempPath = async (blob: Blob, filename?: string): Promise<ImageUploadResponse> => {
    setIsUploading(true)
    setError(null)
    try {
      return await uploadImage(blob, filename)
    } catch (err) {
      const msg = err instanceof Error ? err.message : fallbackMessage
      setError(msg)
      throw err
    } finally {
      setIsUploading(false)
    }
  }

  const upload = async (blob: Blob, filename?: string): Promise<string> => {
    const result = await uploadWithTempPath(blob, filename)
    return result.previewUrl
  }

  const reset = () => {
    setIsUploading(false)
    setError(null)
  }

  return { upload, uploadWithTempPath, isUploading, error, reset }
}
