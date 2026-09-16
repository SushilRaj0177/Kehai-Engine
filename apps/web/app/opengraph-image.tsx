import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Kehai Engine — QR + geofence verified attendance";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070a",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -60,
            fontSize: 480,
            fontWeight: 900,
            color: "#ff2d55",
            opacity: 0.14,
            display: "flex",
          }}
        >
          気配
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 76,
              height: 76,
              borderRadius: 16,
              background: "#0a0e14",
              border: "2px solid rgba(255,45,85,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 900,
              color: "#ff5c73",
            }}
          >
            気
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 52, fontWeight: 800, color: "#ffffff", letterSpacing: -1, display: "flex" }}>
              KEHAI ENGINE
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: "#5ff4ff", letterSpacing: 4, display: "flex" }}>
              ENGINE
            </div>
          </div>
        </div>
        <div
          style={{
            marginTop: 40,
            fontSize: 34,
            fontWeight: 500,
            color: "rgba(255,255,255,0.85)",
            display: "flex",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          Presence you can verify. Insight you can trust.
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 20,
            color: "rgba(255,255,255,0.45)",
            display: "flex",
            textAlign: "center",
          }}
        >
          QR + geofence verified attendance for clubs and events
        </div>
      </div>
    ),
    { ...size }
  );
}
