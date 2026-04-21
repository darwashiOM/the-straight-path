#!/usr/bin/env node
/**
 * Seeds the `brand`, `navItems`, `quickLinks`, and `footerNav` siteSettings
 * docs from the built-in defaults if (and only if) they do not already
 * exist. Idempotent: a second run is a no-op because we skip docs that
 * have already been seeded or edited by an admin.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=/path/to/sa.json \
 *     node scripts/seed-new-site-settings.mjs
 *
 * Or pass the key path explicitly:
 *   node scripts/seed-new-site-settings.mjs /path/to/sa.json
 */
import { readFileSync } from 'node:fs';

import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// -------------------------------------------------------------------------
// Firebase Admin init — mirrors migrate-content-to-firestore.mjs so the
// same credential flow works (positional arg || ADC env var || ADC).
// -------------------------------------------------------------------------

const keyArg = process.argv[2];
const keyEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const keyPath = keyArg || keyEnv;
const app = keyPath
  ? initializeApp({
      credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))),
      projectId: 'the-straight-path-tsp',
    })
  : initializeApp({ credential: applicationDefault(), projectId: 'the-straight-path-tsp' });

const db = getFirestore(app);
const SERVER_TS = FieldValue.serverTimestamp();

// -------------------------------------------------------------------------
// Defaults — kept inline (rather than imported from the TS source) so this
// script runs with plain Node without a build step. Keep these in sync with
// apps/web/src/lib/content-defaults.ts (DEFAULT_BRAND_SETTING /
// DEFAULT_NAV_ITEMS).
// -------------------------------------------------------------------------

const BRAND_SEED = {
  id: 'brand',
  schemaVersion: 1,
  translations: {
    en: { siteName: 'The Straight Path', tagline: 'A Clear Path to God' },
    ar: { siteName: 'الطريق المستقيم', tagline: 'طريق واضح إلى الله' },
  },
  data: { logoUrl: '', ogImage: '' },
};

const NAV_ITEMS_SEED = {
  id: 'navItems',
  schemaVersion: 1,
  translations: { en: {} },
  data: {
    items: [
      { to: '/learn', key: 'learn', labelEn: 'Learn', labelAr: 'تعلّم', visible: true, order: 0 },
      { to: '/quran', key: 'quran', labelEn: "Read the Qur'an", labelAr: 'اقرأ القرآن', visible: true, order: 1 },
      { to: '/resources', key: 'resources', labelEn: 'Resources', labelAr: 'روابط مفيدة', visible: true, order: 2 },
      { to: '/faq', key: 'faq', labelEn: 'Ask Questions', labelAr: 'اطرح سؤالاً', visible: true, order: 3 },
      { to: '/social', key: 'social', labelEn: 'On Social Media', labelAr: 'على وسائل التواصل', visible: true, order: 4 },
      { to: '/about', key: 'about', labelEn: 'About', labelAr: 'من نحن', visible: true, order: 5 },
    ],
  },
};

const QUICK_LINKS_SEED = {
  id: 'quickLinks',
  schemaVersion: 1,
  translations: { en: {} },
  data: {
    items: [
      {
        to: '/social',
        icon: 'users',
        visible: true,
        order: 0,
        labelEn: 'On Social Media',
        labelAr: 'على وسائل التواصل',
        descEn: 'Follow trusted voices on YouTube and beyond.',
        descAr: 'تابع أصواتاً موثوقة على يوتيوب وغيره.',
      },
      {
        to: '/resources',
        icon: 'link',
        visible: true,
        order: 1,
        labelEn: 'Useful External Links',
        labelAr: 'روابط خارجية مفيدة',
        descEn: "Qur'an, hadith, research — a small, carefully-picked list.",
        descAr: 'القرآن، الحديث، البحث — قائمة صغيرة مختارة بعناية.',
      },
      {
        to: '/faq',
        icon: 'help',
        visible: true,
        order: 2,
        labelEn: 'FAQ',
        labelAr: 'الأسئلة الشائعة',
        descEn: 'Short, honest answers to the questions people most often ask.',
        descAr: 'إجابات قصيرة وصادقة على أكثر الأسئلة تكراراً.',
      },
      {
        to: '/contact',
        icon: 'message',
        visible: true,
        order: 3,
        labelEn: 'Get in touch',
        labelAr: 'تواصل معنا',
        descEn: 'Have a question or want to say hello? Send us a note.',
        descAr: 'لديك سؤال أو تود إلقاء التحية؟ أرسل لنا رسالة.',
      },
    ],
  },
};

