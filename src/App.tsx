import { useEffect, useMemo, useRef, useState } from "react";
import { DEMOS } from "./data/demos";
import { t } from "./i18n";
import { analyzeThread } from "./lib/analyze";
import { briefToMarkdown } from "./lib/briefText";
import { parseThread } from "./lib/parseThread";
import type { Brief, Locale, ReplyLang, ThreadMessage } from "./types";

function useQueryDemo(): string {
  if (typeof window === "undefined") return "lease";
  const id = new URLSearchParams(window.location.search).get("demo");
  return DEMOS.some((d) => d.id === id) ? id! : "lease";
}

function shouldAutoRun(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search);
  return q.get("run") === "1";
}

export default function App() {
  const [locale, setLocale] = useState<Locale>("en");
  const [demoId, setDemoId] = useState<string>(useQueryDemo);
  const [messages, setMessages] = useState<ThreadMessage[]>(
    () => DEMOS.find((d) => d.id === demoId)?.messages ?? DEMOS[0].messages,
  );
  const [activeDemo, setActiveDemo] = useState<string | null>(demoId);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [source, setSource] = useState<"demo" | "outline" | "live" | null>(null);
  const [evidence, setEvidence] = useState<string[]>([]);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [copied, setCopied] = useState<"reply" | "brief" | null>(null);
  const [replyLang, setReplyLang] = useState<ReplyLang>("en");
  const threadRef = useRef<HTMLDivElement>(null);
  const autoOnce = useRef(false);
  const c = t(locale);

  const scenario = useMemo(
    () => DEMOS.find((d) => d.id === activeDemo) ?? null,
    [activeDemo],
  );

  function loadDemo(id: string, run = false) {
    const demo = DEMOS.find((d) => d.id === id);
    if (!demo) return;
    setDemoId(id);
    setActiveDemo(id);
    setMessages(demo.messages);
    setBrief(null);
    setSource(null);
    setEvidence([]);
    setFocusId(null);
    const url = new URL(window.location.href);
    url.searchParams.set("demo", id);
    if (!run) url.searchParams.delete("run");
    window.history.replaceState({}, "", url);
    if (run) void chair(demo.messages, id);
  }

  async function chair(msgs = messages, preferred = activeDemo) {
    if (busy || msgs.length === 0) return;
    setBusy(true);
    setScanning(true);
    setBrief(null);
    setFocusId(null);
    try {
      const result = await analyzeThread(msgs, preferred);
      setEvidence(result.evidenceIds);
      setScanning(false);
      setBrief(result.brief);
      setSource(result.source);
    } finally {
      setBusy(false);
      setScanning(false);
    }
  }

  useEffect(() => {
    if (autoOnce.current) return;
    autoOnce.current = true;
    if (shouldAutoRun()) void chair();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!focusId || !threadRef.current) return;
    const node = threadRef.current.querySelector(`[data-mid="${focusId}"]`);
    node?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  async function copy(text: string, which: "reply" | "brief") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  function applyPaste() {
    const parsed = parseThread(pasteText);
    if (parsed.length === 0) return;
    setMessages(parsed);
    const known = DEMOS.find((d) => d.raw.trim() === pasteText.trim());
    setActiveDemo(known?.id ?? null);
    setBrief(null);
    setSource(null);
    setEvidence([]);
    setPasteOpen(false);
    void chair(parsed, known?.id ?? null);
  }

  const title = scenario
    ? locale === "zh"
      ? scenario.titleZh
      : scenario.titleEn
    : locale === "zh"
      ? "已貼上的對話"
      : "Pasted thread";

  return (
    <div className="app">
      <header className="mast">
        <a className="brand" href="./">
          <span className="wordmark">{c.product}</span>
          <span className="wordmark-zh">{c.productZh}</span>
          <span className="guest">{c.demoReady}</span>
        </a>
        <div className="mast-actions">
          <div className="seg" role="group" aria-label="Language">
            <button type="button" className={locale === "en" ? "on" : ""} onClick={() => setLocale("en")}>
              {c.langEn}
            </button>
            <button type="button" className={locale === "zh" ? "on" : ""} onClick={() => setLocale("zh")}>
              {c.langZh}
            </button>
          </div>
          <button type="button" className="btn" onClick={() => setPasteOpen(true)}>
            {c.paste}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => void chair()}
            disabled={busy}
            data-testid="chair-btn"
          >
            {busy ? c.chairing : c.chairThis}
          </button>
        </div>
      </header>

      <section className="hero">
        <div>
          <h1>{c.tagline}</h1>
          <p>{c.subhead}</p>
        </div>
        <div>
          <div className="sample kicker" style={{ border: 0, padding: "0 0 8px", pointerEvents: "none" }}>
            <span className="kicker">{c.samples}</span>
          </div>
          <div className="samples">
            {DEMOS.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`sample ${activeDemo === d.id ? "on" : ""}`}
                onClick={() => loadDemo(d.id)}
                data-testid={`demo-${d.id}`}
              >
                <span className="kicker">
                  {d.channel === "whatsapp"
                    ? c.channelWhatsapp
                    : d.channel === "wechat"
                      ? c.channelWechat
                      : c.channelEmail}
                </span>
                <b>{locale === "zh" ? d.titleZh : d.titleEn}</b>
                <span>{locale === "zh" ? d.blurbZh : d.blurbEn}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <main className="workspace">
        <section className="panel thread-panel">
          <div className="panel-head">
            <h2>{title}</h2>
            <div className="meta">
              {messages.length} {c.messages}
            </div>
          </div>
          <div className="thread-scroll" ref={threadRef} data-testid="thread">
            {messages.map((m, i) => {
              const ev = evidence.includes(m.id) || focusId === m.id;
              return (
                <article
                  key={m.id}
                  data-mid={m.id}
                  className={`msg ${i % 3 === 2 ? "alt" : ""} ${scanning ? "scan" : ""} ${ev ? "evidence" : ""}`}
                >
                  <header>
                    <span className="who">{m.sender}</span>
                    {m.role ? <span className="role">{m.role}</span> : null}
                    <span className="when">{m.timestamp}</span>
                  </header>
                  <p>{m.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="panel brief-panel">
          <div className="paper-rule" />
          <div className="brief-scroll">
            {!brief ? (
              <div className="empty">
                <div className="chop-ghost">決</div>
                <h3>{c.briefEmpty}</h3>
                <p>{c.briefEmptyHint}</p>
              </div>
            ) : (
              <BriefView
                brief={brief}
                messages={messages}
                locale={locale}
                source={source}
                replyLang={replyLang}
                setReplyLang={setReplyLang}
                copied={copied}
                onCopyReply={() => copy(brief.suggestedReplies[replyLang], "reply")}
                onCopyBrief={() => copy(briefToMarkdown(brief, messages, locale), "brief")}
                onReset={() => {
                  setBrief(null);
                  setSource(null);
                  setEvidence([]);
                  setFocusId(null);
                }}
                onEvidence={(id) => setFocusId(id)}
              />
            )}
          </div>
        </section>
      </main>

      <footer className="foot">{c.footer}</footer>

      {pasteOpen ? (
        <div className="modal-back" role="dialog" aria-modal="true">
          <div className="modal">
            <h2>{c.pasteTitle}</h2>
            <p>{c.pasteHint}</p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder={c.pastePlaceholder}
            />
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setPasteOpen(false)}>
                {c.cancel}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={applyPaste}
                disabled={!parseThread(pasteText).length}
              >
                {c.usePaste}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BriefView({
  brief,
  messages,
  locale,
  source,
  replyLang,
  setReplyLang,
  copied,
  onCopyReply,
  onCopyBrief,
  onReset,
  onEvidence,
}: {
  brief: Brief;
  messages: ThreadMessage[];
  locale: Locale;
  source: "demo" | "outline" | "live" | null;
  replyLang: ReplyLang;
  setReplyLang: (l: ReplyLang) => void;
  copied: "reply" | "brief" | null;
  onCopyReply: () => void;
  onCopyBrief: () => void;
  onReset: () => void;
  onEvidence: (id: string) => void;
}) {
  const c = t(locale);
  const byId = new Map(messages.map((m) => [m.id, m]));
  return (
    <div data-testid="brief">
      <div className="brief-top">
        <div>
          <h2>{brief.headline}</h2>
          <p className="context">{brief.context}</p>
        </div>
        <div className="chop stamp">決</div>
      </div>
      <div className="brief-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn" onClick={onCopyBrief}>
          {copied === "brief" ? c.copied : c.copyBrief}
        </button>
        <button type="button" className="btn" onClick={onReset}>
          {c.reset}
        </button>
      </div>

      <section className="section">
        <h3>{c.decisions}</h3>
        {brief.decisions.length === 0 ? <p className="context">—</p> : null}
        {brief.decisions.map((d, i) => (
          <div className="item" key={i}>
            <div className="flags">
              <span className={`pill ${d.status === "agreed" ? "ok" : "tent"}`}>
                {d.status === "agreed" ? c.agreed : c.tentative}
              </span>
            </div>
            <p>{d.text}</p>
            {d.evidence.length ? (
              <ul className="ev">
                {d.evidence.map((id) => {
                  const m = byId.get(id);
                  return (
                    <li key={id}>
                      <button type="button" onClick={() => onEvidence(id)}>
                        {c.evidence} · {m ? `${m.sender}: ${m.text.slice(0, 90)}${m.text.length > 90 ? "…" : ""}` : id}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        ))}
      </section>

      <section className="section">
        <h3>{c.openQuestions}</h3>
        {brief.openQuestions.length === 0 ? <p className="context">—</p> : null}
        {brief.openQuestions.map((q, i) => (
          <div className="item" key={i}>
            <div className="flags">
              {q.blocker ? <span className="pill block">{c.blocker}</span> : null}
              {q.askedBy ? <span className="pill">{q.askedBy}</span> : null}
            </div>
            <p>{q.text}</p>
            {q.needs?.length ? (
              <div className="due">
                {c.needs}: {q.needs.join(", ")}
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="section">
        <h3>{c.owners}</h3>
        {brief.owners.map((o, i) => (
          <div className="item owner" key={i}>
            <div>
              <strong>{o.name}</strong>
              {o.due ? <span className="due">{c.due} {o.due}</span> : null}
            </div>
            <p>{o.action}</p>
          </div>
        ))}
      </section>

      {brief.risks.length ? (
        <section className="section">
          <h3>{c.risks}</h3>
          {brief.risks.map((r, i) => (
            <div className="item" key={i}>
              <div className="flags">
                <span className={`pill ${r.severity === "high" ? "high" : r.severity === "medium" ? "med" : ""}`}>
                  {c.severity[r.severity]}
                </span>
              </div>
              <p>{r.text}</p>
            </div>
          ))}
        </section>
      ) : null}

      <section className="section">
        <h3>{c.suggestedReply}</h3>
        <div className="seg" role="tablist">
          {([
            ["en", c.replyEn],
            ["zhHant", c.replyHant],
            ["zhHans", c.replyHans],
            ["yue", c.replyYue],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={replyLang === key ? "on" : ""}
              onClick={() => setReplyLang(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="reply">{brief.suggestedReplies[replyLang]}</div>
        <div className="brief-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn btn-primary" onClick={onCopyReply}>
            {copied === "reply" ? c.copied : c.copyReply}
          </button>
        </div>
      </section>

      {source === "outline" ? <p className="note">{c.offlineNote}</p> : null}
    </div>
  );
}
