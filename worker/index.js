/**
 * Chairmemo live-brief proxy.
 * The OpenRouter key is provided only as the LLM_API_KEY Worker secret.
 * Do not put secrets in this file.
 */

const ALLOWED_ORIGINS = new Set(["https://aircrushin.github.io"]);
const MAX_BODY_BYTES = 40 * 1024;
const MAX_MESSAGES = 80;
const MAX_MESSAGE_CHARS = 4000;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 8;
const MODEL = "openai/gpt-4o-mini";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

const SYSTEM = `You are Chairmemo, a bilingual chief of staff for founders working across Hong Kong and the Greater Bay Area.
Given a messy WhatsApp, WeChat or email thread (JSON messages with id, sender, timestamp, text), produce a decision brief as strict JSON with this shape:
{
  "headline": "string",
  "context": "string",
  "decisions": [{"text":"string","status":"agreed"|"tentative","evidence":["m01"],"owners":["name"]}],
  "openQuestions": [{"text":"string","blocker":true,"askedBy":"name","needs":["name"]}],
  "owners": [{"name":"string","action":"string","due":"optional"}],
  "risks": [{"text":"string","severity":"low"|"medium"|"high"}],
  "suggestedReplies": {"en":"string","zhHant":"string","zhHans":"string","yue":"string"}
}
Rules:
- Do not invent decisions the thread does not support. Quote evidence by message id only.
- Treat soft language (尽量/盡力, maybe, try, 先拖) as tentative or as an open question, never as a closed decision.
- Separate who spoke from who owns the next action.
- suggestedReplies must be sendable as-is, in English, Traditional Chinese, Simplified Chinese, and written Cantonese, and must not concede anything the thread rejected.
- Return JSON only.`;

/** @type {Map<string, { count: number, reset: number }>} */
const hits = new Map();

function allowedOrigin(origin) {
  return origin && ALLOWED_ORIGINS.has(origin) ? origin : null;
}

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const allow = allowedOrigin(origin);
  if (allow) headers["Access-Control-Allow-Origin"] = allow;
  return headers;
}

function json(status, body, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(origin),
    },
  });
}

function requestOrigin(request) {
  const origin = request.headers.get("Origin") || "";
  if (allowedOrigin(origin)) return origin;
  const referer = request.headers.get("Referer") || "";
  if (referer.startsWith("https://aircrushin.github.io/")) {
    return "https://aircrushin.github.io";
  }
  return origin;
}

function isAllowedBrowser(request) {
  const origin = request.headers.get("Origin") || "";
  const referer = request.headers.get("Referer") || "";
  return (
    allowedOrigin(origin) !== null ||
    referer.startsWith("https://aircrushin.github.io/")
  );
}

function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function rateLimit(ip) {
  const now = Date.now();
  const rec = hits.get(ip);
  if (!rec || now >= rec.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return { ok: true, remaining: RATE_MAX - 1 };
  }
  if (rec.count >= RATE_MAX) {
    return { ok: false, retryAfter: Math.ceil((rec.reset - now) / 1000) };
  }
  rec.count += 1;
  return { ok: true, remaining: RATE_MAX - rec.count };
}

function isBrief(value) {
  return (
    value &&
    typeof value === "object" &&
    typeof value.headline === "string" &&
    value.headline.trim().length > 0 &&
    Array.isArray(value.decisions) &&
    Array.isArray(value.openQuestions) &&
    Array.isArray(value.owners) &&
    value.suggestedReplies &&
    typeof value.suggestedReplies.en === "string"
  );
}

function sanitizeMessages(raw) {
  if (!Array.isArray(raw)) return null;
  if (raw.length === 0 || raw.length > MAX_MESSAGES) return null;
  const messages = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const id = String(item.id || "").slice(0, 32);
    const sender = String(item.sender || "Unknown").slice(0, 80);
    const timestamp = String(item.timestamp || "—").slice(0, 80);
    const text = String(item.text || "").slice(0, MAX_MESSAGE_CHARS);
    if (!text.trim()) continue;
    messages.push({
      id: id || `m${String(messages.length + 1).padStart(2, "0")}`,
      sender,
      timestamp,
      text,
    });
  }
  return messages.length ? messages : null;
}

async function generateBrief(messages, apiKey) {
  const res = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://aircrushin.github.io/chairmemo/",
      "X-Title": "Chairmemo",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: JSON.stringify(messages) },
      ],
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    const err = new Error(`Upstream ${res.status}`);
    err.detail = text.slice(0, 200);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    const err = new Error("Empty model response");
    err.status = 502;
    throw err;
  }
  const parsed = JSON.parse(content);
  if (!isBrief(parsed)) {
    const err = new Error("Model returned an unusable brief");
    err.status = 502;
    throw err;
  }
  return parsed;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = requestOrigin(request);

    if (request.method === "OPTIONS") {
      if (!allowedOrigin(request.headers.get("Origin") || "")) {
        return new Response(null, { status: 403 });
      }
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return json(
        200,
        { ok: true, service: "chairmemo-brief", hasKey: Boolean(env.LLM_API_KEY) },
        origin,
      );
    }

    if (request.method === "POST" && url.pathname === "/api/brief") {
      if (!isAllowedBrowser(request)) {
        return json(403, { error: "Origin not allowed." }, origin);
      }
      const limited = rateLimit(clientIp(request));
      if (!limited.ok) {
        return json(
          429,
          { error: "Too many live briefs from this network. Please wait and try again." },
          origin,
        );
      }
      const length = Number(request.headers.get("Content-Length") || "0");
      if (length > MAX_BODY_BYTES) {
        return json(413, { error: "Thread is too large to chair in one request." }, origin);
      }
      if (!env.LLM_API_KEY) {
        return json(503, { error: "Live briefing is not configured." }, origin);
      }
      let payload;
      try {
        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return json(413, { error: "Thread is too large to chair in one request." }, origin);
        }
        payload = JSON.parse(raw || "{}");
      } catch {
        return json(400, { error: "Request was not valid JSON." }, origin);
      }
      const messages = sanitizeMessages(payload.messages);
      if (!messages) {
        return json(400, { error: "Paste a thread with at least one message (up to 80)." }, origin);
      }
      try {
        const brief = await generateBrief(messages, env.LLM_API_KEY);
        return json(200, { brief, source: "live" }, origin);
      } catch (err) {
        const status = err.status || 502;
        return json(
          status,
          { error: "The live model could not chair this thread. Please try again in a moment." },
          origin,
        );
      }
    }

    return json(404, { error: "Not found" }, origin);
  },
};
