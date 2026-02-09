import { getAccessToken } from "@/lib/api/client";

type AdEvent = "impression" | "click";

interface TrackPayload {
  adId: string;
  event: AdEvent;
  timestamp: string;
}

const IS_DEV = process.env.NODE_ENV === "development";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000")
  );
}

async function sendTrackEvent(payload: TrackPayload): Promise<void> {
  if (IS_DEV) {
    // eslint-disable-next-line no-console
    console.log(`[ad:${payload.event}]`, payload.adId);
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    const token = getAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    await fetch(`${getBaseUrl()}/api/v1/ads/track`, {
      method: "POST",
      headers,
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
