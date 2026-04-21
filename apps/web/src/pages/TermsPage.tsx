import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

export default function TermsPage() {
  return (
    <>
      <SeoHead title="Terms of Use" canonical="https://thestraightpath.app/terms" />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            Terms of Use
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>Last updated: April 2026.</p>
            <p>
              The Straight Path is provided free of charge, on an as-is basis, for educational
              purposes. By using the site you agree to the following:
            </p>
            <ul>
              <li>Content is offered in good faith; we strive for accuracy but make no guarantees.</li>
              <li>
                Articles may be quoted with attribution. The source code is available under the
                MIT License; original text content is under{' '}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CC BY 4.0
                </a>{' '}
                unless otherwise noted.
              </li>
              <li>
                Please don't abuse the contact form or attempt to disrupt the service for others.
              </li>
            </ul>
          </div>
        </div>
      </Container>
    </>
  );
}
