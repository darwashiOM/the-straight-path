import { Suspense, lazy, useEffect, type ReactElement } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import RootLayout from '@/layouts/RootLayout';
import LoadingScreen from '@/components/LoadingScreen';
import { localeFromPath } from '@/lib/i18n';

const HomePage = lazy(() => import('@/pages/HomePage'));
const LearnPage = lazy(() => import('@/pages/LearnPage'));
const ArticleIndexPage = lazy(() => import('@/pages/ArticleIndexPage'));
const ArticlePage = lazy(() => import('@/pages/ArticlePage'));
const QuranPage = lazy(() => import('@/pages/QuranPage'));
const ResourcesPage = lazy(() => import('@/pages/ResourcesPage'));
const FaqPage = lazy(() => import('@/pages/FaqPage'));
const SocialPage = lazy(() => import('@/pages/SocialPage'));
const AboutPage = lazy(() => import('@/pages/AboutPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));
const TermsPage = lazy(() => import('@/pages/TermsPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));

/**
 * Keeps i18next in lock-step with the route. The URL is the single source of
 * truth — `/ar/...` renders Arabic RTL, everything else renders English LTR.
 * Browser back/forward, deep links, and the <LanguageSwitcher> <Link> all
 * flow through here.
 */
function LocaleSync() {
  const { pathname } = useLocation();
  const { i18n } = useTranslation();
  useEffect(() => {
    const desired = localeFromPath(pathname);
    if (i18n.language !== desired) void i18n.changeLanguage(desired);
  }, [pathname, i18n]);
  return null;
}

/**
 * The shared page tree. Rendered twice inside <Routes> — once at the root
 * (English) and once nested under `ar` (Arabic). Keeping it in one place
 * guarantees the two locales never drift structurally.
 */
function pageRoutes(keyPrefix: string): ReactElement[] {
  return [
    <Route key={`${keyPrefix}-index`} index element={<HomePage />} />,
    <Route key={`${keyPrefix}-learn`} path="learn" element={<LearnPage />} />,
    <Route key={`${keyPrefix}-articles`} path="learn/articles" element={<ArticleIndexPage />} />,
    <Route
      key={`${keyPrefix}-article`}
      path="learn/articles/:slug"
      element={<ArticlePage />}
    />,
    <Route key={`${keyPrefix}-quran`} path="quran" element={<QuranPage />} />,
    <Route key={`${keyPrefix}-resources`} path="resources" element={<ResourcesPage />} />,
    <Route key={`${keyPrefix}-faq`} path="faq" element={<FaqPage />} />,
    <Route key={`${keyPrefix}-social`} path="social" element={<SocialPage />} />,
    <Route key={`${keyPrefix}-about`} path="about" element={<AboutPage />} />,
    <Route key={`${keyPrefix}-contact`} path="contact" element={<ContactPage />} />,
    <Route key={`${keyPrefix}-privacy`} path="privacy" element={<PrivacyPage />} />,
    <Route key={`${keyPrefix}-terms`} path="terms" element={<TermsPage />} />,
    <Route key={`${keyPrefix}-404`} path="*" element={<NotFoundPage />} />,
  ];
}

export default function App() {
  return (
    <>
      <LocaleSync />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route element={<RootLayout />}>
            {pageRoutes('en')}
            <Route path="ar">{pageRoutes('ar')}</Route>
          </Route>
        </Routes>
      </Suspense>
    </>
  );
}
