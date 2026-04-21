import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import RootLayout from '@/layouts/RootLayout';
import LoadingScreen from '@/components/LoadingScreen';

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

export default function App() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route index element={<HomePage />} />
          <Route path="learn" element={<LearnPage />} />
          <Route path="learn/articles" element={<ArticleIndexPage />} />
          <Route path="learn/articles/:slug" element={<ArticlePage />} />
          <Route path="quran" element={<QuranPage />} />
          <Route path="resources" element={<ResourcesPage />} />
          <Route path="faq" element={<FaqPage />} />
          <Route path="social" element={<SocialPage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="terms" element={<TermsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
