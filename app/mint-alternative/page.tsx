import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Shield, Zap, Mail, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Mint Alternative for Bill Tracking (2026) | Duezo',
  description:
    'Mint shut down in March 2024, leaving 24 million users without a bill tracker. Duezo is the best Mint alternative — AI-powered, no bank linking, $4.99/mo. Try free.',
  keywords: [
    'mint alternative',
    'mint app alternative',
    'mint replacement',
    'mint shut down alternative',
    'mint app closed',
    'best mint replacement 2026',
    'intuit mint alternative',
    'mint budget app alternative',
    'bill tracker app',
    'bill reminder app no bank',
  ],
  openGraph: {
    title: 'Best Mint Alternative for Bill Tracking (2026) | Duezo',
    description:
      'Mint is gone. Duezo tracks your bills automatically via email — no bank linking, no ads, no bloat. The cleanest Mint replacement for bill tracking.',
    url: 'https://duezo.app/mint-alternative',
    siteName: 'Duezo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Mint Alternative for Bill Tracking (2026) | Duezo',
    description: 'Mint is gone. Duezo tracks your bills automatically — no bank linking, no ads.',
  },
  alternates: {
    canonical: 'https://duezo.app/mint-alternative',
  },
};

const faqs = [
  {
    q: 'What happened to Mint?',
    a: "Intuit shut down Mint on March 23, 2024 — one of the most widely used personal finance apps, with over 24 million users. Mint redirected users to Credit Karma, which doesn't offer the same bill tracking experience. Millions of users are still looking for a real replacement.",
  },
  {
    q: 'Is Duezo a good Mint replacement for bill tracking?',
    a: "Yes — especially if you used Mint mainly to see what bills were coming up. Duezo scans your Gmail for bill emails, extracts the amount and due date automatically, and shows you a countdown for each bill. No bank linking required. Simple, focused, and private.",
  },
  {
    q: 'Does Duezo replace all of Mint?',
    a: 'Duezo replaces the bill tracking and reminder part of Mint — the part most people actually used. It does not do full budgeting, investment tracking, or credit scores. If bill tracking is what you miss most, Duezo is the replacement. If you need a full budgeting tool, consider YNAB or Copilot.',
  },
  {
    q: 'Does Duezo require a bank account link?',
    a: "No. Duezo reads your bill confirmation emails instead of linking to your bank. Your financial accounts stay completely private. It's the opposite of how Mint worked — and for many former Mint users, that's a major upgrade.",
  },
  {
    q: 'How much does Duezo cost?',
    a: "Duezo Pro is $4.99/month or $39.99/year. There's a free trial — no credit card required. Way less than most budgeting apps, and it does the one thing you actually need: tells you what bills are due and when.",
  },
  {
    q: 'Will Duezo shut down like Mint?',
    a: "Mint was owned by Intuit, a giant corporation that had no real incentive to keep a free product alive. Duezo is an independent app with a direct revenue model — you pay for it, it works for you. No ads, no data selling, no pressure to pivot. We stay in business by being useful.",
  },
];

