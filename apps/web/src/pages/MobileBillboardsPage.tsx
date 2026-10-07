import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { ArrowDown, Download, Mail, Minus, Plus, Printer, Trash2 } from 'lucide-react';

import Breadcrumbs from '@/components/Breadcrumbs';
import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { useLocalizedPath } from '@/hooks/useLocalizedPath';
import {
  BILLBOARD_IMAGE_SIZE,
  BILLBOARDS,
  MAX_STICKERS_PER_ORDER,
  billboardDownloadName,
  billboardImage,
  billboardPdf,
  type Billboard,
} from '@/lib/billboards';
import { useSiteSetting } from '@/lib/content';
import { getDb } from '@/lib/firebase';
import { buildBreadcrumbs, canonicalFor, getRouteMeta } from '@/lib/routes';
import { breadcrumbSchema } from '@/lib/schema';
import { cn } from '@/lib/utils';

const PATH = '/mobile-billboards';
const MAX = MAX_STICKERS_PER_ORDER;

type Status = 'idle' | 'submitting' | 'success' | 'error';
type Quantities = Record<string, number>;

const EMPTY_FORM = {
  name: '',
  email: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  honeypot: '',
};

export default function MobileBillboardsPage() {
  const { t } = useTranslation();
  const { locale, localizePath } = useLocalizedPath();
  const meta = getRouteMeta(PATH)!;

  const header = useSiteSetting<{ title: string; description: string }>('billboardsHeader', locale);
  const title = header.data?.value.title || t('billboardsPage.title');
  const description = header.data?.value.description || t('billboardsPage.description');

  const [quantities, setQuantities] = useState<Quantities>({});
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState<Status>('idle');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [orderInView, setOrderInView] = useState(false);
  const orderRef = useRef<HTMLElement>(null);
  const orderTitleRef = useRef<HTMLHeadingElement>(null);

  const selected = BILLBOARDS.filter((b) => (quantities[b.id] ?? 0) > 0);
  const total = selected.reduce((sum, b) => sum + (quantities[b.id] ?? 0), 0);
  const canAddMore = total < MAX;

  // Hide the floating summary once the order form itself is on screen.
  useEffect(() => {
    const el = orderRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) =>
      setOrderInView(Boolean(entry?.isIntersecting)),
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  function setQuantity(id: string, next: number) {
    setValidationError(null);
    setQuantities((prev) => {
      const others = Object.entries(prev).reduce((s, [k, q]) => (k === id ? s : s + q), 0);
      const clamped = Math.max(0, Math.min(next, MAX - others));
      const rest = { ...prev };
      delete rest[id];
      return clamped > 0 ? { ...rest, [id]: clamped } : rest;
    });
  }

  function goToOrder() {
    orderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    orderTitleRef.current?.focus({ preventScroll: true });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.honeypot) return; // bot filled the honeypot
    setValidationError(null);

    if (total === 0) {
      setValidationError(t('billboardsPage.order.chooseOne'));
      return;
    }
    const address = {
      street: form.street.trim().slice(0, 200),
      city: form.city.trim().slice(0, 100),
      state: form.state.trim().slice(0, 40),
      zip: form.zip.trim().slice(0, 20),
    };
    const name = form.name.trim().slice(0, 120);
    if (!name || !address.street || !address.city || !address.state || !address.zip) {
      setValidationError(t('billboardsPage.order.required'));
      return;
    }

    setStatus('submitting');
    try {
      // Field names are whitelisted by firestore.rules; the function
      // `onBillboardOrder` re-checks ids and the 7-sticker total.
      await addDoc(collection(getDb(), 'billboard-orders'), {
        name,
        email: form.email.trim().slice(0, 200),
        address,
        items: Object.fromEntries(selected.map((b) => [b.id, quantities[b.id]])),
        createdAt: serverTimestamp(),
        source: 'mobile-billboards-page',
        locale,
      });
      setStatus('success');
      setForm(EMPTY_FORM);
      setQuantities({});
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  }

  const showBar = total > 0 && !orderInView && status !== 'success';

  return (
    <>
      <SeoHead
        title={title}
        description={description || (locale === 'en' ? meta.description : undefined)}
        canonical={canonicalFor(PATH, locale)}
        alternatePath={PATH}
        jsonLd={breadcrumbSchema([
          { name: t('nav.home'), url: canonicalFor('/', locale) },
          { name: t('nav.mobileBillboards'), url: canonicalFor(PATH, locale) },
        ])}
      />
      <Container className={cn('py-16', showBar && 'pb-32')}>
        <div className="mx-auto max-w-4xl">
          <Breadcrumbs
            items={buildBreadcrumbs(PATH).map((n) => ({
              label: t(n.i18nKey) as string,
              to: n.path === PATH ? undefined : localizePath(n.path),
            }))}
          />
          <h1 className="text-primary-700 dark:text-accent-300 font-serif text-5xl font-semibold">
            {title}
          </h1>
          <p className="text-ink/70 dark:text-paper/70 mt-4 max-w-prose text-lg">{description}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <HowCard
              icon={<Printer size={18} />}
              title={t('billboardsPage.how.printTitle')}
              body={t('billboardsPage.how.printBody')}
            />
            <HowCard
              icon={<Mail size={18} />}
              title={t('billboardsPage.how.mailTitle')}
              body={t('billboardsPage.how.mailBody', { max: MAX })}
            />
          </div>

          <ul className="mt-12 space-y-8">
            {BILLBOARDS.map((b, i) => (
              <BillboardItem
                key={b.id}
                billboard={b}
                eager={i < 2}
                quantity={quantities[b.id] ?? 0}
                canAddMore={canAddMore}
                onChange={(n) => setQuantity(b.id, n)}
              />
            ))}
          </ul>

          <section
            id="order"
            ref={orderRef}
            aria-labelledby="order-title"
            className="card mt-16 scroll-mt-24 p-6 hover:shadow-sm sm:p-8"
          >
            <h2
              id="order-title"
              ref={orderTitleRef}
              tabIndex={-1}
              className="text-primary-700 dark:text-accent-300 font-serif text-3xl font-semibold focus:outline-none"
            >
              {t('billboardsPage.order.title')}
            </h2>

            {status === 'success' ? (
              <div className="mt-4" role="status">
                <p className="text-primary-700 dark:text-accent-300 font-serif text-lg">
                  {t('billboardsPage.order.successTitle')}
                </p>
                <p className="text-ink/70 dark:text-paper/70 mt-2 text-sm">
                  {t('billboardsPage.order.successBody')}
                </p>
                <button type="button" className="btn-ghost mt-6" onClick={() => setStatus('idle')}>
                  {t('billboardsPage.order.orderAgain')}
                </button>
              </div>
            ) : (
              <>
                <p className="text-ink/70 dark:text-paper/70 mt-3">
                  {t('billboardsPage.order.intro', { max: MAX })}
                </p>

                <form onSubmit={onSubmit} className="mt-8 space-y-6">
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

                  <div>
                    <p className="text-ink/80 dark:text-paper/80 text-sm font-semibold">
                      {t('billboardsPage.order.summary')}
                    </p>
                    {selected.length === 0 ? (
                      <p className="text-ink/60 dark:text-paper/60 mt-2 text-sm">
                        {t('billboardsPage.order.empty')}
                      </p>
                    ) : (
                      <>
                        <ul className="divide-primary-500/10 dark:divide-primary-700/40 mt-2 divide-y">
                          {selected.map((b) => (
                            <li key={b.id} className="flex items-center gap-3 py-3">
                              <img
                                src={billboardImage(b)}
                                alt=""
                                width={BILLBOARD_IMAGE_SIZE.width}
                                height={BILLBOARD_IMAGE_SIZE.height}
                                className="hidden h-8 w-auto rounded-sm sm:block"
                              />
                              <span className="text-ink/90 dark:text-paper/90 min-w-0 flex-1 text-sm">
                                <span className="text-ink/50 dark:text-paper/50 me-1.5 tabular-nums">
                                  {b.id}
                                </span>
                                {b.title}
                              </span>
                              <QuantityStepper
                                title={b.title}
                                value={quantities[b.id] ?? 0}
                                canIncrease={canAddMore}
                                onChange={(n) => setQuantity(b.id, n)}
                              />
                            </li>
                          ))}
                        </ul>
                        <p className="text-ink/80 dark:text-paper/80 mt-2 text-sm font-semibold">
                          {t('billboardsPage.order.total', { count: total, max: MAX })}
                        </p>
                      </>
                    )}
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label={t('billboardsPage.order.name')} required>
                      <input
                        required
                        maxLength={120}
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="input"
                        autoComplete="name"
                      />
                    </Field>
                    <Field label={t('billboardsPage.order.email')} required>
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
                  </div>

                  <div className="space-y-4">
                    <p className="text-ink/80 dark:text-paper/80 text-sm font-semibold">
                      {t('billboardsPage.order.addressHeading')}
                    </p>
                    <Field
                      label={t('billboardsPage.order.street')}
                      hint={t('billboardsPage.order.streetHint')}
                      required
                    >
                      <input
                        required
                        maxLength={200}
                        value={form.street}
                        onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                        className="input"
                        autoComplete="street-address"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <Field label={t('billboardsPage.order.city')} required>
                        <input
                          required
                          maxLength={100}
                          value={form.city}
                          onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                          className="input"
                          autoComplete="address-level2"
                        />
                      </Field>
                      <Field label={t('billboardsPage.order.state')} required>
                        <input
                          required
                          maxLength={40}
                          value={form.state}
                          onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                          className="input"
                          autoComplete="address-level1"
                        />
                      </Field>
                      <Field label={t('billboardsPage.order.zip')} required>
                        <input
                          required
                          maxLength={20}
                          inputMode="numeric"
                          value={form.zip}
                          onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
                          className="input"
                          autoComplete="postal-code"
                          dir="ltr"
                        />
                      </Field>
                    </div>
                  </div>

                  <button type="submit" disabled={status === 'submitting'} className="btn-primary">
                    {status === 'submitting'
                      ? t('billboardsPage.order.submitting')
                      : t('billboardsPage.order.submit')}
                  </button>
                  {validationError ? (
                    <p className="text-sienna text-sm" role="alert">
                      {validationError}
                    </p>
                  ) : null}
                  {status === 'error' ? (
                    <p className="text-sienna text-sm" role="alert">
                      {t('billboardsPage.order.error')}
                    </p>
                  ) : null}
                </form>
              </>
            )}
          </section>
        </div>
      </Container>

      {showBar ? (
        <div
          className="border-primary-500/10 bg-paper/95 dark:border-primary-700/40 dark:bg-primary-900/95 fixed inset-x-0 bottom-0 z-40 border-t shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur-md"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <Container className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0" aria-live="polite">
              <p className="text-ink/90 dark:text-paper/90 text-sm font-semibold">
                {t('billboardsPage.bar.selected', { count: total, max: MAX })}
              </p>
              {!canAddMore ? (
                <p className="text-ink/60 dark:text-paper/60 text-xs">
                  {t('billboardsPage.bar.limit')}
                </p>
              ) : null}
            </div>
            <button type="button" onClick={goToOrder} className="btn-primary shrink-0 !py-2.5">
              {t('billboardsPage.bar.continue')} <ArrowDown size={16} />
            </button>
          </Container>
        </div>
      ) : null}
    </>
  );
}

function HowCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="card flex gap-4 p-5 hover:shadow-sm">
      <div className="bg-primary-50 text-primary-700 dark:bg-primary-900 dark:text-accent-300 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
        {icon}
      </div>
      <div>
        <h2 className="text-primary-700 dark:text-accent-300 font-serif text-lg font-semibold">
          {title}
        </h2>
        <p className="text-ink/70 dark:text-paper/70 mt-1 text-sm">{body}</p>
      </div>
    </div>
  );
}

