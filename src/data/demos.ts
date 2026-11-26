import type { DemoScenario, ThreadMessage } from "../types";
import { parseThread } from "../lib/parseThread";

function withRoles(
  messages: ThreadMessage[],
  roles: Record<string, string>,
): ThreadMessage[] {
  return messages.map((m) => ({ ...m, role: roles[m.sender] }));
}

const LEASE_RAW = `[26/11/2026, 4:07:14 PM] Priya Sharma: Hi all — can we lock the Nanshan unit today? Landlord's agent is pushing for a yes by 8pm.

[26/11/2026, 4:09:02 PM] 阿明: 你好，铺位是南山科兴科学园 B 座 1203。面积 128㎡。业主说租金 15,000 人民币/月，押二付一，12月20日可交铺。过了今晚8点可能要留给另一批看过的客户。

[26/11/2026, 4:11:41 PM] 傅玉涵: Wait wait 我记得上周看场是 13,800？阿明，15k 是新报价还是搞错了？我们 budget 没有到 15。

[26/11/2026, 4:13:18 PM] 阿明: 13,800 是11月的价。业主说12月起按 15,000。但如果你们三年一签、12月20日能准时进，我可以再帮你们争取 13,800，前两个月免租做装修。水电物业另计，大约 18 块/平。

[26/11/2026, 4:16:55 PM] Priya Sharma: Utilities at 18/sqm is another ~2.3k RMB. If rent is 13.8k + two months free, I can live with that. If it stays 15k I need to flag finance.

[26/11/2026, 4:18:22 PM] Jason Kwok: Legal flag: 阿明, who is the landlord contracting with? It cannot be Harbour Labs Limited (HK) if this is a PRC premises lease. It has to be the Qianhai WFOE. Also need the fire inspection and property management onboarding in the handover conditions — last time a Nanshan landlord tried to hand over "as is" and we sat dark for three weeks.

[26/11/2026, 4:21:03 PM] 阿明: 合同可以用香港公司吗？业主比较希望香港公司付，说结汇方便。押金他想收港币。

[26/11/2026, 4:22:47 PM] Jason Kwok: That's a no from me. HK company paying RMB rent / posting a HKD deposit for a PRC lease is messy and may not be enforceable the way the landlord thinks. WFOE signs, WFOE pays in RMB, deposit in RMB. If they want a comfort letter from the HK parent, I can draft one.

[26/11/2026, 4:24:10 PM] 傅玉涵: Agreed with Jason. WFOE signs. 阿明 please take that back. And please confirm 13,800 + 2 months rent-free, 3-year term, handover 20 Dec WITH electricity and property access live, not "as is".

[26/11/2026, 4:27:39 PM] Priya Sharma: Fit-out: our contractor 开工 says they need 18 days, so a 20 Dec handover means we are not operational until ~7 Jan. I need to tell the SZ team not to ship desks this Friday.

[26/11/2026, 4:29:01 PM] 傅玉涵: Yes — Priya, please hold the desk shipment. Don't cancel, just hold.

[26/11/2026, 4:36:52 PM] 阿明: 我和业主通了。13,800 可以，三年，前两月免租，12月20日交铺。合同必须今晚先出意向书，他才肯撤掉另一拨。电和门禁他说「尽量」，不能写进意向书，只能写交铺后配合办理。

[26/11/2026, 4:38:44 PM] Jason Kwok: "尽量" is not acceptable as the only language. The LOI can stay light, but handover conditions have to be in the lease: power, access cards, and fire-file transfer as conditions precedent to rent commencing. I will not recommend signing an LOI that is silent on this.

[26/11/2026, 4:40:15 PM] Priya Sharma: Also the deposit — 押二付一 at 13,800 is 41,400 RMB, all via WFOE, right? Not HKD, not from the HK account.

[26/11/2026, 4:41:02 PM] 阿明: 押金业主还是想收港币，说可以给收据。今晚意向书他想先写 13,800，公司名先空着？

[26/11/2026, 4:42:29 PM] 傅玉涵: 公司名不能空。写深圳前海的 WFOE：Harbour Labs (Shenzhen) Co., Ltd. 押金人民币，打到业主对公账户。港币方案不行。

[26/11/2026, 4:44:18 PM] Jason Kwok: I can turn a one-page LOI in 45 minutes: 13,800 RMB, 3 years, two months rent-free, WFOE as tenant, deposit 2 months in RMB, target handover 20 Dec, lease to include utilities/access as CP. We do not agree to exclusivity beyond Friday noon if the lease draft isn't out.

[26/11/2026, 4:46:01 PM] 傅玉涵: Do it. Jason owns the LOI. 阿明, send the landlord's full legal name + bank details for the RMB account, and confirm in writing that 15k is withdrawn. Priya, hold shipment and warn the SZ team about a 7 Jan go-live.

[26/11/2026, 4:47:33 PM] Priya Sharma: On it. Do we also need a budget approval from finance for the deposit tomorrow, or is Yu Han's go enough?

[26/11/2026, 4:48:09 PM] 傅玉涵: My go is enough for the LOI. Finance signs off the actual transfer when the lease is in agreed form — not tonight.

[26/11/2026, 4:51:26 PM] 阿明: 好，我去要营业执照和对公账户。意向书请尽快发我微信。另一个客户那边我先拖到明天中午。

[26/11/2026, 4:52:04 PM] 傅玉涵: 谢谢阿明。Jason pls send the LOI to this group and to 阿明 before 7:30pm. I'll be in a call till 6:30.`;

