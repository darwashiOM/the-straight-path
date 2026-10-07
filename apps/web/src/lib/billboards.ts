/**
 * Mobile billboards (Dawah bumper stickers, 11 × 3 in) shown on
 * /mobile-billboards. Files live in `public/mobile-billboards/`, named
 * `<id>-<slug>.png` / `.pdf`.
 *
 * To add a design: drop its PNG (2000 × 545) and single-page PDF in that
 * folder, add an entry here, and add the same id to
 * `functions/src/billboards/catalog.ts` (that file holds the Notion label).
 * Ids are permanent: never renumber or reuse one. If you replace a file,
 * give it a new name too; images are cached by browsers for a year.
 */

export interface Billboard {
  /** Permanent two-digit id, also the order key and Notion label prefix. */
  id: string;
  /** Short name used in the gallery, the order summary and Notion. */
  title: string;
  /** The words on the sticker, for screen readers and search. */
  text: string;
  /** Who said it / where it's from, if the sticker cites a source. */
  source?: string;
  /** File name without extension, inside `/mobile-billboards/`. */
  file: string;
}

export const MAX_STICKERS_PER_ORDER = 7;

/** Pixel size of every PNG (11:3). */
export const BILLBOARD_IMAGE_SIZE = { width: 2000, height: 545 } as const;

export const BILLBOARDS: Billboard[] = [
  {
    id: '01',
    title: 'This Is the Straight Path',
    text: 'God is my Lord and your Lord, so worship Him. This is the straight path.',
    source: 'Jesus (Qur’an 3:51)',
    file: '01-this-is-the-straight-path',
  },
  {
    id: '02',
    title: 'Make the Most of Your Youth (Navy)',
    text: 'Make the most of your youth before old age.',
    source: 'Prophet Muhammad',
    file: '02-make-the-most-of-your-youth-navy',
  },
  {
    id: '03',
    title: 'Make the Most of Your Youth (Cream)',
    text: 'Make the most of your youth before old age.',
    source: 'Prophet Muhammad',
    file: '03-make-the-most-of-your-youth-cream',
  },
  {
    id: '04',
    title: 'God Forgave Adam',
    text: 'God forgave Adam. And no one had to die.',
    file: '04-god-forgave-adam',
  },
  {
    id: '05',
    title: 'My Lord, Have Mercy on Them',
    text: 'My Lord, have mercy on them, as they cared for me when I was little.',
    source: 'Qur’an 17:24',
    file: '05-my-lord-have-mercy-on-them',
  },
  {
    id: '06',
    title: 'Repel Evil With Good',
    text: 'Repel evil with good, and your enemy will become your dearest friend.',
    source: 'Qur’an 41:34',
    file: '06-repel-evil-with-good',
  },
  {
    id: '07',
    title: 'Show Mercy to Those on Earth',
    text: 'Show mercy to those on earth, and the One in heaven will show mercy to you.',
    source: 'Prophet Muhammad',
    file: '07-show-mercy-to-those-on-earth',
  },
  {
    id: '08',
    title: 'Who Else Answers',
    text: 'Who else answers the desperate when they cry out to Him?',
    source: 'Qur’an 27:62',
    file: '08-who-else-answers',
  },
];

export function billboardImage(b: Billboard): string {
  return `/mobile-billboards/${b.file}.png`;
}

export function billboardPdf(b: Billboard): string {
  return `/mobile-billboards/${b.file}.pdf`;
}

/** Friendly file name for the browser's download prompt. */
export function billboardDownloadName(b: Billboard, ext: 'png' | 'pdf'): string {
  return `The Straight Path - ${b.id} ${b.title}.${ext}`;
}
