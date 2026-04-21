import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

const channels = [
  {
    name: 'EF Dawah',
    url: 'https://www.youtube.com/@EFDawah',
    description: 'Long-form dialogues and Q&A with people of all backgrounds.',
  },
  {
    name: 'Yaqeen Institute',
    url: 'https://www.youtube.com/@YaqeenInstituteOfficial',
    description: 'Short, research-driven explainers on contemporary topics.',
  },
  {
    name: 'Mufti Menk',
    url: 'https://www.youtube.com/@muftimenkofficial',
    description: 'Gentle, accessible reminders and life lessons.',
  },
];

export default function SocialPage() {
  return (
    <>
      <SeoHead
        title="Islam Explained on Social Media"
        canonical="https://thestraightpath.app/social"
      />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          Islam Explained on Social Media
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          A small, curated list of channels that explain Islam with clarity and good character.
        </p>
        <ul className="mt-12 grid gap-6 md:grid-cols-3">
          {channels.map((c) => (
            <li key={c.url}>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card group flex h-full flex-col p-6"
              >
                <h2 className="font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                  {c.name}
                </h2>
                <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">{c.description}</p>
                <span className="mt-4 text-xs font-semibold text-primary-600 dark:text-accent-400">
                  Visit channel →
                </span>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
