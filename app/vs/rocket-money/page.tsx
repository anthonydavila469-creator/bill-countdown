import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X, Minus } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs Rocket Money: Honest Comparison (2026) | Duezo',
  description:
    'Compare Duezo vs Rocket Money for bill tracking. Duezo is $4.99/mo, focused on bills only, with Gmail scanning instead of bank linking. See the full comparison.',
  keywords: [
    'duezo vs rocket money',
    'rocket money alternative',
    'rocket money comparison',
    'bill tracker app comparison',
  ],
  openGraph: {
    title: 'Duezo vs Rocket Money: Honest Comparison (2026)',
    description: 'Which bill tracking app is right for you? Compare features, pricing, and privacy.',
    url: 'https://duezo.app/vs/rocket-money',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/rocket-money' },
};

type Row = [string, string | boolean, string | boolean, string?];

const rows: Row[] = [
  ['Monthly price', '$4.99/mo', '$6–12/mo'],
  ['Annual price', '$39.99/yr', '$48–144/yr'],
  ['Bill tracking', true, true],
  ['Countdown timers', true, false],
  ['AI bill detection', true, true],
  ['Gmail scanning (no bank link)', true, false],
  ['Bank account linking', false, true],
  ['Subscription cancellation', false, true],
  ['Bill negotiation', false, true],
  ['Budgeting tools', false, true],
  ['Credit score monitoring', false, true],
  ['Price increase alerts', true, false],
  ['Dark mode', true, true],
  ['iOS app', true, true],
  ['Privacy-focused', true, false],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-orange-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsRocketMoneyPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs Rocket Money Comparison',
            url: 'https://duezo.app/vs/rocket-money',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            Rocket Money
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Rocket Money is a full-featured financial app. Duezo is laser-focused on one thing: making sure you never miss a bill. Here&apos;s how they compare.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-orange-400 font-medium">Duezo</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Rocket Money</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, rocket], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={rocket} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* When to choose each */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-orange-400">Choose Duezo if you…</h2>
            <ul className="space-y-3 text-zinc-300">
              {[
                'Just want to track bill due dates',
                'Don\'t want to link your bank account',
                'Prefer Gmail-based bill detection',
                'Want visual countdown timers',
                'Want a simple, focused app',
                'Want to save money ($4.99 vs $6–12/mo)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-zinc-300">Choose Rocket Money if you…</h2>
            <ul className="space-y-3 text-zinc-400">
              {[
                'Want subscription cancellation service',
                'Want bill negotiation to lower costs',
                'Need full budgeting and spending tracking',
                'Want credit score monitoring',
                'Don\'t mind linking bank accounts',
                'Want an all-in-one financial app',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-zinc-500 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Key differences */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">Key Differences</h2>
        <div className="space-y-8">
          <div>
            <h3 className="font-semibold text-lg mb-2">💰 Pricing</h3>
            <p className="text-zinc-400">
              Duezo is a flat <strong className="text-white">$4.99/mo</strong>. Rocket Money uses a &quot;choose your price&quot; model ranging from $6–12/month for premium, which can feel unclear. If you just need bill tracking, Duezo saves you money every month.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">🔒 Privacy</h3>
            <p className="text-zinc-400">
              Rocket Money requires linking your bank accounts via Plaid. Duezo takes a different approach — it scans your Gmail for bill notifications. Your bank credentials never leave your bank. For privacy-conscious users, this is a significant advantage.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 Focus</h3>
            <p className="text-zinc-400">
              Rocket Money does a lot: budgeting, subscription cancellation, bill negotiation, credit monitoring. That&apos;s great if you need all of it. But if you just want to know when your bills are due and never miss a payment, Duezo does that one thing exceptionally well.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Try Duezo?</h2>
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

      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/vs/ynab" className="hover:text-zinc-300 transition-colors">Duezo vs YNAB</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
      </div>
    </main>
  );
}
