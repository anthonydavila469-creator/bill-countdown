import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Check, X } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo vs YNAB: Do You Need a Full Budget App? (2026) | Duezo',
  description:
    'Compare Duezo vs YNAB (You Need A Budget). YNAB is $14.99/mo for full budgeting. Duezo is $4.99/mo for simple bill tracking. Find out which is right for you.',
  keywords: [
    'duezo vs ynab',
    'ynab alternative',
    'ynab too expensive',
    'ynab too complex',
    'simple bill tracker',
  ],
  openGraph: {
    title: 'Duezo vs YNAB: Do You Need a Full Budget App?',
    description: 'YNAB is $14.99/mo for budgeting. Duezo is $4.99/mo for bill tracking. Which do you actually need?',
    url: 'https://duezo.app/vs/ynab',
    siteName: 'Duezo',
    type: 'website',
  },
  alternates: { canonical: 'https://duezo.app/vs/ynab' },
};

type Row = [string, string | boolean, string | boolean];

const rows: Row[] = [
  ['Monthly price', '$4.99/mo', '$14.99/mo'],
  ['Annual price', '$39.99/yr', '$109/yr'],
  ['Bill tracking', true, true],
  ['Countdown timers', true, false],
  ['AI bill detection from Gmail', true, false],
  ['Zero-based budgeting', false, true],
  ['Envelope/category budgeting', false, true],
  ['Bank account syncing', false, true],
  ['Goal tracking', false, true],
  ['Debt payoff tools', false, true],
  ['Price increase alerts', true, false],
  ['Learning curve', 'Minutes', 'Weeks'],
  ['Setup time', '~2 min', '1–2 hours'],
  ['iOS app', true, true],
  ['Web app', true, true],
];

function Cell({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <span className="text-zinc-300 text-sm">{value}</span>;
  if (value) return <Check className="w-5 h-5 text-orange-400 mx-auto" />;
  return <X className="w-5 h-5 text-zinc-700 mx-auto" />;
}

export default function VsYnabPage() {
  return (
    <main className="min-h-screen bg-[#08080c] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'Duezo vs YNAB Comparison',
            url: 'https://duezo.app/vs/ynab',
          }),
        }}
      />

      <section className="max-w-4xl mx-auto px-6 pt-24 pb-16 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo vs{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
            YNAB
          </span>
        </h1>
        <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
          YNAB is the gold standard for budgeting. But if you just want to track your bills, it&apos;s overkill. Here&apos;s an honest comparison.
        </p>
      </section>

      {/* Table */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-4 px-4 text-zinc-400 font-medium">Feature</th>
                <th className="text-center py-4 px-4 text-orange-400 font-medium">Duezo</th>
                <th className="text-center py-4 px-4 text-zinc-400 font-medium">YNAB</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map(([feature, duezo, ynab], i) => (
                <tr key={i} className="border-b border-zinc-800/50">
                  <td className="py-3 px-4 text-zinc-300">{feature}</td>
                  <td className="py-3 px-4 text-center"><Cell value={duezo} /></td>
                  <td className="py-3 px-4 text-center"><Cell value={ynab} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Positioning */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-orange-500/5 border border-orange-500/20 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-orange-400">Choose Duezo if you…</h2>
            <ul className="space-y-3 text-zinc-300">
              {[
                'Just want to know when bills are due',
                'Find YNAB overwhelming or too complex',
                'Don\'t want to spend time setting up categories',
                'Want automatic bill detection from email',
                'Want to save $10/mo vs YNAB',
                'Already have a budgeting system (or don\'t want one)',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-4 text-zinc-300">Choose YNAB if you…</h2>
            <ul className="space-y-3 text-zinc-400">
              {[
                'Want a full zero-based budgeting system',
                'Need to track every dollar you spend',
                'Want to pay down debt strategically',
                'Are willing to invest time learning the method',
                'Need bank syncing for all transactions',
                'Want detailed financial reporting',
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

      {/* The real question */}
      <section className="max-w-3xl mx-auto px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">The Real Question</h2>
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            YNAB is a fantastic app — if you want a comprehensive budgeting system. But many people sign up for YNAB when all they really need is <strong className="text-white">a simple way to track bill due dates</strong>.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed mb-4">
            That&apos;s like buying a Swiss Army knife when you just need scissors.
          </p>
          <p className="text-zinc-300 text-lg leading-relaxed">
            Duezo costs <strong className="text-orange-400">67% less than YNAB</strong>, takes 2 minutes to set up (vs hours for YNAB), and does the one thing most people actually need: making sure bills get paid on time.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Just Need Bill Tracking?</h2>
        <p className="text-zinc-400 text-lg mb-8">
          Skip the budgeting complexity. Track your bills in 2 minutes.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-10 py-4 rounded-xl text-lg transition-colors"
        >
          Start Free Trial <ArrowRight className="w-5 h-5" />
        </Link>
        <p className="text-zinc-500 text-sm mt-4">$4.99/mo · 67% less than YNAB · Cancel anytime</p>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">Home</Link>
        <Link href="/prism-alternative" className="hover:text-zinc-300 transition-colors">Prism Alternative</Link>
        <Link href="/vs/rocket-money" className="hover:text-zinc-300 transition-colors">Duezo vs Rocket Money</Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">Blog</Link>
      </div>
    </main>
  );
}
