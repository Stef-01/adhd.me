# Crisis contacts

Every crisis number and chat link the product shows lives in `src/model/crisis-contacts.ts`: the
Urgent help rows and the numbers the safety messages quote. Nothing else may hard-code one;
`src/model/crisis-contacts.test.ts` fails if a safety message quotes a number the registry lacks,
or if any file under `app/` writes a registry number out instead of reading it with `said()`.

## When to check

- On every release day, by hand, every row.
- When the monthly `crisis-contacts` workflow opens "Re-check the crisis contacts". It opens one
  when any `verifiedOn` is older than 90 days. Run it by hand from the Actions tab at any time.
- Locally: `node scripts/crisis-contacts-age.mjs`.

## How to check a contact

1. Open its `source` page. Use the service's own site, never a directory or a search snippet.
2. Confirm the number or chat link, the hours, and who it is for, against the row's `said`,
   `when` and `href`.
3. For a call, dial it from a phone and hear the service's greeting. For a text line, confirm the
   service still takes texts at that number. For a chat, open the link and reach the chat's start.
4. If anything differs, change the row and its test in the same commit.
5. Set `verifiedOn` to the day you checked, as YYYY-MM-DD.

## Last checked, 2026-09-26

| Id | Service | Method | What the row says | Hours checked | Source |
| --- | --- | --- | --- | --- | --- |
| emergency | Emergency | call | 000 | Any hour | triplezero.gov.au |
| emergency-text | 000 by text | relay | 0423 677 767, start with 000 | Any hour, through the National Relay Service SMS Relay | accesshub.gov.au, "How to make an emergency call using the NRS" |
| lifeline | Lifeline | call | 13 11 14 | 24/7 | lifeline.org.au/131114 |
| lifeline-text | Lifeline Text | text | 0477 13 11 14 | 24/7 | lifeline.org.au/crisis-text |
| kids-helpline | Kids Helpline | call | 1800 55 1800 | 24/7, ages 5 to 25 | kidshelpline.com.au |
| kids-helpline-chat | Kids Helpline | chat | Chat | 24/7, ages 5 to 25 | kidshelpline.com.au/get-help/webchat-counselling |
| beyond-blue | Beyond Blue | call | 1300 22 4636 | 24/7 | beyondblue.org.au/get-support/talk-to-a-counsellor |
| beyond-blue-chat | Beyond Blue | chat | Chat | 24/7, longer waits 5pm to midnight Melbourne time | beyondblue.org.au/get-support/talk-to-a-counsellor/chat |
| suicide-call-back | Suicide Call Back Service | call | 1300 659 467 | 24/7 | suicidecallbackservice.org.au/contact-us |
| butterfly | The Butterfly Foundation | call | 1800 33 4673 | 8am to midnight AEST, closed national public holidays | butterfly.org.au/get-support/helpline |
| alcohol-drug | National Alcohol and Other Drug Hotline | call | 1800 250 015 | 24/7 | health.gov.au/contacts/national-alcohol-and-other-drug-hotline |
| respect | 1800RESPECT | call | 1800 737 732 | 24/7 | 1800respect.org.au/calling-1800respect |

The 2026-09-26 check read each service's own pages through search results, because the build
machine could not open the sites directly. Dial and open each one by hand before the first release.

## Not shown, and why

- **"Free, any hour, from any phone."** was deleted from Urgent help. Not every row is a free call
  from every phone, and Butterfly is not open every hour.
- **1800RESPECT text, 0458 737 732.** The service warns the number can appear on a phone bill,
  which matters most to the person its safety message is for. Add it only with that warning.
- **13YARN, 13 92 76.** A 24/7 line for Aboriginal and Torres Strait Islander people. A call row,
  so it does not answer the review's ask for a way in without speaking. Add it as its own decision.
