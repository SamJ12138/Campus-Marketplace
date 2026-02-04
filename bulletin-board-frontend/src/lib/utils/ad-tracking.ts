type AdEvent = "impression" | "click";

interface TrackPayload {
  adId: string;
  event: AdEvent;
  timestamp: string;
}

const IS_DEV = process.env.NODE_ENV === "development";

async function sendTrackEvent(payload: TrackPayload): Promise<void> {
  if (IS_DEV) {
    console.log(`[ad:${payload.event}]`, payload.adId);
  }

  try {
    await fetch("/api/ads/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Tracking is best-effort; never block the UI
  }
}

export function trackAdImpression(adId: string): void {
  sendTrackEvent({ adId, event: "impression", timestamp: new Date().toISOString() });
}

export function trackAdClick(adId: string): void {
  sendTrackEvent({ adId, event: "click", timestamp: new Date().toISOString() });
}
