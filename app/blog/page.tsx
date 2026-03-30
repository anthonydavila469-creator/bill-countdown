import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Blog | Duezo — Bill Tracking Tips & Guides',
  description:
    'Tips, comparisons, and guides to help you stay on top of your bills. From the team behind Duezo.',
  openGraph: {
    title: 'Duezo Blog — Bill Tracking Tips & Guides',
    description: 'Tips, comparisons, and guides for bill tracking.',
    url: 'https://duezo.app/blog',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/blog' },
  other: { lastmod: '2026-03-26' },
};

const posts = [
  {
    slug: 'duezo-faq',
    title: 'Duezo FAQ — Everything You Want to Know About the App',
    excerpt:
      'Real questions, honest answers. From how the AI works to whether it\'s actually free — everything people ask about Duezo, answered in plain English.',
    date: '2026-03-26',
    readTime: '10 min read',
  },
  {
    slug: 'never-miss-a-bill-payment',
    title: 'Never Miss a Bill Payment Again: 7 Tips + The App That Automates It',
    excerpt:
      'Late fees cost Americans $14 billion a year. Here is how to stop missing bill due dates for good — including the app that does it automatically.',
    date: '2026-03-01',
    readTime: '7 min read',
  },
  {
    slug: 'why-simple-bill-tracker-beats-budgeting-apps',
    title: 'Why a Simple Bill Tracker Beats Complex Budgeting Apps',
    excerpt:
      'YNAB, Copilot, Rocket Money — they do a lot. But if you just want to stop missing due dates, a simple bill tracker beats a complex budgeting app every time.',
    date: '2026-02-26',
    readTime: '6 min read',
  },
  {
    slug: 'best-bill-reminder-app-2026',
    title: 'Best Bill Reminder App 2026 — Ranked by What Actually Works',
    excerpt:
      'We tested the top apps that send bill payment reminders before the due date. Here is what actually works in 2026.',
    date: '2026-02-24',
    readTime: '8 min read',
  },
  {
    slug: 'bill-tracker-no-bank-account',
    title: "Best Bill Tracker Apps That Don't Require a Bank Account (2026)",
    excerpt:
      "Most bill tracking apps want your bank login. You don't have to give it. Here are the best alternatives that work without linking a bank account.",
    date: '2026-02-19',
    readTime: '6 min read',
  },
  {
    slug: 'best-prism-alternatives-2026',
    title: 'Best Prism Alternatives in 2026',
    excerpt:
      'Prism shut down in December 2023. Here are the best bill tracking apps to replace it — compared honestly.',
    date: '2026-02-11',
    readTime: '8 min read',
  },
];

export default function BlogPage() {
  return (
    <main className="min-h-screen bg-[#0F0A1E] text-white">
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">Blog</h1>
        <p className="text-lg text-zinc-400 mb-12">
          Tips, comparisons, and guides to help you never miss a bill.
        </p>

        <div className="space-y-6">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="block bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-violet-500/30 transition-colors group"
            >
              <div className="flex items-center gap-3 text-sm text-zinc-500 mb-3">
                <Calendar className="w-4 h-4" />
                <time dateTime={post.date}>
                  {new Date(post.date).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                <span>·</span>
                <span>{post.readTime}</span>
              </div>
              <h2 className="text-xl font-semibold mb-2 group-hover:text-violet-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-zinc-400 mb-4">{post.excerpt}</p>
              <span className="inline-flex items-center gap-1 text-violet-400 text-sm font-medium">
                Read more <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/vs/rocket-money" className="hover:text-zinc-300 transition-colors">Duezo vs Rocket Money</Link>
        <Link href="/vs/ynab" className="hover:text-zinc-300 transition-colors">Duezo vs YNAB</Link>
      </div>
    </main>
  );
}
