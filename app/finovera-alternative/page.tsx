import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Shield, Zap, Mail, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Best Finovera Alternative in 2026 | Duezo',
  description:
    'Finovera shut down in June 2024. Duezo is the best Finovera alternative — AI-powered bill tracking that scans your Gmail, shows due date countdowns, and never requires bank linking. Free to try.',
  keywords: [
    'finovera alternative',
    'finovera replacement',
    'finovera shut down',
    'bill tracker app',
    'bill reminder app no bank account',
    'finovera app alternative 2026',
    'e-bill aggregator alternative',
    'bill tracking app gmail',
  ],
  openGraph: {
    title: 'Best Finovera Alternative in 2026 | Duezo',
    description:
      'Finovera shut down in June 2024. Duezo picks up where it left off — AI bill tracking, countdown timers, no bank linking required.',
    url: 'https://duezo.app/finovera-alternative',
    siteName: 'Duezo',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Best Finovera Alternative in 2026 | Duezo',
    description: 'Finovera shut down June 2024. Duezo is the modern replacement.',
  },
  alternates: {
    canonical: 'https://duezo.app/finovera-alternative',
  },
};

const faqs = [
  {
    q: 'What happened to Finovera?',
    a: 'Finovera shut down on June 25, 2024. The company sent notice to users and permanently closed its bill aggregation service, leaving thousands of users looking for a replacement.',
  },
  {
    q: 'Is Duezo a good replacement for Finovera?',
    a: 'Yes. Like Finovera, Duezo automatically finds your bills — but instead of linking to bank accounts, it scans your Gmail for bill notification emails. This means instant bill detection without sharing your banking credentials.',
  },
  {
    q: 'Does Duezo require bank linking?',
    a: 'No. Duezo scans your Gmail for bill emails instead of linking to your bank account. This is both more private and more accurate — it finds bills from every vendor that sends you a notification email.',
  },
  {
    q: 'How much does Duezo cost?',
    a: "Duezo is $4.99/month or $39.99/year (save 33%). There's a free trial with no credit card required.",
  },
  {
    q: 'What about Prism — did that also shut down?',
    a: 'Yes. Prism shut down in December 2023, followed by Finovera in June 2024. Both left behind users who needed simple, automatic bill tracking. Duezo was built to be the modern answer to both.',
  },
];

