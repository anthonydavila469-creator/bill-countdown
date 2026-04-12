import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Mail, Code, Wrench } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About Duezo — Built by Anthony Dyess',
  description:
    'Duezo is a bill tracking app built by Anthony Dyess, an indie developer who got tired of paying late fees. No VC, no investors — just one developer solving a real problem.',
  keywords: [
    'about duezo',
    'duezo developer',
    'anthony dyess',
    'indie app developer',
    'bill tracking app creator',
  ],
  openGraph: {
    title: 'About Duezo — Built by Anthony Dyess',
    description:
      'Meet the solo developer behind Duezo. Built after one too many late fees.',
    url: 'https://duezo.app/about',
    siteName: 'Duezo',
    type: 'website',
  },
  twitter: {
    title: 'About Duezo — Built by Anthony Dyess',
    description:
      'Meet the solo developer behind Duezo. Built after one too many late fees.',
  },
  alternates: { canonical: 'https://duezo.app/about' },
};

export default function AboutPage() {
  const personJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'Anthony Dyess',
    jobTitle: 'Founder & Developer',
    worksFor: {
      '@type': 'Organization',
      name: 'Duezo',
      url: 'https://duezo.app',
    },
    description:
      'Indie developer and creator of Duezo, a bill tracking app.',
  };

  return (
    <main className="min-h-screen bg-[#0F0A1E] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />

      <section className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-10">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-zinc-300">About</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-8">
          About{' '}
          <span className="bg-gradient-to-r from-violet-400 to-violet-400 bg-clip-text text-transparent">
            Duezo
          </span>
        </h1>

        {/* Developer profile */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-12">
          {/* Gradient avatar */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-3xl font-bold text-white flex-shrink-0">
            AD
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-1">Anthony Dyess</h2>
            <p className="text-zinc-400 mb-3">Founder &amp; Solo Developer</p>
            <p className="text-zinc-300 leading-relaxed">
              Plasma cutter by day, app builder by night. I built Duezo after
              paying one too many late fees — not because I didn&apos;t have the money,
              but because I forgot the due date. Every budgeting app wanted my
              bank login. I just wanted a countdown.
            </p>
          </div>
        </div>

        {/* Credentials */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
          {[
            '5+ years building software',
            'Bootstrapped founder',
            'Built Duezo after paying too many late fees',
            'Ships code daily',
          ].map((item) => (
            <div
              key={item}
              className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-center"
            >
              <p className="text-sm text-zinc-300 font-medium">{item}</p>
            </div>
          ))}
        </div>

        {/* Story */}
        <div className="space-y-6 text-zinc-300 leading-relaxed mb-12">
          <h2 className="text-2xl font-semibold text-white">The Story</h2>
          <p>
            In late 2024, I was staring at a $35 late fee on my electric bill. I
            had the money — I just forgot it was due. I downloaded three
            different budgeting apps. Every single one wanted my bank account
            credentials before I could even see a dashboard.
          </p>
          <p>
            I didn&apos;t want budgeting. I didn&apos;t want pie charts. I just wanted
            something that would tell me &ldquo;your electric bill is due in 3
            days&rdquo; with a big, obvious countdown. So I built it.
          </p>
          <p>
            Duezo started as a weekend project and turned into a full app with
            photo scan, iOS widgets, push notifications, and a
            calendar view. It&apos;s still just me — no team, no VC money, no
            investors. Just a solo developer building the app I wish existed.
          </p>
        </div>

        {/* Values */}
        <div className="grid sm:grid-cols-3 gap-6 mb-12">
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <Wrench className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="font-semibold mb-2">Bootstrapped</h3>
            <p className="text-sm text-zinc-400">
              No VC, no investors. Built and funded entirely by one developer.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <Code className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="font-semibold mb-2">Indie Built</h3>
            <p className="text-sm text-zinc-400">
              Every line of code, every design decision — made by one person who
              uses the app daily.
            </p>
          </div>
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
            <Mail className="w-8 h-8 text-violet-400 mb-3" />
            <h3 className="font-semibold mb-2">Real Support</h3>
            <p className="text-sm text-zinc-400">
              Email me directly at{' '}
              <a
                href="mailto:support@duezo.app"
                className="text-violet-400 hover:underline"
              >
                support@duezo.app
              </a>
              . You&apos;ll hear back from the person who wrote the code.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
          <h2 className="text-2xl font-bold mb-3">Try Duezo Free</h2>
          <p className="text-zinc-400 mb-6">
            Track up to 5 bills free. Upgrade to Pro for unlimited bills and
            all features.
          </p>
          <Link
            href="https://apps.apple.com/us/app/duezo/id6759273131"
            className="group inline-flex items-center gap-2 px-6 py-3 text-base font-semibold bg-gradient-to-r from-violet-500 to-violet-500 rounded-full hover:opacity-90 transition-opacity"
          >
            Download on the App Store
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </section>

      {/* Footer links */}
      <div className="max-w-3xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          Home
        </Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">
          Blog
        </Link>
        <Link href="/privacy" className="hover:text-zinc-300 transition-colors">
          Privacy
        </Link>
        <Link href="/terms" className="hover:text-zinc-300 transition-colors">
          Terms
        </Link>
      </div>
    </main>
  );
}