export default function MintAlternativePage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Best Mint Alternative for Bill Tracking (2026)',
            description: 'Duezo is the best Mint alternative for bill tracking — AI-powered, no bank linking required.',
            url: 'https://duezo.app/mint-alternative',
            mainEntity: {
              '@type': 'SoftwareApplication',
              name: 'Duezo',
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'iOS, Web',
              offers: {
                '@type': 'Offer',
                price: '4.99',
                priceCurrency: 'USD',
                priceValidUntil: '2026-12-31',
              },
              aggregateRating: {
                '@type': 'AggregateRating',
                ratingValue: '4.8',
                ratingCount: '50',
              },
            },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 via-transparent to-transparent" />
        <div className="relative max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 text-orange-400 text-sm font-medium">
            Mint shut down March 23, 2024
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Best{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              Mint Alternative
            </span>{' '}
            for Bill Tracking
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            Intuit killed Mint and shipped you to Credit Karma. If you used Mint to track bills and due dates, Duezo picks up exactly where Mint left off — without the bank linking, the ads, or the complexity.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Try Duezo Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/vs/mint"
              className="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium px-8 py-3.5 rounded-xl transition-colors"
            >
              Duezo vs Mint Full Comparison
            </Link>
          </div>
        </div>
      </section>

      {/* What people miss about Mint */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          What Former Mint Users Actually Miss
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              quote:
                'I only used Mint to see my upcoming bills. Credit Karma doesn\'t do that. I need something simple.',
              source: 'Reddit user, r/mintuit',
              duezo: 'Duezo shows all upcoming bills with countdown timers.',
            },
            {
              quote:
                "I paid a $40 late fee last month because I forgot a bill. I never did that when I had Mint.",
              source: 'App Store reviewer',
              duezo: 'Duezo alerts you before bills are due — automatic.',
            },
            {
              quote:
                'Everything I try wants access to my bank account. Mint was bad enough, but at least I knew the company.',
              source: 'Hacker News comment',
              duezo: 'Duezo reads your bill emails. No bank linking. Ever.',
            },
          ].map((item, i) => (
            <div
              key={i}
              className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col"
            >
              <p className="text-zinc-300 italic mb-3">&ldquo;{item.quote}&rdquo;</p>
              <p className="text-zinc-500 text-sm mb-4">— {item.source}</p>
              <div className="mt-auto pt-4 border-t border-zinc-800">
                <p className="text-orange-400 text-sm font-medium flex items-center gap-2">
                  <Check className="w-4 h-4" /> {item.duezo}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Feature comparison */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Mint vs Duezo: Bill Tracking Comparison
        </h2>
        <p className="text-zinc-400 text-center mb-10">
          For the bill tracking side of Mint, Duezo does it better — and without the tradeoffs.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-zinc-500 font-medium">
                  Mint <span className="text-xs">(shut down)</span>
                </th>
                <th className="text-center py-4 px-4 text-orange-400 font-medium">Duezo</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {[
                ['Bill due date tracking', true, true],
                ['Automatic bill detection', true, true],
                ['Countdown timers', false, true],
                ['AI-powered Gmail scanning', false, true],
                ['No bank linking required', false, true],
                ['No ads', false, true],
                ['No data selling', false, true],
                ['Bill pay reminders', true, true],
                ['Recurring bill support', true, true],
                ['Price increase alerts', false, true],
                ['Mobile app (iOS)', true, true],
                ['Web app', true, true],
                ['Still available', false, true],
              ].map(([feature, mint, duezo], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature as string}</td>
                  <td className="py-3 px-4 text-center">
                    {mint ? (
                      <Check className="w-5 h-5 text-zinc-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-zinc-700 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {duezo ? (
                      <Check className="w-5 h-5 text-orange-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-zinc-700 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Why Duezo is different */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Why Duezo Is a Better Mint Replacement
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: Mail,
              title: 'Automatic Bill Detection',
              desc: 'Duezo scans your Gmail for bill notifications, invoices, and statements. It extracts amounts and due dates automatically — no manual entry, no bank access needed.',
            },
            {
              icon: Clock,
              title: 'Visual Countdown Timers',
              desc: 'Instead of buried list items, Duezo shows you a countdown for each bill. Open the app and immediately know what\'s due in 3 days, 10 days, or next month.',
            },
            {
              icon: Shield,
              title: 'No Bank Linking. Ever.',
              desc: "Mint required bank access. That data was used to serve ads. Duezo uses Gmail instead — just bill emails. Your bank accounts, credit cards, and financial life stay private.",
            },
            {
              icon: Zap,
              title: 'Simple and Focused',
              desc: "Mint tried to do everything — budgeting, investments, credit scores. Duezo does one thing: bill tracking. It's faster, simpler, and more reliable because it's not trying to be everything.",
            },
          ].map((item, i) => (
            <div key={i} className="flex gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <item.icon className="w-6 h-6 text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">{item.title}</h3>
                <p className="text-zinc-400">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* The Credit Karma problem */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">Why Credit Karma Isn&apos;t a Real Mint Replacement</h2>
          <p className="text-zinc-400 mb-4">
            When Intuit shut down Mint, they said "just use Credit Karma." Credit Karma is a credit monitoring service — it shows your credit score, recommends credit cards, and makes money by selling you financial products.
          </p>
          <p className="text-zinc-400 mb-4">
            It doesn&apos;t track bills. It doesn&apos;t show you what&apos;s due next week. It doesn&apos;t remind you that your electric bill is due in 4 days. That&apos;s not what it&apos;s built for.
          </p>
          <p className="text-zinc-400">
            If you miss the bill-tracking side of Mint, you need a dedicated bill tracker — not another credit score dashboard. That&apos;s exactly what Duezo is.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
          Frequently Asked Questions
        </h2>
        <div className="space-y-6">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-zinc-800 pb-6">
              <h3 className="font-semibold text-lg mb-2">{faq.q}</h3>
              <p className="text-zinc-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          Done Waiting for a Good Mint Replacement?
        </h2>
        <p className="text-zinc-400 text-lg mb-8">
          Duezo tracks your bills from your email automatically. See what&apos;s due, when it&apos;s due, and never pay a late fee because you forgot.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-zinc-500 text-sm mt-4">
          $4.99/mo after trial · No bank linking required · Cancel anytime
        </p>
      </section>

      {/* Footer nav */}
      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/finovera-alternative" className="hover:text-zinc-300 transition-colors">Finovera Alternative</Link>
        <Link href="/vs/mint" className="hover:text-zinc-300 transition-colors">Duezo vs Mint (Full)</Link>
        <Link href="/vs/rocket-money" className="hover:text-zinc-300 transition-colors">Duezo vs Rocket Money</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
      </div>
    </main>
  );
}
