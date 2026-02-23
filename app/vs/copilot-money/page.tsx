import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs Copilot Money: Is Copilot Worth $15/mo? (2026) | Duezo',
  description:
    'Compare Duezo ($4.99/mo) vs Copilot Money ($14.99/mo). Copilot is a full budgeting app. Duezo is focused on bill tracking. Save $120/year if you just need bills.',
  keywords: [
    'duezo vs copilot money',
    'copilot money alternative',
    'copilot money too expensive',
    'cheap bill tracker',
    'bill tracking app',
  ],
  openGraph: {
    title: 'Duezo vs Copilot Money: Is Copilot Worth $15/mo?',
    description: 'Copilot is $14.99/mo for budgeting. Duezo is $4.99/mo for bill tracking. Do you need to pay 3x more?',
    url: 'https://duezo.app/vs/copilot-money',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/copilot-money' },
};

type Row = [string, string | boolean, string | boolean];

const rows: Row[] = [
  ['Monthly price', '$4.99/mo', '$14.99/mo'],
  ['Annual price', '$39.99/yr', '$179.88/yr'],
  ['Bill tracking', true, true],
  ['Bill countdown timers', true, false],
  ['AI email scanning', true, false],
  ['Budgeting tools', false, true],
  ['Investment tracking', false, true],
  ['Net worth tracking', false, true],
  ['Spending insights', false, true],
  ['Bank account linking', false, true],
  ['Price increase alerts', true, false],
  ['iOS app', true, true],
  ['Web app', true, false],
  ['Setup time', '~2 min', '~30 min'],
  ['Learning curve', 'Minutes', 'Hours'],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-violet-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsCopilotMoneyPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs Copilot Money Comparison',
            url: 'https://duezo.app/vs/copilot-money',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-violet-600">
            Copilot Money
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          Copilot is a premium budgeting app. Duezo just tracks bills. If you don&apos;t need full budgeting, you could save $120/year.
        </p>
      </section>

      {/* Comparison Table */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-violet-400 font-medium">Duezo</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">Copilot Money</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, copilot], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={copilot} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* When to choose each */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-violet-500/5 border border-violet-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-violet-400">Choose Duezo if you…</h2>
            <ul className="space-y-3 text-zinc-300">
              {[
                'Just want to track bill due dates',
                'Don\'t need full budgeting or investment tracking',
                'Want to save $10/mo ($120/year)',
                'Don\'t want to link your bank account',
                'Prefer Gmail-based bill detection',
                'Want countdown timers for bills',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-violet-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-zinc-300">Choose Copilot Money if you…</h2>
            <ul className="space-y-3 text-zinc-400">
              {[
                'Want a full budgeting system',
                'Need investment and net worth tracking',
                'Want detailed spending insights and trends',
                'Are willing to pay $15/mo for premium features',
                'Don\'t mind linking bank accounts',
                'Want an all-in-one financial dashboard',
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
            <h3 className="font-semibold text-lg mb-2">💰 Price: 3x More Expensive</h3>
            <p className="text-zinc-400">
              Copilot is <strong className="text-white">$14.99/mo</strong> ($180/year). Duezo is <strong className="text-violet-400">$4.99/mo</strong> ($40/year). 
              That&apos;s a <strong className="text-white">$140 annual difference</strong>. If all you need is bill tracking, that&apos;s a lot of money for features you won&apos;t use.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">🎯 Scope: Budgeting vs Bills</h3>
            <p className="text-zinc-400">
              Copilot does a lot — budgeting, investment tracking, net worth monitoring, spending insights. 
              If you need all that, it&apos;s worth it. But if you just want to make sure you don&apos;t miss bill payments, <strong className="text-white">Duezo does that one thing exceptionally well</strong>.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">⏱️ Bill-Specific Features</h3>
            <p className="text-zinc-400">
              Copilot can track bills as recurring expenses. Duezo is <strong className="text-white">built specifically for bills</strong> — 
              with countdown timers, price increase alerts, and AI-powered email scanning. If bills are your main concern, Duezo is more focused and easier to use.
            </p>
          </div>
        </div>
      </section>

      {/* The real question */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">Ask Yourself This</h3>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            Are you actually using Copilot&apos;s budgeting tools? Do you check your investment tracking every week? Do you analyze the spending insights?
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            If the answer is no — if you&apos;re really just using it to remember when bills are due — then you&apos;re paying <strong className="text-white">$10/mo for features you don&apos;t use</strong>.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            That&apos;s where Duezo comes in. Same price as Netflix. Does one thing well. Saves you $120/year.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Save $120/Year</h2>
        <p className="text-zinc-400 text-lg mb-8">
          If you just need bill tracking, there&apos;s no reason to pay $15/mo.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-zinc-500 text-sm mt-4">$4.99/mo · 67% less than Copilot · Cancel anytime</p>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/vs" className="hover:text-zinc-300 transition-colors">All Comparisons</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
      </div>
    </main>
  );
}
