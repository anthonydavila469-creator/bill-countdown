'use client';

import { useEffect, useState } from 'react';

interface PipelineResult {
  email: {
    id: string;
    from: string;
    subject: string;
    date: string;
    plainBodyLength: number;
    htmlBodyLength: number;
  };
  preprocessing: {
    cleanedTextLength: number;
    cleanedTextPreview: string;
  };
  candidateExtraction: {
    isPromotional: boolean;
    skipReason: string | null;
    keywordScore: number;
    amountsFound: number;
    amounts: Array<{ value: number; context: string; keywordScore: number }>;
    datesFound: number;
    dates: Array<{ value: string; context: string; keywordScore: number }>;
    namesFound: number;
    names: Array<{ value: string; source: string; confidence: number }>;
  };
  paymentLinkExtraction: {
    skipReason: string | null;
    candidatesFound: number;
    candidates: Array<{ url: string; anchorText: string; score: number; domain: string }>;
  };
  databaseStatus: {
    alreadyProcessed: boolean;
    emailRawId: string | null;
  };
  willBeProcessed: boolean;
  error?: string;
}

export default function PipelineDebugPage() {
  const [emailIndex, setEmailIndex] = useState(0);
  const [data, setData] = useState<PipelineResult | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchPipeline = async (index: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/extraction/test-pipeline?index=${index}`);
      const result = await res.json();
      setData(result);
    } catch (e) {
      setData({ error: 'Failed to fetch' } as PipelineResult);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPipeline(0);
  }, []);

  const handlePrev = () => {
    const newIndex = Math.max(0, emailIndex - 1);
    setEmailIndex(newIndex);
    fetchPipeline(newIndex);
  };

  const handleNext = () => {
    const newIndex = emailIndex + 1;
    setEmailIndex(newIndex);
    fetchPipeline(newIndex);
  };

  if (data?.error) {
    return (
      <div className="min-h-screen bg-[#08080c] text-white p-8">
        <h1 className="text-2xl font-bold mb-4 text-red-500">Error</h1>
        <p>{data.error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#08080c] text-white p-8">
      <h1 className="text-2xl font-bold mb-6">Pipeline Debug</h1>

      {/* Navigation */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={emailIndex === 0 || loading}
          className="px-4 py-2 bg-white/10 rounded disabled:opacity-50"
        >
          ← Previous
        </button>
        <span className="text-gray-400">Email #{emailIndex + 1}</span>
        <button
          onClick={handleNext}
          disabled={loading}
          className="px-4 py-2 bg-white/10 rounded disabled:opacity-50"
        >
          Next →
        </button>
        {loading && <span className="text-gray-500">Loading...</span>}
      </div>

      {data && !loading && (
        <div className="space-y-6">
          {/* Email Info */}
          <div className="p-4 bg-white/5 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-emerald-400">Email</h2>
            <p className="font-medium">{data.email.subject}</p>
            <p className="text-sm text-gray-400">From: {data.email.from}</p>
            <p className="text-sm text-gray-400">
              Plain: {data.email.plainBodyLength} chars | HTML: {data.email.htmlBodyLength} chars
            </p>
          </div>

          {/* Will be processed? */}
          <div className={`p-4 rounded-lg ${data.willBeProcessed ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <h2 className="text-lg font-semibold mb-1">
              {data.willBeProcessed ? '✓ Will be processed' : '✗ Will be SKIPPED'}
            </h2>
            {data.candidateExtraction.skipReason && (
              <p className="text-sm">Reason: {data.candidateExtraction.skipReason}</p>
            )}
            {data.candidateExtraction.isPromotional && (
              <p className="text-sm">Marked as promotional</p>
            )}
            {data.databaseStatus.alreadyProcessed && (
              <p className="text-sm text-yellow-400">Already processed in database</p>
            )}
          </div>

          {/* Candidate Extraction */}
          <div className="p-4 bg-white/5 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-emerald-400">Candidate Extraction</h2>
            <p className="text-sm mb-2">Keyword Score: <span className="text-emerald-400">{data.candidateExtraction.keywordScore}</span></p>

            <div className="grid grid-cols-2 gap-4 mt-3">
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">Amounts ({data.candidateExtraction.amountsFound})</h3>
                {data.candidateExtraction.amounts.map((a, i) => (
                  <p key={i} className="text-xs text-gray-400">
                    ${a.value.toFixed(2)} (score: {a.keywordScore})
                  </p>
                ))}
                {data.candidateExtraction.amountsFound === 0 && (
                  <p className="text-xs text-red-400">No amounts found</p>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-1">Dates ({data.candidateExtraction.datesFound})</h3>
                {data.candidateExtraction.dates.map((d, i) => (
                  <p key={i} className="text-xs text-gray-400">
                    {d.value} (score: {d.keywordScore})
                  </p>
                ))}
                {data.candidateExtraction.datesFound === 0 && (
                  <p className="text-xs text-red-400">No dates found</p>
                )}
              </div>
            </div>

            <div className="mt-3">
              <h3 className="text-sm font-medium text-gray-300 mb-1">Names ({data.candidateExtraction.namesFound})</h3>
              {data.candidateExtraction.names.map((n, i) => (
                <p key={i} className="text-xs text-gray-400">
                  {n.value} ({n.source}, conf: {n.confidence.toFixed(2)})
                </p>
              ))}
            </div>
          </div>

          {/* Payment Links */}
          <div className="p-4 bg-white/5 rounded-lg">
            <h2 className="text-lg font-semibold mb-2 text-emerald-400">Payment Links</h2>
            {data.paymentLinkExtraction.skipReason ? (
              <p className="text-sm text-red-400">{data.paymentLinkExtraction.skipReason}</p>
            ) : (
              <>
                <p className="text-sm mb-2">Found {data.paymentLinkExtraction.candidatesFound} candidates</p>
                {data.paymentLinkExtraction.candidates.map((c, i) => (
                  <div key={i} className="mb-2 p-2 bg-black/30 rounded text-xs">
                    <p className="text-emerald-400">"{c.anchorText}" (score: {c.score})</p>
                    <p className="text-gray-500 truncate">{c.url}</p>
                    <p className="text-gray-600">{c.domain}</p>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Cleaned Text Preview */}
          <details className="p-4 bg-white/5 rounded-lg">
            <summary className="text-lg font-semibold cursor-pointer text-emerald-400">
              Cleaned Text Preview ({data.preprocessing.cleanedTextLength} chars)
            </summary>
            <pre className="mt-2 p-2 bg-black/30 rounded text-xs text-gray-400 whitespace-pre-wrap">
              {data.preprocessing.cleanedTextPreview}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
