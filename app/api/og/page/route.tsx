import { ImageResponse } from "next/og";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || BRAND_NAME;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "radial-gradient(circle at 15% 20%, rgba(32, 199, 181, 0.28), transparent 45%), radial-gradient(circle at 85% 10%, rgba(11, 34, 57, 0.45), transparent 50%), linear-gradient(135deg, #07101b 0%, #0b2239 52%, #09314f 100%)",
          color: "#eef6ff",
          padding: "60px"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24 }}>
          <div style={{ fontSize: 30, letterSpacing: 2, opacity: 0.95 }}>{BRAND_NAME.toUpperCase()}</div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              border: "1px solid rgba(255,255,255,0.22)",
              borderRadius: "999px",
              padding: "10px 16px",
              fontSize: 22,
              letterSpacing: 2,
              opacity: 0.92
            }}
          >
            PORTFOLIO
          </div>
        </div>
        <div style={{ maxWidth: "90%", fontSize: 66, lineHeight: 1.08, fontWeight: 750 }}>{title}</div>
        <div style={{ fontSize: 30, opacity: 0.9 }}>{BRAND_TAGLINE}</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
