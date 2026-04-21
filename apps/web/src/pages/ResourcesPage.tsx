import { ExternalLink } from 'lucide-react';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';

interface Resource {
  title: string;
  url: string;
  description: string;
  category: string;
}

const resources: Resource[] = [
  {
    title: 'Quran.com',
    url: 'https://quran.com/',
    description: 'The Noble Qur\'an with translations in many languages.',
    category: 'Qur\'an',
  },
  {
    title: 'Sunnah.com',
    url: 'https://sunnah.com/',
    description: 'Searchable, authenticated hadith collections with gradings.',
    category: 'Hadith',
  },
  {
    title: 'Yaqeen Institute',
    url: 'https://yaqeeninstitute.org/',
    description: 'Research-driven articles addressing contemporary questions about Islam.',
    category: 'Research',
  },
  {
    title: 'Bayyinah TV',
    url: 'https://bayyinah.tv/',
    description: 'Arabic and Qur\'an studies taught by Nouman Ali Khan and the Bayyinah team.',
    category: 'Study',
  },
  {
    title: 'Islamic Awareness',
    url: 'https://www.islamic-awareness.org/',
    description: 'Scholarly articles on the Qur\'an, early Islam, and comparative religion.',
    category: 'Research',
  },
];

export default function ResourcesPage() {
  return (
    <>
      <SeoHead title="Useful External Links" canonical="https://thestraightpath.app/resources" />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          Useful External Links
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          Trusted resources for further study — chosen for their accuracy, accessibility, and tone.
        </p>
        <ul className="mt-12 grid gap-4 md:grid-cols-2">
          {resources.map((r) => (
            <li key={r.url}>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="card group flex h-full flex-col p-6"
              >
                <span className="text-xs font-semibold uppercase tracking-wider text-accent-500">
                  {r.category}
                </span>
                <h2 className="mt-2 flex items-center gap-2 font-serif text-xl font-semibold text-primary-700 group-hover:text-primary-600 dark:text-accent-300">
                  {r.title}
                  <ExternalLink size={14} aria-hidden="true" />
                </h2>
                <p className="mt-2 flex-1 text-sm text-ink/70 dark:text-paper/70">
                  {r.description}
                </p>
              </a>
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
