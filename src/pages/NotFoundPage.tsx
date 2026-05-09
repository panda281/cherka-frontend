import { useEffect } from "react";
import { Link } from "react-router-dom";
import { applySeo, clearJsonLd } from "../lib/seo";

export function NotFoundPage() {
  useEffect(() => {
    applySeo({
      title: "Page not found — Ticketr",
      description:
        "This page does not exist or the link is broken. Browse events on Ticketr or return home.",
      path: typeof window !== "undefined" ? window.location.pathname : "/",
      image: "/logo/ticketr%20logo-02.svg",
      type: "website",
      robots: "noindex, follow"
    });
    clearJsonLd("event");
    clearJsonLd("home-website");
    return () => {
      clearJsonLd("event");
    };
  }, []);

  return (
    <main className="pzm-notFound">
      <div className="pzm-notFound__inner">
        <p className="pzm-notFound__code">404</p>
        <h1 className="pzm-notFound__title">Page not found</h1>
        <p className="pzm-notFound__desc">
          The page you opened does not exist, or the URL was mistyped. If you refreshed an event link,
          try opening the site from the home page once — your host may need SPA routing enabled.
        </p>
        <div className="pzm-notFound__actions">
          <Link to="/" className="pzm-btn pzm-btn--cta pzm-btn--lg">
            Back to home
          </Link>
          <Link to="/#all" className="pzm-btn pzm-btn--outline pzm-btn--lg">
            All events
          </Link>
        </div>
      </div>
    </main>
  );
}
