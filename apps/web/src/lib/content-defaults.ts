/**
 * Built-in content defaults — used on first paint before Firestore data
 * arrives, and as a safety net if Firestore is unreachable. These values
 * should stay minimal and stable; everything that should be editable lives
 * in Firestore.
 *
 * Defaults are authored in English; public loaders fall back to `en` when
 * an Arabic variant is missing.
 */
import type {
  ChannelDoc,
  FaqDoc,
  PageDoc,
  ResourceDoc,
  SeriesDoc,
  TopicDoc,
  Translatable,
} from './content-schema';

type Id<T> = T & { id: string };

// ---------- Topics ----------

export const DEFAULT_TOPICS: Id<TopicDoc>[] = [
  t('foundations', 0, { en: 'Foundations', ar: 'الأساسيات' }),
  t('creed', 1, { en: 'Creed', ar: 'العقيدة' }),
  t('quran', 2, { en: "Qur'an", ar: 'القرآن' }),
  t('prophet', 3, { en: 'Prophet', ar: 'النبي ﷺ' }),
  t('character', 4, { en: 'Character', ar: 'الأخلاق' }),
  t('practice', 5, { en: 'Practice', ar: 'العبادة' }),
  t('comparative-religion', 6, { en: 'Comparative Religion', ar: 'مقارنة الأديان' }),
];

function t(slug: string, order: number, label: Translatable<string>): Id<TopicDoc> {
  return {
    id: slug,
    slug,
    order,
    translations: { en: { label: label.en }, ar: label.ar ? { label: label.ar } : undefined },
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
      ar: {
        title: 'أساسيات الإسلام',
        description:
          'ابدأ من البداية. ترتيب قراءة قصير يغطي ماهية الإسلام، ولماذا خُلقنا، والعبادات الأساسية، ونظرة عامة في عشر نقاط للمهتم.',
      },
    },
    schemaVersion: 1,
  },
];

// ---------- Resources ----------