const FOOTER_NAV_SEED = {
  id: 'footerNav',
  schemaVersion: 1,
  translations: { en: {} },
  data: {
    columns: [
      {
        id: 'learn',
        titleEn: 'Learn',
        titleAr: 'تعلّم',
        order: 0,
        links: [
          { to: '/learn', labelEn: 'Learn', labelAr: 'تعلّم' },
          { to: '/learn/articles', labelEn: 'Articles', labelAr: 'مقالات' },
          { to: '/quran', labelEn: "Read the Qur'an", labelAr: 'اقرأ القرآن' },
        ],
      },
      {
        id: 'community',
        titleEn: 'Community',
        titleAr: 'المجتمع',
        order: 1,
        links: [
          { to: '/resources', labelEn: 'Resources', labelAr: 'روابط مفيدة' },
          { to: '/faq', labelEn: 'FAQ', labelAr: 'الأسئلة الشائعة' },
          { to: '/social', labelEn: 'On Social Media', labelAr: 'على وسائل التواصل' },
        ],
      },
      {
        id: 'project',
        titleEn: 'Project',
        titleAr: 'المشروع',
        order: 2,
        links: [
          { to: '/about', labelEn: 'About', labelAr: 'من نحن' },
          { to: '/contact', labelEn: 'Contact', labelAr: 'تواصل' },
          { to: '/privacy', labelEn: 'Privacy', labelAr: 'الخصوصية' },
          { to: '/terms', labelEn: 'Terms', labelAr: 'الشروط' },
        ],
      },
      {
        id: 'follow',
        titleEn: 'Follow',
        titleAr: 'تابعنا',
        order: 3,
        links: [],
      },
    ],
  },
};

// -------------------------------------------------------------------------
// Additional seeds — page headers, contact copy, 404 page, SEO defaults,
// homepage section ordering, and featured-article selection. Keep in sync
// with DEFAULT_SITE_SETTINGS in apps/web/src/lib/content-defaults.ts.
// -------------------------------------------------------------------------

const RESOURCES_HEADER_SEED = {
  id: 'resourcesHeader',
  schemaVersion: 1,
  translations: {
    en: {
      title: 'Useful External Links',
      description:
        'Trusted resources for further study — chosen for their accuracy, accessibility, and tone.',
    },
    ar: {
      title: 'روابط خارجية مفيدة',
      description: 'موارد موثوقة للمزيد من الدراسة — اخترناها لدقتها ويسرها وطيب أسلوبها.',
    },
  },
};

const FAQ_HEADER_SEED = {
  id: 'faqHeader',
  schemaVersion: 1,
  translations: {
    en: {
      title: 'Ask Questions',
      description:
        'Plain answers to common questions about Islam — and an open door for the rest.',
    },
    ar: {
      title: 'اطرح سؤالاً',
      description: 'إجابات واضحة عن أسئلة شائعة حول الإسلام — وبابٌ مفتوح لما سواها.',
    },
  },
};

const SOCIAL_HEADER_SEED = {
  id: 'socialHeader',
  schemaVersion: 1,
  translations: {
    en: {
      title: 'Islam Explained on Social Media',
      description:
        'A small, curated list of channels that explain Islam with clarity and good character.',
    },
    ar: {
      title: 'الإسلام على وسائل التواصل',
      description: 'قائمة صغيرة مختارة من القنوات التي تشرح الإسلام بوضوح وأدب.',
    },
  },
};

const CONTACT_INTRO_SEED = {
  id: 'contactIntro',
  schemaVersion: 1,
  translations: {
    en: {
      eyebrow: '',
      title: 'Contact',
      body: 'Have a question about Islam? A correction? A thought? We read every message.',
    },
    ar: {
      eyebrow: '',
      title: 'تواصل معنا',
      body: 'هل لديك سؤال عن الإسلام؟ أو تصحيح؟ أو خاطرة؟ نقرأ كل رسالة.',
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
        successBody: "We'll reply soon, inshā'Allāh.",
        errorBody: 'Something went wrong. Please try again in a moment.',
      },
      ar: {
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        message: 'الرسالة',
        submit: 'أرسل الرسالة',
        submittingLabel: 'جارٍ الإرسال…',
        successTitle: 'شكراً — وصلتنا رسالتك.',
        successBody: 'سنردّ قريباً إن شاء الله.',
        errorBody: 'حدث خطأ ما. يرجى المحاولة بعد لحظة.',
      },
    },
  },
};

