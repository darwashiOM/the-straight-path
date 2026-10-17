/**
 * Links shown on /new-muslim-resources under "Links for Resources".
 *
 * Groups and links render in file order, which mirrors the list the team
 * compiled on Linktree. To add, remove, or reorder a link, edit this file.
 * Thumbnails are 160 × 160 WebP files in apps/web/public/new-muslim-resources/
 * (the site's or app's own icon, or the video's thumbnail, cropped square).
 */

/** Fallback icon shown in the round badge if the thumbnail fails to load. */
export type NewMuslimLinkIcon = 'book' | 'scroll' | 'pdf' | 'video' | 'app';

export interface NewMuslimLink {
  id: string;
  title: string;
  /** Small grey line under the title: the site, platform, or file type. */
  note: string;
  url: string;
  /** Site path of the square thumbnail, e.g. `/new-muslim-resources/quran-com.webp`. */
  image: string;
  icon: NewMuslimLinkIcon;
}

export interface NewMuslimLinkGroup {
  id: 'documents' | 'videos' | 'ios' | 'android';
  title: string;
  links: NewMuslimLink[];
}

const IMAGE_DIR = '/new-muslim-resources';

export const NEW_MUSLIM_LINK_GROUPS: NewMuslimLinkGroup[] = [
  {
    id: 'documents',
    title: 'Helpful Links & Documents',
    links: [
      {
        id: 'quran-com',
        title: 'The Noble Qur’an – Quran.com',
        note: 'quran.com',
        url: 'https://quran.com/',
        image: `${IMAGE_DIR}/quran-com.webp`,
        icon: 'book',
      },
      {
        id: 'sunnah-com',
        title: 'Sunnah.com – Sayings and Teachings of Prophet Muhammad ﷺ',
        note: 'sunnah.com',
        url: 'https://sunnah.com/',
        image: `${IMAGE_DIR}/sunnah-com.webp`,
        icon: 'scroll',
      },
      {
        id: 'prayer-guide',
        title: 'Prayer Guide',
        note: 'PDF document',
        url: 'https://cdn.shopify.com/s/files/1/0813/3610/7286/files/MP_Book_English.pdf?v=1706228154',
        image: `${IMAGE_DIR}/prayer-guide.webp`,
        icon: 'pdf',
      },
    ],
  },
  {
    id: 'videos',
    title: 'Helpful Videos',
    links: [
      {
        id: 'wudu-video',
        title: 'Video Guide to Wudu (Ablution)',
        note: 'YouTube · Green Lane Masjid',
        url: 'https://www.youtube.com/watch?v=2xS70Zn-jRk',
        image: `${IMAGE_DIR}/wudu-video.webp`,
        icon: 'video',
      },
      {
        id: 'prayer-video',
        title: 'How do Muslims Pray? (All 5 Prayers)',
        note: 'YouTube · Green Lane Masjid',
        url: 'https://www.youtube.com/watch?v=4zr6tNgmKSI',
        image: `${IMAGE_DIR}/prayer-video.webp`,
        icon: 'video',
      },
    ],
  },
  {
    id: 'ios',
    title: 'Helpful Apps · iPhone & iPad',
    links: [
      {
        id: 'namaz-ios',
        title: 'Namaz App: Learn Salah (Prayer)',
        note: 'App Store',
        url: 'https://apps.apple.com/us/app/namaz-app-learn-salah-prayer/id1447056625',
        image: `${IMAGE_DIR}/namaz-ios.webp`,
        icon: 'app',
      },
      {
        id: 'muslim-pro-ios',
        title: 'Muslim Pro: Qur’an & Prayer Times',
        note: 'App Store',
        url: 'https://apps.apple.com/us/app/muslim-pro-quran-prayer-times/id388389451',
        image: `${IMAGE_DIR}/muslim-pro-ios.webp`,
        icon: 'app',
      },
      {
        id: 'quran-ios',
        title: 'Quran App',
        note: 'App Store · by Quran.com',
        url: 'https://apps.apple.com/us/app/quran-by-quran-com-%D9%82%D8%B1%D8%A2%D9%86/id1118663303',
        image: `${IMAGE_DIR}/quran-ios.webp`,
        icon: 'book',
      },
    ],
  },
  {
    id: 'android',
    title: 'Helpful Apps · Android',
    links: [
      {
        id: 'namaz-android',
        title: 'Namaz App: Learn Salah (Prayer)',
        note: 'Google Play · listed as “Namaz: learning for beginners”',
        url: 'https://play.google.com/store/apps/details?id=com.nurios.namazapp',
        image: `${IMAGE_DIR}/namaz-android.webp`,
        icon: 'app',
      },
      {
        id: 'muslim-pro-android',
        title: 'Muslim Pro: Qur’an & Prayer Times',
        note: 'Google Play',
        url: 'https://play.google.com/store/apps/details?id=com.bitsmedia.android.muslimpro',
        image: `${IMAGE_DIR}/muslim-pro-android.webp`,
        icon: 'app',
      },
      {
        id: 'quran-android',
        title: 'Quran App',
        note: 'Google Play · by Quran.com',
        url: 'https://play.google.com/store/apps/details?id=com.quran.labs.androidquran',
        image: `${IMAGE_DIR}/quran-android.webp`,
        icon: 'book',
      },
    ],
  },
];
