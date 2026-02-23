import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy | Duezo',
  description: 'How Duezo collects, uses, and protects your data.',
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#08080c] text-white">
      {/* Navigation */}
      <nav className="border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">
                Due<span className="text-violet-400">zo</span>
              </span>
            </Link>
            <Link
              href="/"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Privacy Policy</h1>
          <p className="text-zinc-500 text-sm">Last updated: February 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-10">
          {/* Introduction */}
          <section>
            <p className="text-zinc-300 leading-relaxed">
              Duezo (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) is committed to
              protecting your privacy. This Privacy Policy explains how we collect, use, and
              safeguard your information when you use our bill tracking application at duezo.app.
            </p>
          </section>

          {/* What Data We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. What Data We Collect</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Account Information</h3>
                <p>
                  When you create an account, we collect your email address, name, and authentication
                  credentials. If you sign in with Google, we receive your basic profile information
                  from Google.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Bill Information</h3>
                <p>
                  We store the bill data you create or import, including bill names, amounts, due
                  dates, categories, payment status, and recurring schedules.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Payment Data</h3>
                <p>
                  Subscription payments are processed through Stripe. We do not store your credit
                  card numbers or full payment details. Stripe handles all payment information
                  securely in accordance with PCI-DSS standards.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-medium text-white mb-2">Usage Data</h3>
                <p>
                  We may collect basic usage data such as pages visited and features used to improve
                  the application experience.
                </p>
              </div>
            </div>
          </section>

          {/* How We Use Gmail Data */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. How We Use Gmail Data</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>
                If you choose to connect your Gmail account, we request <strong className="text-white">read-only</strong> access
                to your emails. Here&rsquo;s exactly how we handle your email data:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  We only search for and process emails that appear to be bill-related (e.g.,
                  invoices, payment reminders, statements).
                </li>
                <li>
                  We <strong className="text-white">do not</strong> store the full content of your emails. Only extracted
                  bill details (payee name, amount, due date) are saved.
                </li>
                <li>
                  We <strong className="text-white">do not</strong> read, modify, or delete any emails in your inbox.
                </li>
                <li>
                  We <strong className="text-white">do not</strong> share your email data with third parties for advertising.
                </li>
                <li>
                  You can disconnect Gmail at any time from Settings, which revokes our access
                  immediately.
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use AI */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use AI</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>
                We use Anthropic&rsquo;s Claude AI to process bill-related emails and extract
                structured data (bill names, amounts, due dates, and categories). This processing
                happens on Anthropic&rsquo;s servers.
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Only the text content of bill-related emails is sent to the AI for processing.
                </li>
                <li>
                  Anthropic does not use your data to train their models (per their data processing
                  terms).
                </li>
                <li>
                  Extracted bill data is stored in our database. The original email content is not
                  retained after processing.
                </li>
              </ul>
            </div>
          </section>

          {/* Third-Party Services */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Third-Party Services</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>We use the following third-party services to operate Duezo:</p>
              <div className="rounded-xl border border-white/10 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      <th className="text-left p-4 font-medium text-white">Service</th>
                      <th className="text-left p-4 font-medium text-white">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    <tr>
                      <td className="p-4 text-zinc-300">Supabase</td>
                      <td className="p-4 text-zinc-400">Authentication and database hosting</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-zinc-300">Stripe</td>
                      <td className="p-4 text-zinc-400">Subscription payment processing</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-zinc-300">Anthropic (Claude)</td>
                      <td className="p-4 text-zinc-400">AI-powered bill extraction from emails</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-zinc-300">Google (Gmail API)</td>
                      <td className="p-4 text-zinc-400">Email access for bill detection (optional)</td>
                    </tr>
                    <tr>
                      <td className="p-4 text-zinc-300">Vercel</td>
                      <td className="p-4 text-zinc-400">Application hosting</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p>
                Each service operates under its own privacy policy and data processing terms.
              </p>
            </div>
          </section>

          {/* Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>We take security seriously and implement the following measures:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  All data is encrypted in transit (TLS/HTTPS) and at rest.
                </li>
                <li>
                  Database access is protected by <strong className="text-white">Row-Level Security (RLS)</strong> policies,
                  ensuring users can only access their own data.
                </li>
                <li>
                  Authentication is handled by Supabase Auth with industry-standard security
                  practices.
                </li>
                <li>
                  OAuth tokens for Gmail are stored encrypted and can be revoked at any time.
                </li>
                <li>
                  We do not store passwords in plaintext.
                </li>
              </ul>
            </div>
          </section>

          {/* User Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <div className="space-y-4 text-zinc-300 leading-relaxed">
              <p>You have the following rights regarding your data:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong className="text-white">Delete your account</strong> — You can permanently delete your account
                  and all associated data from Settings. This action is immediate and irreversible.
                </li>
                <li>
                  <strong className="text-white">Export your data</strong> — You can export your payment history as CSV
                  from the History page.
                </li>
                <li>
                  <strong className="text-white">Disconnect Gmail</strong> — You can revoke Gmail access at any time
                  from Settings.
                </li>
                <li>
                  <strong className="text-white">Access your data</strong> — All your bill data is visible within the
                  application at all times.
                </li>
              </ul>
            </div>
          </section>

          {/* Changes */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Changes to This Policy</h2>
            <p className="text-zinc-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any
              significant changes by email or through a notice within the application. Continued use
              of Duezo after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Contact */}
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Contact Us</h2>
            <p className="text-zinc-300 leading-relaxed">
              If you have any questions about this Privacy Policy or how we handle your data, please
              contact us at{' '}
              <a
                href="mailto:support@duezo.app"
                className="text-violet-400 hover:text-violet-300 transition-colors"
              >
                support@duezo.app
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-violet-500 to-violet-400 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Duezo</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-zinc-500">
              <span className="text-white">Privacy</span>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms
              </Link>
              <a href="mailto:support@duezo.app" className="hover:text-white transition-colors">
                Contact
              </a>
            </div>
            <p className="text-sm text-zinc-500">
              &copy; {new Date().getFullYear()} Duezo
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
