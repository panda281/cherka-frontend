import type { ReceiptSubmitResponse } from "../types";

export const RECEIPT_TELEGRAM_REDIRECT_SECONDS = 10;

export function telegramFallbackMessage(orderRef: string): string {
  return `No Telegram deep link from the server. Set up the ticket bot username on the server, or use your user bot with /claim ${orderRef}.`;
}

/** e.g. https://t.me/ticketr_user_demo_bot + ?start=ORD-… */
export function buildTelegramStartUrl(userBotBase: string, orderRef: string): string {
  const base = userBotBase.trim().replace(/\/$/, "");
  if (!base.includes("?")) return `${base}?start=${encodeURIComponent(orderRef)}`;
  return `${base}&start=${encodeURIComponent(orderRef)}`;
}

/** Prefer API deep link; otherwise env user bot + ?start=orderRef (same shape as server would return). */
export function resolveReceiptRedirectUrl(
  apiTelegramOpenBotUrl: string | null | undefined,
  orderRef: string,
  userBotBaseUrl: string
): string {
  const fromApi = apiTelegramOpenBotUrl?.trim();
  if (fromApi) return fromApi;
  return buildTelegramStartUrl(userBotBaseUrl, orderRef);
}

/** Parse JSON body from POST /orders/:id/receipt (after response.ok). */
export async function readReceiptSubmitBody(response: Response): Promise<ReceiptSubmitResponse> {
  const rawText = await response.text();
  if (!rawText.trim()) return {};
  try {
    return JSON.parse(rawText) as ReceiptSubmitResponse;
  } catch {
    return {};
  }
}

/**
 * Opens the Telegram deep link from the API (server is the source of truth for ?start= encoding).
 * Mobile: same tab. Desktop: new tab.
 */
export function openTelegramBotUrl(url: string): void {
  if (!url) return;
  const mobile =
    typeof window !== "undefined" &&
    (window.matchMedia("(max-width: 640px)").matches ||
      (typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));

  if (mobile) {
    window.location.href = url;
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export async function fetchTelegramDeepLink(
  apiBaseUrl: string,
  orderId: string
): Promise<string | null> {
  const response = await fetch(
    `${apiBaseUrl}/orders/${encodeURIComponent(orderId)}/telegram-deep-link`
  );
  if (!response.ok) return null;
  try {
    const data = (await response.json()) as { telegramOpenBotUrl?: unknown };
    const url = data.telegramOpenBotUrl;
    return typeof url === "string" && url.length > 0 ? url : null;
  } catch {
    return null;
  }
}
