import type { EventItem, OrderResponse } from "../types";

type RawEvent = EventItem & {
  event_image_url?: string | null;
};

function normalizeEvent(raw: RawEvent): EventItem {
  const eventImageUrl = (raw.eventImageUrl ?? raw.event_image_url) ?? null;
  return {
    ...(raw as unknown as EventItem),
    eventImageUrl
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
