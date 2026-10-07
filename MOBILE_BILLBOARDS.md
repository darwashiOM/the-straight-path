# Mobile Billboards: gallery & sticker orders

`/mobile-billboards` shows the Dawah bumper stickers (11 × 3 in). Visitors
can download each design (print-ready PDF, or PNG for phones) or choose up
to **7 stickers in total** and ask us to mail them (US addresses only).

```
/mobile-billboards order form ──▶ Firestore `billboard-orders/{id}`
                                        │
                                        ▼  Cloud Function `onBillboardOrder`
                                re-checks ids + 7-sticker total
                                ┌───────┴────────┐
                                ▼                ▼
                     Notion "Mobile Billboard   Email (Resend)
                     Orders" database           Straight Path Mobile Billboard Order from …
```

Firestore is the source of truth. An order that fails the server checks gets
`status: 'rejected'` (with `rejectedReason`) and sends nothing. Otherwise each
channel's outcome is written back under `notifications`, like the contact
form.

## Notion database

Uses the **same Notion integration** (`NOTION_API_KEY`) as the contact form.
Share the database with it: open the database as a full page → `•••` →
**Connections** → add the integration.

| Column         | Type          | Filled with                                         |
| -------------- | ------------- | --------------------------------------------------- |
| `Name`         | Title         | customer name                                       |
| `Email`        | Email         | customer email                                      |
| `Address`      | Place or Text | see below                                           |
| `Billboard ID` | Multi-select  | e.g. `01. God Forgave Adam` (options auto-create)   |
| `Quantity`     | Number        | total stickers in the order                         |
| `Items`        | Text          | _optional_: `2 × 01. God Forgave Adam` per line     |
| `Assigned To`  | Person        | optional, see `BILLBOARD_ORDERS_NOTION_ASSIGNEE_ID` |
| `Order Status` | Status        | left at its default                                 |
| `Created time` | Created time  | set by Notion                                       |

**Address.** If the column is a _Place_ (map) property, the function looks the
address up with the free US Census geocoder and pins it on the map (Notion's
API only accepts coordinates). If no match is found (typo, new building, PO
box), the map cell stays empty and the page body says so. If the column is
_Text_, the address is written as one line. Either way the full address,
including any apartment number, is in the page body.

Put the database id (32 hex characters from its URL) in `functions/.env`:

```
BILLBOARD_ORDERS_NOTION_DATABASE_ID=<32 hex chars>
BILLBOARD_ORDERS_NOTION_ASSIGNEE_ID=        # optional Notion user id
```

Alerts: in the database, ⚡ **Automations** → _Page added_ → _Send
notification to_ → pick people.

## Emails

**To the team:** sent to `CONTACT_NOTIFY_EMAIL` from `CONTACT_FROM_EMAIL`
(same as the contact form). Subject: `Straight Path Mobile Billboard Order from
<name>`; reply-to is the customer.

**To the customer:**

- **"We got your order"**: right after they order, listing their stickers
  and address.
- **"Your Mobile Billboards are on the way"**: when the team sets the Notion
  row's **Order Status** to **Shipped**. The scheduled function
  `notifyShippedBillboardOrders` checks Notion every 10 minutes, so the email
  arrives within about 10 minutes. It uses the name, email, Items and Address
  from the Notion row, so fix any typo there _before_ marking it Shipped. Each
  row is emailed once (recorded in `billboard-shipped-emails/{notionPageId}`);
  only rows changed in the last 3 days are checked.

Customer emails come from `no-reply@thestraightpath.org`
(`BILLBOARD_ORDERS_FROM_EMAIL`), sent by Resend like every other site email;
no inbox exists at that address. They say replies aren't read and point to
the contact form. To accept replies instead, set `BILLBOARD_ORDERS_REPLY_TO`
in `functions/.env` to a real inbox and redeploy functions. The option name
that means "mailed" is `BILLBOARD_ORDERS_SHIPPED_STATUS` (default `Shipped`).
It doesn't matter who changes the status in Notion.

## Adding a new design

1. Export a 2000 × 545 PNG and a **single-page** 11 × 3 in PDF.
2. Save both in `apps/web/public/mobile-billboards/` as `NN-short-name.png`
   / `.pdf`, using the next unused number.
3. Add an entry to `apps/web/src/lib/billboards.ts`.
4. Add the same id and its Notion label to
   `functions/src/billboards/catalog.ts` (no commas: Notion forbids them).
5. Deploy functions, then merge to `main` for the website.

Never renumber or reuse an id: old Notion rows would point at the wrong
sticker. If you replace a file, give it a new name too, because browsers
cache images for a year.

## Page copy, nav and homepage card

- Page title/intro: Admin → Site Settings → **Mobile Billboards header**.
- Header link: Admin → Site Settings → **Navigation** → add `/mobile-billboards`.
- Homepage card: Admin → Site Settings → **Quick links** → add a card with
  path `/mobile-billboards`, icon _Car_, and image
  `/mobile-billboards/01-this-is-the-straight-path.png`.

## Deploy

```bash
pnpm deploy:rules
```

```bash
pnpm deploy:functions
```

Hosting deploys automatically when `main` is updated.

## Troubleshooting

- Look at the order in Firestore (`billboard-orders/{id}`): `status`,
  `rejectedReason`, `notifications.notion` / `notifications.email`.
- Logs: `firebase functions:log --only onBillboardOrder` and
  `firebase functions:log --only notifyShippedBillboardOrders`.
- "On the way" email not sent: check `billboard-shipped-emails/{notionPageId}`
  in Firestore (`ok`, `error`, `attempts`; it stops after 3 failures).
- Column names are defined in `functions/src/billboards/notion.ts`
  (`ORDER_NOTION_PROPS`).
