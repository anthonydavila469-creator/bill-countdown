'use client';

import { useEffect, useState } from 'react';

interface EmailSummary {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  hasPlainBody: boolean;
  plainBodyLength: number;
  hasHtmlBody: boolean;
  htmlBodyLength: number;
  htmlPreview: string;
}

interface TestData {
  gmail_connected: boolean;
  token_email: string;
  emails_fetched: number;
  emails: EmailSummary[];
  error?: string;
  details?: string;
}

export default function DebugEmailsPage() {
  const [data, setData] = useState<TestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/extraction/test-fetch')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setData({ error: e.message } as TestData);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Fetching emails from Gmail...</h1>
        <p className="text-gray-400">This may take a few seconds...</p>
      </div>
    );
  }

  if (data?.error) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p className="mb-2">{data.error}</p>
        {data.details && <p className="text-gray-400 text-sm">{data.details}</p>}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Gmail Emails Debug</h1>

      {/* Connection Status */}
      <div className="mb-6 p-4 bg-white/5 rounded-lg">
        <p>Gmail Connected: <span className="text-emerald-400">{data?.gmail_connected ? 'Yes' : 'No'}</span></p>
        <p>Account: <span className="text-emerald-400">{data?.token_email}</span></p>
        <p>Emails Found: <span className="text-emerald-400">{data?.emails_fetched}</span></p>
      </div>

      {/* Email List */}
      <div className="space-y-4">
        {data?.emails.map((email, index) => (
          <div key={email.id} className="p-4 bg-white/5 rounded-lg">
            <div className="flex justify-between items-start mb-2">
              <span className="text-gray-500 text-sm">#{index + 1}</span>
              <span className="text-gray-500 text-xs">{new Date(email.date).toLocaleString()}</span>
            </div>

            <p className="font-medium text-emerald-400 mb-1">{email.subject}</p>
            <p className="text-sm text-gray-400 mb-2">From: {email.from}</p>

            <p className="text-xs text-gray-500 mb-3">{email.snippet}...</p>

            <div className="flex gap-4 text-xs">
              <span className={email.hasPlainBody ? 'text-emerald-400' : 'text-red-400'}>
                Plain: {email.hasPlainBody ? `✓ ${email.plainBodyLength} chars` : '✗ None'}
              </span>
              <span className={email.hasHtmlBody ? 'text-emerald-400' : 'text-red-400'}>
                HTML: {email.hasHtmlBody ? `✓ ${email.htmlBodyLength} chars` : '✗ None'}
              </span>
            </div>

            {email.hasHtmlBody && (
              <details className="mt-2">
                <summary className="text-xs text-gray-500 cursor-pointer">Show HTML preview</summary>
                <pre className="mt-1 p-2 bg-black/30 rounded text-xs text-gray-400 overflow-x-auto">
                  {email.htmlPreview}...
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {data?.emails.length === 0 && (
        <p className="text-gray-400">No emails found. The Gmail query might not be matching any emails.</p>
      )}
    </div>
  );
}
