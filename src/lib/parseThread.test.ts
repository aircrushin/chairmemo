import { describe, expect, it } from "vitest";
import { parseThread } from "./parseThread";

describe("parseThread", () => {
  it("parses WhatsApp bracket timestamps", () => {
    const raw = `[26/11/2026, 9:41:02 PM] Priya Sharma: Can someone confirm the deposit?
[26/11/2026, 9:42:11 PM] 傅玉涵: 我以为已经是 13.8k RMB?`;
    const messages = parseThread(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("Priya Sharma");
    expect(messages[0].channel).toBe("whatsapp");
    expect(messages[1].sender).toBe("傅玉涵");
    expect(messages[1].text).toContain("13.8k");
  });

  it("parses WhatsApp dash exports and merges wrapped lines", () => {
    const raw = `26/11/2026, 21:41 - Jason Kwok: We cannot sign
as Harbour Labs Limited if the landlord insists on the WFOE.
26/11/2026, 21:44 - Priya Sharma: Agreed, flagging for Yu Han.`;
    const messages = parseThread(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].text).toMatch(/WFOE/);
    expect(messages[0].text).toMatch(/cannot sign/);
  });

  it("parses WeChat name / timestamp / body blocks", () => {
    const raw = `阿明
2026-11-26 21:43:01
租金按 15000，押二付一，12月20日可交铺。

傅玉涵
2026-11-26 21:45:12
等等，之前不是说 13800 吗？`;
    const messages = parseThread(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("阿明");
    expect(messages[0].channel).toBe("wechat");
    expect(messages[1].text).toContain("13800");
  });

  it("parses an email thread with From/Date/Subject headers", () => {
    const raw = `From: Alex Chen <alex@example.com>
Sent: Thursday, 26 November 2026 18:12
To: Yu Han
Subject: Option pool

I would push back on 15%.

From: Jordan Lee <jordan@example.com>
Date: Thursday, 26 November 2026 19:04
Subject: Re: Option pool

Let's reply tomorrow. Who owns the draft?`;
    const messages = parseThread(raw);
    expect(messages).toHaveLength(2);
    expect(messages[0].sender).toBe("Alex Chen");
    expect(messages[0].channel).toBe("email");
    expect(messages[0].text).toContain("Option pool");
    expect(messages[1].sender).toBe("Jordan Lee");
    expect(messages[1].text).toContain("Who owns the draft?");
  });

  it("returns an empty list for blank input", () => {
    expect(parseThread("   ")).toEqual([]);
  });
});
