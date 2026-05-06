type SeoPayload = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
};

const defaultSiteName = "Ticketr";

function siteUrl(): string {
  const fromEnv = String(import.meta.env.VITE_SITE_URL ?? "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return "";
}

function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = siteUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

function setMetaByName(name: string, content: string) {
  let el = document.head.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("name", name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setMetaByProperty(property: string, content: string) {
  let el = document.head.querySelector(`meta[property="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute("property", property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(url: string) {
  let el = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", url);
}

export function applySeo(payload: SeoPayload) {
  const canonical = payload.path ? absoluteUrl(payload.path) : window.location.href;
  const image = payload.image ? absoluteUrl(payload.image) : absoluteUrl("/logo/ticketr%20logo-02.svg");
  const type = payload.type ?? "website";

  document.title = payload.title;
  setCanonical(canonical);
  setMetaByName("description", payload.description);
  setMetaByName("robots", "index,follow,max-image-preview:large");

  setMetaByProperty("og:type", type);
  setMetaByProperty("og:site_name", defaultSiteName);
  setMetaByProperty("og:title", payload.title);
  setMetaByProperty("og:description", payload.description);
  setMetaByProperty("og:url", canonical);
  setMetaByProperty("og:image", image);

  setMetaByName("twitter:card", "summary_large_image");
  setMetaByName("twitter:title", payload.title);
  setMetaByName("twitter:description", payload.description);
  setMetaByName("twitter:image", image);
}

export function applyJsonLd(id: string, data: unknown) {
  const scriptId = `ld-json-${id}`;
  let script = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = scriptId;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

export function clearJsonLd(id: string) {
  const script = document.getElementById(`ld-json-${id}`);
  if (script) script.remove();
}
