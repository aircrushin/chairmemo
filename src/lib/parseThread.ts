import type { ThreadMessage } from "../types";

const WHATSAPP_BRACKET =
  /^\[(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\]\s*([^:]+):\s*([\s\S]*)$/;

const WHATSAPP_DASH =
  /^(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}),?\s+(\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APMapm]{2})?)\s+-\s+([^:]+):\s*([\s\S]*)$/;

const WECHAT_STAMP = /^(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/;

const WECHAT_INLINE =
  /^([\p{L}\p{N} .'_-]{1,40})\s+(\d{1,2}月\d{1,2}日|\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[\/.]\d{1,2})\s+(\d{1,2}:\d{2}(?::\d{2})?)$/u;

const EMAIL_FROM = /^(From|发件人|寄件者)\s*:\s*(.+)$/i;
const EMAIL_DATE = /^(Date|Sent|发送时间|日期)\s*:\s*(.+)$/i;
const EMAIL_SUBJECT = /^(Subject|主题|主旨)\s*:\s*(.+)$/i;

function nextId(index: number): string {
  return `m${String(index).padStart(2, "0")}`;
}

function pushOrMerge(
  messages: ThreadMessage[],
  incoming: Omit<ThreadMessage, "id">,
): void {
  const last = messages[messages.length - 1];
  if (
    last &&
    last.sender === incoming.sender &&
    last.timestamp === incoming.timestamp
  ) {
    last.text = `${last.text}\n${incoming.text}`.trim();
    return;
  }
  messages.push({ id: nextId(messages.length + 1), ...incoming });
}

function isNameLine(s: string): boolean {
  return (
    /^[\p{L}\p{N} .'_-]{1,40}$/u.test(s) &&
    !/[:：]/.test(s) &&
    s.split(/\s+/).length <= 4
  );
}

function nextNonEmpty(lines: string[], from: number): string {
  for (let k = from; k < lines.length; k++) {
    if (lines[k].trim()) return lines[k].trim();
  }
  return "";
}

function parseEmailBlocks(text: string): ThreadMessage[] | null {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const fromIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (EMAIL_FROM.test(line.trim())) fromIndexes.push(i);
  });
  if (fromIndexes.length === 0) return null;

  const messages: ThreadMessage[] = [];
  for (let i = 0; i < fromIndexes.length; i++) {
    const start = fromIndexes[i];
    const end = i + 1 < fromIndexes.length ? fromIndexes[i + 1] : lines.length;
    const block = lines.slice(start, end);
    let sender = "Unknown";
    let timestamp = "";
    let subject = "";
    let bodyStart = 0;
    for (let j = 0; j < block.length; j++) {
      const trimmed = block[j].trim();
      const from = trimmed.match(EMAIL_FROM);
      const date = trimmed.match(EMAIL_DATE);
      const subj = trimmed.match(EMAIL_SUBJECT);
      if (from) sender = from[2].replace(/<[^>]+>/g, "").trim();
      else if (date) timestamp = date[2].trim();
      else if (subj) subject = subj[2].trim();
      else if (trimmed === "" && j > 0) {
        bodyStart = j + 1;
        break;
      }
    }
    const body = block.slice(bodyStart).join("\n").trim();
    const textBody = subject && !body.startsWith("Subject")
      ? (body ? `Subject: ${subject}\n\n${body}` : `Subject: ${subject}`)
      : body;
    if (!textBody) continue;
    pushOrMerge(messages, {
      sender,
      timestamp: timestamp || "—",
      text: textBody,
      channel: "email",
    });
  }
  return messages.length ? messages : null;
}

export function parseThread(raw: string): ThreadMessage[] {
  const trimmed = raw.replace(/\u200e/g, "").replace(/\r\n/g, "\n").trim();
  if (!trimmed) return [];

  const email = parseEmailBlocks(trimmed);
  if (email) return email;

  const lines = trimmed.split("\n");
  const messages: ThreadMessage[] = [];
  let pendingName: string | null = null;
  let pendingTime: string | null = null;
  const slot: { current: Omit<ThreadMessage, "id"> | null } = { current: null };

  const flush = () => {
    if (slot.current && slot.current.text.trim()) {
      pushOrMerge(messages, { ...slot.current, text: slot.current.text.trim() });
    }
    slot.current = null;
  };

  const start = (partial: Omit<ThreadMessage, "id" | "text">, text: string) => {
    flush();
    slot.current = { ...partial, text };
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trimEnd();
    const t = line.trim();
    if (!t) {
      if (slot.current) slot.current.text += "\n";
      continue;
    }

    const bracket = t.match(WHATSAPP_BRACKET);
    if (bracket) {
      start(
        {
          sender: bracket[3].trim(),
          timestamp: `${bracket[1]} ${bracket[2]}`,
          channel: "whatsapp",
        },
        bracket[4],
      );
      continue;
    }

    const dash = t.match(WHATSAPP_DASH);
    if (dash) {
      start(
        {
          sender: dash[3].trim(),
          timestamp: `${dash[1]} ${dash[2]}`,
          channel: "whatsapp",
        },
        dash[4],
      );
      continue;
    }

    const wechatStamp = t.match(WECHAT_STAMP);
    if (wechatStamp && pendingName) {
      pendingTime = `${wechatStamp[1]} ${wechatStamp[2]}`;
      continue;
    }

    const wechatInline = t.match(WECHAT_INLINE);
    if (wechatInline) {
      start(
        {
          sender: wechatInline[1].trim(),
          timestamp: `${wechatInline[2]} ${wechatInline[3]}`,
          channel: "wechat",
        },
        "",
      );
      pendingName = null;
      pendingTime = null;
      continue;
    }

    if (isNameLine(t) && WECHAT_STAMP.test(nextNonEmpty(lines, i + 1))) {
      pendingName = t;
      pendingTime = null;
      continue;
    }

    if (pendingName && pendingTime) {
      start(
        {
          sender: pendingName,
          timestamp: pendingTime,
          channel: "wechat",
        },
        t,
      );
      pendingName = null;
      pendingTime = null;
      continue;
    }

    if (slot.current) {
      slot.current.text += `\n${t}`;
      continue;
    }

    const loose = t.match(/^([^:]{1,40}):\s+([\s\S]+)$/);
    if (loose) {
      start(
        {
          sender: loose[1].trim(),
          timestamp: "—",
          channel: "unknown",
        },
        loose[2],
      );
      continue;
    }

    start(
      { sender: "Unknown", timestamp: "—", channel: "unknown" },
      t,
    );
  }

  flush();
  return messages;
}

export function toRawTranscript(messages: ThreadMessage[]): string {
  return messages
    .map((m) => `[${m.timestamp}] ${m.sender}: ${m.text}`)
    .join("\n\n");
}
