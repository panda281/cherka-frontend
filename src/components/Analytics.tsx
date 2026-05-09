import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, isAnalyticsEnabled, trackPageView } from "../lib/analytics";

/**
 * Mount inside BrowserRouter. Loads GA4 when VITE_GA_MEASUREMENT_ID is set
 * and records virtual page views on client-side navigation.
 */
export function Analytics() {
  const location = useLocation();
  const didInit = useRef(false);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    if (didInit.current) return;
    didInit.current = true;
    initAnalytics();
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled()) return;
    const path = `${location.pathname}${location.search}${location.hash}`;
    trackPageView(path);
  }, [location.pathname, location.search, location.hash]);

  return null;
}
