import type { EventItem } from "../types";

export function slugifyEventName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function eventRouteRef(event: EventItem): string {
  return `${slugifyEventName(event.name)}--${event.id}`;
}

export function eventRoutePath(event: EventItem): string {
  return `/event/${eventRouteRef(event)}`;
}

export function extractEventIdFromRef(eventRef: string): string {
  if (!eventRef) return "";
  const separator = "--";
  if (!eventRef.includes(separator)) return eventRef;
  const parts = eventRef.split(separator);
  return parts[parts.length - 1] ?? eventRef;
}