const HIRE_RAW = `Priya Sharma
2026-11-25 11:06:22
我把广州候选人 Linda 陈琳 的情况放这里。她要 12 月 15 日入职，期望 32k RMB/月，远程广州，偶尔来香港。今天她又在 WhatsApp 追问 offer 能不能今晚出。

傅玉涵
2026-11-25 11:08:03
32k 比我们深圳档高出不少。她是全职雇员还是合作？我记得我们说先 contractor 三个月？

Jason Kwok
2026-11-25 11:12:41
Do not issue a Hong Kong employment contract if she is working in Guangzhou. That creates PE risk and she will not have a HK work visa by 15 Dec anyway. If she is based in GZ, either: (1) GZ or SZ entity hires her as staff, or (2) a contractor agreement with IP assignment, 3-month term, then convert. I prefer (2) until we have a headcount slot in the WFOE.

Priya Sharma
2026-11-25 11:15:17
她本人很想要香港 offer，说家人觉得「香港公司更稳」。我已经解释过签证，但她今天仍问 can you just hire me under the HK company, I will stay in Guangzhou.

傅玉涵
2026-11-25 11:17:44
不行。跟她讲清楚：先由 WFOE 或 contractor，不能用香港劳动合同覆盖广州上班。薪酬我可以到 28k RMB contractor，或 26k 正式编制（五险一金另计）。32k 全包我不同意。

阿Ken
2026-11-25 11:20:05
我插一句，Linda 技术面是过的，系统设计不错。如果 28k 她不接受，我们备用候选人是 23k 但要 1 月中才能来。另外电脑：她要用自己的还是我们寄一台去广州？寄的话现在寄，过关要填什么？

Jason Kwok
2026-11-25 11:23:18
Company laptop should be issued by the WFOE, shipped domestic, not carried across the border by a founder as a "gift". I'll send Priya a one-pager IP + confidentiality addendum that must be signed before we grant repo access. No GitHub invite until that is back.

Priya Sharma
2026-11-25 11:26:52
入职日 12/15 如果走 contractor，我还来得及。走正式编制，这个月社保截止已过，最早 1 月才进系统。她说 12/15 是硬的，因为现在公司 12/14 最后一天。

傅玉涵
2026-11-25 11:28:33
那就 contractor，12 月 15 日开始，三个月，28k RMB/月，WFOE 出协议。三个月后评估再转正式。Priya 今晚先发一封意向，不要发香港 offer letter。

Priya Sharma
2026-11-25 11:30:11
收到。意向书要不要写转正后的薪酬范围？她肯定会问。还有试用期内是否远程、每月来港几天？

傅玉涵
2026-11-25 11:32:40
转正后范围写 26–30k 正式工资 + 社保，不要写 32。远程广州可以，第一个季度每月来港不超过 4 天，来港费用我们报销，签证用商务签，不作雇佣。Jason 帮我看这句可不可以。

Jason Kwok
2026-11-25 11:36:04
The 4 days/month business-visit language is fine if we do not treat it as work formally performed in HK. Keep meetings, reviews, no client-facing delivery in HK. I'll add that to the contractor draft by tomorrow noon. Priya, do not promise a HK employment conversion in writing.

阿Ken
2026-11-25 11:38:29
电脑我申请一台 MacBook，走深圳仓库寄广州，明天能出吗？另外她 GitHub 账号是 linda-chen-gz，先不要加 org。

Priya Sharma
2026-11-25 11:40:08
电脑请阿Ken 走 WFOE 资产出库。我今晚 7 点前出意向：28k contractor，12/15 开始，3 个月，转正 26–30k，不承诺香港雇佣。还没回答的是：28k 她会不会直接拒绝？要不要 Yu Han 今晚和她 call 五分钟？

傅玉涵
2026-11-25 11:41:22
你先发意向。如果她卡在 32k，我再打电话。不要在消息里先让步。`;

