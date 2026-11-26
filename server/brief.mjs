/**
 * Optional local/live brief server. Uses LLM_API_KEY (OpenRouter-compatible).
 * Never expose this key in the static Pages build.
 */
import http from "node:http";

const PORT = Number(process.env.BRIEF_PORT || 8787);
const KEY = process.env.LLM_API_KEY || process.env.OPENROUTER_API_KEY;
const MODEL = process.env.LLM_MODEL || "openai/gpt-4o-mini";
const BASE = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");

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

export async function generateBrief(messages) {
  if (!KEY) {
    const err = new Error("LLM_API_KEY is not set");
    err.status = 501;
    throw err;
  }
  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${KEY}`,
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
    const err = new Error(`Upstream ${res.status}: ${text.slice(0, 400)}`);
    err.status = 502;
    throw err;
  }
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty model response");
  return JSON.parse(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

export function startServer() {
  const server = http.createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, model: KEY ? MODEL : null }));
      return;
    }
    if (req.method === "POST" && req.url === "/api/brief") {
      try {
        const payload = JSON.parse((await readBody(req)) || "{}");
        const brief = await generateBrief(payload.messages || []);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ brief, source: "live" }));
      } catch (err) {
        res.writeHead(err.status || 500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(err.message || err) }));
      }
      return;
    }
    res.writeHead(404);
    res.end("Not found");
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Chairmemo brief server on http://127.0.0.1:${PORT}`);
  });
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) startServer();
