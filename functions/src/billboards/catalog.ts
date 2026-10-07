/**
 * Server-side copy of the mobile-billboard catalog: id → the label written
 * to the Notion "Billboard ID" multi-select. Keep in sync with
 * `apps/web/src/lib/billboards.ts` (the web page lists the same ids).
 *
 * Ids are permanent: never renumber or reuse one, even after a design is
 * retired, or old Notion rows will point at the wrong sticker. Notion option
 * names can't contain commas.
 */
export const BILLBOARD_LABELS: Readonly<Record<string, string>> = {
  '01': '01. God Forgave Adam',
  '02': '02. Make the Most of Your Youth (Navy)',
  '03': '03. Make the Most of Your Youth (Cream)',
  '04': '04. My Lord Have Mercy on Them',
  '05': '05. Repel Evil With Good',
  '06': '06. Show Mercy to Those on Earth',
  '07': '07. This Is the Straight Path',
  '08': '08. Who Else Answers',
};

/** Most stickers (all designs together) one order may ask for. */
export const MAX_STICKERS_PER_ORDER = 7;
