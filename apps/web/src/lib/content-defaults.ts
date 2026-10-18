/**
 * Built-in content defaults — used on first paint before Firestore data
 * arrives, and as a safety net if Firestore is unreachable. These values
 * should stay minimal and stable; everything that should be editable lives
 * in Firestore.
 *
 * The site is English-only. Defaults seed only the English locale; the
 * Translatable wrapper's optional `ar` is intentionally omitted.
 */
import type {
  ChannelDoc,
  FaqDoc,
  NavItem,
  PageDoc,
  QuickLinkItem,
  ResourceDoc,
  SeriesDoc,
  TopicDoc,
  Translatable,
} from './content-schema';

type Id<T> = T & { id: string };

// ---------- Topics ----------

export const DEFAULT_TOPICS: Id<TopicDoc>[] = [
  t('foundations', 0, 'Foundations'),
  t('creed', 1, 'Creed'),
  t('quran', 2, 'Quran'),
  t('prophet', 3, 'Prophet'),
  t('character', 4, 'Character'),
  t('practice', 5, 'Practice'),
  t('comparative-religion', 6, 'Comparative Religion'),
];

function t(slug: string, order: number, label: string): Id<TopicDoc> {
  return {
    id: slug,
    slug,
    order,
    translations: { en: { label } },
    schemaVersion: 1,
  };
}

// ---------- Series ----------

export const DEFAULT_SERIES: Id<SeriesDoc>[] = [
  {
    id: 'foundations-of-islam',
    slug: 'foundations-of-islam',
    order: 0,
    articleSlugs: [
      'what-is-islam',
      'why-did-god-create-you',
      'the-five-pillars',
      '10-things-to-know-about-islam',
    ],
    translations: {
      en: {
        title: 'Foundations of Islam',
        description:
          'Start at the beginning. A short reading order covering what Islam is, why we were created, the core practices, and a ten-point overview for the curious.',
      },
    },
    schemaVersion: 1,
  },
];

// ---------- Resources ----------

export const DEFAULT_RESOURCES: Id<ResourceDoc>[] = [
  r('quranCom', 0, 'https://quran.com/', 'quran', {
    en: {
      title: 'Quran.com',
      description: 'The Noble Quran with translations in many languages.',
    },
  }),
  r('sunnahCom', 1, 'https://sunnah.com/', 'hadith', {
    en: {
      title: 'Sunnah.com',
      description: 'Searchable, authenticated hadith collections with gradings.',
    },
  }),
  r('yaqeen', 2, 'https://yaqeeninstitute.org/', 'research', {
    en: {
      title: 'Yaqeen Institute',
      description: 'Research-driven articles addressing contemporary questions about Islam.',
    },
  }),
  r('bayyinah', 3, 'https://bayyinah.tv/', 'study', {
    en: {
      title: 'Bayyinah TV',
      description: 'Arabic and Quran studies taught by Nouman Ali Khan and the Bayyinah team.',
    },
  }),
  r('islamicAwareness', 4, 'https://www.islamic-awareness.org/', 'research', {
    en: {
      title: 'Islamic Awareness',
      description: 'Scholarly articles on the Quran, early Islam, and comparative religion.',
    },
  }),
];

function r(
  id: string,
  order: number,
  url: string,
  category: string,
  tr: Translatable<{ title: string; description: string }>,
): Id<ResourceDoc> {
  return { id, url, order, category, translations: tr, schemaVersion: 1 };
}

// ---------- FAQs ----------

export const DEFAULT_FAQS: Id<FaqDoc>[] = [
  f('f1', 0, {
    en: {
      question: 'What is Islam, in one sentence?',
      answer:
        'Islam is the voluntary submission of the heart to the one God (Allāh), expressed in worship, ethics, and daily life — a tradition Muslims trace through all the prophets from Noah to Jesus to Muḥammad ﷺ.',
    },
  }),
  f('f2', 1, {
    en: {
      question: 'Do Muslims worship a different God than Christians and Jews?',
      answer:
        'No. Muslims worship the same One God who spoke to Abraham, Moses, and Jesus. "Allāh" is simply the Arabic word for God. Arabic-speaking Christians and Jews also call God "Allāh."',
    },
  }),
  f('f3', 2, {
    en: {
      question: 'Do I have to learn Arabic to be Muslim?',
      answer:
        'No. A Muslim can be of any language. Arabic is the language of the Quran, so many Muslims learn some Arabic for prayer and reading scripture, but full translations are widely available.',
    },
  }),
  f('f4', 3, {
    en: {
      question: 'What are the five pillars of Islam?',
      answer:
        'Testimony of faith (shahāda), daily prayer (ṣalāh), charity (zakāh), fasting in Ramadan (ṣawm), and pilgrimage to Mecca once in a lifetime if able (ḥajj).',
    },
  }),
  f('f5', 4, {
    en: {
      question: 'How do I become Muslim?',
      answer:
        'You sincerely declare the testimony of faith: "There is no god but Allāh, and Muḥammad is the messenger of Allāh." That is the beginning of the path; what follows is a lifetime of learning and growth.',
    },
  }),
  f('f6', 5, {
    en: {
      question: 'I have more questions. Who can I ask?',
      answer:
        'Please use the contact form. We read every message and respond with care — there is no pressure, just conversation.',
    },
  }),
];