function BillboardItem({
  billboard: b,
  eager,
  quantity,
  canAddMore,
  onChange,
}: {
  billboard: Billboard;
  eager: boolean;
  quantity: number;
  canAddMore: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const alt = b.source ? `${b.text} — ${b.source}` : b.text;

  return (
    <li
      className={cn(
        'card overflow-hidden',
        quantity > 0 && 'ring-accent-400 ring-2 ring-offset-2 ring-offset-transparent',
      )}
    >
      <img
        src={billboardImage(b)}
        alt={alt}
        width={BILLBOARD_IMAGE_SIZE.width}
        height={BILLBOARD_IMAGE_SIZE.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        className="block h-auto w-full"
      />
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-accent-500 text-xs font-semibold uppercase tracking-wider">
            {t('billboardsPage.number', { id: b.id })}
          </p>
          <h2 className="text-primary-700 dark:text-accent-300 mt-1 font-serif text-xl font-semibold">
            {b.title}
          </h2>
          {b.source ? (
            <p className="text-ink/60 dark:text-paper/60 mt-0.5 text-sm">{b.source}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={billboardPdf(b)}
            download={billboardDownloadName(b, 'pdf')}
            aria-label={t('billboardsPage.downloadPdfLabel', { title: b.title })}
            className="btn-ghost !px-3 !py-2"
          >
            <Download size={16} /> {t('billboardsPage.downloadPdf')}
          </a>
          <a
            href={billboardImage(b)}
            download={billboardDownloadName(b, 'png')}
            aria-label={t('billboardsPage.downloadPngLabel', { title: b.title })}
            className="btn-ghost !px-3 !py-2"
          >
            <Download size={16} /> {t('billboardsPage.downloadPng')}
          </a>
          {quantity === 0 ? (
            <button
              type="button"
              onClick={() => onChange(1)}
              disabled={!canAddMore}
              className="btn-primary !px-4 !py-2"
            >
              <Plus size={16} /> {t('billboardsPage.addToOrder')}
            </button>
          ) : (
            <QuantityStepper
              title={b.title}
              value={quantity}
              canIncrease={canAddMore}
              onChange={onChange}
            />
          )}
        </div>
      </div>
    </li>
  );
}

function QuantityStepper({
  title,
  value,
  canIncrease,
  onChange,
}: {
  title: string;
  value: number;
  canIncrease: boolean;
  onChange: (next: number) => void;
}) {
  const { t } = useTranslation();
  const btn =
    'text-primary-700 hover:bg-primary-50 dark:text-paper dark:hover:bg-primary-800 inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div
      role="group"
      aria-label={t('billboardsPage.quantityLabel', { title })}
      className="border-primary-500/20 dark:border-primary-700/60 inline-flex items-center gap-1 rounded-xl border p-0.5"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        aria-label={
          value === 1
            ? t('billboardsPage.remove', { title })
            : t('billboardsPage.decrease', { title })
        }
        className={btn}
      >
        {value === 1 ? <Trash2 size={16} /> : <Minus size={16} />}
      </button>
      <span className="text-ink dark:text-paper min-w-6 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canIncrease}
        aria-label={t('billboardsPage.increase', { title })}
        className={btn}
      >
        <Plus size={16} />
      </button>
    </div>
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
