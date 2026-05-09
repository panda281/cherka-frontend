/**
 * Optional visitor analytics (Google Analytics 4).
 *
 * Set VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX in your env (e.g. Vercel / .env.production).
 * Leave unset in dev if you do not want hits while developing.
 *
 * Alternatives: Plausible (privacy-first, script + window.plausible),
 * Vercel Analytics (@vercel/analytics), PostHog, Umami (self-hosted).
 */

const GA_ID = (import.meta.env.VITE_GA_MEASUREMENT_ID as string | undefined)?.trim();

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function isAnalyticsEnabled(): boolean {
  return Boolean(GA_ID);
}

/** Load gtag once; does not send default page_view (SPA sends via trackPageView). */
export function initAnalytics(): void {
  if (!GA_ID || typeof window === "undefined") return;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { send_page_view: false });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`;
  document.head.appendChild(script);
}

/** Call on each route change (and once on first paint). */
export function trackPageView(path: string): void {
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href
  });
}

/** Optional custom events (e.g. purchase_started, share_clicked). */
export function trackEvent(name: string, params?: Record<string, string | number | boolean>): void {
  if (!GA_ID || !window.gtag) return;
  window.gtag("event", name, params ?? {});
}