const TERM_RAW = `From: Jordan Lee <jordan@southpeak.vc>
Sent: Friday, 27 November 2026 10:14
To: 傅玉涵 <yuhan@harbourlabs.com>
Cc: Alex Chen <alex@harbourlabs.com>; Priya Sharma <priya@harbourlabs.com>
Subject: Harbour Labs — follow-up on the term sheet

Yu Han — thanks again for coming in on Wednesday. The partners are supportive and would like to issue a term sheet this month if we can close two points:

1) Option pool: we would like a 15% unallocated pool, recut pre-money (standard for us at seed).
2) A 20-day exclusivity period from signing the TS, and a target first close before the Lunar New Year break.

Associate on our side (me) can turn a draft today if you confirm. We are also still mid-process with one other company in the same slot, so a read by Monday 10:00 HKT would help.

Best,
Jordan
South Peak Capital

From: Alex Chen <alex@harbourlabs.com>
Sent: Friday, 27 November 2026 11:02
To: 傅玉涵 <yuhan@harbourlabs.com>; Priya Sharma <priya@harbourlabs.com>
Subject: Re: Harbour Labs — follow-up on the term sheet

Flagging this off-thread first — I would not accept 15% unallocated pre-money. That is a meaningful dilution of the founding team before a dollar hits the account. 10% unallocated is what we modelled, 12% is the most I would go, and I would rather top up at Series A. Also "standard for us" is a tactic; two of their last seed deals I can see from friends were 10%.

Exclusivity for 20 days in late November / December is long, given CNY. I would offer 10 business days, or 20 days but only after we have the full TS, not from a handshake.

Do we know if they are actually competing a slot, or is that pacing?

I can draft a reply but I think it should come from you, Yu Han.

From: Priya Sharma <priya@harbourlabs.com>
Sent: Friday, 27 November 2026 11:26
To: 傅玉涵 <yuhan@harbourlabs.com>; Alex Chen <alex@harbourlabs.com>
Subject: Re: Harbour Labs — follow-up on the term sheet

Ops / cap table note: our current option commitments to early hires already sit at ~3.2% (verbal, not all granted). A 10% unallocated pool on top is tight but workable if we wait on the later GZ hires. 15% unallocated plus the 3.2% would be painful.

Monday 10:00 HKT is tight — Yu Han you have the SZ landlord call at 9:30. I can move that.

Also: Jordan cc'd me but the email is really a partner-level negotiation. Please don't let me be the one who replies.

From: 傅玉涵 <yuhan@harbourlabs.com>
Sent: Friday, 27 November 2026 12:11
To: Alex Chen <alex@harbourlabs.com>; Priya Sharma <priya@harbourlabs.com>
Subject: Re: Harbour Labs — follow-up on the term sheet

Agree with Alex on the pool. We counter at 10% unallocated pre-money, and we can discuss 12% only if they come up on valuation (they are still at the number we already said is tight). Do not pre-accept 15%.

Exclusivity: 10 business days from receipt of a full TS, not 20 from today. I want room if West Harbour comes back next week — they said they might.

I will send the reply. Alex, please send me 6 bullets by 5pm today (pool maths + the 10% comps + exclusivity language). Priya, no need to move the landlord call; I will write to Jordan this evening, still ahead of Monday 10:00.

One open question I still need Alex's view on: they have not reconfirmed the valuation in this email. Do we restate our number, or stay silent and only address the two points they raised?

From: Alex Chen <alex@harbourlabs.com>
Sent: Friday, 27 November 2026 12:29
To: 傅玉涵 <yuhan@harbourlabs.com>; Priya Sharma <priya@harbourlabs.com>
Subject: Re: Harbour Labs — follow-up on the term sheet

Restate it, briefly. If we only answer the pool and exclusivity, we let the tight valuation stand as agreed. One sentence: we can move on a TS this month at the valuation already discussed, with a 10% unallocated pool, and we are not reopening other terms.

I'll have bullets to you by 4:30pm. Happy to review your draft on a quick call at 6.`;

