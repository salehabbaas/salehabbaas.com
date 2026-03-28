import { Server } from "@hocuspocus/server";

const port = Number(process.env.PORT || 8080);
const verifyEndpoint = process.env.RESUME_COLLAB_VERIFY_URL;

if (!verifyEndpoint) {
  throw new Error("Missing RESUME_COLLAB_VERIFY_URL");
}

const server = new Server({
  port,
  async onAuthenticate(data) {
    const token = typeof data.token === "string" ? data.token : "";
    if (!token) {
      throw new Error("Missing token");
    }

    const response = await fetch(verifyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ token })
    });

    if (!response.ok) {
      throw new Error("Invalid token");
    }

    const payload = await response.json();
    return payload.payload;
  }
});

server.listen();
