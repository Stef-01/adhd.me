// Every crisis contact the product shows, in one place: the Urgent help rows and the numbers the
// safety messages quote. Each one names the official page it was checked against and the day.
// `docs/ops/crisis-contacts.md` says how to re-check them; a monthly workflow flags any older
// than 90 days. Jurisdiction: Australia.

export type ContactMethod = "call" | "text" | "chat" | "relay";

export type CrisisContactId =
  | "emergency"
  | "emergency-text"
  | "lifeline"
  | "lifeline-text"
  | "kids-helpline"
  | "kids-helpline-chat"
  | "beyond-blue"
  | "beyond-blue-chat"
  | "suicide-call-back"
  | "butterfly"
  | "alcohol-drug"
  | "respect";

export interface CrisisContact {
  readonly id: CrisisContactId;
  /** The name a person reads on the row or in a sentence. */
  readonly service: string;
  readonly method: ContactMethod;
  /** `tel:` for a call, `sms:` for a text or the text relay, `https:` for a chat. */
  readonly href: string;
  /** The number as a person reads it aloud, or "Chat". */
  readonly said: string;
  /** Who it is for, or when. Three words at most. */
  readonly when: string;
  /** The day this contact was last checked against `source`, as YYYY-MM-DD. */
  readonly verifiedOn: string;
  /** The service's own page for this method. */
  readonly source: string;
}

const CHECKED = "2026-09-26";

export const CRISIS_CONTACTS: readonly CrisisContact[] = [
  { id: "emergency", service: "Emergency", method: "call", href: "tel:000", said: "000", when: "In danger now", verifiedOn: CHECKED, source: "https://www.triplezero.gov.au/" },
  { id: "emergency-text", service: "000 by text", method: "relay", href: "sms:0423677767", said: "0423 677 767", when: "Start with 000", verifiedOn: CHECKED, source: "https://www.accesshub.gov.au/about-the-nrs/how-to-make-an-emergency-call-using-the-nrs" },
  { id: "lifeline", service: "Lifeline", method: "call", href: "tel:131114", said: "13 11 14", when: "Any hour", verifiedOn: CHECKED, source: "https://www.lifeline.org.au/131114" },
  { id: "lifeline-text", service: "Lifeline Text", method: "text", href: "sms:0477131114", said: "0477 13 11 14", when: "Any hour", verifiedOn: CHECKED, source: "https://www.lifeline.org.au/crisis-text/" },
  { id: "kids-helpline", service: "Kids Helpline", method: "call", href: "tel:1800551800", said: "1800 55 1800", when: "Up to 25", verifiedOn: CHECKED, source: "https://kidshelpline.com.au/" },
  { id: "kids-helpline-chat", service: "Kids Helpline", method: "chat", href: "https://kidshelpline.com.au/get-help/webchat-counselling/", said: "Chat", when: "Up to 25", verifiedOn: CHECKED, source: "https://kidshelpline.com.au/get-help/webchat-counselling/" },
  { id: "beyond-blue", service: "Beyond Blue", method: "call", href: "tel:1300224636", said: "1300 22 4636", when: "Any hour", verifiedOn: CHECKED, source: "https://www.beyondblue.org.au/get-support/talk-to-a-counsellor" },
  { id: "beyond-blue-chat", service: "Beyond Blue", method: "chat", href: "https://www.beyondblue.org.au/get-support/talk-to-a-counsellor/chat", said: "Chat", when: "Any hour", verifiedOn: CHECKED, source: "https://www.beyondblue.org.au/get-support/talk-to-a-counsellor/chat" },
  { id: "suicide-call-back", service: "Suicide Call Back Service", method: "call", href: "tel:1300659467", said: "1300 659 467", when: "Any hour", verifiedOn: CHECKED, source: "https://www.suicidecallbackservice.org.au/contact-us/" },
  { id: "butterfly", service: "The Butterfly Foundation", method: "call", href: "tel:1800334673", said: "1800 33 4673", when: "8am to midnight", verifiedOn: CHECKED, source: "https://butterfly.org.au/get-support/helpline/" },
  { id: "alcohol-drug", service: "The National Alcohol and Other Drug Hotline", method: "call", href: "tel:1800250015", said: "1800 250 015", when: "Any hour", verifiedOn: CHECKED, source: "https://www.health.gov.au/contacts/national-alcohol-and-other-drug-hotline" },
  { id: "respect", service: "1800RESPECT", method: "call", href: "tel:1800737732", said: "1800 737 732", when: "Any hour", verifiedOn: CHECKED, source: "https://1800respect.org.au/calling-1800respect" },
];

export function contact(id: CrisisContactId): CrisisContact {
  const found = CRISIS_CONTACTS.find((c) => c.id === id);
  if (!found) throw new Error(`crisis-contacts: unknown contact ${id}`);
  return found;
}

/** What a number reads as in a sentence: "13 11 14". */
export function said(id: CrisisContactId): string {
  return contact(id).said;
}

/** The Urgent help rows, in the order a person in danger needs them. */
export const URGENT_ROWS: readonly CrisisContactId[] = [
  "emergency",
  "emergency-text",
  "lifeline",
  "lifeline-text",
  "kids-helpline",
  "kids-helpline-chat",
  "beyond-blue",
  "beyond-blue-chat",
];

/** The scheme each method must use, so a text row can never dial and a call row can never open a page. */
export const SCHEME_FOR: Readonly<Record<ContactMethod, string>> = {
  call: "tel:",
  text: "sms:",
  chat: "https:",
  relay: "sms:",
};
