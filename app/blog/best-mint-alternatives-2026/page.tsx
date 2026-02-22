import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Star } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Mint Alternatives in 2026 — What Actually Replaced Mint? | Duezo',
  description:
    'Mint shut down in March 2024. We ranked the best Mint alternatives for 2026: Duezo, Credit Karma, YNAB, Copilot, and more. Find the real replacement.',
  keywords: [
    'best mint alternatives 2026',
    'mint alternative',
    'what replaced mint',
    'mint app replacement',
    'mint shut down alternative',
    'intuit mint alternative',
    'credit karma mint replacement',
    'bill tracker app',
  ],
  openGraph: {
    title: 'Best Mint Alternatives in 2026 — Honest Comparison',
    description:
      'Mint shut down. Credit Karma is not a real replacement. Here are the apps that actually fill the gap.',
    url: 'https://duezo.app/blog/best-mint-alternatives-2026',
    siteName: 'Duezo',
    type: 'article',
  },
  alternates: { canonical: 'https://duezo.app/blog/best-mint-alternatives-2026' },
};

const schemaData = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Best Mint Alternatives in 2026',
  description:
    'Mint shut down in March 2024. Here are the best alternatives for tracking bills and budgets in 2026.',
  datePublished: '2026-02-22',
  dateModified: '2026-02-22',
  author: { '@type': 'Person', name: 'Anthony Davila' },
  publisher: {
    '@type': 'Organization',
    name: 'Duezo',
    url: 'https://duezo.app',
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://duezo.app/blog/best-mint-alternatives-2026',
  },
};

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best Mint alternative in 2026?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The best Mint alternative depends on what you actually used Mint for. For bill tracking and due-date management, Duezo is the closest replacement — it scans your email automatically and shows countdown timers for upcoming bills. For full budgeting, YNAB or Copilot Money are stronger options. Credit Karma, despite Intuit pushing it, is not a real Mint replacement.',
      },
    },
    {
      '@type': 'Question',
      name: 'Why did Mint shut down?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Intuit shut down Mint in March 2024 after acquiring it in 2009. Intuit redirected Mint users to Credit Karma, which it also owns. The shutdown affected approximately 24 million users who had used Mint for budgeting and bill tracking.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is Credit Karma a good Mint replacement?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Credit Karma focuses on credit score monitoring and financial product recommendations — it is a lead-generation tool for credit cards and loans, not a budgeting or bill-tracking app. It does not have the spending categorization, bill management, or budget features that made Mint useful.',
      },
    },
    {
      '@type': 'Question',
      name: 'Is there a free Mint alternative?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. Duezo has a free tier for basic bill tracking (up to 5 bills). YNAB offers a 34-day free trial. NerdWallet is free with ads. Most alternatives that are fully free rely on selling ads or recommending financial products.',
      },
    },
  ],
};

