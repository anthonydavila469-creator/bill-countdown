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
};

const posts = [
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
    <main className="min-h-screen bg-[#08080c] text-white">
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
              className="block bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 hover:border-orange-500/30 transition-colors group"
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
              <h2 className="text-xl font-semibold mb-2 group-hover:text-orange-400 transition-colors">
                {post.title}
              </h2>
              <p className="text-zinc-400 mb-4">{post.excerpt}</p>
              <span className="inline-flex items-center gap-1 text-orange-400 text-sm font-medium">
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
