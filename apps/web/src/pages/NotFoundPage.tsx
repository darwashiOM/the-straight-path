import { Link } from 'react-router-dom';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

export default function NotFoundPage() {
  return (
    <>
      <SeoHead title="Page Not Found" />
      <Container className="py-24 text-center">
        <p className="font-serif text-sm uppercase tracking-widest text-accent-500">Error 404</p>
        <h1 className="mx-auto mt-4 max-w-2xl text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
          We couldn't find that page.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-ink/70 dark:text-paper/70">
          The link may be broken, or the page may have moved. Try one of these instead:
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary">
            Home
          </Link>
          <Link to="/learn/articles" className="btn-ghost">
            Articles
          </Link>
          <Link to="/quran" className="btn-ghost">
            Read the Qur'ān
          </Link>
          <Link to="/contact" className="btn-ghost">
            Contact
          </Link>
        </div>
      </Container>
    </>
  );
}
