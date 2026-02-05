import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Gimme Dat - Campus Marketplace for Gettysburg College";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f172a",
          backgroundImage:
            "radial-gradient(circle at 25% 25%, #1e3a5f 0%, transparent 50%), radial-gradient(circle at 75% 75%, #2d1f47 0%, transparent 50%)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              background: "linear-gradient(135deg, #f97316 0%, #eab308 100%)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 20,
            }}
          >
            Gimme Dat
          </div>
          <div
            style={{
              fontSize: 36,
              color: "#94a3b8",
              marginBottom: 40,
            }}
          >
            Campus Marketplace
          </div>
          <div
            style={{
              display: "flex",
              gap: 40,
              color: "#64748b",
              fontSize: 24,
            }}
          >
            <span>📚 Textbooks</span>
            <span>🛋️ Furniture</span>
            <span>💼 Services</span>
            <span>🎫 Tickets</span>
          </div>
          <div
            style={{
              marginTop: 50,
              padding: "12px 32px",
              backgroundColor: "#f97316",
              borderRadius: 9999,
              color: "white",
              fontSize: 24,
              fontWeight: 600,
            }}
          >
            For Gettysburg College Students
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
