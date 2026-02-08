import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "Saleh Abbaas";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(140deg, #052038 0%, #0c4f82 50%, #29bea7 100%)",
          color: "#f7fbff",
          padding: "60px"
        }}
      >
        <div style={{ fontSize: 30, letterSpacing: 2, opacity: 0.95 }}>SALEH ABBAAS</div>
        <div style={{ maxWidth: "85%", fontSize: 64, lineHeight: 1.12, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 30, opacity: 0.88 }}>Software Engineer • Firebase Architect</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