function f(
  id: string,
  order: number,
  tr: Translatable<{ question: string; answer: string }>,
): Id<FaqDoc> {
  return { id, order, category: 'general', translations: tr, schemaVersion: 1 };
}

// ---------- Channels ----------

export const DEFAULT_CHANNELS: Id<ChannelDoc>[] = [
  c('efdawah', 0, 'https://www.youtube.com/@EFDawah', {
    en: {
      name: 'EF Dawah',
      description: 'Long-form dialogues and Q&A with people of all backgrounds.',
    },
  }),
  c('yaqeen', 1, 'https://www.youtube.com/@YaqeenInstituteOfficial', {
    en: {
      name: 'Yaqeen Institute',
      description: 'Short, research-driven explainers on contemporary topics.',
    },
  }),
  c('muftimenk', 2, 'https://www.youtube.com/@muftimenkofficial', {
    en: { name: 'Mufti Menk', description: 'Gentle, accessible reminders and life lessons.' },
  }),
];

function c(
  id: string,
  order: number,
  url: string,
  tr: Translatable<{ name: string; description: string }>,
): Id<ChannelDoc> {
  return { id, url, order, translations: tr, schemaVersion: 1 };
}

// ---------- Site settings ----------

export interface SiteSettingDefault<T = Record<string, string>> {
  id: string;
  translations: Translatable<T>;
  data?: Record<string, unknown>;
}

/**
 * Default `brand` setting — site identity used in the navbar, footer, and
 * OG defaults. `logoUrl`/`ogImage` stay empty so the existing accent-dot +
 * default OG fall through until an editor uploads real assets.
 */
export const DEFAULT_BRAND_SETTING: SiteSettingDefault<{
  siteName: string;
  tagline?: string;
}> = {
  id: 'brand',
  translations: {
    en: { siteName: 'The Straight Path', tagline: 'A Clear Path to God' },
  },
  data: { logoUrl: '', ogImage: '' },
};

/**
 * Default ordered nav items. Paths are canonical; the navbar renders the
 * English label directly. `key` is a stable identifier used as a React key
 * and for deep links from other surfaces. `labelAr` is retained at the
 * interface level for legacy doc compatibility but is unused.
 */
export const DEFAULT_NAV_ITEMS: NavItem[] = [
  { to: '/learn', key: 'learn', labelEn: 'Learn about Islam', visible: true, order: 0 },
  { to: '/quran', key: 'quran', labelEn: 'Read the Quran', visible: true, order: 1 },
  {
    to: '/new-muslim-resources',
    key: 'newMuslimResources',
    labelEn: 'New Muslim Resources',
    visible: true,
    order: 2,
  },
  {
    to: '/mobile-billboards',
    key: 'mobileBillboards',
    labelEn: 'Mobile Billboards',
    visible: true,
    order: 3,
  },
  { to: '/faq', key: 'faq', labelEn: 'FAQs', visible: true, order: 4, placement: 'more' },
  {
    to: '/resources',
    key: 'resources',
    labelEn: 'Further Learning',
    visible: true,
    order: 5,
    placement: 'more',
  },
  {
    to: '/social',
    key: 'social',
    labelEn: 'On Social Media',
    visible: true,
    order: 6,
    placement: 'more',
  },
  { to: '/about', key: 'about', labelEn: 'About', visible: true, order: 7, placement: 'more' },
];

/**
 * Default quick-links grid — the four cards at the bottom of the homepage.
 * `to` is canonical (no locale prefix). `labelAr`/`descAr` are retained at
 * the interface level for legacy doc compatibility but are unused.
 */
