/**
 * Curated Unsplash photos (hotlink-friendly URLs). Same event id always maps to the same image.
 * @see https://unsplash.com/license
 */
export const DEFAULT_HERO_UNSPLASH =
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=2000&q=85&auto=format&fit=crop";

const UNSPLASH_EVENT_COVERS = [
  "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1501281668745-bf2a074bf1d9?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1540575467063-266a023c31dc?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1536922640866-9c814c80f177?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1574391884720-bf2a074bf1d9?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=1600&q=80&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=1600&q=80&auto=format&fit=crop"
] as const;

function hashToIndex(id: string, modulo: number): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h) % modulo;
}

export function unsplashCoverForEventId(eventId: string): string {
  return UNSPLASH_EVENT_COVERS[hashToIndex(eventId, UNSPLASH_EVENT_COVERS.length)];
}
