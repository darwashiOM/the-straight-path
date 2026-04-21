import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

export default function AboutPage() {
  return (
    <>
      <SeoHead title="About" canonical="https://thestraightpath.app/about" />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            About The Straight Path
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>
              The Straight Path is an independent, volunteer effort to share Islam in a calm,
              reader-first voice. Our aim is not to argue but to invite — to make the essentials
              of Islam clear, accessible, and honest, for anyone curious enough to open the page.
            </p>
            <h2>Our principles</h2>
            <ul>
              <li>
                <strong>Pastoral, not polemical.</strong> We write as if speaking to a thoughtful
                stranger over coffee.
              </li>
              <li>
                <strong>Source everything.</strong> Qur'anic verses and authenticated hadith,
                cited and graded.
              </li>
              <li>
                <strong>Non-sectarian.</strong> We teach core Islam and leave sectarian debates at
                the door.
              </li>
              <li>
                <strong>Plain language.</strong> Arabic terms are defined on first use and
                transliterated consistently.
              </li>
              <li>
                <strong>Reader-first.</strong> Every sentence earns its place.
              </li>
            </ul>
            <h2>How we are funded</h2>
            <p>
              This project is volunteer-run. Its infrastructure is intentionally minimal — a
              static React site on Firebase Hosting, cached aggressively. If you'd like to
              contribute time or translation help, please reach out.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
