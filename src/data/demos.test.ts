import { describe, expect, it } from "vitest";
import { DEMOS } from "./demos";
import { parseThread } from "../lib/parseThread";
import { matchDemoId } from "../lib/analyze";

describe("demo fixtures", () => {
  for (const demo of DEMOS) {
    it(`${demo.id} evidence ids resolve to messages`, () => {
      const ids = new Set(demo.messages.map((m) => m.id));
      expect(demo.messages.length).toBeGreaterThan(4);
      expect(parseThread(demo.raw).map((m) => m.text)).toEqual(
        demo.messages.map((m) => m.text),
      );
      for (const decision of demo.brief.decisions) {
        expect(decision.evidence.length).toBeGreaterThan(0);
        for (const ev of decision.evidence) {
          expect(ids.has(ev), `${demo.id} missing evidence ${ev}`).toBe(true);
        }
      }
      expect(demo.brief.headline.length).toBeGreaterThan(20);
      expect(demo.brief.suggestedReplies.en.length).toBeGreaterThan(80);
      expect(demo.brief.suggestedReplies.yue.length).toBeGreaterThan(80);
    });

    it(`${demo.id} is recognized when pasted`, () => {
      expect(matchDemoId(parseThread(demo.raw))).toBe(demo.id);
    });
  }
});
