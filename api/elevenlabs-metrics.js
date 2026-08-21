import { elevenFetch, sendUpstreamError } from "./_elevenlabs.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  try {
    const response = await elevenFetch("/v1/user/subscription");
    if (!response.ok) return sendUpstreamError(res, response);
    const data = await response.json();
    const used = Number(data.character_count || 0);
    const limit = Number(data.character_limit || 0);
    return res.status(200).json({
      tier: data.tier || "unknown",
      status: data.status || "unknown",
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentUsed: limit ? Math.min(100, Math.round((used / limit) * 100)) : 0,
      resetAt: data.next_character_count_reset_unix ? data.next_character_count_reset_unix * 1000 : null,
      overage: data.current_overage || null,
      billingPeriod: data.billing_period || data.character_refresh_period || null,
    });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Could not read ElevenLabs usage" });
  }
}