export const DEFAULT_QUICK_LINKS: QuickLinkItem[] = [
  {
    to: '/social',
    icon: 'users',
    visible: true,
    order: 0,
    labelEn: 'On Social Media',
    descEn: 'Follow trusted voices on YouTube and beyond.',
  },
  {
    to: '/resources',
    icon: 'link',
    visible: true,
    order: 1,
    labelEn: 'Further Learning',
    descEn: 'Quran, hadith, research — a small, carefully-picked list.',
  },
  {
    to: '/faq',
    icon: 'help',
    visible: true,
    order: 2,
    labelEn: 'FAQ',
    descEn: 'Short, honest answers to the questions people most often ask.',
  },
  {
    to: '/contact',
    icon: 'message',
    visible: true,
    order: 3,
    labelEn: 'Get in touch',
    descEn: 'Have a question or want to say hello? Send us a note.',
  },
  {
    to: '/mobile-billboards',
    icon: 'car',
    visible: true,
    order: 4,
    labelEn: 'Mobile Billboards',
    descEn: 'Dawah bumper stickers.',
    image: '/mobile-billboards/01-this-is-the-straight-path.png',
  },
];

export const DEFAULT_SITE_SETTINGS: SiteSettingDefault[] = [
  DEFAULT_BRAND_SETTING as SiteSettingDefault,
  {
    id: 'navItems',
    translations: { en: {} },
    data: { items: DEFAULT_NAV_ITEMS },
  },
  {
    id: 'hero',
    translations: {
      en: {
        eyebrow: 'The Straight Path',
        title: 'A Clear Path to God',
        subtitle:
          'A pastoral, accessible introduction to Islam — organized around learning, scripture, and reflection.',
        ctaPrimary: 'Start Learning',
        ctaSecondary: 'Read the Quran',
      },
    },
  },
  {
    id: 'quranBanner',
    translations: {
      en: {
        eyebrow: 'Read the Quran',
        headline: 'Read the Quran — the word of God, preserved for over 1400 years.',
        body: 'Quran.com offers the Quran in many languages with a simple, clear interface.',
        cta: 'Open Quran.com',
        ctaUrl: 'https://quran.com/',
      },
    },
  },
  {
    id: 'startHere',
    translations: {
      en: {
        eyebrow: 'Start Here',
        title: 'New to Islam? Start here.',
        body: 'Three short articles, in order. Read them in one sitting, or one a day — whichever feels right.',
      },
    },
    data: {
      articleSlugs: ['what-is-islam', 'why-did-god-create-you', '10-things-to-know-about-islam'],
    },
  },
  {
    id: 'learnHeader',
    translations: {
      en: {
        title: 'Learn About Islam',
        description:
          'A curated set of articles introducing the core ideas, character, and practices of Islam — written for readers of any background.',
      },
    },
  },
  {
    id: 'articlesHeader',
    translations: {
      en: {
        title: 'Articles',
        description:
          'Essays on the foundations of Islam — the creed, the Prophet, the Quran, and the path.',
      },
    },
  },
  {
    id: 'quranAbout',
    translations: {
      en: {
        title: 'About the Quran',
        body: 'The Quran is the final revelation from God (Allāh), revealed through the angel Gabriel to the Prophet Muḥammad ﷺ over 23 years. It has been preserved — word for word, in its original Arabic — through both written transmission and continuous memorization across generations.\n\nIt is the central religious text of Islam — a book of guidance, mercy, and wisdom. Muslims believe its preservation is divinely safeguarded, and its message is a continuation of the one sent to earlier prophets: worship God alone, and do good.',
      },
    },
  },
  {
    id: 'footer',
    translations: {
      en: {
        copyright: 'The Straight Path',
      },
    },
  },
  {
    id: 'quickLinks',
    translations: { en: {} },
    data: { items: DEFAULT_QUICK_LINKS },
  },
  {
    id: 'resourcesHeader',
    translations: {
      en: {
        title: 'Further Learning',
        description: '',
      },
    },
  },
  {
    id: 'faqHeader',
    translations: {
      en: {
        title: 'Frequently Asked Questions',
        description: '',
      },
    },
  },
  {
    id: 'socialHeader',
    translations: {
      en: {
        title: 'Helpful Social Media Channels',
        description: '',
      },
    },
  },
  {
    id: 'billboardsHeader',
    translations: {
      en: {
        title: 'Mobile Billboards',
        description:
          'Free Dawah bumper stickers, 11 × 3 inches. Download a design to print yourself, or ask us to mail you some at no cost.',
      },
    },
  },
  {
    id: 'newMuslimHeader',
    translations: {
      en: { title: 'New Muslim Resources' },
    },
  },
  {
    id: 'contactIntro',
    translations: {
      en: {
        eyebrow: '',
        title: 'Contact',
        body: 'Have a question? Need support? We read every message.',
      },
    },
    data: {
      formLabels: {
        en: {
          name: 'Name',
          email: 'Email',
          message: 'Message',
          submit: 'Send message',
          submittingLabel: 'Sending…',
          successTitle: 'Thank you — your message has been received.',
          successBody: "We'll reply soon, in shaa Allah.",
          errorBody: 'Something went wrong. Please try again in a moment.',
        },
      },
      // New-Muslim support services offered from the contact form. All off by
      // default; switch them on from Admin → Site Settings → Contact.
      supportServices: {
        mentor: false,
        quran: false,
        hijab: false,
      },
    },
  },
  {
    id: 'notFound',
    translations: {
      en: {
        eyebrow: 'Error 404',
        title: "We couldn't find that page.",
        body: "The link may be broken, or the page may have moved. If you've wandered off the path, that's alright — let's find your way back.",
      },
    },
    data: {
      popularLinks: [
        {
          to: '/learn',
          labelEn: 'Start learning',
          hintEn: 'A gentle on-ramp',
        },
        {
          to: '/learn/articles',
          labelEn: 'Articles',
          hintEn: 'Essays and explainers',
        },
        {
          to: '/faq',
          labelEn: 'FAQ',
          hintEn: 'Common questions, honest answers',
        },
        {
          to: '/quran',
          labelEn: 'Read the Quran',
          hintEn: 'The words themselves',
        },
        {
          to: '/about',
          labelEn: 'About',
          hintEn: 'Who we are, why we built this',
        },
        {
          to: '/contact',
          labelEn: 'Contact',
          hintEn: "We'll write back",
        },
      ],
    },
  },
  {
    id: 'seo',
    translations: { en: {} },
    data: {
      defaults: {
        titleSuffix: 'The Straight Path',
        defaultDescriptionEn:
          'A pastoral, accessible introduction to Islam. Learn the essentials, read the Quran, and explore a clear path to God.',
        defaultOgImageUrl: '/og-default.png',
      },
      routes: {},
    },
  },
  {
    id: 'homepageSections',
    translations: { en: {} },
    data: {
      sections: [
        { id: 'hero', visible: true, order: 0 },
        { id: 'featured', visible: true, order: 1 },
        { id: 'learnRow', visible: true, order: 2 },
        { id: 'quranBanner', visible: true, order: 3 },
        { id: 'quickLinks', visible: true, order: 4 },
      ],
    },
  },
  {
    id: 'featured',
    translations: { en: {} },
    data: {
      mode: 'newest',
    },
  },
];

