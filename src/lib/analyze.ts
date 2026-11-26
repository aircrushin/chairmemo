import { DEMOS } from "../data/demos";
import type { Brief, ThreadMessage } from "../types";
import { BRIEF_API_URL } from "./config";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

/** Match a pasted thread to a canned demo when the user pastes the sample. */
export function matchDemoId(messages: ThreadMessage[]): string | null {
  if (messages.length === 0) return null;
  const joined = normalize(messages.map((m) => m.text).join("\n"));
  for (const demo of DEMOS) {
    const demoJoined = normalize(demo.messages.map((m) => m.text).join("\n"));
    if (joined === demoJoined) return demo.id;
    const overlap = demo.messages.filter((m) =>
      joined.includes(normalize(m.text).slice(0, 80)),
    ).length;
    if (overlap >= Math.min(6, demo.messages.length) && messages.length >= 4) {
      return demo.id;
    }
  }
  return null;
}

export interface AnalyzeResult {
  brief: Brief | null;
  source: "demo" | "live" | "error";
  evidenceIds: string[];
  error?: string;
}

function evidenceFrom(brief: Brief | null): string[] {
  if (!brief) return [];
  return [...new Set(brief.decisions?.flatMap((d) => d.evidence) ?? [])];
}

async function requestLiveBrief(messages: ThreadMessage[]): Promise<AnalyzeResult> {
  let res: Response;
  try {
    res = await fetch(BRIEF_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
  } catch {
    return {
      brief: null,
      source: "error",
      evidenceIds: [],
      error:
        "The live briefing service could not be reached. Official samples still work; pasted threads need the live model.",
    };
  }

  let data: { brief?: Brief; error?: string } = {};
  try {
    data = (await res.json()) as { brief?: Brief; error?: string };
  } catch {
    data = {};
  }

  if (res.ok && data.brief?.headline) {
    return {
      brief: data.brief,
      source: "live",
      evidenceIds: evidenceFrom(data.brief),
    };
  }

  const fallback =
    res.status === 429
      ? "Too many live briefs just now. Please wait a minute and try again."
      : res.status === 403
        ? "This page is not allowed to call the live briefing service."
        : "The live model could not chair this thread. Please try again in a moment.";

  return {
    brief: null,
    source: "error",
    evidenceIds: [],
    error: data.error || fallback,
  };
}

export async function analyzeThread(
  messages: ThreadMessage[],
  preferredDemoId?: string | null,
  options?: { forceLive?: boolean },
): Promise<AnalyzeResult> {
  const demoId = preferredDemoId || matchDemoId(messages);
  const demo = DEMOS.find((d) => d.id === demoId);
  const scanMs = Math.min(1600, 420 + messages.length * 45);

  if (demo && !options?.forceLive) {
    await sleep(scanMs);
    return {
      brief: demo.brief,
      source: "demo",
      evidenceIds: evidenceFrom(demo.brief),
    };
  }

  await sleep(Math.min(scanMs, 500));
  return requestLiveBrief(messages);
}
