import { elevenFetch, sendUpstreamError } from "./_elevenlabs.js";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const response = await elevenFetch("/v1/single-use-token/realtime_scribe", { method: "POST" });
    if (!response.ok) return sendUpstreamError(res, response);
    const data = await response.json();
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json({ token: data.token });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not create Scribe token" });
  }
}