const NOT_FOUND_SEED = {
  id: 'notFound',
  schemaVersion: 1,
  translations: {
    en: {
      eyebrow: 'Error 404',
      title: "We couldn't find that page.",
      body:
        "The link may be broken, or the page may have moved. If you've wandered off the path, that's alright — let's find your way back.",
    },
    ar: {
      eyebrow: 'خطأ 404',
      title: 'لم نجد هذه الصفحة.',
      body:
        'قد يكون الرابط معطوباً، أو نُقِلت الصفحة. إن ضِلّ بك الطريق فلا بأس — لنعد بك إلى المسار.',
    },
  },
  data: {
    popularLinks: [
      { to: '/learn', labelEn: 'Start learning', labelAr: 'ابدأ التعلّم', hintEn: 'A gentle on-ramp', hintAr: 'بداية هادئة' },
      { to: '/learn/articles', labelEn: 'Articles', labelAr: 'المقالات', hintEn: 'Essays and explainers', hintAr: 'مقالات وشروحات' },
      { to: '/faq', labelEn: 'FAQ', labelAr: 'أسئلة شائعة', hintEn: 'Common questions, honest answers', hintAr: 'أسئلة متكررة بإجابات صادقة' },
      { to: '/quran', labelEn: "Read the Qur'ān", labelAr: 'اقرأ القرآن', hintEn: 'The words themselves', hintAr: 'الكلمات نفسها' },
      { to: '/about', labelEn: 'About', labelAr: 'من نحن', hintEn: 'Who we are, why we built this', hintAr: 'من نحن، ولماذا بنينا هذا' },
      { to: '/contact', labelEn: 'Contact', labelAr: 'تواصل معنا', hintEn: "We'll write back", hintAr: 'سنردّ عليك' },
    ],
  },
};

const SEO_SEED = {
  id: 'seo',
  schemaVersion: 1,
  translations: { en: {} },
  data: {
    defaults: {
      titleSuffix: 'The Straight Path',
      defaultDescriptionEn:
        'A pastoral, accessible introduction to Islam. Learn the essentials, read the Qur’an, and explore a clear path to God.',
      defaultDescriptionAr:
        'مقدمة هادئة ورحيمة عن الإسلام. تعلّم الأساسيات، واقرأ القرآن، واستكشف طريقاً واضحاً إلى الله.',
      defaultOgImageUrl: '/og-default.png',
    },
    routes: {},
  },
};

const HOMEPAGE_SECTIONS_SEED = {
  id: 'homepageSections',
  schemaVersion: 1,
  translations: { en: {} },
  data: {
    sections: [
      { id: 'hero', visible: true, order: 0 },
      { id: 'featured', visible: true, order: 1 },
      { id: 'learnRow', visible: true, order: 2 },
      { id: 'quranBanner', visible: true, order: 3 },
      { id: 'quickLinks', visible: true, order: 4 },
      { id: 'aboutPreview', visible: true, order: 5 },
    ],
  },
};

const FEATURED_SEED = {
  id: 'featured',
  schemaVersion: 1,
  translations: { en: {} },
  data: { mode: 'newest' },
};

// -------------------------------------------------------------------------
// Seed helpers
// -------------------------------------------------------------------------

async function seedIfMissing(seed) {
  const ref = db.collection('siteSettings').doc(seed.id);
  const snap = await ref.get();
  if (snap.exists) {
    console.log(`  ${seed.id}: exists, skipping`);
    return false;
  }
  await ref.set({ ...seed, createdAt: SERVER_TS, updatedAt: SERVER_TS });
  console.log(`  ${seed.id}: seeded`);
  return true;
}

async function main() {
  console.log('Seeding new siteSettings docs…');
  const seeds = [
    BRAND_SEED,
    NAV_ITEMS_SEED,
    QUICK_LINKS_SEED,
    FOOTER_NAV_SEED,
    RESOURCES_HEADER_SEED,
    FAQ_HEADER_SEED,
    SOCIAL_HEADER_SEED,
    CONTACT_INTRO_SEED,
    NOT_FOUND_SEED,
    SEO_SEED,
    HOMEPAGE_SECTIONS_SEED,
    FEATURED_SEED,
  ];
  let created = 0;
  for (const seed of seeds) {
    if (await seedIfMissing(seed)) created++;
  }
  console.log(`Done. ${created} of ${seeds.length} seeded (others already existed).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
