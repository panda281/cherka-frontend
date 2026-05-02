import type { EventItem, EventTier, OrderResponse } from "../types";

type RawEvent = EventItem & {
  event_image_url?: string | null;
};

function normalizeTier(row: Record<string, unknown>): EventTier {
  return {
    id: String(row.id ?? ""),
    tierCode: String(row.tierCode ?? row.tier_code ?? ""),
    tierName: String(row.tierName ?? row.tier_name ?? ""),
    price: String(row.price ?? "0"),
    earlyBirdPrice: (row.earlyBirdPrice ?? row.early_bird_price ?? null) as string | null | undefined,
    earlyBirdEndsAt: (row.earlyBirdEndsAt ?? row.early_bird_ends_at ?? null) as string | null | undefined,
    active: row.active !== false
  };
}

function normalizeEvent(raw: RawEvent): EventItem {
  const eventImageUrl = (raw.eventImageUrl ?? raw.event_image_url) ?? null;
  const tiers = Array.isArray(raw.tiers)
    ? raw.tiers.map((t) => normalizeTier(t as Record<string, unknown>))
    : [];
  const base = raw as unknown as EventItem;
  return {
    ...base,
    eventImageUrl,
    tiers
  };
}

export async function requestEvents(apiBaseUrl: string): Promise<EventItem[]> {
  const response = await fetch(`${apiBaseUrl}/events`);
  if (!response.ok) throw new Error("Failed to fetch events.");
  const rows = (await response.json()) as RawEvent[];
  return rows.map(normalizeEvent);
}

export async function createOrder(
  apiBaseUrl: string,
  params: {
    eventId: string;
    tierId: string;
    quantity?: number;
    promoCode?: string;
  }
): Promise<OrderResponse> {
  const body: Record<string, unknown> = {
    eventId: params.eventId,
    tierId: params.tierId
  };
  if (params.quantity != null && params.quantity > 1) body.quantity = params.quantity;
  const code = params.promoCode?.trim();
  if (code) body.promoCode = code.toLowerCase();

  const response = await fetch(`${apiBaseUrl}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  const raw = (await response.json().catch(() => ({}))) as { error?: string } & Partial<OrderResponse>;
  if (!response.ok) {
    const msg = typeof raw.error === "string" ? raw.error : "Could not create order. Try again.";
    throw new Error(msg);
  }
  return raw as OrderResponse;
}