const rolesLease: Record<string, string> = {
  "傅玉涵": "Founder",
  "Priya Sharma": "Ops",
  "Jason Kwok": "Counsel",
  阿明: "Landlord agent",
};

const rolesHire: Record<string, string> = {
  "傅玉涵": "Founder",
  "Priya Sharma": "Ops",
  "Jason Kwok": "Counsel",
  阿Ken: "Engineering",
};

const rolesTerm: Record<string, string> = {
  "Jordan Lee": "Investor associate",
  "傅玉涵": "Founder",
  "Alex Chen": "Co-founder",
  "Priya Sharma": "Ops",
};

export const DEMOS: DemoScenario[] = [
  {
    id: "lease",
    channel: "whatsapp",
    titleEn: "Shenzhen office lease",
    titleZh: "南山办公室租约",
    blurbEn:
      "A WhatsApp group tries to lock a Nanshan unit by 8pm — rent, which company signs, and a fuzzy handover.",
    blurbZh:
      "WhatsApp 群要在今晚 8 点前锁定南山单位：租金、哪家公司签约、交铺条件含糊不清。",
    raw: LEASE_RAW,
    messages: withRoles(parseThread(LEASE_RAW), rolesLease),
    brief: {
      headline:
        "Proceed with a WFOE-signed LOI tonight at RMB 13,800, not 15,000 — but do not accept a handover that is only “尽力”.",
      context:
        "Harbour Labs is trying to lock a 128㎡ unit at Nanshan Kexing Science Park by 8pm. The agent raised rent from an earlier RMB 13,800 quote to 15,000, asked the Hong Kong company to sign and to post the deposit in HKD, and would only promise utilities and access on a best-efforts basis. The founder has now authorised a tight counter.",
      decisions: [
        {
          text: "Tenant will be Harbour Labs (Shenzhen) Co., Ltd. (the Qianhai WFOE), not Harbour Labs Limited (HK). Deposit and rent in RMB to the landlord’s corporate account. A parent comfort letter is possible; a HKD deposit is not.",
          status: "agreed",
          evidence: ["m06", "m07", "m08", "m09", "m16"],
          owners: ["Jason Kwok", "阿明"],
        },
        {
          text: "Commercial terms to put in the LOI: RMB 13,800 / month, 3-year term, first two months rent-free, target handover 20 December 2026, two-month deposit (RMB 41,400). The RMB 15,000 ask is withdrawn only once 阿明 confirms in writing.",
          status: "agreed",
          evidence: ["m04", "m09", "m12", "m14", "m17"],
          owners: ["Jason Kwok", "阿明"],
        },
        {
          text: "Jason drafts and circulates the one-page LOI to the group and to 阿明 before 7:30pm. Exclusivity, if any, should not run past Friday noon unless a lease draft is out. Yu Han’s approval is enough to issue the LOI; finance approves the actual transfer only when the lease is in agreed form.",
          status: "agreed",
          evidence: ["m17", "m18", "m19", "m20", "m22"],
          owners: ["Jason Kwok", "傅玉涵"],
        },
        {
          text: "Priya holds (does not cancel) the desk shipment and warns the Shenzhen team that a 20 Dec handover implies a ~7 January go-live after an 18-day fit-out.",
          status: "agreed",
          evidence: ["m10", "m11", "m18"],
          owners: ["Priya Sharma"],
        },
      ],
      openQuestions: [
        {
          text: "The landlord will not put power, access cards and fire-file transfer into the LOI, only a post-handover “配合办理”. Counsel will not recommend an LOI that is silent; these must be conditions precedent to rent commencing in the lease. This is still unresolved with the landlord.",
          blocker: true,
          askedBy: "Jason Kwok",
          needs: ["阿明", "Landlord"],
        },
        {
          text: "阿明 still needs to send the landlord’s full legal name, business licence and RMB corporate bank details, and written confirmation that the RMB 15,000 price is withdrawn.",
          blocker: true,
          askedBy: "傅玉涵",
          needs: ["阿明"],
        },
      ],
      owners: [
        {
          name: "Jason Kwok",
          action: "Draft the one-page LOI with the agreed terms and CP language for the lease, and send it to the group and 阿明.",
          due: "Today 7:30pm",
        },
        {
          name: "阿明",
          action: "Return landlord legal name, licence and RMB account details; confirm 15,000 is withdrawn; push back on “尽力” handover language.",
          due: "This evening",
        },
        {
          name: "Priya Sharma",
          action: "Hold the desk shipment and notify the SZ team of a ~7 Jan operational date.",
          due: "Today",
        },
        {
          name: "傅玉涵",
          action: "Available after 6:30pm to review the LOI; finance is not needed tonight.",
        },
      ],
      risks: [
        {
          text: "Agent is still soft on utilities and access (“尽量”), which previously left the company without power for three weeks in Nanshan.",
          severity: "high",
        },
        {
          text: "Landlord may still push for an HK-company signature or a HKD deposit, which counsel has rejected as poorly enforceable.",
          severity: "medium",
        },
        {
          text: "Another prospective tenant is being stalled only until tomorrow noon — timing risk if the LOI slips past 7:30pm.",
          severity: "medium",
        },
      ],
      suggestedReplies: {
        en: `Hi 阿明 — thank you for going back to the owner.

We can issue a one-page LOI this evening on the following basis:

• Tenant: Harbour Labs (Shenzhen) Co., Ltd. (our Qianhai WFOE). The Hong Kong company will not be the tenant.
• Rent: RMB 13,800 / month, 3-year term, first two months rent-free, target handover 20 December 2026.
• Deposit: two months in RMB (RMB 41,400) to the landlord’s corporate account. We cannot post the deposit in HKD.
• The lease (not just a side conversation) will need power, access cards and fire-file transfer as conditions precedent to rent starting. “尽力” is not enough for us.

Please send the landlord’s full legal name, business licence and RMB bank details, and confirm in writing that the RMB 15,000 figure is withdrawn. Jason will send the LOI by 7:30pm. We can hold this for you until Friday noon pending a lease draft.

Thanks,
Yu Han`,
        zhHant: `阿明你好，謝謝你再跟業主溝通。

我們今晚可以先出一頁意向書，前提如下：

• 承租方：Harbour Labs (Shenzhen) Co., Ltd.（前海 WFOE），不能由香港公司簽約。
• 租金：人民幣 13,800／月，三年期，首兩個月免租，目標 12 月 20 日交鋪。
• 保證金：兩個月租金，人民幣 41,400，打入業主對公帳戶。不能以港幣支付。
• 正式租約須把電力、門禁與消防檔案移交寫成租金起算的先決條件。「盡力」對我們不夠。

請補上業主全名、營業執照與人民幣對公帳戶，並書面確認 15,000 的報價已收回。Jason 會在今晚 7:30 前把意向書發來。若租約草案能跟進，我們可將檔期保留至周五中午。

謝謝，
玉涵`,
        zhHans: `阿明你好，谢谢你再跟业主沟通。

我们今晚可以先出一页意向书，前提如下：

• 承租方：Harbour Labs (Shenzhen) Co., Ltd.（前海 WFOE），不能由香港公司签约。
• 租金：人民币 13,800／月，三年期，前两个月免租，目标 12 月 20 日交铺。
• 保证金：两个月租金，人民币 41,400，打入业主对公账户。不能以港币支付。
• 正式租约须把电力、门禁与消防档案移交写成租金起算的先决条件。「尽量」对我们不够。

请补上业主全名、营业执照与人民币对公账户，并书面确认 15,000 的报价已收回。Jason 会在今晚 7:30 前把意向书发来。若租约草案能跟进，我们可以将档期保留至周五中午。

谢谢，
玉涵`,
        yue: `阿明你好，唔該你再同业主倾过。

我哋今晚可以出一页意向书，条件系咁：

• 承租方：Harbour Labs (Shenzhen) Co., Ltd.（前海 WFOE），唔可以香港公司签约。
• 租金：人民币 13,800／月，签三年，头两个月免租，目标 12 月 20 日交铺。
• 按金：两个月租金，人民币 41,400，打入业主对公户口。唔可以畀港币。
• 正式租约要写明电力、门禁同消防档案移交，作为开始计租嘅先决条件。只写「尽量」我哋接唔到。

麻烦补返业主全名、营业执照同人民币对公户口，再书面确认 15,000 嗰个价已经收返。Jason 会喺今晚 7:30 前将意向书 send 过来。如果租约草案跟得上，我哋可以帮你留到礼拜五中午。

谢谢，
玉涵`,
      },
    },
  },
  {
    id: "hire",
    channel: "wechat",
    titleEn: "Guangzhou engineer offer",
    titleZh: "广州工程师 offer",
    blurbEn:
      "A WeChat thread races an offer for a Guangzhou engineer who wants a Hong Kong contract by tonight.",
    blurbZh:
      "微信群要在今晚出 offer：广州工程师希望签香港合同，编制、薪酬与电脑寄送还没对齐。",
    raw: HIRE_RAW,
    messages: withRoles(parseThread(HIRE_RAW), rolesHire),
    brief: {
      headline:
        "Send a contractor intent tonight at RMB 28k — not a Hong Kong offer letter, and not RMB 32k.",
      context:
        "Linda 陈琳, a Guangzhou-based engineer who passed the technical interview, is pushing for an offer this evening and a 15 December start, her last day at the current job being 14 December. She has asked to be hired by the Hong Kong company while remaining in Guangzhou. Counsel, the founder and ops have now aligned on a different structure.",
      decisions: [
        {
          text: "Do not issue a Hong Kong employment contract or promise a HK employment conversion in writing. She is based in Guangzhou; a HK contract would create PE risk and she will not have a HK work visa by 15 December.",
          status: "agreed",
          evidence: ["m03", "m04", "m05", "m09", "m12"],
          owners: ["Priya Sharma", "Jason Kwok"],
        },
        {
          text: "Offer a 3-month contractor agreement from 15 December, issued by the WFOE, at RMB 28,000 / month. Conversion to formal employment is only after that review, at a formal salary range of RMB 26–30k plus social insurance — not 32k all-in, which the founder has rejected.",
          status: "agreed",
          evidence: ["m05", "m08", "m09", "m11", "m15"],
          owners: ["Priya Sharma", "傅玉涵"],
        },
        {
          text: "Remote work from Guangzhou is fine. In the first quarter she may visit Hong Kong up to 4 days per month, expenses reimbursed, on a business visa, for meetings and reviews only — no client-facing delivery in Hong Kong, and not formal work performed in HK.",
          status: "agreed",
          evidence: ["m11", "m12"],
          owners: ["Jason Kwok", "Priya Sharma"],
        },
        {
          text: "A company MacBook is to be issued as WFOE property and shipped domestically from the Shenzhen warehouse to Guangzhou — not carried across the border. No GitHub org invite (linda-chen-gz) until the IP and confidentiality addendum is signed.",
          status: "agreed",
          evidence: ["m07", "m13", "m14"],
          owners: ["阿Ken", "Jason Kwok"],
        },
      ],
      openQuestions: [
        {
          text: "It is still unknown whether Linda will accept RMB 28k. Priya sends the intent first; Yu Han will call only if she holds at 32k. No concession should be previewed in the message.",
          blocker: false,
          askedBy: "Priya Sharma",
          needs: ["Linda 陈琳"],
        },
      ],
      owners: [
        {
          name: "Priya Sharma",
          action: "Send the intent email by 7pm: 28k contractor, 15 Dec start, 3-month term, conversion range 26–30k, no HK employment promise.",
          due: "Today 7:00pm",
        },
        {
          name: "Jason Kwok",
          action: "Draft the contractor agreement plus IP/confidentiality addendum, including the 4-day business-visit language, by tomorrow noon.",
          due: "Tomorrow noon",
        },
        {
          name: "阿Ken",
          action: "Request the MacBook from the Shenzhen WFOE inventory and hold the GitHub invite.",
          due: "Tomorrow",
        },
        {
          name: "傅玉涵",
          action: "Stand by to call Linda only if she rejects 28k and holds at 32k.",
        },
      ],
      risks: [
        {
          text: "Candidate may decline 28k and be lost; the backup candidate is cheaper (23k) but cannot start until mid-January.",
          severity: "medium",
        },
        {
          text: "Any written hint of a Hong Kong employment conversion, or treating monthly HK visits as work in Hong Kong, reopens PE and immigration risk.",
          severity: "high",
        },
        {
          text: "Formal WFOE employment cannot enter social insurance until January because this month’s cutoff has passed — another reason the 15 Dec start has to be contractor.",
          severity: "low",
        },
      ],
      suggestedReplies: {
        en: `Hi Linda,

Thank you for your patience — we would like to move ahead and can send a written intent this evening.

Because you will be based in Guangzhou, the agreement would be a 3-month contractor engagement with our Shenzhen WFOE, starting 15 December, at RMB 28,000 per month. After those three months we would review a conversion to formal employment, at a salary range of RMB 26–30k plus social insurance. We cannot issue a Hong Kong employment contract for work performed in Guangzhou.

You would work remotely from Guangzhou. In the first quarter you could visit Hong Kong up to four days a month (travel reimbursed) for internal meetings, on a business visa.

If this works, we will send the contractor draft and a short IP / confidentiality addendum next. A company laptop would be shipped to Guangzhou from our Shenzhen office once that is signed.

Happy to answer questions,
Priya`,
        zhHant: `Linda 你好，

謝謝你等候。我們希望往前走，今晚可以先發一份書面意向。

由於你將常駐廣州，協議會是與我們深圳 WFOE 簽訂的三個月合作（contractor），12 月 15 日開始，每月人民幣 28,000。三個月後再評估轉為正式編制，薪資區間為 26–30k 加社保。我們不能就你在廣州的工作發出香港勞動合同。

工作以廣州遠端為主。第一季度你可以每月來港不超過四天（費用報銷），以商務簽進行內部會議。

若可以，我們接著會發合作協議與一份簡短的知識產權及保密附件。公司電腦會在簽署後由深圳辦公室寄到廣州。

有問題隨時找我。
Priya`,
        zhHans: `Linda 你好，

谢谢你等候。我们希望往前走，今晚可以先发一份书面意向。

由于你将常驻广州，协议会是与我们深圳 WFOE 签订的三个月合作（contractor），12 月 15 日开始，每月人民币 28,000。三个月后再评估转为正式编制，薪资区间为 26–30k 加社保。我们不能就你在广州的工作发出香港劳动合同。

工作以广州远程为主。第一季度你可以每月来港不超过四天（费用报销），以商务签进行内部会议。

若可以，我们接着会发合作协议与一份简短的知识产权及保密附件。公司电脑会在签署后由深圳办公室寄到广州。

有问题随时找我。
Priya`,
        yue: `Linda 你好，

唔該晒等。我哋想推进，今晚可以先出一份书面意向。

因为你会常驻广州，协议会系同我哋深圳 WFOE 签三个月合作（contractor），12 月 15 日开始，每月人民币 28,000。三个月后再评估转正式编制，薪资区间 26–30k 加社保。我哋唔可以就你喺广州嘅工作出香港劳动合同。

工作以广州远程为主。第一季度你可以每月来香港唔超过四日（费用报销），用商务签开内部会议。

如果 OK，我哋再发合作协议同埋一份短嘅知识产权同保密附件。公司电脑会喺签约之后由深圳办公室寄去广州。

有问题随时搵我。
Priya`,
      },
    },
  },
  {
    id: "termsheet",
    channel: "email",
    titleEn: "Seed term-sheet reply",
    titleZh: "种子轮条款回复",
    blurbEn:
      "An investor wants a 15% option pool and 20-day exclusivity by Monday 10:00 — the founders do not agree.",
    blurbZh:
      "投资人希望周一 10:00 前确认 15% 期权池与 20 天排他；创始人团队并不同意。",
    raw: TERM_RAW,
    messages: withRoles(parseThread(TERM_RAW), rolesTerm),
    brief: {
      headline:
        "Yu Han replies tonight: 10% unallocated pool, 10 business days of exclusivity from a full term sheet, valuation restated — not 15%, and not 20 days from today.",
      context:
        "South Peak’s associate, Jordan Lee, emailed after Wednesday’s meeting asking to close two points so a term sheet can go out this month: a 15% unallocated option pool recut pre-money, and 20-day exclusivity from signing, with a read requested by Monday 10:00 HKT. The internal thread (Alex, Priya, Yu Han) has now settled the counter.",
      decisions: [
        {
          text: "Counter the option pool at 10% unallocated pre-money. Do not pre-accept 15%. 12% is only discussable if South Peak moves on valuation, which the team already regards as tight. Existing verbal option commitments are ~3.2%.",
          status: "agreed",
          evidence: ["m02", "m03", "m04"],
          owners: ["傅玉涵", "Alex Chen"],
        },
        {
          text: "Exclusivity: 10 business days from receipt of a full term sheet, not 20 days from today or from a handshake. The team wants room if West Harbour comes back next week.",
          status: "agreed",
          evidence: ["m02", "m04"],
          owners: ["傅玉涵"],
        },
        {
          text: "The reply is from Yu Han, not from Priya or Alex. Alex sends six bullets (pool maths, 10% comps, exclusivity language) by 4:30–5:00pm and can review a draft on a 6pm call. Yu Han writes this evening, still ahead of Monday 10:00 HKT. The 9:30am Shenzhen landlord call stays.",
          status: "agreed",
          evidence: ["m03", "m04", "m05"],
          owners: ["傅玉涵", "Alex Chen", "Priya Sharma"],
        },
        {
          text: "The reply will briefly restate the valuation already discussed, so that answering only the pool and exclusivity does not let a tight valuation stand as if agreed. Other terms are not reopened.",
          status: "agreed",
          evidence: ["m04", "m05"],
          owners: ["傅玉涵", "Alex Chen"],
        },
      ],
      openQuestions: [
        {
          text: "It is still unclear whether South Peak is genuinely competing a single remaining slot, or using that as pacing. This does not block the reply.",
          blocker: false,
          askedBy: "Alex Chen",
          needs: ["Jordan Lee"],
        },
      ],
      owners: [
        {
          name: "Alex Chen",
          action: "Send Yu Han six bullets: pool maths, 10% comps from recent South Peak seeds, and exclusivity language.",
          due: "Today 4:30pm",
        },
        {
          name: "傅玉涵",
          action: "Draft and send the founder reply to Jordan this evening; optional 6pm review with Alex.",
          due: "This evening",
        },
        {
          name: "Priya Sharma",
          action: "Do not reply to Jordan; leave the 9:30am landlord call in place.",
        },
      ],
      risks: [
        {
          text: "A 15% unallocated pre-money pool would meaningfully dilute the founders before cash in, on top of ~3.2% already committed to early hires.",
          severity: "high",
        },
        {
          text: "20-day exclusivity over the December / CNY period would constrain a possible West Harbour follow-up.",
          severity: "medium",
        },
        {
          text: "If the reply addresses only pool and exclusivity and stays silent on valuation, the current tight number may be treated as agreed.",
          severity: "medium",
        },
      ],
      suggestedReplies: {
        en: `Hi Jordan,

Thank you again for Wednesday, and for the clear follow-up. We would also like to move to a term sheet this month.

On the two points you raised:

• Option pool. We can agree a 10% unallocated pool, recut pre-money. 15% is too large given our current model and existing commitments, and we would rather top up at Series A if needed.

• Exclusivity. We can offer 10 business days of exclusivity starting from our receipt of a full term sheet (not 20 days from today). That should still leave room to target a first close before the Lunar New Year break.

We can proceed on a term sheet this month at the valuation we already discussed, and we are not looking to reopen other terms.

I will be in a position to review a draft as soon as you can turn it. Thank you again — looking forward to it.

Yu Han
Harbour Labs`,
        zhHant: `Jordan 你好，

再次謝謝星期三的交流，以及這封清楚的後續。我們也希望能在本月進入條款清單。

就你提出的兩點：

• 期權池。我們可以同意 10% 未分配池，並在 pre-money 重切。15% 以我們目前的模型與既有承諾來說過大，若有需要我們傾向在 A 輪再補。

• 排他。我們可以提供 10 個工作日的排他，自我們收到完整條款清單起算（而非自今天起算的 20 天）。這仍應足夠在農曆新年前爭取 first close。

我們可以按已經討論過的估值推进本月的條款清單，其他條款不打算重開。

你們草案一出，我會盡快看。謝謝，期待下一步。

玉涵
Harbour Labs`,
        zhHans: `Jordan 你好，

再次谢谢星期三的交流，以及这封清楚的后续。我们也希望能在本月进入条款清单。

就你提出的两点：

• 期权池。我们可以同意 10% 未分配池，并在 pre-money 重切。15% 以我们目前的模型与既有承诺来说过大，若有需要我们倾向在 A 轮再补。

• 排他。我们可以提供 10 个工作日的排他，自我们收到完整条款清单起算（而非自今天起算的 20 天）。这仍应足够在农历新年前争取 first close。

我们可以按已经讨论过的估值推进本月的条款清单，其他条款不打算重开。

你们草案一出，我会尽快看。谢谢，期待下一步。

玉涵
Harbour Labs`,
        yue: `Jordan 你好，

再谢谢礼拜三嘅交流，同埋呢封清楚嘅 follow-up。我哋都希望呢个月可以出 term sheet。

你提出嘅两点：

• Option pool。我哋可以同意 10% 未分配池，pre-money 重切。15% 以我哋而家嘅模型同埋已有承诺来讲过大，如果有需要我哋倾向 A 轮再补。

• 排他。我哋可以提供 10 个工作日排他，由我哋收到完整 term sheet 起计（唔系由今日起计 20 日）。呢个都应该够时间目标年前进 first close。

我哋可以按已经讨论过嘅估值，喺呢个月推进 term sheet，其他条款唔打算重开。

你哋草案一出，我会尽快看。谢谢，期待下一步。

玉涵
Harbour Labs`,
      },
    },
  },
];

export const DEMO_BY_ID = Object.fromEntries(DEMOS.map((d) => [d.id, d]));
