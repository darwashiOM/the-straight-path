import { useState } from 'react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

import Container from '@/components/Container';
import SeoHead from '@/components/SeoHead';
import { getDb } from '@/lib/firebase';

type Status = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const [status, setStatus] = useState<Status>('idle');
  const [form, setForm] = useState({ name: '', email: '', message: '', honeypot: '' });

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
      <SeoHead title="Contact" canonical="https://thestraightpath.app/contact" />
      <Container className="py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="font-serif text-5xl font-semibold text-primary-700 dark:text-accent-300">
            Contact
          </h1>
          <p className="mt-4 text-lg text-ink/70 dark:text-paper/70">
            Have a question about Islam? A correction? A thought? We read every message.
          </p>

          {status === 'success' ? (
            <div className="card mt-10 p-6">
              <p className="font-serif text-lg text-primary-700 dark:text-accent-300">
                Thank you — your message has been received.
              </p>
              <p className="mt-2 text-sm text-ink/70 dark:text-paper/70">
                We'll reply soon, inshā'Allāh.
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
              <Field label="Name" required>
                <input
                  required
                  maxLength={120}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input"
                  autoComplete="name"
                />
              </Field>
              <Field label="Email" required>
                <input
                  required
                  type="email"
                  maxLength={200}
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="input"
                  autoComplete="email"
                />
              </Field>
              <Field label="Message" required>
                <textarea
                  required
                  rows={6}
                  maxLength={5000}
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  className="input resize-y"
                />
              </Field>
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-primary"
              >
                {status === 'submitting' ? 'Sending…' : 'Send message'}
              </button>
              {status === 'error' ? (
                <p className="text-sm text-sienna">
                  Something went wrong. Please try again in a moment.
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
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink/80 dark:text-paper/80">
        {label}
        {required ? <span className="ml-1 text-sienna">*</span> : null}
      </span>
      {children}
    </label>
  );
}
