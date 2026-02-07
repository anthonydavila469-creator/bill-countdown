'use client';

import { useEffect, useState } from 'react';

interface DebugData {
  user_id: string;
  summary: {
    total_emails: number;
    total_extractions: number;
  };
  recent_emails: Array<{
    id: string;
    gmail_message_id: string;
    subject: string;
    from_address: string;
    date_received: string;
    processed_at: string | null;
    created_at: string;
  }>;
  recent_extractions: Array<{
    id: string;
    status: string;
    extracted_name: string | null;
    extracted_amount: number | null;
    extracted_due_date: string | null;
    confidence_overall: number | null;
    payment_url: string | null;
    payment_confidence: number | null;
    candidate_payment_links: Array<{
      url: string;
      anchorText: string;
      score: number;
      domain: string;
    }> | null;
    created_at: string;
    email_raw_id: string | null;
  }>;
}

export default function DebugPage() {
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rescanning, setRescanning] = useState(false);
  const [rescanResult, setRescanResult] = useState<string | null>(null);

  const fetchData = () => {
    fetch('/api/extraction/debug')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          setError(d.error);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleForceRescan = async () => {
    setRescanning(true);
    setRescanResult(null);
    try {
      // First, clear existing extractions and reset processed status
      const clearRes = await fetch('/api/extraction/debug/clear', {
        method: 'POST',
      });
      if (!clearRes.ok) {
        const clearResult = await clearRes.json();
        setRescanResult(`Clear failed: ${clearResult.error}`);
        setRescanning(false);
        return;
      }

      // Then rescan
      const res = await fetch('/api/extraction/scan-inbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceReprocess: true,
          maxResults: 200,
          daysBack: 90,
        }),
      });

      // Handle 423 (sync already in progress)
      if (res.status === 423) {
        setRescanResult('A sync is already in progress. Please wait and try again.');
        setRescanning(false);
        return;
      }

      const result = await res.json();
      setRescanResult(`Rescanned: ${result.processed} processed, ${result.autoAccepted} auto-accepted, ${result.needsReview} need review`);
      // Refresh the debug data
      fetchData();
    } catch (e) {
      setRescanResult(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
    setRescanning(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white p-8">
        <h1 className="text-2xl font-bold mb-4">Loading debug data...</h1>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Email Extraction Debug</h1>

      {/* Force Rescan Button */}
      <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2 text-amber-400">Force Rescan</h2>
        <p className="text-sm text-gray-400 mb-3">
          Re-run the extraction pipeline on all emails to populate payment link data.
        </p>
        <button
          onClick={handleForceRescan}
          disabled={rescanning}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-500 text-black font-medium rounded-lg transition-colors"
        >
          {rescanning ? 'Rescanning...' : 'Force Rescan All Emails'}
        </button>
        {rescanResult && (
          <p className="mt-2 text-sm text-emerald-400">{rescanResult}</p>
        )}
      </div>

      {/* Summary */}
      <div className="mb-8 p-4 bg-white/5 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">Summary</h2>
        <p>Total Emails Scanned: <span className="text-emerald-400">{data?.summary.total_emails}</span></p>
        <p>Total Extractions: <span className="text-emerald-400">{data?.summary.total_extractions}</span></p>
      </div>

      {/* Recent Emails */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Emails ({data?.recent_emails.length})</h2>
        {data?.recent_emails.length === 0 ? (
          <p className="text-gray-400">No emails found. Try scanning your inbox first.</p>
        ) : (
          <div className="space-y-2">
            {data?.recent_emails.map((email) => (
              <div key={email.id} className="p-3 bg-white/5 rounded-lg text-sm">
                <p className="font-medium truncate">{email.subject}</p>
                <p className="text-gray-400 text-xs">From: {email.from_address}</p>
                <p className="text-gray-400 text-xs">
                  Date: {new Date(email.date_received).toLocaleDateString()}
                  {email.processed_at ? ' ✓ Processed' : ' ⏳ Not processed'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Extractions */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-4">Recent Extractions ({data?.recent_extractions.length})</h2>
        {data?.recent_extractions.length === 0 ? (
          <p className="text-gray-400">No extractions found.</p>
        ) : (
          <div className="space-y-3">
            {data?.recent_extractions.map((ext) => (
              <div key={ext.id} className="p-4 bg-white/5 rounded-lg text-sm">
                <div className="flex justify-between items-start mb-2">
                  <p className="font-medium">{ext.extracted_name || 'Unknown'}</p>
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    ext.status === 'auto_accepted' ? 'bg-emerald-500/20 text-emerald-400' :
                    ext.status === 'needs_review' ? 'bg-yellow-500/20 text-yellow-400' :
                    ext.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {ext.status}
                  </span>
                </div>
                <p className="text-gray-400">
                  Amount: ${ext.extracted_amount?.toFixed(2) || 'N/A'} |
                  Due: {ext.extracted_due_date || 'N/A'} |
                  Confidence: {((ext.confidence_overall || 0) * 100).toFixed(0)}%
                </p>

                {/* Payment Link Info */}
                <div className="mt-2 pt-2 border-t border-white/10">
                  <p className="text-xs text-gray-400">
                    Payment URL: {ext.payment_url ? (
                      <a href={ext.payment_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                        {ext.payment_url.substring(0, 50)}...
                      </a>
                    ) : 'None'}
                  </p>
                  <p className="text-xs text-gray-400">
                    Payment Confidence: {ext.payment_confidence ? `${(ext.payment_confidence * 100).toFixed(0)}%` : 'N/A'}
                  </p>
                  {ext.candidate_payment_links && ext.candidate_payment_links.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer">
                        {ext.candidate_payment_links.length} payment link candidates
                      </summary>
                      <div className="mt-1 pl-2 space-y-1">
                        {ext.candidate_payment_links.map((link, i) => (
                          <p key={i} className="text-xs text-gray-500">
                            [{link.score}] "{link.anchorText}" - {link.domain}
                          </p>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