export default function FioveraAlternativePage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      {/* Schema markup */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Best Finovera Alternative in 2026',
            description:
              'Duezo is the best Finovera alternative for automatic bill tracking.',
            url: 'https://duezo.app/finovera-alternative',
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
            },
            breadcrumb: {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://duezo.app' },
                { '@type': 'ListItem', position: 2, name: 'Finovera Alternative', item: 'https://duezo.app/finovera-alternative' },
              ],
            },
          }),
        }}
      />

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 rounded-full px-4 py-2 text-sm text-orange-400 mb-8">
          Finovera shut down June 2024 · Here&apos;s what&apos;s next
        </div>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          The Best Finovera Alternative <br />
          <span className="text-orange-400">in 2026</span>
        </h1>
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
          Finovera went dark. But you still need to track bills without logging into 10 different websites.
          Duezo scans your Gmail automatically — same idea, better execution.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Try Duezo Free <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-zinc-500 text-sm">No bank account required. No credit card needed.</p>
        </div>
      </section>

      {/* What happened to Finovera */}
      <section className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">What Happened to Finovera?</h2>
          <p className="text-zinc-400 leading-relaxed mb-4">
            In June 2024, Finovera sent its users a notice: the service was shutting down permanently on June 25, 2024.
            After years of helping people automatically aggregate e-bills in one place, Finovera joined a growing list of
            bill tracking services — including <Link href="/prism-alternative" className="text-orange-400 hover:underline">Prism (shut down Dec 2023)</Link> — that couldn&apos;t stay alive.
          </p>
          <p className="text-zinc-400 leading-relaxed">
            The market clearly wants automatic bill tracking without the hassle of manual entry or bank linking.
            Finovera proved the demand. Duezo is the modern answer.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Finovera vs Duezo — Feature by Feature</h2>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-6 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-6 text-zinc-500 font-medium">Finovera</th>
                <th className="text-center py-4 px-6 text-orange-400 font-semibold">Duezo</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Automatic bill detection', true, true],
                ['No bank account required', true, true],
                ['Bill due date tracking', true, true],
                ['Email-based bill scanning', false, true],
                ['Visual countdown timers', false, true],
                ['iOS home screen widget', false, true],
                ['Price increase alerts', false, true],
                ['Still actively maintained', false, true],
                ['Available today', false, true],
              ].map(([feature, finovera, duezo], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-4 px-6 text-zinc-300">{feature as string}</td>
                  <td className="py-4 px-6 text-center">
                    {finovera ? (
                      <Check className="w-5 h-5 text-zinc-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-500/60 mx-auto" />
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {duezo ? (
                      <Check className="w-5 h-5 text-orange-400 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-red-500/60 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* How Duezo Works */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">How Duezo Works</h2>
        <p className="text-zinc-400 text-center max-w-xl mx-auto mb-12">
          Same end result as Finovera — all your bills in one place, without logging in everywhere. Different method: your Gmail already has all the answers.
        </p>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Mail,
              title: 'Connect Gmail',
              desc: 'Duezo reads your email inbox for bill notifications — Netflix, rent, insurance, utilities. Anything that sends you an email.',
            },
            {
              icon: Zap,
              title: 'Bills Detected Automatically',
              desc: 'AI extracts the bill name, amount, and due date from each notification. No manual entry. No biller logins. Just instant detection.',
            },
            {
              icon: Clock,
              title: 'Countdowns on Your Home Screen',
              desc: 'Every bill shows a countdown to its due date. Add the widget and it lives on your iPhone home screen so you never forget.',
            },
          ].map(({ icon: Icon, title, desc }, i) => (
            <div key={i} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-orange-400" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{title}</h3>
              <p className="text-zinc-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 flex gap-6">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-orange-400" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">Your Privacy Is Protected</h3>
            <p className="text-zinc-400 leading-relaxed mb-2">
              Finovera stored your billing credentials. Duezo doesn&apos;t. We only read bill notification emails —
              we never see your banking passwords, SSN, or account numbers. Gmail access is read-only and can be revoked
              anytime from your Google account settings.
            </p>
            <p className="text-zinc-400 text-sm">
              Duezo stores only: bill name, amount, due date. That&apos;s it.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold mb-8">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {faqs.map(({ q, a }, i) => (
            <div key={i} className="border border-zinc-800 rounded-2xl p-6">
              <h3 className="font-semibold mb-2">{q}</h3>
              <p className="text-zinc-400 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-2xl p-10 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Replace Finovera?</h2>
          <p className="text-zinc-400 mb-8 max-w-md mx-auto">
            Start your free trial. Connect Gmail in 30 seconds. Your bills show up automatically.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-8 py-4 rounded-2xl text-lg transition-colors"
          >
            Start Free — No Bank Account Required <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-zinc-600 text-sm mt-4">$4.99/mo or $39.99/yr · Free trial · Cancel anytime</p>
        </div>
      </section>

      {/* Internal links */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="border-t border-zinc-800 pt-8">
          <h3 className="font-semibold text-zinc-400 mb-4">See Also</h3>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/prism-alternative" className="text-orange-400 hover:underline">Prism App Alternative</Link>
            <Link href="/vs/rocket-money" className="text-orange-400 hover:underline">Duezo vs Rocket Money</Link>
            <Link href="/vs/ynab" className="text-orange-400 hover:underline">Duezo vs YNAB</Link>
            <Link href="/blog/best-prism-alternatives-2026" className="text-orange-400 hover:underline">Best Prism Alternatives in 2026</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
