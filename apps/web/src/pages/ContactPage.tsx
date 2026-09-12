import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import { useSiteSetting } from '@/lib/content';
import type { SupportServiceKey, SupportServicesData } from '@/lib/content-schema';
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
type SubmissionType = 'question' | 'support';

const SERVICE_KEYS: SupportServiceKey[] = ['mentor', 'quran', 'hijab'];
/** Services that involve a physical delivery, and therefore need an address. */
const SHIPPED_SERVICES: SupportServiceKey[] = ['quran', 'hijab'];

interface SupportState {
  wanted: boolean;
  requests: Record<SupportServiceKey, boolean>;
  details: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
}

const EMPTY_SUPPORT: SupportState = {
  wanted: false,
  requests: { mentor: false, quran: false, hijab: false },
  details: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
};

const EMPTY_FORM = { name: '', email: '', message: '', honeypot: '' };

export default function ContactPage() {
  const { t } = useTranslation();
  const { locale } = useLocalizedPath();
  const [status, setStatus] = useState<Status>('idle');
  const [submittedType, setSubmittedType] = useState<SubmissionType>('question');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [support, setSupport] = useState<SupportState>(EMPTY_SUPPORT);
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

  // Which support services are switched on in Admin → Site Settings → Contact.
  const serviceFlags = (intro.data?.data?.supportServices ?? {}) as Partial<SupportServicesData>;
  const enabledServices = SERVICE_KEYS.filter((k) => serviceFlags[k] === true);
  const supportAvailable = enabledServices.length > 0;
  const supportActive = supportAvailable && support.wanted;
  const selectedServices = enabledServices.filter((k) => support.requests[k]);
  const needsAddress = selectedServices.some((k) => SHIPPED_SERVICES.includes(k));

  function patchSupport<K extends keyof SupportState>(key: K, value: SupportState[K]) {
    setSupport((s) => ({ ...s, [key]: value }));
  }

  function toggleService(key: SupportServiceKey) {
    setSupport((s) => ({ ...s, requests: { ...s.requests, [key]: !s.requests[key] } }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return; // bot filled the honeypot
    setValidationError(null);

    if (supportActive && selectedServices.length === 0) {
      setValidationError(t('contactPage.support.chooseOne'));
      return;
    }

    const type: SubmissionType = supportActive ? 'support' : 'question';
    const payload: Record<string, unknown> = {
      name: form.name.slice(0, 120),
      email: form.email.slice(0, 200),
      message: form.message.slice(0, 5000),
      createdAt: serverTimestamp(),
      source: 'contact-page',
      locale,
      type,
    };

    if (supportActive) {
      // Only include keys that are set — Firestore rejects `undefined`, and
      // the security rules whitelist exactly these fields.
      const request: Record<string, unknown> = { requests: selectedServices };
      const details = support.details.trim();
      const phone = support.phone.trim();
      if (details) request.details = details.slice(0, 2000);
      if (phone) request.phone = phone.slice(0, 40);
      if (needsAddress) {
        request.address = {
          street: support.street.trim().slice(0, 200),
          city: support.city.trim().slice(0, 100),
          state: support.state.trim().slice(0, 40),
          zip: support.zip.trim().slice(0, 20),
        };
      }
      payload.support = request;
    }

    setStatus('submitting');
    try {
      await addDoc(collection(getDb(), 'contact-submissions'), payload);
      setSubmittedType(type);
      setStatus('success');
      setForm(EMPTY_FORM);
      setSupport(EMPTY_SUPPORT);
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
              <p className="text-ink/70 dark:text-paper/70 mt-2 text-sm">
                {submittedType === 'support'
                  ? t('contactPage.support.successBody')
                  : labels.successBody}
              </p>
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

              {supportAvailable ? (
                <div className="card p-5">
                  <Checkbox
                    checked={support.wanted}
                    onChange={() => patchSupport('wanted', !support.wanted)}
                    label={t('contactPage.support.toggle')}
                    emphasis
                  />

                  {support.wanted ? (
                    <div className="mt-5 space-y-5">
                      <p className="text-ink/70 dark:text-paper/70 text-sm">
                        {t('contactPage.support.intro')}
                      </p>

                      <fieldset>
                        <legend className="text-ink/80 dark:text-paper/80 mb-2 block text-sm font-semibold">
                          {t('contactPage.support.whatLabel')}
                          <span className="text-sienna ms-1">*</span>
                        </legend>
                        <div className="space-y-2">
                          {enabledServices.map((key) => (
                            <Checkbox
                              key={key}
                              checked={support.requests[key]}
                              onChange={() => toggleService(key)}
                              label={t(`contactPage.support.options.${key}`)}
                            />
                          ))}
                        </div>
                      </fieldset>

                      <Field
                        label={t('contactPage.support.details')}
                        hint={t('contactPage.support.detailsHint')}
                      >
                        <textarea
                          rows={4}
                          maxLength={2000}
                          value={support.details}
                          onChange={(e) => patchSupport('details', e.target.value)}
                          className="input resize-y"
                        />
                      </Field>

                      <Field
                        label={t('contactPage.support.phone')}
                        hint={t('contactPage.support.phoneHint')}
                      >
                        <input
                          type="tel"
                          maxLength={40}
                          value={support.phone}
                          onChange={(e) => patchSupport('phone', e.target.value)}
                          className="input"
                          autoComplete="tel"
                          dir="ltr"
                        />
                      </Field>

                      {needsAddress ? (
                        <div className="space-y-4">
                          <div>
                            <p className="text-ink/80 dark:text-paper/80 text-sm font-semibold">
                              {t('contactPage.support.addressHeading')}
                            </p>
                            <p className="text-ink/60 dark:text-paper/60 mt-1 text-xs">
                              {t('contactPage.support.addressHint')}
                            </p>
                          </div>
                          <Field label={t('contactPage.support.street')} required>
                            <input
                              required
                              maxLength={200}
                              value={support.street}
                              onChange={(e) => patchSupport('street', e.target.value)}
                              className="input"
                              autoComplete="street-address"
                            />
                          </Field>
                          <div className="grid gap-4 sm:grid-cols-3">
                            <Field label={t('contactPage.support.city')} required>
                              <input
                                required
                                maxLength={100}
                                value={support.city}
                                onChange={(e) => patchSupport('city', e.target.value)}
                                className="input"
                                autoComplete="address-level2"
                              />
                            </Field>
                            <Field label={t('contactPage.support.state')} required>
                              <input
                                required
                                maxLength={40}
                                value={support.state}
                                onChange={(e) => patchSupport('state', e.target.value)}
                                className="input"
                                autoComplete="address-level1"
                              />
                            </Field>
                            <Field label={t('contactPage.support.zip')} required>
                              <input
                                required
                                maxLength={20}
                                inputMode="numeric"
                                value={support.zip}
                                onChange={(e) => patchSupport('zip', e.target.value)}
                                className="input"
                                autoComplete="postal-code"
                                dir="ltr"
                              />
                            </Field>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <button type="submit" disabled={status === 'submitting'} className="btn-primary">
                {status === 'submitting' ? labels.submittingLabel : labels.submit}
              </button>
              {validationError ? (
                <p className="text-sienna text-sm" role="alert">
                  {validationError}
                </p>
              ) : null}
              {status === 'error' ? (
                <p className="text-sienna text-sm" role="alert">
                  {labels.errorBody}
                </p>
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
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
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
      {hint ? (
        <span className="text-ink/60 dark:text-paper/60 mt-1.5 block text-xs">{hint}</span>
      ) : null}
    </label>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
  emphasis,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
  emphasis?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-primary-500 mt-0.5 h-4 w-4 shrink-0 cursor-pointer"
      />
      <span
        className={
          emphasis
            ? 'text-ink/90 dark:text-paper/90 text-sm font-semibold'
            : 'text-ink/80 dark:text-paper/80 text-sm'
        }
      >
        {label}
      </span>
    </label>
  );
}