// ---------- Editorial pages ----------

export const DEFAULT_PAGES: Omit<Id<PageDoc>, 'createdAt' | 'updatedAt' | 'updatedBy'>[] = [
  {
    id: 'about',
    slug: 'about',
    translations: {
      en: {
        title: 'About The Straight Path',
        body: `The Straight Path is an independent, volunteer effort to share Islam in a calm, reader-first voice. Our aim is not to argue but to invite — to make the essentials of Islam clear, accessible, and honest, for anyone curious enough to open the page.

## Our principles

- **Pastoral, not polemical.** We write as if speaking to a thoughtful stranger over coffee.
- **Source everything.** Quranic verses and authenticated hadith, cited and graded.
- **Non-sectarian.** We teach core Islam and leave sectarian debates at the door.
- **Plain language.** Arabic terms are defined on first use and transliterated consistently.
- **Reader-first.** Every sentence earns its place.

## How we are funded

This project is volunteer-run. Its infrastructure is intentionally minimal — a static React site on Firebase Hosting, cached aggressively. If you'd like to contribute time or translation help, please reach out.`,
      },
    },
    schemaVersion: 1,
  },
  {
    id: 'privacy',
    slug: 'privacy',
    translations: {
      en: {
        title: 'Privacy Policy',
        body: `Last updated: April 2026.

The Straight Path is a content site. We aim to collect as little personal data as possible.

## What we collect

- **Contact form submissions.** When you submit the contact form we store your name, email, and message in Firebase Firestore so we can reply.
- **Basic analytics.** Aggregate, anonymous page-view data via Firebase Analytics. No cross-site tracking.
- **Technical logs.** Firebase Hosting records standard request logs (IP, user-agent) for short periods.

## What we don't do

- We do not sell or share data with advertisers.
- We do not use tracking cookies beyond what's required for the site to work.

## Your rights

You may request deletion of any message you've sent us by emailing the address on the contact page.`,
      },
    },
    schemaVersion: 1,
  },
  {
    id: 'terms',
    slug: 'terms',
    translations: {
      en: {
        title: 'Terms of Use',
        body: `Last updated: April 2026.

The Straight Path is provided free of charge, on an as-is basis, for educational purposes. By using the site you agree to the following:

- Content is offered in good faith; we strive for accuracy but make no guarantees.
- Articles may be quoted with attribution. The source code is available under the MIT License; original text content is under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) unless otherwise noted.
- Please don't abuse the contact form or attempt to disrupt the service for others.`,
      },
    },
    schemaVersion: 1,
  },
];
