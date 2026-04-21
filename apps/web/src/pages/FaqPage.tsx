import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'What is Islam, in one sentence?',
    a: 'Islam is the voluntary submission of the heart to the one God (Allāh), expressed in worship, ethics, and daily life — a tradition Muslims trace through all the prophets from Noah to Jesus to Muḥammad ﷺ.',
  },
  {
    q: 'Do Muslims worship a different God than Christians and Jews?',
    a: 'No. Muslims worship the same One God who spoke to Abraham, Moses, and Jesus. "Allāh" is simply the Arabic word for God. Arabic-speaking Christians and Jews also call God "Allāh."',
  },
  {
    q: 'Do I have to learn Arabic to be Muslim?',
    a: 'No. A Muslim can be of any language. Arabic is the language of the Qur\'ān, so many Muslims learn some Arabic for prayer and reading scripture, but full translations are widely available.',
  },
  {
    q: 'What are the five pillars of Islam?',
    a: 'Testimony of faith (shahāda), daily prayer (ṣalāh), charity (zakāh), fasting in Ramadan (ṣawm), and pilgrimage to Mecca once in a lifetime if able (ḥajj).',
  },
  {
    q: 'How do I become Muslim?',
    a: 'You sincerely declare the testimony of faith: "There is no god but Allāh, and Muḥammad is the messenger of Allāh." That is the beginning of the path; what follows is a lifetime of learning and growth.',
  },
  {
    q: 'I have more questions. Who can I ask?',
    a: 'Please use the contact form. We read every message and respond with care — there is no pressure, just conversation.',
  },
];

export default function FaqPage() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <>
      <SeoHead
        title="Frequently Asked Questions"
        canonical="https://thestraightpath.app/faq"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
      <Container className="py-16">
        <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
          Ask Questions
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink/70 dark:text-paper/70">
          Plain answers to common questions about Islam — and an open door for the rest.
        </p>
        <ul className="mx-auto mt-12 max-w-3xl divide-y divide-primary-500/10 dark:divide-primary-700/40">
          {faqs.map((f, i) => (
            <li key={f.q}>
              <button
                type="button"
                onClick={() => setOpen(open === i ? null : i)}
                aria-expanded={open === i}
                className="flex w-full items-center justify-between gap-4 py-5 text-left"
              >
                <span className="font-serif text-lg font-semibold text-primary-700 dark:text-accent-300">
                  {f.q}
                </span>
                <ChevronDown
                  size={20}
                  className={cn(
                    'shrink-0 text-primary-600 transition-transform dark:text-accent-400',
                    open === i && 'rotate-180',
                  )}
                />
              </button>
              {open === i ? (
                <p className="animate-fade-in pb-5 pr-10 text-ink/70 dark:text-paper/70">{f.a}</p>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </>
  );
}
