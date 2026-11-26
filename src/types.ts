export type Locale = "en" | "zh";

export type ReplyLang = "en" | "zhHant" | "zhHans" | "yue";

export type DecisionStatus = "agreed" | "tentative";

export type Severity = "low" | "medium" | "high";

export interface ThreadMessage {
  id: string;
  sender: string;
  role?: string;
  timestamp: string;
  text: string;
  channel?: "whatsapp" | "wechat" | "email" | "unknown";
}

export interface Decision {
  text: string;
  status: DecisionStatus;
  evidence: string[];
  owners: string[];
}

export interface OpenQuestion {
  text: string;
  blocker: boolean;
  askedBy?: string;
  needs?: string[];
}

export interface OwnerAction {
  name: string;
  action: string;
  due?: string;
}

export interface Risk {
  text: string;
  severity: Severity;
}

export interface Brief {
  headline: string;
  context: string;
  decisions: Decision[];
  openQuestions: OpenQuestion[];
  owners: OwnerAction[];
  risks: Risk[];
  suggestedReplies: Record<ReplyLang, string>;
}

export interface DemoScenario {
  id: string;
  channel: "whatsapp" | "wechat" | "email";
  titleEn: string;
  titleZh: string;
  blurbEn: string;
  blurbZh: string;
  raw: string;
  messages: ThreadMessage[];
  brief: Brief;
}