const apps = [
  {
    rank: 1,
    name: 'Duezo',
    tagline: 'Best for bill tracking — no manual entry, no bank linking',
    pros: [
      'Scans your email automatically — no typing bills in manually',
      'Shows countdown timers to each due date',
      'No bank account linking required (privacy-first)',
      'Clean, simple interface — not overwhelming',
      'Free tier available',
    ],
    cons: [
      'Newer app — fewer reviews than established options',
      "Bill payment not built in (you still pay on the biller's site)",
      'iOS only (Android coming)',
    ],
    price: 'Free | Pro $4.99/mo or $39.99/yr',
    mintFeature: 'Bill due dates & reminders',
    url: 'https://duezo.app',
    highlighted: true,
  },
  {
    rank: 2,
    name: 'YNAB (You Need a Budget)',
    tagline: 'Best for serious budgeters who want full control',
    pros: [
      'Powerful budgeting methodology (zero-based budgeting)',
      'Excellent mobile apps',
      'Large community and educational resources',
      'Syncs with most bank accounts',
    ],
    cons: [
      '$14.99/mo (or $109/yr) — expensive',
      'Steep learning curve',
      'Overkill if you just want to track bills',
      'No automatic email scanning',
    ],
    price: '$14.99/mo or $109/yr',
    mintFeature: 'Budgeting & spending categories',
  },
  {
    rank: 3,
    name: 'Copilot Money',
    tagline: 'Best Mint-like experience on iOS',
    pros: [
      'Most polished design of any budgeting app',
      'AI-powered transaction categorization',
      'Net worth tracking',
      'Good bank sync',
    ],
    cons: [
      '$13/mo (or $95/yr) — on the expensive side',
      'iOS only',
      'Requires linking bank accounts',
      "Privacy trade-off if you don't want to link bank",
    ],
    price: '$13/mo or $95/yr',
    mintFeature: 'Transaction categorization & spending overview',
  },
  {
    rank: 4,
    name: 'Monarch Money',
    tagline: 'Best for couples and households',
    pros: [
      'Collaborative features (multiple users)',
      'Clean dashboard',
      'Goal tracking',
      'Good cross-platform support',
    ],
    cons: [
      '$14.99/mo — expensive',
      'Bank linking required',
      'Less bill-specific than some alternatives',
    ],
    price: '$14.99/mo or $99/yr',
    mintFeature: 'Spending overview & net worth',
  },
  {
    rank: 5,
    name: 'Credit Karma (Intuit)',
    tagline: "What Intuit wants you to use — but it's not a real replacement",
    pros: ['Free', 'Good credit score monitoring', 'Tax filing integration (TurboTax)'],
    cons: [
      'Not a budgeting app — it is a credit score and loan recommendation tool',
      'No real spending categorization',
      'No bill-due-date tracking',
      'Monetized by recommending credit cards and loans to you',
      'Missing almost every feature that made Mint useful',
    ],
    price: 'Free',
    mintFeature: '⚠️ Does NOT replace Mint for budgeting or bill tracking',
  },
];

