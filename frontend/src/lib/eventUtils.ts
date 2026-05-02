import type { EventItem, EventTier } from "../types";
import { unsplashCoverForEventId } from "./unsplashPlaceholders";

export function inferCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("fest")) return "Festivals";
  if (n.includes("exhibit") || n.includes("gallery")) return "Exhibitions";
  if (n.includes("sport") || n.includes("marathon") || n.includes("match")) return "Sports";
  if (n.includes("tech") || n.includes("hackathon") || n.includes("summit")) return "Tech";
  if (n.includes("art") && !n.includes("party")) return "Arts";
  return "Music";
}

/** Prefer stored category from API; fall back to name heuristic for older rows. */
export function eventCategory(event: EventItem): string {
  const c = event.category?.trim();
  if (c) return c;
  return inferCategory(event.name);
}

export function publishedEvents(events: EventItem[]): EventItem[] {
  return events.filter((e) => e.status === "published");
}

export function activeTiersOf(event: EventItem) {
  return event.tiers.filter((t) => t.active);
}

/** Matches backend: early-bird unit while end time is in the future, else `price`. */
export function effectiveUnitPriceEtb(tier: EventTier, at: Date = new Date()): number {
  const regular = Number.parseFloat(tier.price);
  if (!Number.isFinite(regular)) return 0;
  const ebRaw = tier.earlyBirdPrice != null ? Number.parseFloat(String(tier.earlyBirdPrice)) : NaN;
  const ends = tier.earlyBirdEndsAt ? new Date(tier.earlyBirdEndsAt) : null;
  if (
    Number.isFinite(ebRaw) &&
    ebRaw > 0 &&
    ends != null &&
    !Number.isNaN(ends.getTime()) &&
    at.getTime() < ends.getTime()
  ) {
    return ebRaw;
  }
  return regular;
}

export function isEarlyBirdActive(tier: EventTier, at: Date = new Date()): boolean {
  const eff = effectiveUnitPriceEtb(tier, at);
  const reg = Number.parseFloat(tier.price);
  return Number.isFinite(reg) && eff < reg - 1e-9;
}

/** Short label for tier dropdowns (early bird + door when applicable). */
export function formatTierPriceLabel(tier: EventTier): string {
  const eff = effectiveUnitPriceEtb(tier);
  const reg = Number.parseFloat(tier.price);
  const base = `${tier.tierName} (${tier.tierCode})`;
  if (isEarlyBirdActive(tier)) {
    const until = tier.earlyBirdEndsAt
      ? new Date(tier.earlyBirdEndsAt).toLocaleString(undefined, {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit"
        })
      : "";
    return `${base} — ETB ${eff.toLocaleString()} early bird${until ? ` until ${until}` : ""} · door ETB ${reg.toLocaleString()}`;
  }
  return `${base} — ETB ${reg.toLocaleString()}`;
}

export function eventHasActiveEarlyBird(event: EventItem): boolean {
  return activeTiersOf(event).some((t) => isEarlyBirdActive(t));
}

export function isSoldOut(event: EventItem): boolean {
  return activeTiersOf(event).length === 0;
}

export function minPriceEtb(event: EventItem): number | null {
  const tiers = activeTiersOf(event);
  if (!tiers.length) return null;
  return Math.min(...tiers.map((t) => effectiveUnitPriceEtb(t)));
}

export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

export function formatEventTimeRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const s = new Date(startIso).toLocaleTimeString(undefined, opts);
  const e = new Date(endIso).toLocaleTimeString(undefined, opts);
  return `${s} – ${e}`;
}

function isUsableRemoteImageUrl(u: string | null | undefined): u is string {
  if (u == null) return false;
  const t = u.trim();
  if (!t) return false;
  if (/^(null|undefined)$/i.test(t)) return false;
  return /^https?:\/\//i.test(t);
}

/** Custom image when set and valid; otherwise a stable Unsplash cover per event id. */
export function eventCoverImageUrl(event: EventItem): string {
  if (isUsableRemoteImageUrl(event.eventImageUrl)) {
    return event.eventImageUrl.trim();
  }
  const id = event.id?.trim() || "default";
  return unsplashCoverForEventId(id);
}
