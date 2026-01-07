import { appwriteConfig, storage } from './appwrite'

export function coverUrlFor(
  coverFileId?: string,
  opts?: {
    width?: number
    height?: number
  }
) {
  const bucketId = appwriteConfig.storageBucketId
  if (!bucketId || !coverFileId) return '/cover-placeholder.svg'

  try {
    return storage.getFilePreview(bucketId, coverFileId, opts?.width, opts?.height).toString()
  } catch {
    return '/cover-placeholder.svg'
  }
}
