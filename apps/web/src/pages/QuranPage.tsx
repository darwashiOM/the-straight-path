import { ArrowRight } from 'lucide-react';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

export default function QuranPage() {
  return (
    <>
      <SeoHead title="Read the Qur'an" canonical="https://thestraightpath.app/quran" />
      <section className="bg-gradient-to-b from-primary-50 to-paper py-24 dark:from-primary-800 dark:to-primary-900">
        <Container className="text-center">
          <p className="font-serif text-sm uppercase tracking-widest text-accent-500">
            The Noble Qur'ān
          </p>
          <h1 className="mx-auto mt-3 max-w-3xl text-balance font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300 md:text-6xl">
            Read the word of God, preserved for over 1400 years.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-ink/70 dark:text-paper/80">
            We recommend Quran.com — a trusted, free resource that offers the Qur'ān in many
            languages with a simple and beautiful interface.
          </p>
          <a
            href="https://quran.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary mt-8"
          >
            Open Quran.com <ArrowRight size={16} />
          </a>
        </Container>
      </section>

      <section className="py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <h2 className="font-serif text-3xl font-semibold text-primary-700 dark:text-accent-300">
              About the Qur'ān
            </h2>
            <div className="prose prose-lg mt-6 dark:prose-invert">
              <p>
                The Qur'ān is the final revelation from God (Allāh), revealed through the angel
                Gabriel to the Prophet Muḥammad ﷺ over 23 years. It has been preserved — word for
                word, in its original Arabic — through both written transmission and continuous
                memorization across generations.
              </p>
              <p>
                It is the central religious text of Islam — a book of guidance, mercy, and wisdom.
                Muslims believe its preservation is divinely safeguarded, and its message is a
                continuation of the one sent to earlier prophets: worship God alone, and do good.
              </p>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
