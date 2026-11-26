import type { Brief, Locale, ThreadMessage } from "../types";

export function briefToMarkdown(brief: Brief, messages: ThreadMessage[], locale: Locale): string {
  const label = (en: string, zh: string) => (locale === "zh" ? zh : en);
  const byId = new Map(messages.map((m) => [m.id, m]));
  const ev = (ids: string[]) =>
    ids
      .map((id) => {
        const m = byId.get(id);
        return m ? `- ${m.sender} (${m.timestamp}): ${m.text.replace(/\n/g, " ")}` : `- ${id}`;
      })
      .join("\n");

  const lines = [
    `# ${brief.headline}`,
    "",
    brief.context,
    "",
    `## ${label("Decisions", "已決議")}`,
    ...brief.decisions.flatMap((d, i) => [
      `${i + 1}. (${d.status}) ${d.text}`,
      ev(d.evidence),
      "",
    ]),
    `## ${label("Open questions", "未決問題")}`,
    ...brief.openQuestions.map(
      (q) =>
        `- ${q.blocker ? label("[Blocker] ", "【卡點】") : ""}${q.text}`,
    ),
    "",
    `## ${label("Owners", "負責人")}`,
    ...brief.owners.map(
      (o) => `- ${o.name}: ${o.action}${o.due ? ` (${o.due})` : ""}`,
    ),
    "",
    `## ${label("Risks", "風險")}`,
    ...brief.risks.map((r) => `- (${r.severity}) ${r.text}`),
    "",
    `## ${label("Suggested reply (EN)", "建議回覆（英文）")}`,
    brief.suggestedReplies.en,
    "",
    `## ${label("Suggested reply (Traditional Chinese)", "建議回覆（繁體）")}`,
    brief.suggestedReplies.zhHant,
    "",
    `## ${label("Suggested reply (Cantonese)", "建議回覆（粵語）")}`,
    brief.suggestedReplies.yue,
    "",
  ];
  return lines.join("\n");
}
