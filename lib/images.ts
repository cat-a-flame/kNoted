import { createClient } from './supabase/client';

export const PATTERN_IMAGE_BUCKET = 'pattern-images';
export const YARN_IMAGE_BUCKET = 'yarn-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type Bucket = typeof PATTERN_IMAGE_BUCKET | typeof YARN_IMAGE_BUCKET;

export function imageUrl(bucket: Bucket, path: string | null): string | null {
  if (!path) return null;
  return createClient().storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

/** Uploads to "<user id>/<owner id>-<timestamp>.<ext>" and returns the storage path. */
export async function uploadImage(bucket: Bucket, userId: string, ownerId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${ownerId}-${Date.now()}.${ext}`;
  const { error } = await createClient()
    .storage.from(bucket)
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

/** Best effort: a leftover file is harmless, so failures are ignored. */
export async function removeImage(bucket: Bucket, path: string | null) {
  if (!path) return;
  await createClient().storage.from(bucket).remove([path]);
}

export const patternImageUrl = (path: string | null) => imageUrl(PATTERN_IMAGE_BUCKET, path);
export const uploadPatternImage = (userId: string, patternId: string, file: File) => uploadImage(PATTERN_IMAGE_BUCKET, userId, patternId, file);
export const removePatternImage = (path: string | null) => removeImage(PATTERN_IMAGE_BUCKET, path);

export const yarnImageUrl = (path: string | null) => imageUrl(YARN_IMAGE_BUCKET, path);
export const uploadYarnImage = (userId: string, yarnId: string, file: File) => uploadImage(YARN_IMAGE_BUCKET, userId, yarnId, file);
export const removeYarnImage = (path: string | null) => removeImage(YARN_IMAGE_BUCKET, path);
