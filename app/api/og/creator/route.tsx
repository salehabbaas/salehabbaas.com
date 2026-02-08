import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Saleh Abbaas";
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
          background: "linear-gradient(135deg, #061629 0%, #0f4a7a 45%, #2bb7a6 100%)",
          color: "#ffffff",
          padding: "64px"
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            border: "1px solid rgba(255,255,255,0.45)",
            borderRadius: "999px",
            padding: "10px 18px",
            fontSize: 28,
            letterSpacing: 2
          }}
        >
          {platform.toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: "86%" }}>
          <div style={{ fontSize: 58, lineHeight: 1.1, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 32, opacity: 0.88 }}>Saleh Abbaas · Content Creator</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630
    }
  );
}
