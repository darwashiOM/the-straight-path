# Contact form: notifications & support requests

How a contact-form submission flows, and the one-time setup needed for the
email + Notion notifications.

```
/contact form ──▶ Firestore `contact-submissions/{id}`
                        │
                        ▼  Cloud Function `onContactSubmission`
                ┌───────┴────────┐
                ▼                ▼
        Notion database     Email (Resend)
        (team queue)        [Straight Path Contact] …
```

Firestore is the source of truth. Each channel is independent: if one fails
the other still runs, and the outcome of both is written back to the document
under `notifications` (`ok: true/false`, with the error text if any).

## What the form collects

- **Always:** name, email, message.
- **Optionally** (when at least one support service is switched on in admin):
  an "I'm a new Muslim and would like support" checkbox that reveals
  - which services are wanted: Mentor / Qur'an / Hijab (one or more),
  - a free-text details box (hijab style, Qur'an language, mentor hopes…),
  - an optional phone number,
  - a US shipping address (street, city, state, ZIP) — required only when a
    Qur'an or hijab is requested. Shipping is US-only.

## Switching support services on / off

Admin → Site Settings → **Contact page intro + form labels** → _New-Muslim
support requests_. Tick the services you can currently offer and **Save**.

- A service that is off does not appear on the form at all.
- When all three are off, the whole support section disappears.
- No deploy needed; the public page reads the setting live.

## One-time setup

### 1. Resend (email)

1. Create an account at <https://resend.com> and add the domain
   `thestraightpath.org` under **Domains**.
2. Resend shows DNS records to add (a DKIM `TXT` record, and an `MX` + `TXT`
   pair on a `send` subdomain for bounces). Add them in Namecheap → Advanced
   DNS, then click **Verify** in Resend. Propagation can take a few minutes.
3. Create an API key (**API Keys → Create**, permission "Sending access").
4. Store it as a Firebase secret (paste the key when prompted):

   ```bash
   firebase functions:secrets:set RESEND_API_KEY
   ```

Every notification email has the subject prefix **`[Straight Path Contact]`**.
In Outlook, create a rule: _subject contains_ `[Straight Path Contact]` →
move to a folder / flag / alert. Replying to the email replies to the visitor
(the visitor's address is set as reply-to).

### 2. Notion (team queue)

1. **Create an internal integration:** Notion → Settings → Connections →
   _Develop or manage integrations_ → **New integration**. Pick your
   workspace, type _Internal_. Under Capabilities keep _Insert content_ (and
   _Read user information_ if you want "Assigned To" filled). Save and copy
   the **Internal Integration Secret**.
2. **Share the database with it:** open the Contact submissions database as a
   full page → `⋯` menu → **Connections** → _Add connection_ → pick the
   integration.
3. **Database columns** (names are case-sensitive and must match exactly):

   | Column            | Type         | Filled with                              |
   | ----------------- | ------------ | ---------------------------------------- |
   | `Name`            | Title        | visitor name                             |
   | `Email`           | Email        | visitor email                            |
   | `Submitted date`  | Date         | when the form was sent                   |
   | `Type`            | Multi-select | `Question` or `Support`                  |
   | `Message Preview` | Text         | first ~300 chars (full text in the page) |
   | `Request`         | Multi-select | `Mentor`, `Quran`, `Hijab`               |
   | `Phone`           | Phone        | optional                                 |
   | `Address`         | Text         | US shipping address (one line)           |
   | `Status`          | Status       | left at the default (e.g. _Not started_) |
   | `Assigned To`     | Person       | optional, see `NOTION_ASSIGNEE_ID`       |
   | `Firestore ID`    | Text         | document id, for tracing                 |

   The full message, support details, phone and address are also written into
   the page body, so nothing is cut off.

4. **Database id:** open the database as a full page; the URL looks like
   `https://www.notion.so/<workspace>/<32 hex chars>?v=…`. The 32-character
   run is the id.
5. Store the secret and the id:

   ```bash
   firebase functions:secrets:set NOTION_API_KEY
   ```

   and put the id in `functions/.env` (copy from `functions/.env.example`).

6. **Get notified:** in the database, click the ⚡ (Automations) icon →
   **New automation** → trigger _Page added_ → action _Send notification to_
   → choose the people → **Save**. Notion will push to phone/desktop for every
   new row. (Database automations need a paid Notion plan.)

### 3. Function params — `functions/.env`

```
CONTACT_NOTIFY_EMAIL=you@example.com            # comma-separate for several inboxes
CONTACT_FROM_EMAIL=The Straight Path <contact@thestraightpath.org>
NOTION_DATABASE_ID=<32 hex chars>
NOTION_ASSIGNEE_ID=                              # optional Notion user id
```

`functions/.env` is git-ignored; it is bundled with the function at deploy
time. A channel whose config is missing is skipped with a warning in the
logs, so the function is safe to deploy before everything is set up.

### 4. Deploy

Hosting deploys automatically when `main` is updated. Rules and functions are
deployed by hand:

```bash
pnpm deploy:rules
```

```bash
pnpm deploy:functions
```

## Troubleshooting

- Open the submission in Firestore (`contact-submissions/{id}`) and look at
  `notifications.notion` / `notifications.email`. `ok: false` carries the
  provider's error text (e.g. a Notion property name that doesn't match).
- Function logs: `firebase functions:log --only onContactSubmission`.
- Emails landing in spam usually means the Resend domain isn't verified yet
  (DKIM record missing or not propagated).
- Property names in Notion are defined once in
  `functions/src/contact/notion.ts` (`NOTION_PROPS`) if a column is renamed.
