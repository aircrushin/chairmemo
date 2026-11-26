# Chairmemo · 議決紀要

**From messy threads to a decision brief.**

Chairmemo is a bilingual chief of staff for the chats that actually run a company in Hong Kong and the Greater Bay Area. Paste a WhatsApp, WeChat or email thread. In one pass it chairs the conversation: what was decided, what is still open, who owns the next move, and a suggested reply in English, 中文 and 粵語.

Live demo (no sign-in): **https://aircrushin.github.io/chairmemo/**

Built as a solo submission for [HK AI Hackathon](https://luma.com/mf11yxkq) / HK AI Week 2026.

## Why this

Founders, counsel and ops in this region do not live in neat meeting notes. They live in mixed-language WhatsApp groups, WeChat threads and long cc-chains — then someone is asked to “just reply.” The decisions are in the thread, but they are easy to miss: a rent figure that changed overnight, a landlord who wants the Hong Kong company to sign a Shenzhen lease, a candidate who wants a HK employment contract while working in Guangzhou, an investor who calls a 15% option pool “standard.”

Chairmemo is built for that last mile. It does not summarise for the sake of a summary. It produces a chair’s brief you can act on, and a reply you can send.

## The one-minute demo

The hosted demo ships with three official samples. No account, no API key.

1. **Shenzhen office lease** — a WhatsApp group racing an 8pm deadline: rent, which entity signs, and a fuzzy handover.
2. **Guangzhou engineer offer** — a WeChat thread that almost issues the wrong kind of contract.
3. **Seed term-sheet reply** — an email chain on option pool, exclusivity and who should write back.

Open the demo, pick a sample, press **Chair this thread**. Evidence in the brief is clickable and lights up the source messages.

## What it does

- Parses WhatsApp exports, WeChat name/timestamp blocks, and email `From` / `Date` / `Subject` threads.
- Separates **agreed** decisions from **tentative** ones, and will not treat a soft “尽量 / 盡力” as a closed point.
- Lists open questions and blockers, with who needs to answer.
- Assigns owners and due times when the thread named them.
- Flags legal and operational risks (entity, immigration, cap table, timing).
- Drafts a suggested reply in English, Traditional Chinese, Simplified Chinese and written Cantonese.
- Copies the brief as Markdown.

The official samples use curated, evidence-linked briefs so a judge’s first run is reliable in under a minute. Paste a thread of your own on the hosted demo and Chairmemo still extracts an outline (speakers, questions, agreement-like lines). For a full live brief on unseen threads, run it locally with an LLM key (OpenRouter-compatible).

## How it uses AI

Chairmemo is not a generic chat wrapper. The model is instructed to act as a bilingual chief of staff:

- Only record a decision if the thread supports it; quote evidence by message.
- Mark tentative language as tentative.
- Distinguish “who spoke” from “who owns the next action.”
- Draft a reply in four registers, including written Cantonese, without inventing concessions the thread did not authorise.

The same schema powers the official samples and the optional live path (`LLM_API_KEY` + `npm run dev:ai`).

## Tech stack

- React 19, TypeScript, Vite
- CSS (no component library) — typographic “chair’s paper” beside the noisy thread
- Client-side thread parser, fixture tests (Vitest) and a production build smoke check
- Optional OpenRouter-compatible API for live briefs
- Hosted on GitHub Pages

## Run locally

```bash
npm install
npm test
npm run dev
```

Then open the printed local URL. To generate live briefs for pasted threads:

```bash
export LLM_API_KEY=sk-or-...   # OpenRouter or a compatible key
# optional: export LLM_MODEL=openai/gpt-4o-mini
npm run dev:ai
```

Do not commit secrets. `.env` and `.env.local` are gitignored.

## Tests

```bash
npm test        # parser + demo fixture integrity
npm run smoke   # production build and required static files
```

## Product principles

- Guest mode first. A judge should not have to sign in.
- Evidence first. Every decision should point at the messages that support it.
- Bilingual by construction, not as a translation afterthought.
- Honest about uncertainty. If the landlord only promised “尽力,” the brief says so.

## Author

傅玉涵 (Yu Han Fu) · [github.com/aircrushin](https://github.com/aircrushin)

MIT license. See [LICENSE](LICENSE).
