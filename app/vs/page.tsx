import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo Comparisons: vs Rocket Money, YNAB, Prism, Mint & More | Duezo',
  description:
    'Compare Duezo to other bill tracking and budgeting apps. See honest side-by-side comparisons with Rocket Money, YNAB, Chronicle, Prism Bills, Mint, and Copilot Money.',
  keywords: [
    'duezo comparison',
    'bill tracker comparison',
    'budgeting app comparison',
    'mint alternative',
    'prism alternative',
    'rocket money alternative',
  ],
  openGraph: {
    title: 'Compare Duezo to Other Bill Tracking Apps',
    description: 'Honest comparisons between Duezo and popular financial apps. Find the right bill tracker for you.',
    url: 'https://duezo.app/vs',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs' },
};

const comparisons = [
  {
    slug: 'prism',
    title: 'Duezo vs Prism Bills',
    description: 'Prism shut down in Dec 2023. Duezo is the spiritual successor — built for the same people who loved Prism.',
    highlight: 'Most Popular',
    status: 'Prism is shut down',
  },
  {
    slug: 'mint',
    title: 'Duezo vs Mint',
    description: 'Mint shut down in 2024. If you just used it for bill tracking, Duezo is simpler and privacy-focused.',
    status: 'Mint is shut down',
  },
  {
    slug: 'rocket-money',
    title: 'Duezo vs Rocket Money',
    description: 'Rocket Money does a lot. Duezo just tracks bills. If you don\'t need subscription cancellation or budgeting, save money.',
    pricing: 'Duezo: $4.99/mo · Rocket Money: $6–12/mo',
  },
  {
    slug: 'ynab',
    title: 'Duezo vs YNAB',
    description: 'YNAB is the gold standard for budgeting. But if you just want bill tracking, it\'s overkill — and 3x more expensive.',
    pricing: 'Duezo: $4.99/mo · YNAB: $14.99/mo',
  },
  {
    slug: 'copilot-money',
    title: 'Duezo vs Copilot Money',
    description: 'Copilot is premium budgeting at $15/mo. Duezo is bill-focused at $5/mo. Save $120/year if you don\'t need full budgeting.',
    pricing: 'Duezo: $4.99/mo · Copilot: $14.99/mo',
  },
  {
    slug: 'chronicle',
    title: 'Duezo vs Chronicle',
    description: 'Both are $4.99/mo. Chronicle requires manual entry. Duezo scans your email automatically. Same price, less work.',
    pricing: 'Both $4.99/mo',
  },
];

export default function ComparisonsPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo Comparisons',
            url: 'https://duezo.app/vs',
          }),
        }}
      />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 text-sm text-orange-400 mb-6">
          <Search className="w-4 h-4" />
          Honest Comparisons
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          How Duezo Compares to{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            Other Apps
          </span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto">
          Side-by-side comparisons with popular bill tracking and budgeting apps. We&apos;ll be honest about what we do better — and what we don&apos;t.
        </p>
      </section>

      {/* Comparison Grid */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-6">
          {comparisons.map((comp) => (
            <Link
              key={comp.slug}
              href={`/vs/${comp.slug}`}
              className="group relative bg-zinc-900/50 border border-zinc-800 hover:border-orange-500/50 rounded-2xl p-8 transition-all hover:bg-zinc-900/80"
            >
              {comp.highlight && (
                <div className="absolute -top-3 left-6 bg-orange-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  {comp.highlight}
                </div>
              )}
              <h2 className="text-xl font-bold mb-3 group-hover:text-orange-400 transition-colors">
                {comp.title}
              </h2>
              <p className="text-zinc-400 mb-4 leading-relaxed">{comp.description}</p>
              {comp.status && (
                <div className="inline-flex items-center gap-2 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1 text-xs text-zinc-400 mb-4">
                  {comp.status}
                </div>
              )}
              {comp.pricing && (
                <div className="text-sm text-zinc-500 mb-4">{comp.pricing}</div>
              )}
              <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
                Read Comparison <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Why we compare */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 md:p-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Why We Write These Comparisons</h2>
          <div className="space-y-4 text-zinc-300 text-lg leading-relaxed">
            <p>
              Most comparison pages are just SEO bait. They pick a random competitor, say their product is better at everything, and call it a day.
            </p>
            <p>
              We&apos;re trying something different: <strong className="text-white">honest comparisons</strong>.
            </p>
            <p>
              Duezo is great at bill tracking. It&apos;s not great at budgeting, investment tracking, or subscription cancellation. 
              We&apos;ll tell you when another app is a better fit for your needs.
            </p>
            <p className="text-orange-400 font-semibold">
              If you just want to track bills and never miss a payment, Duezo is probably the right choice. If you need more, we&apos;ll tell you.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Want to Try Duezo?</h2>
        <p className="text-zinc-400 text-lg mb-8">
          Simple bill tracking. No bank linking. $4.99/mo.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer links */}
      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
      </div>
    </main>
  );
}
