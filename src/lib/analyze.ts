import { DEMOS } from "../data/demos";
import type { Brief, Decision, OpenQuestion, OwnerAction, ThreadMessage } from "../types";

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

const QUESTION_RE =
  /(\?|？|吗[？?]?$|嗎[？?]?$|能否|能不能|要不要|谁来|誰來|who (owns|will)|can we|can someone|do we)/i;

function outlineBrief(messages: ThreadMessage[]): Brief {
  const questions: OpenQuestion[] = [];
  const owners: OwnerAction[] = [];
  const decisions: Decision[] = [];
  const seenOwners = new Set<string>();

  for (const m of messages) {
    const text = m.text.replace(/\s+/g, " ").trim();
    if (QUESTION_RE.test(text)) {
      questions.push({
        text: `${m.sender}: ${text}`,
        blocker: /must|不能|不行|block|visa|签证|簽證|enforce|先决|先決/i.test(text),
        askedBy: m.sender,
      });
    }
    if (
      /^(agreed|yes —|yes -|do it|on it|我同意|同意|收到|就这样|就這樣|我去|i will|i'll|let's|lets )\b/i.test(
        text,
      ) ||
      /\b(agreed with|pls send|please hold|please send|owns the|我来|我來)\b/i.test(text)
    ) {
      decisions.push({
        text: `${m.sender}: ${text}`,
        status: /try|maybe|可能|先拖|tentative/i.test(text) ? "tentative" : "agreed",
        evidence: [m.id],
        owners: [m.sender],
      });
    }
    const assign = text.match(
      /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)[,:]?\s+(please|pls|owns|should|can you)\b/i,
    );
    if (assign && !seenOwners.has(assign[1])) {
      seenOwners.add(assign[1]);
      owners.push({ name: assign[1], action: text });
    }
  }

  const speakers = [...new Set(messages.map((m) => m.sender))];
  return {
    headline: `Outline of a ${messages.length}-message thread among ${speakers.slice(0, 4).join(", ")}${speakers.length > 4 ? "…" : ""}.`,
    context:
      "This is an offline outline extracted from the pasted thread (questions, agreement-like lines, and possible owners). Use one of the official samples to see a full bilingual Chairmemo brief, including a suggested reply.",
    decisions: decisions.slice(0, 6),
    openQuestions: questions.slice(0, 6),
    owners: owners.slice(0, 6),
    risks: [],
    suggestedReplies: {
      en: "Offline mode cannot draft a grounded reply for an unseen thread. Load one of the official samples, or run Chairmemo locally with an LLM_API_KEY to generate a live brief.",
      zhHant:
        "離線模式無法為未見過的對話起草有依據的回覆。請載入官方示例，或在本地以 LLM_API_KEY 執行 Chairmemo 以生成即時紀要。",
      zhHans:
        "离线模式无法为未见过的对话起草有依据的回复。请载入官方示例，或在本地以 LLM_API_KEY 运行 Chairmemo 以生成即时纪要。",
      yue: "离线模式唔可以为未见过嘅对话起草有依据嘅回覆。请载入官方示例，或者喺本地用 LLM_API_KEY 行 Chairmemo 嚟生成即时纪要。",
    },
  };
}

export interface AnalyzeResult {
  brief: Brief;
  source: "demo" | "outline" | "live";
  evidenceIds: string[];
}

export async function analyzeThread(
  messages: ThreadMessage[],
  preferredDemoId?: string | null,
): Promise<AnalyzeResult> {
  const demoId = preferredDemoId || matchDemoId(messages);
  const demo = DEMOS.find((d) => d.id === demoId);
  // Animation budget so the first run feels like a reading pass, still under a minute.
  const scanMs = Math.min(1600, 420 + messages.length * 45);
  await sleep(scanMs);

  if (demo) {
    const evidenceIds = [
      ...new Set(demo.brief.decisions.flatMap((d) => d.evidence)),
    ];
    return { brief: demo.brief, source: "demo", evidenceIds };
  }

  try {
    const res = await fetch("/api/brief", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });
    if (res.ok) {
      const data = (await res.json()) as { brief: Brief };
      if (data.brief?.headline) {
        const evidenceIds = [
          ...new Set(data.brief.decisions?.flatMap((d) => d.evidence) ?? []),
        ];
        return { brief: data.brief, source: "live", evidenceIds };
      }
    }
  } catch {
    // Fall through to the offline outline when no brief server is running.
  }

  const brief = outlineBrief(messages);
  const evidenceIds = [
    ...new Set([
      ...brief.decisions.flatMap((d) => d.evidence),
      ...messages.filter((m) => QUESTION_RE.test(m.text)).map((m) => m.id),
    ]),
  ];
  return { brief, source: "outline", evidenceIds };
}
