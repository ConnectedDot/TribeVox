export function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not configured on the server.");
  return key;
}

export async function elevenFetch(path, init = {}) {
  const key = getApiKey();
  const headers = new Headers(init.headers || {});
  headers.set("xi-api-key", key);
  return fetch(`https://api.elevenlabs.io${path}`, { ...init, headers });
}

export async function sendUpstreamError(res, response) {
  let detail = "ElevenLabs request failed";
  try {
    const body = await response.json();
    detail = body?.detail?.message || body?.detail || body?.message || detail;
  } catch {}
  return res.status(response.status || 500).json({ error: detail });
}
