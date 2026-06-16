import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Duezo FAQ — Everything You Want to Know About the App | Duezo',
  description:
    'Answers to the most common questions about Duezo: how it works, what it costs, privacy, bank logins, AI photo scan, and more. Written in plain English.',
  keywords: [
    'duezo faq',
    'duezo questions',
    'is duezo free',
    'duezo bill tracker',
    'duezo privacy',
    'duezo vs spreadsheet',
    'bill tracking app faq',
  ],
  openGraph: {
    title: 'Duezo FAQ — Everything You Want to Know',
    description:
      'Common questions about Duezo answered in plain English. No jargon, no spin.',
    url: 'https://duezo.app/blog/duezo-faq',
    siteName: 'Duezo',
    type: 'article',
  },
  alternates: { canonical: 'https://duezo.app/blog/duezo-faq' },
};

const faqs = [
  {
    q: 'Can Duezo really replace my spreadsheet?',
    a: "Honestly? Yes. If you're tracking bills in a spreadsheet you're doing a lot of manual work — typing in amounts, remembering due dates, checking things off. Duezo does all of that automatically. Use Quick Add to pick a vendor and fill in the details, or snap a photo and AI pulls the name, amount, and due date for you. You get countdown cards that change color as deadlines approach, recurring bill support, and a calendar view. The only thing a spreadsheet does better is let you add custom formulas — but if you just need to know what's due and when, Duezo is faster and less error-prone.",
  },
  {
    q: 'What is the fastest way to add a bill?',
    a: "Quick Add is the fastest — tap +, start typing a vendor name, and pick from 30+ autocomplete suggestions. The name and category fill in automatically. Or snap a photo of any bill or statement and AI extracts the name, amount, and due date for you. You can also set bills as recurring so they auto-generate each month.",
  },
  {
    q: 'How much does Duezo cost?',
    a: "Duezo is free to download with up to 5 bills. Every core feature — push notifications, calendar view, widgets, Quick Add — is included in the free tier. Duezo Pro is $3.99/month or $19.99/year (yearly includes a 7-day free trial) for unlimited bills and all features. The developer built this for himself and keeps the pricing simple.",
  },
  {
    q: 'Do I have to connect my bank account?',
    a: "No, and you never will. Duezo will never ask for your bank login, Plaid credentials, or financial account access. You add bills with Quick Add or by snapping a photo. Your bank stays completely out of the picture. This was a deliberate design choice — the developer built Duezo specifically because other apps demanded bank access just to track due dates.",
  },
  {
    q: 'How does the AI photo scanning work?',
    a: "When you snap a photo of a bill or statement, the app sends the image through an AI model (Claude by Anthropic). The AI reads the photo and extracts three things: the bill name (like 'Electric Bill' or 'Netflix'), the amount due, and the due date. It works with most standard bills and statements — utilities, subscriptions, credit cards, rent notices, and more. If the AI can't confidently extract something, it leaves the field blank for you to fill in.",
  },
  {
    q: 'What if the AI gets the amount or due date wrong?',
    a: "It happens occasionally, especially with unusual bill formats. You can edit any bill at any time — just tap on it and change the amount, date, or name. The AI is right about 95% of the time, but Duezo always lets you have the final say. Think of the AI as a fast first draft, not the final answer.",
  },
  {
    q: 'Is my data safe? Who can see my bills?',
    a: "Only you. Duezo uses Supabase with row-level security, which means the database itself enforces that you can only see your own data — it's not just application-level logic. Your data is encrypted in transit and at rest. The app never sells, shares, or analyzes your bill data for advertising. There is no analytics SDK tracking your behavior inside the app.",
  },
  {
    q: 'Does Duezo work on Android?',
    a: "Not yet. Right now Duezo is available as a native iOS app and as a web app that works in any browser. The web app works great on Android phones — you can add it to your home screen for an app-like experience. A native Android app is something the developer wants to build, but as a solo project, iOS and web came first.",
  },
  {
    q: 'Can I share bills with my partner or roommate?',
    a: "Not currently. Duezo is designed as a personal bill tracker. Shared bills and household accounts are on the roadmap, but there is no timeline yet. For now, both people can track the same bills in their own accounts.",
  },
  {
    q: 'How is Duezo different from Rocket Money or YNAB?',
    a: "Rocket Money and YNAB are full budgeting platforms. They connect to your bank, categorize transactions, and help you plan spending. Duezo does one thing: it tells you what bills are due and when. No bank connection, no transaction tracking, no budget categories. If you want a complete financial picture, those apps are great. If you just want to stop paying late fees, Duezo is simpler, faster, and more affordable at $3.99/mo.",
  },
  {
    q: 'What are the countdown cards?',
    a: "They're the core of Duezo. Each bill gets a visual card that shows the bill name, amount, and a countdown to the due date. The cards change color as the deadline gets closer — green when you have plenty of time, amber when it's getting close, and red when it's due soon or overdue. It's a glanceable way to know your financial obligations without opening a spreadsheet or checking your email.",
  },
  {
    q: 'Who built Duezo?',
    a: "One person — Anthony Dyess, an indie developer. He works as a plasma cutter during the day and builds apps at night. Duezo started because he kept getting hit with late fees, not because he didn't have money, but because he forgot due dates. There's no company behind it, no VC funding, no team. Just one developer who uses the app every day and keeps making it better.",
  },
];

