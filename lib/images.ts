import { createClient } from './supabase/client';

export const PATTERN_IMAGE_BUCKET = 'pattern-images';
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function patternImageUrl(path: string | null): string | null {
  if (!path) return null;
  return createClient().storage.from(PATTERN_IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Uploads to "<user id>/<pattern id>-<timestamp>.<ext>" and returns the storage path. */
export async function uploadPatternImage(userId: string, patternId: string, file: File): Promise<string> {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${userId}/${patternId}-${Date.now()}.${ext}`;
  const { error } = await createClient()
    .storage.from(PATTERN_IMAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, cacheControl: '31536000' });
  if (error) throw error;
  return path;
}

/** Best effort: a leftover file is harmless, so failures are ignored. */
export async function removePatternImage(path: string | null) {
  if (!path) return;
  await createClient().storage.from(PATTERN_IMAGE_BUCKET).remove([path]);
}
