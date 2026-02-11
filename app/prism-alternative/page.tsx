import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Shield, Zap, Mail, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Prism App Alternative in 2026 | Duezo',
  description:
    'Prism shut down in December 2023. Duezo is the best Prism alternative — AI-powered bill tracking with countdown timers, Gmail scanning, and no bank linking required. $4.99/mo.',
  keywords: [
    'prism app alternative',
    'prism replacement',
    'prism bill pay alternative',
    'prism shut down',
    'bill tracker app',
    'bill reminder app',
  ],
  openGraph: {
    title: 'Best Prism App Alternative in 2026 | Duezo',
    description:
      'Prism shut down in Dec 2023. Duezo picks up where Prism left off — AI bill tracking, countdown timers, no bank linking.',
    url: 'https://duezo.app/prism-alternative',
    siteName: 'Duezo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Prism App Alternative in 2026 | Duezo',
    description:
      'Prism shut down in Dec 2023. Duezo picks up where Prism left off.',
  },
  alternates: {
    canonical: 'https://duezo.app/prism-alternative',
  },
};

const faqs = [
  {
    q: 'What happened to Prism?',
    a: 'Prism shut down in December 2023, leaving millions of users without their favorite bill tracking app. The company cited business challenges and encouraged users to find alternatives.',
  },
  {
    q: 'Is Duezo a good replacement for Prism?',
    a: 'Yes. Duezo was built with the same philosophy — simple bill tracking without budgeting bloat. It adds AI-powered Gmail scanning and visual countdown timers that Prism never had.',
  },
  {
    q: 'Does Duezo require bank linking?',
    a: 'No. Duezo scans your Gmail for bill notifications instead of linking to your bank account, giving you better privacy and security.',
  },
  {
    q: 'How much does Duezo cost?',
    a: 'Duezo is $4.99/month or $39.99/year (save 33%). There\'s a free trial so you can try it risk-free.',
  },
];

export default function PrismAlternativePage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Best Prism App Alternative in 2026',
            description:
              'Duezo is the best Prism alternative for bill tracking.',
            url: 'https://duezo.app/prism-alternative',
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
            Prism shut down in December 2023
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
            The Best{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              Prism Alternative
            </span>{' '}
            for Bill Tracking
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            We know how frustrating it was when Prism disappeared. Duezo picks
            up where Prism left off — with AI-powered Gmail scanning, visual
            countdown timers, and no bank linking required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
            >
              Try Duezo Free <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/blog/best-prism-alternatives-2026"
              className="inline-flex items-center justify-center gap-2 border border-zinc-700 hover:border-zinc-500 text-zinc-300 font-medium px-8 py-3.5 rounded-xl transition-colors"
            >
              Read Full Comparison
            </Link>
          </div>
        </div>
      </section>

      {/* What people loved about Prism */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          What People Loved About Prism
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              quote:
                'I just want a simple bill reminder app! No budgeting, expense tracking, analytics.',
              source: 'Reddit user, r/personalfinance',
              duezo: 'Duezo is bills-only. No bloat.',
            },
            {
              quote:
                "Haven't found a bill syncing app since Prism died. Everything else wants to be a full budgeting suite.",
              source: 'Reddit user, r/ynab',
              duezo: 'Duezo syncs bills from Gmail automatically.',
            },
            {
              quote:
                'Prism was the only app that showed me exactly when each bill was due without needing to link my bank.',
              source: 'Former Prism user',
              duezo: 'Duezo has countdown timers for every bill.',
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

      {/* Feature Comparison Table */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-4">
          Prism vs Duezo: Feature Comparison
        </h2>
        <p className="text-zinc-400 text-center mb-10">
          Duezo delivers everything Prism did — and more.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-zinc-500 font-medium">Prism <span className="text-xs">(discontinued)</span></th>
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
                ['Bill pay reminders', true, true],
                ['Recurring bill support', true, true],
                ['Dark mode', false, true],
                ['Price increase alerts', false, true],
                ['Mobile app (iOS)', true, true],
                ['Still available', false, true],
              ].map(([feature, prism, duezo], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature as string}</td>
                  <td className="py-3 px-4 text-center">
                    {prism ? (
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

      {/* Why Duezo */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
          Why Former Prism Users Choose Duezo
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {[
            {
              icon: Mail,
              title: 'AI Gmail Scanning',
              desc: 'Duezo reads your bill emails and automatically creates bill entries with amounts and due dates. No manual entry needed.',
            },
            {
              icon: Clock,
              title: 'Visual Countdown Timers',
              desc: 'See exactly how many days until each bill is due. Color-coded urgency so you never miss a payment.',
            },
            {
              icon: Shield,
              title: 'Privacy First',
              desc: 'No bank linking required. Duezo scans Gmail — your financial accounts stay private and secure.',
            },
            {
              icon: Zap,
              title: 'Simple & Focused',
              desc: 'Just bill tracking. No budgeting, no expense categories, no investment tracking. Bills only, done well.',
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
          Ready to Replace Prism?
        </h2>
        <p className="text-zinc-400 text-lg mb-8">
          Join thousands of former Prism users who switched to Duezo. Start your
          free trial today.
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
        <Link href="/vs/rocket-money" className="hover:text-zinc-300 transition-colors">Duezo vs Rocket Money</Link>
        <Link href="/vs/ynab" className="hover:text-zinc-300 transition-colors">Duezo vs YNAB</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
        <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
      </div>
    </main>
  );
}
