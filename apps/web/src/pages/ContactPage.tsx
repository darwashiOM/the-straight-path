import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import { getDb } from '@/lib/firebase';
import { canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';

interface ContactIntroCopy {
  eyebrow?: string;
  title: string;
  body: string;
}

interface ContactFormLabels {
  name: string;
  email: string;
  message: string;
  submit: string;
  submittingLabel: string;
  successTitle: string;
  successBody: string;
  errorBody: string;
}

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const [status, setStatus] = useState<Status>('idle');
  const [form, setForm] = useState({ name: '', email: '', message: '', honeypot: '' });
  const meta = getRouteMeta('/contact')!;

  const intro = useSiteSetting<ContactIntroCopy>('contactIntro', locale);
  const introCopy = intro.data?.value;
  const formLabelsByLocale = intro.data?.data?.formLabels as
    | Record<'en' | 'ar', ContactFormLabels>
    | undefined;
  const labels: ContactFormLabels = formLabelsByLocale?.[locale] ??
    formLabelsByLocale?.en ?? {
      name: t('contactPage.fields.name'),
      email: t('contactPage.fields.email'),
      message: t('contactPage.fields.message'),
      submit: t('contactPage.send'),
      submittingLabel: t('contactPage.sending'),
      successTitle: t('contactPage.thankYou'),
      successBody: t('contactPage.replySoon'),
      errorBody: t('contactPage.error'),
    };
  const title = introCopy?.title || t('contactPage.title');
  const description = introCopy?.body || t('contactPage.description');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return; // bot filled the honeypot
    setStatus('submitting');
    try {
      await addDoc(collection(getDb(), 'contact-submissions'), {
        name: form.name.slice(0, 120),
        email: form.email.slice(0, 200),
        message: form.message.slice(0, 5000),
        createdAt: serverTimestamp(),
        source: 'contact-page',
        locale,
      });
      setStatus('success');
      setForm({ name: '', email: '', message: '', honeypot: '' });
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  return (
    <>
      <SeoHead
        title={title}
        description={description || (locale === 'en' ? meta.description : undefined)}
        canonical={canonicalFor('/contact', locale)}
        alternatePath="/contact"
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.contact'), url: canonicalFor('/contact', locale) },
        ])}
      />
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          {introCopy?.eyebrow ? (
            <p className="text-accent-500 mb-3 font-serif text-sm uppercase tracking-widest">
              {introCopy.eyebrow}
            </p>
          ) : null}
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
            {title}
          </h1>
          <p className="text-ink/70 dark:text-paper/70 mt-4 text-lg">{description}</p>

          {status === 'success' ? (
            <div className="card mt-10 p-6">
              <p className="text-primary-700 dark:text-accent-300 font-serif text-lg">
                {labels.successTitle}
              </p>
              <p className="text-ink/70 dark:text-paper/70 mt-2 text-sm">{labels.successBody}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-10 space-y-5">
              <input
                type="text"
                name="hp-field"
                tabIndex={-1}
                autoComplete="off"
                className="hidden"
                value={form.honeypot}
                onChange={(e) => setForm((f) => ({ ...f, honeypot: e.target.value }))}
                aria-hidden="true"
              />
              <Field label={labels.name} required>
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  autoComplete="name"
                />
              </Field>
              <Field label={labels.email} required>
                <input
                  required
                  type="email"
                  maxLength={200}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  autoComplete="email"
                  dir="ltr"
                />
              </Field>
              <Field label={labels.message} required>
                <textarea
                  required
                  rows={6}
                  maxLength={5000}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="input resize-y"
                />
              </Field>
              <button type="submit" disabled={status === 'submitting'} className="btn-primary">
                {status === 'submitting' ? labels.submittingLabel : labels.submit}
              </button>
              {status === 'error' ? (
                <p className="text-sienna text-sm">{labels.errorBody}</p>
              ) : null}
            </form>
          )}
        </div>
      </Container>
    </>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-ink/80 dark:text-paper/80 mb-2 block text-sm font-semibold">
        {label}
        {required ? <span className="text-sienna ms-1">*</span> : null}
      </span>
      {children}
    </label>
  );
}
