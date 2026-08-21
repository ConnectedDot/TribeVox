import { elevenFetch, sendUpstreamError } from "./_elevenlabs.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const text = String(req.body?.text || "").trim();
  const voiceId = String(req.body?.voiceId || process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb");
  const speed = Math.min(1.2, Math.max(0.7, Number(req.body?.speed || 1)));
  if (!text || text.length > 220) return res.status(400).json({ error: "Text is required and must be 220 characters or fewer." });
  try {
    const response = await elevenFetch(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: "eleven_flash_v2_5",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed },
      }),
    });
    if (!response.ok) return sendUpstreamError(res, response);
    const arrayBuffer = await response.arrayBuffer();
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "private, max-age=300");
    return res.status(200).send(Buffer.from(arrayBuffer));
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not generate pronunciation" });
  }
}
