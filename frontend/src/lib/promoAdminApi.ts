import type { CreatePromoBatchResponse, PromoCodeRow } from "../types";

const STORAGE_KEY = "ticketr_organizer_api_key";

export function getStoredOrganizerApiKey(): string {
  return sessionStorage.getItem(STORAGE_KEY) ?? "";
}

export function setStoredOrganizerApiKey(key: string): void {
  const t = key.trim();
  if (!t) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, t);
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-scanner-api-key": apiKey.trim()
  };
}

function normalizePromoRow(raw: Record<string, unknown>): PromoCodeRow {
  return {
    id: String(raw.id ?? ""),
    name: String(raw.name ?? ""),
    code: String(raw.code ?? ""),
    eventId: (raw.eventId ?? raw.event_id ?? null) as string | null,
    discountType: raw.discountType === "fixed_total" || raw.discount_type === "fixed_total" ? "fixed_total" : "percent",
    discountValue: String(raw.discountValue ?? raw.discount_value ?? "0"),
    maxUses: raw.maxUses != null ? Number(raw.maxUses) : raw.max_uses != null ? Number(raw.max_uses) : null,
    usesCount: Number(raw.usesCount ?? raw.uses_count ?? 0),
    validFrom: raw.validFrom != null ? String(raw.validFrom) : raw.valid_from != null ? String(raw.valid_from) : null,
    validUntil:
      raw.validUntil != null ? String(raw.validUntil) : raw.valid_until != null ? String(raw.valid_until) : null,
    active: raw.active !== false,
    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),
    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? "")
  };
}

export async function listPromoCodes(
  apiBaseUrl: string,
  apiKey: string,
  eventId?: string
): Promise<PromoCodeRow[]> {
  const q = eventId?.trim() ? `?eventId=${encodeURIComponent(eventId.trim())}` : "";
  const response = await fetch(`${apiBaseUrl}/admin/promo-codes${q}`, {
    headers: { Accept: "application/json", "x-scanner-api-key": apiKey.trim() }
  });
  const raw = (await response.json().catch(() => ({}))) as { error?: string; rows?: unknown[] };
  if (!response.ok) {
    throw new Error(typeof raw.error === "string" ? raw.error : "Could not load promo codes.");
  }
  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  return rows.map((r) => normalizePromoRow(r as Record<string, unknown>));
}

export type CreatePromoBatchInput = {
  promoName: string;
  count: number;
  eventId?: string | null;
  discountType: "percent" | "fixed_total";
  discountValue: number;
  maxUses?: number | null;
  validFrom?: string | null;
  validUntil?: string | null;
  active?: boolean;
};

export async function createPromoBatch(
  apiBaseUrl: string,
  apiKey: string,
  body: CreatePromoBatchInput
): Promise<CreatePromoBatchResponse> {
  const response = await fetch(`${apiBaseUrl}/admin/promo-codes`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({
      promoName: body.promoName.trim(),
      count: body.count,
      eventId: body.eventId?.trim() || null,
      discountType: body.discountType,
      discountValue: body.discountValue,
      maxUses: body.maxUses ?? null,
      validFrom: body.validFrom?.trim() || null,
      validUntil: body.validUntil?.trim() || null,
      active: body.active ?? true
    })
  });
  const raw = (await response.json().catch(() => ({}))) as { error?: string; rows?: unknown[]; count?: number };
  if (!response.ok) {
    throw new Error(typeof raw.error === "string" ? raw.error : "Could not create promo codes.");
  }
  const rows = Array.isArray(raw.rows) ? raw.rows.map((r) => normalizePromoRow(r as Record<string, unknown>)) : [];
  return { rows, count: raw.count ?? rows.length };
}

export async function patchPromoCode(
  apiBaseUrl: string,
  apiKey: string,
  promoId: string,
  patch: { active?: boolean }
): Promise<PromoCodeRow> {
  const response = await fetch(`${apiBaseUrl}/admin/promo-codes/${encodeURIComponent(promoId)}`, {
    method: "PATCH",
    headers: authHeaders(apiKey),
    body: JSON.stringify(patch)
  });
  const raw = (await response.json().catch(() => ({}))) as { error?: string; row?: Record<string, unknown> };
  if (!response.ok) {
    throw new Error(typeof raw.error === "string" ? raw.error : "Could not update promo.");
  }
  if (!raw.row) throw new Error("Invalid server response.");
  return normalizePromoRow(raw.row);
}
