import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, HelpCircle, Link as LinkIcon, Tv } from 'lucide-react';

import {
  listArticles,
  listChannels,
  listFaqs,
  listResources,
} from '@/lib/admin-firestore';

export default function DashboardPage() {
  const articles = useQuery({ queryKey: ['admin', 'articles'], queryFn: listArticles });
  const resources = useQuery({ queryKey: ['admin', 'resources'], queryFn: listResources });
  const faqs = useQuery({ queryKey: ['admin', 'faqs'], queryFn: listFaqs });
  const channels = useQuery({ queryKey: ['admin', 'channels'], queryFn: listChannels });

  const cards = [
    {
      label: 'Articles',
      count: articles.data?.length,
      to: '/admin/articles',
      icon: FileText,
    },
    {
      label: 'Resources',
      count: resources.data?.length,
      to: '/admin/resources',
      icon: LinkIcon,
    },
    { label: 'FAQ', count: faqs.data?.length, to: '/admin/faq', icon: HelpCircle },
    { label: 'Channels', count: channels.data?.length, to: '/admin/channels', icon: Tv },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h2 className="font-serif text-lg text-primary-700">At a glance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, count, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="group rounded-xl border border-primary-100 bg-white p-5 shadow-sm transition-all hover:border-primary-300 hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink/60">{label}</span>
                <Icon className="h-4 w-4 text-primary-400 group-hover:text-primary-600" />
              </div>
              <div className="mt-2 font-serif text-3xl text-primary-700">
                {count ?? '—'}
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-primary-100 bg-white p-6 shadow-sm">
        <h2 className="font-serif text-lg text-primary-700">Getting started</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-ink/70">
          <li>Create or edit an article under Articles.</li>
          <li>
            Anything you publish shows up on the public site immediately — Firestore entries
            override MDX files on slug collision.
          </li>
          <li>
            To add another editor, share their auth UID and register it under Settings.
          </li>
        </ol>
      </section>
    </div>
  );
}