export const DEFAULT_RESOURCES: Id<ResourceDoc>[] = [
  r('quranCom', 0, 'https://quran.com/', 'quran', {
    en: { title: 'Quran.com', description: "The Noble Qur'an with translations in many languages." },
    ar: { title: 'Quran.com', description: 'القرآن الكريم مع ترجماته بلغات متعددة.' },
  }),
  r('sunnahCom', 1, 'https://sunnah.com/', 'hadith', {
    en: { title: 'Sunnah.com', description: 'Searchable, authenticated hadith collections with gradings.' },
    ar: { title: 'Sunnah.com', description: 'مجموعات الحديث الموثّقة قابلة للبحث، مع درجاتها.' },
  }),
  r('yaqeen', 2, 'https://yaqeeninstitute.org/', 'research', {
    en: { title: 'Yaqeen Institute', description: 'Research-driven articles addressing contemporary questions about Islam.' },
    ar: { title: 'معهد يقين', description: 'مقالات بحثية تعالج الأسئلة المعاصرة عن الإسلام.' },
  }),
  r('bayyinah', 3, 'https://bayyinah.tv/', 'study', {
    en: { title: 'Bayyinah TV', description: "Arabic and Qur'an studies taught by Nouman Ali Khan and the Bayyinah team." },
    ar: { title: 'Bayyinah TV', description: 'دروس في العربية والقرآن يقدمها نعمان علي خان وفريق البينة.' },
  }),
  r('islamicAwareness', 4, 'https://www.islamic-awareness.org/', 'research', {
    en: { title: 'Islamic Awareness', description: "Scholarly articles on the Qur'an, early Islam, and comparative religion." },
    ar: { title: 'Islamic Awareness', description: 'مقالات أكاديمية عن القرآن وصدر الإسلام والأديان المقارنة.' },
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
    ar: {
      question: 'ما هو الإسلام في جملة واحدة؟',
      answer:
        'الإسلام هو الاستسلام الطوعي للقلب لله الواحد، ويتجلى في العبادة والأخلاق وحياة اليوم — وهو تقليد يرى المسلمون أنه ممتد عبر جميع الأنبياء من نوح إلى عيسى إلى محمد ﷺ.',
    },
  }),
  f('f2', 1, {
    en: {
      question: 'Do Muslims worship a different God than Christians and Jews?',
      answer:
        'No. Muslims worship the same One God who spoke to Abraham, Moses, and Jesus. "Allāh" is simply the Arabic word for God. Arabic-speaking Christians and Jews also call God "Allāh."',
    },
    ar: {
      question: 'هل يعبد المسلمون إلهاً مختلفاً عن إله المسيحيين واليهود؟',
      answer:
        'لا. يعبد المسلمون الإله الواحد نفسه الذي كلّم إبراهيم وموسى وعيسى. و«الله» هي كلمة عربية تعني الإله. والمسيحيون واليهود الناطقون بالعربية يُسمّون الله أيضاً «الله».',
    },
  }),
  f('f3', 2, {
    en: {
      question: 'Do I have to learn Arabic to be Muslim?',
      answer:
        "No. A Muslim can be of any language. Arabic is the language of the Qur'ān, so many Muslims learn some Arabic for prayer and reading scripture, but full translations are widely available.",
    },
    ar: {
      question: 'هل يجب تعلّم العربية لأكون مسلماً؟',
      answer:
        'لا. يمكن للمسلم أن يكون من أي لغة. العربية هي لغة القرآن، فيتعلم كثير من المسلمين شيئاً منها للصلاة وقراءة الكتاب، لكن الترجمات الكاملة متاحة على نطاق واسع.',
    },
  }),
  f('f4', 3, {
    en: {
      question: 'What are the five pillars of Islam?',
      answer:
        'Testimony of faith (shahāda), daily prayer (ṣalāh), charity (zakāh), fasting in Ramadan (ṣawm), and pilgrimage to Mecca once in a lifetime if able (ḥajj).',
    },
    ar: {
      question: 'ما هي أركان الإسلام الخمسة؟',
      answer: 'شهادة التوحيد، والصلاة، والزكاة، وصوم رمضان، وحجّ البيت لمن استطاع إليه سبيلاً مرة في العمر.',
    },
  }),
  f('f5', 4, {
    en: {
      question: 'How do I become Muslim?',
      answer:
        'You sincerely declare the testimony of faith: "There is no god but Allāh, and Muḥammad is the messenger of Allāh." That is the beginning of the path; what follows is a lifetime of learning and growth.',
    },
    ar: {
      question: 'كيف أصبح مسلماً؟',
      answer:
        'تُعلِن شهادة التوحيد صادقاً: «أشهد أن لا إله إلا الله وأشهد أنّ محمداً رسول الله». هذه بداية الطريق، وما بعدها حياةٌ من التعلّم والنمو.',
    },
  }),
  f('f6', 5, {
    en: {
      question: 'I have more questions. Who can I ask?',
      answer:
        'Please use the contact form. We read every message and respond with care — there is no pressure, just conversation.',
    },
    ar: {
      question: 'لديّ أسئلة أخرى. بمن أتصل؟',
      answer: 'يرجى استخدام نموذج التواصل. نقرأ كل رسالة ونردّ عليها بعناية — لا ضغط، بل حوار.',
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
    en: { name: 'EF Dawah', description: 'Long-form dialogues and Q&A with people of all backgrounds.' },
    ar: { name: 'EF Dawah', description: 'حوارات مطوّلة وأسئلة وأجوبة مع أناس من خلفيات متنوعة.' },
  }),
  c('yaqeen', 1, 'https://www.youtube.com/@YaqeenInstituteOfficial', {
    en: { name: 'Yaqeen Institute', description: 'Short, research-driven explainers on contemporary topics.' },
    ar: { name: 'معهد يقين', description: 'شروحات قصيرة قائمة على البحث لمواضيع معاصرة.' },
  }),
  c('muftimenk', 2, 'https://www.youtube.com/@muftimenkofficial', {
    en: { name: 'Mufti Menk', description: 'Gentle, accessible reminders and life lessons.' },
    ar: { name: 'مفتي منك', description: 'تذكيرات لطيفة ودروس حياتية ميسّرة.' },
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

export const DEFAULT_SITE_SETTINGS: SiteSettingDefault[] = [
  {
    id: 'hero',
    translations: {
      en: {
        eyebrow: 'The Straight Path',
        title: 'A Clear Path to God',
        subtitle:
          'A pastoral, accessible introduction to Islam — organized around learning, scripture, and reflection.',
        ctaPrimary: 'Start Learning',
        ctaSecondary: "Read the Qur'an",
      },
      ar: {
        eyebrow: 'الطريق المستقيم',
        title: 'طريق واضح إلى الله',
        subtitle: 'مقدمة هادئة ورحيمة عن الإسلام — مُنظَّمة حول التعلم والكتاب والتأمل.',
        ctaPrimary: 'ابدأ التعلّم',
        ctaSecondary: 'اقرأ القرآن',
      },
    },
  },
  {
    id: 'quranBanner',
    translations: {
      en: {
        eyebrow: "Read the Qur'an",
        headline: "Read the Qur'ān — the word of God, preserved for over 1400 years.",
        body: "Quran.com offers the Qur'ān in many languages with a simple, clear interface.",
        cta: 'Open Quran.com',
        ctaUrl: 'https://quran.com/',
      },
      ar: {
        eyebrow: 'اقرأ القرآن',
        headline: 'اقرأ القرآن الكريم — كلام الله، محفوظاً منذ أكثر من 1400 عام.',
        body: 'يُوفِّر موقع Quran.com القرآن الكريم بلغات متعددة، بواجهة بسيطة وواضحة.',
        cta: 'افتح Quran.com',
        ctaUrl: 'https://quran.com/',
      },
    },
  },
  {
    id: 'aboutPreview',
    translations: {
      en: {
        eyebrow: 'About Us',
        headline: 'An invitation, not an argument.',
        body:
          'The Straight Path is a small, independent effort to share Islam in a calm, reader-first voice — pastoral rather than polemical, for seekers of every background.',
        cta: 'Read more about our mission',
      },
      ar: {
        eyebrow: 'من نحن',
        headline: 'دعوةٌ، لا مجادلة.',
        body:
          'الطريق المستقيم جهد صغير مستقل لمشاركة الإسلام بصوتٍ هادئ يراعي القارئ — رعوي لا جدلي، لكل باحث من أيّ خلفية.',
        cta: 'اقرأ المزيد عن رسالتنا',
      },
    },
  },
  {
    id: 'startHere',
    translations: {
      en: {
        eyebrow: 'Start Here',
        title: 'New to Islam? Start here.',
        body:
          'Three short articles, in order. Read them in one sitting, or one a day — whichever feels right.',
      },
      ar: {
        eyebrow: 'ابدأ من هنا',
        title: 'جديد على الإسلام؟ ابدأ من هنا.',
        body: 'ثلاث مقالات قصيرة بالترتيب. اقرأها في جلسة واحدة، أو واحدة في اليوم — كما يناسبك.',
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
      ar: {
        title: 'تعلّم عن الإسلام',
        description: 'مجموعة مختارة من المقالات تُعرِّف بأفكار الإسلام الجوهرية وأخلاقه وعباداته — مكتوبة لقرّاء من أيّ خلفية.',
      },
    },
  },
  {
    id: 'articlesHeader',
    translations: {
      en: {
        title: 'Articles',
        description: "Essays on the foundations of Islam — the creed, the Prophet, the Qur'an, and the path.",
      },
      ar: {
        title: 'المقالات',
        description: 'مقالات في أسس الإسلام — العقيدة، والنبي ﷺ، والقرآن، والطريق.',
      },
    },
  },
  {
    id: 'quranAbout',
    translations: {
      en: {
        title: "About the Qur'ān",
        body:
          "The Qur'ān is the final revelation from God (Allāh), revealed through the angel Gabriel to the Prophet Muḥammad ﷺ over 23 years. It has been preserved — word for word, in its original Arabic — through both written transmission and continuous memorization across generations.\n\nIt is the central religious text of Islam — a book of guidance, mercy, and wisdom. Muslims believe its preservation is divinely safeguarded, and its message is a continuation of the one sent to earlier prophets: worship God alone, and do good.",
      },
      ar: {
        title: 'عن القرآن الكريم',
        body:
          'القرآن هو الوحي الخاتم من الله، أنزله جبريل عليه السلام على النبي محمد ﷺ على مدى ثلاث وعشرين سنة. وقد حُفِظ — حرفاً حرفاً، بلغته العربية الأصلية — نقلاً مكتوباً وحفظاً متواصلاً جيلاً بعد جيل.\n\nوهو الكتاب المركزي في الإسلام — كتاب هداية ورحمة وحكمة. ويؤمن المسلمون أن حفظه مكفول بعناية الله، وأن رسالته امتداد لما بُعث به الأنبياء السابقون: اعبدوا الله وحده، واعملوا الخير.',
      },
    },
  },
  {
    id: 'footer',
    translations: {
      en: {
        copyright: 'The Straight Path. All rights reserved.',
        madeWith: 'Built with care and in service.',
      },
      ar: {
        copyright: 'الطريق المستقيم. جميع الحقوق محفوظة.',
        madeWith: 'بُنِي بعناية وخدمةً لله.',
      },
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
- **Source everything.** Qur'anic verses and authenticated hadith, cited and graded.
- **Non-sectarian.** We teach core Islam and leave sectarian debates at the door.
- **Plain language.** Arabic terms are defined on first use and transliterated consistently.
- **Reader-first.** Every sentence earns its place.

## How we are funded

This project is volunteer-run. Its infrastructure is intentionally minimal — a static React site on Firebase Hosting, cached aggressively. If you'd like to contribute time or translation help, please reach out.`,
      },
      ar: {
        title: 'عن الطريق المستقيم',
        body: `الطريق المستقيم جهد مستقل تطوعي لمشاركة الإسلام بصوتٍ هادئ يراعي القارئ. هدفنا ليس المجادلة بل الدعوة — أن نُقدّم أساسيات الإسلام واضحةً ميسّرةً صادقة، لكل فضوليٍّ يفتح الصفحة.

## مبادئنا

- **رعوي، لا جدلي.** نكتب كأنّنا نحدِّث غريباً متأمّلاً على فنجان قهوة.
- **التوثيق دائماً.** آيات القرآن والأحاديث الموثّقة، موثَّقةً ومدرّجة.
- **غير طائفيّ.** نُعلِّم الإسلام الجامع ونترك النقاشات الطائفية خارج الباب.
- **لغة واضحة.** نُعرِّف المصطلحات العربية عند أول استخدام، ونضبط رسمها بانتظام.
- **القارئ أولاً.** كلّ جملة تستحق مكانها.

## كيف نموّل هذا المشروع

هذا المشروع يديره متطوعون. بنيته التحتية بسيطة قصداً — موقع React ثابت على Firebase Hosting مع تخزين مؤقت قوي. إذا أردت المساهمة بالوقت أو الترجمة، تواصل معنا.`,
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
