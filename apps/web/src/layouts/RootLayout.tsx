import { Outlet } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PreviewBanner from '@/components/PreviewBanner';

export default function RootLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <PreviewBanner />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
