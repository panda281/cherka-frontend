/** Telegram for event listing requests; override in .env for other handles. */
export const ORGANIZER_TELEGRAM_URL =
  String(import.meta.env.VITE_ORGANIZER_TELEGRAM ?? "").trim() ||
  "https://t.me/alazardev";

export const ORGANIZER_TELEGRAM_HANDLE = "@alazardev";
