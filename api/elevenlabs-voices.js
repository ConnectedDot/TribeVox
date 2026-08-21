import { elevenFetch, sendUpstreamError } from "./_elevenlabs.js";

const fallbacks = [
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", category: "default", labels: { accent: "British" } },
  { voice_id: "pNInz6obpgDQGcFmaJgB", name: "Adam", category: "default", labels: { accent: "American" } },
];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const response = await elevenFetch("/v2/voices?page_size=30");
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) return res.status(200).json({ voices: fallbacks, limited: true });
      return sendUpstreamError(res, response);
    }
    const data = await response.json();
    const voices = (data.voices || []).map((v) => ({ voice_id: v.voice_id, name: v.name, category: v.category, labels: v.labels || {} }));
    return res.status(200).json({ voices: voices.length ? voices : fallbacks, limited: !voices.length });
  } catch {
    return res.status(200).json({ voices: fallbacks, limited: true });
  }
}
