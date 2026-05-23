import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FileText, HelpCircle, Link as LinkIcon, Tv } from 'lucide-react';

import { listArticles, listChannels, listFaqs, listResources } from '@/lib/admin-firestore';

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
        <h2 className="text-primary-700 font-serif text-lg">At a glance</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ label, count, to, icon: Icon }) => (
            <Link
              key={label}
              to={to}
              className="border-primary-100 hover:border-primary-300 group rounded-xl border bg-white p-5 shadow-sm transition-all hover:shadow-md"
            >
              <div className="flex items-center justify-between">
                <span className="text-ink/60 text-sm font-medium">{label}</span>
                <Icon className="text-primary-400 group-hover:text-primary-600 h-4 w-4" />
              </div>
              <div className="text-primary-700 mt-2 font-serif text-3xl">{count ?? '—'}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="border-primary-100 rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-primary-700 font-serif text-lg">Getting started</h2>
        <ol className="text-ink/70 mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>Create or edit an article under Articles.</li>
          <li>
            Anything you publish shows up on the public site immediately — Firestore entries
            override MDX files on slug collision.
          </li>
          <li>To add another editor, share their auth UID and register it under Settings.</li>
        </ol>
      </section>
    </div>
  );
}