export default function DuezoFaqPage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.a,
      },
    })),
  };

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Duezo FAQ — Everything You Want to Know About the App',
    datePublished: '2026-03-26',
    dateModified: '2026-03-26',
    author: { '@type': 'Person', name: 'Anthony Dyess' },
    publisher: {
      '@type': 'Organization',
      name: 'Duezo',
      url: 'https://duezo.app',
    },
    description:
      'Answers to the most common questions about Duezo in a conversational tone.',
  };

  return (
    <main className="min-h-screen bg-[#0F0A1E] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <article className="max-w-3xl mx-auto px-6 pt-24 pb-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-zinc-500 mb-10">
          <Link href="/" className="hover:text-zinc-300 transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-zinc-300 transition-colors">
            Blog
          </Link>
          <span>/</span>
          <span className="text-zinc-300">Duezo FAQ</span>
        </nav>

        {/* Byline */}
        <div className="flex items-center gap-3 text-sm text-zinc-500 mb-6">
          <Calendar className="w-4 h-4" />
          <time dateTime="2026-03-26">March 26, 2026</time>
          <span>·</span>
          <span>10 min read</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">
          Duezo FAQ — Everything You Want to Know
        </h1>

        <p className="text-lg text-zinc-400 mb-12 leading-relaxed">
          Real questions, honest answers. No marketing speak. Here&apos;s everything
          people ask about Duezo — from how the AI works to whether it&apos;s
          actually free (it is).
        </p>

        {/* FAQ list */}
        <div className="space-y-10">
          {faqs.map((faq, i) => (
            <section key={i}>
              <h2 className="text-xl font-semibold mb-3 text-white">
                {faq.q}
              </h2>
              <p className="text-zinc-300 leading-relaxed">{faq.a}</p>
            </section>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center p-8 rounded-2xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border border-violet-500/20">
          <h2 className="text-2xl font-bold mb-3">
            Ready to stop paying late fees?
          </h2>
          <p className="text-zinc-400 mb-6">
            Download Duezo free — no bank login required. $3.99/mo Pro for unlimited bills.
          </p>
          <Link
            href="https://apps.apple.com/us/app/duezo/id6759273131"
            className="group inline-flex items-center gap-2 px-6 py-3 text-base font-semibold bg-gradient-to-r from-violet-500 to-violet-500 rounded-full hover:opacity-90 transition-opacity"
          >
            Download on the App Store
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Related */}
        <div className="mt-12 pt-8 border-t border-white/5">
          <h3 className="text-lg font-semibold mb-4">Related Articles</h3>
          <div className="space-y-3">
            <Link
              href="/blog/never-miss-a-bill-payment"
              className="block text-violet-400 hover:underline"
            >
              Never Miss a Bill Payment Again: 7 Tips + The App That Automates
              It
            </Link>
            <Link
              href="/blog/why-simple-bill-tracker-beats-budgeting-apps"
              className="block text-violet-400 hover:underline"
            >
              Why a Simple Bill Tracker Beats Complex Budgeting Apps
            </Link>
            <Link
              href="/blog/bill-tracker-no-bank-account"
              className="block text-violet-400 hover:underline"
            >
              Best Bill Tracker Apps That Don&apos;t Require a Bank Account
            </Link>
            <Link
              href="/about"
              className="block text-violet-400 hover:underline"
            >
              About Duezo &amp; Anthony Dyess
            </Link>
          </div>
        </div>
      </article>

      <div className="max-w-3xl mx-auto px-6 pb-16 flex flex-wrap justify-center gap-6 text-sm text-zinc-500">
        <Link href="/" className="hover:text-zinc-300 transition-colors">
          Home
        </Link>
        <Link href="/blog" className="hover:text-zinc-300 transition-colors">
          Blog
        </Link>
        <Link href="/about" className="hover:text-zinc-300 transition-colors">
          About
        </Link>
      </div>
    </main>
  );
}
