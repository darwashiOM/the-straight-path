import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

export default function PrivacyPage() {
  return (
    <>
      <SeoHead title="Privacy Policy" canonical="https://thestraightpath.app/privacy" />
      <Container className="py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            Privacy Policy
          </h1>
          <div className="prose prose-lg mt-8 dark:prose-invert">
            <p>Last updated: April 2026.</p>
            <p>
              The Straight Path is a content site. We aim to collect as little personal data as
              possible.
            </p>
            <h2>What we collect</h2>
            <ul>
              <li>
                <strong>Contact form submissions.</strong> When you submit the contact form we
                store your name, email, and message in Firebase Firestore so we can reply.
              </li>
              <li>
                <strong>Basic analytics.</strong> Aggregate, anonymous page-view data via Firebase
                Analytics. No cross-site tracking.
              </li>
              <li>
                <strong>Technical logs.</strong> Firebase Hosting records standard request logs
                (IP, user-agent) for short periods.
              </li>
            </ul>
            <h2>What we don't do</h2>
            <ul>
              <li>We do not sell or share data with advertisers.</li>
              <li>We do not use tracking cookies beyond what's required for the site to work.</li>
            </ul>
            <h2>Your rights</h2>
            <p>
              You may request deletion of any message you've sent us by emailing the address on
              the contact page.
            </p>
          </div>
        </div>
      </Container>
    </>
  );
}
