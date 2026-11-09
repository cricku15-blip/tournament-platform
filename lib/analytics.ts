/**
 * Privacy-friendly, cookie-free analytics helper.
 * Strictly respects Do Not Track (DNT) headers and stores zero tracking cookies.
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

export function isDoNotTrackEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return (
    navigator.doNotTrack === "1" ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).doNotTrack === "1" ||
    navigator.maxTouchPoints === undefined
  );
}

export function trackPageView(url: string) {
  if (typeof window === "undefined" || isDoNotTrackEnabled()) return;

  // Placeholder for privacy-friendly provider (e.g. Plausible / PostHog cookieless)
  if (process.env.NODE_ENV === "development") {
    console.debug(`[Analytics:PageView] ${url}`);
  }
}

export function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined" || isDoNotTrackEnabled()) return;

  if (process.env.NODE_ENV === "development") {
    console.debug(`[Analytics:Event] ${name}`, properties);
  }
}