export default function BestMintAlternativesPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-24 pb-12">
        <div className="mb-6 flex items-center gap-3 text-sm text-zinc-500">
          <Link href="/blog" className="hover:text-zinc-300 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-zinc-400">Best Mint Alternatives 2026</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Best Mint Alternatives in 2026
          <span className="block text-2xl md:text-3xl font-normal text-zinc-400 mt-3">
            What actually replaced Mint — and what didn&apos;t
          </span>
        </h1>

        <div className="flex items-center gap-4 text-sm text-zinc-500 mb-8">
          <span>By Anthony Davila</span>
          <span>·</span>
          <span>February 22, 2026</span>
          <span>·</span>
          <span>9 min read</span>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 mb-10">
          <p className="text-zinc-300 leading-relaxed text-lg">
            Mint shut down in March 2024. Intuit told 24 million users to migrate to Credit Karma.
            Most of those users — including me — quickly realized Credit Karma is not a real
            replacement. So here&apos;s an honest breakdown of what you can actually use instead.
          </p>
        </div>

        {/* TL;DR */}
        <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/20 rounded-2xl p-6 mb-12">
          <h2 className="text-[#FF6B00] font-semibold text-sm uppercase tracking-wider mb-3">
            TL;DR
          </h2>
          <ul className="space-y-2 text-zinc-300">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#14B8A6] mt-1 shrink-0" />
              <span>
                <strong>Bill tracking + due dates:</strong> Duezo (email scanning, countdown timers,
                no bank linking)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-[#14B8A6] mt-1 shrink-0" />
              <span>
                <strong>Full budgeting + spending categories:</strong> YNAB or Copilot Money
              </span>
            </li>
            <li className="flex items-start gap-2">
              <X className="w-4 h-4 text-red-400 mt-1 shrink-0" />
              <span>
                <strong>Credit Karma:</strong> Not a Mint replacement. It&apos;s a credit score
                tool that monetizes you by recommending loans.
              </span>
            </li>
          </ul>
        </div>

        {/* What Mint Actually Did */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">What Mint actually did (the short version)</h2>
          <p className="text-zinc-400 leading-relaxed mb-4">
            Before we compare alternatives, it helps to remember why people loved Mint — because
            different apps replace different parts of it.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { feature: 'Bill due dates', desc: 'Tracked upcoming bills and sent reminders' },
              {
                feature: 'Spending categories',
                desc: 'Automatically labeled transactions (food, rent, subscriptions)',
              },
              {
                feature: 'Budget tracking',
                desc: 'Set monthly budgets by category, tracked against spending',
              },
              {
                feature: 'Net worth',
                desc: 'Aggregated all accounts to show total net worth',
              },
              {
                feature: 'Credit score',
                desc: 'Free credit score monitoring (ironically, this IS what Credit Karma does)',
              },
              {
                feature: 'Subscription tracking',
                desc: 'Flagged recurring charges and subscription increases',
              },
            ].map((item) => (
              <div
                key={item.feature}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4"
              >
                <p className="font-semibold text-white mb-1">{item.feature}</p>
                <p className="text-sm text-zinc-400">{item.desc}</p>
              </div>
            ))}
          </div>
          <p className="text-zinc-400 leading-relaxed mt-4">
            No single app does all of this perfectly. The best alternative for you depends on which
            of these features you actually used.
          </p>
        </section>

        {/* App Comparisons */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-8">
            Best Mint alternatives — ranked and compared
          </h2>

          <div className="space-y-8">
            {apps.map((app) => (
              <div
                key={app.name}
                className={`border rounded-2xl p-6 ${
                  app.highlighted
                    ? 'bg-[#FF6B00]/5 border-[#FF6B00]/30'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }`}
              >
                <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-zinc-500 font-mono text-sm">#{app.rank}</span>
                      <h3 className="text-xl font-bold">
                        {app.highlighted ? (
                          <span className="text-[#FF6B00]">{app.name}</span>
                        ) : (
                          app.name
                        )}
                      </h3>
                      {app.highlighted && (
                        <span className="bg-[#FF6B00]/20 text-[#FF6B00] text-xs font-semibold px-2 py-0.5 rounded-full">
                          Our Pick
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-400 text-sm">{app.tagline}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-zinc-500">Price</p>
                    <p className="font-medium text-zinc-200 text-sm">{app.price}</p>
                  </div>
                </div>

                <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl px-4 py-2 mb-4 inline-flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Replaces Mint&apos;s:</span>
                  <span className="text-xs text-zinc-300">{app.mintFeature}</span>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                      What it does well
                    </p>
                    <ul className="space-y-2">
                      {app.pros.map((pro) => (
                        <li key={pro} className="flex items-start gap-2 text-sm text-zinc-300">
                          <Check className="w-4 h-4 text-[#14B8A6] mt-0.5 shrink-0" />
                          <span>{pro}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mb-3">
                      Trade-offs
                    </p>
                    <ul className="space-y-2">
                      {app.cons.map((con) => (
                        <li key={con} className="flex items-start gap-2 text-sm text-zinc-400">
                          <X className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          <span>{con}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {app.highlighted && app.url && (
                  <div className="mt-6">
                    <Link
                      href={app.url}
                      className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
                    >
                      Try Duezo Free
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Credit Karma Truth Section */}
        <section className="mb-12">
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <X className="w-5 h-5 text-red-400" />
              Why Credit Karma is not a real Mint replacement
            </h2>
            <p className="text-zinc-300 leading-relaxed mb-4">
              Intuit pushed Mint users toward Credit Karma after the shutdown. This was a business
              decision, not a product recommendation.
            </p>
            <p className="text-zinc-400 leading-relaxed mb-4">
              Credit Karma makes money by recommending credit cards, loans, and financial products
              to you. It monitors your credit score as a hook to keep you engaged. That&apos;s a
              fundamentally different product from what Mint was: a budgeting tool that helped you
              track spending and manage bills.
            </p>
            <p className="text-zinc-400 leading-relaxed">
              Credit Karma has no bill tracking, no budget categories that track your actual
              spending, no due-date reminders, and no spending summaries by merchant. If you
              migrated to Credit Karma and it felt wrong — that&apos;s because it&apos;s not the
              same type of product.
            </p>
          </div>
        </section>

        {/* Decision Table */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Which one should you use?</h2>
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left p-4 text-zinc-400 font-normal">
                    If you used Mint for...
                  </th>
                  <th className="text-left p-4 text-zinc-400 font-normal">Best alternative</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {[
                  {
                    use: 'Knowing when bills are due',
                    alt: 'Duezo — countdown timers, email scanning',
                  },
                  {
                    use: 'Tracking spending categories',
                    alt: 'YNAB or Copilot Money',
                  },
                  {
                    use: 'Monthly budget limits',
                    alt: 'YNAB (most powerful budgeting)',
                  },
                  {
                    use: 'Seeing net worth across accounts',
                    alt: 'Monarch Money or Copilot Money',
                  },
                  {
                    use: 'Credit score monitoring',
                    alt: 'Credit Karma (for this specific feature, it actually works)',
                  },
                  {
                    use: "Subscription tracking (what's charging me?)",
                    alt: 'Rocket Money or Copilot Money',
                  },
                  {
                    use: 'All of the above, free',
                    alt: "Honest answer: Mint was uniquely free. Today you'll pay for the best tools.",
                  },
                ].map((row) => (
                  <tr key={row.use}>
                    <td className="p-4 text-zinc-300">{row.use}</td>
                    <td className="p-4 text-zinc-400">{row.alt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Frequently asked questions</h2>
          <div className="space-y-6">
            {[
              {
                q: 'Why did Mint shut down?',
                a: "Intuit acquired Mint in 2009 and shut it down in March 2024. The company redirected users to Credit Karma, which Intuit also owns. The exact reason was never publicly disclosed, but the pattern is consistent with Intuit's strategy of consolidating financial products under its ecosystem (TurboTax, QuickBooks, Credit Karma).",
              },
              {
                q: "Is there a free app that does what Mint did?",
                a: "Not exactly — Mint was uniquely full-featured for a free product. Most replacements with comparable features cost between $8-$15/month. Duezo offers a free tier for basic bill tracking. NerdWallet is free but monetized through financial product recommendations. If you need zero-cost and full features, the honest answer is that Mint was subsidized in ways that aren't sustainable for most companies.",
              },
              {
                q: 'Does Duezo link to my bank account?',
                a: "No. Duezo takes a different approach: it scans your email for bill notifications and payment confirmations, extracting due dates and amounts without requiring your bank credentials. This makes it more private and simpler to set up, though it means it only tracks bills and due dates — not every transaction or your full spending picture.",
              },
              {
                q: 'What happened to all my Mint data?',
                a: "Intuit provided data export options before the shutdown. If you exported your data (CSV format), you can import it into some alternatives like YNAB or Copilot Money. If you didn't export before March 2024, that historical data is gone.",
              },
            ].map((faq) => (
              <div
                key={faq.q}
                className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-6"
              >
                <h3 className="font-semibold text-white mb-3">{faq.q}</h3>
                <p className="text-zinc-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gradient-to-br from-[#FF6B00]/10 to-[#A78BFA]/10 border border-[#FF6B00]/20 rounded-2xl p-8 text-center">
          <div className="flex justify-center gap-1 mb-4">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-5 h-5 fill-[#FF6B00] text-[#FF6B00]" />
            ))}
          </div>
          <h2 className="text-2xl font-bold mb-3">Try Duezo — the bill-tracking Mint alternative</h2>
          <p className="text-zinc-400 mb-6 max-w-xl mx-auto">
            If what you miss most about Mint is knowing when bills are due — Duezo is built for
            exactly that. Scans your email, shows countdown timers, no bank linking required.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-[#FF6B00] hover:bg-[#FF6B00]/90 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            Get Duezo Free
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-xs text-zinc-500 mt-3">Free tier available · No bank account required · iOS</p>
        </section>

        {/* Related */}
        <section className="mt-12 pt-8 border-t border-white/[0.06]">
          <p className="text-sm text-zinc-500 mb-4">Related reading</p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/blog/best-prism-alternatives-2026"
              className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Best Prism Alternatives in 2026
            </Link>
            <Link
              href="/blog/bill-tracker-no-bank-account"
              className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Best Bill Trackers Without Bank Linking
            </Link>
            <Link
              href="/mint-alternative"
              className="text-sm text-zinc-400 hover:text-white transition-colors underline underline-offset-4"
            >
              Duezo vs. Mint
            </Link>
          </div>
        </section>
      </section>
    </main>
  );
}
