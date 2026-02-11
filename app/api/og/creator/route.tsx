import { ImageResponse } from "next/og";

import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || BRAND_NAME;
  const platform = searchParams.get("platform") || "Creator";

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
            "radial-gradient(circle at 10% 15%, rgba(32, 199, 181, 0.26), transparent 46%), radial-gradient(circle at 90% 0%, rgba(11, 34, 57, 0.55), transparent 55%), linear-gradient(135deg, #061629 0%, #0b2239 55%, #0a3c5a 100%)",
          color: "#eef6ff",
          padding: "64px"
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.30)",
            borderRadius: "999px",
            padding: "10px 18px",
            fontSize: 28,
            letterSpacing: 2
          }}
        >
          {platform.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: "86%" }}>
          <div style={{ fontSize: 58, lineHeight: 1.1, fontWeight: 750 }}>{title}</div>
          <div style={{ fontSize: 30, opacity: 0.9 }}>{`${BRAND_NAME} · ${BRAND_TAGLINE}`}</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
