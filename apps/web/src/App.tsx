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

const AdminLayout = lazy(() => import('@/layouts/AdminLayout'));
const LoginPage = lazy(() => import('@/pages/admin/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/admin/DashboardPage'));
const ArticlesListPage = lazy(() => import('@/pages/admin/ArticlesListPage'));
const ArticleEditorPage = lazy(() => import('@/pages/admin/ArticleEditorPage'));
const ResourcesAdminPage = lazy(() => import('@/pages/admin/ResourcesAdminPage'));
const FaqAdminPage = lazy(() => import('@/pages/admin/FaqAdminPage'));
const ChannelsAdminPage = lazy(() => import('@/pages/admin/ChannelsAdminPage'));
const SettingsPage = lazy(() => import('@/pages/admin/SettingsPage'));
const SiteSettingsPage = lazy(() => import('@/pages/admin/SiteSettingsPage'));
const ActivityPage = lazy(() => import('@/pages/admin/ActivityPage'));
const SeriesAdminPage = lazy(() => import('@/pages/admin/SeriesAdminPage'));
const TopicsAdminPage = lazy(() => import('@/pages/admin/TopicsAdminPage'));
const PagesAdminPage = lazy(() => import('@/pages/admin/PagesAdminPage'));
const MediaPage = lazy(() => import('@/pages/admin/MediaPage'));

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
        <Route path="admin/login" element={<LoginPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="articles" element={<ArticlesListPage />} />
          <Route path="articles/new" element={<ArticleEditorPage />} />
          <Route path="articles/:id" element={<ArticleEditorPage />} />
          <Route path="resources" element={<ResourcesAdminPage />} />
          <Route path="faq" element={<FaqAdminPage />} />
          <Route path="channels" element={<ChannelsAdminPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="site" element={<SiteSettingsPage />} />
          <Route path="activity" element={<ActivityPage />} />
          <Route path="series" element={<SeriesAdminPage />} />
          <Route path="topics" element={<TopicsAdminPage />} />
          <Route path="pages" element={<PagesAdminPage />} />
          <Route path="media" element={<MediaPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
