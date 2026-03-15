import { createHash } from 'node:crypto';
import { convert } from 'html-to-text';
import { load } from 'cheerio';
import type { NormalizedEmail, Provider } from '@/types/parser';
import { normalizeWhitespace, parseFromAddress } from '../utils';

const QUOTED_REPLY_PATTERNS = [
  /^on\s.+?wrote:\s*$/gim,
  /^from:\s.+$/gim,
  /^sent:\s.+$/gim,
  /^-{2,}\s*original message\s*-{2,}$/gim,
  /^_{5,}$/gim,
];

const SIGNATURE_PATTERNS = [
  /\n--\s*\n[\s\S]*$/m,
  /\nsent from my (?:iphone|android|pixel|galaxy)[\s\S]*$/im,
  /\n(?:thanks|thank you|best|regards|sincerely),?\s*\n[\s\S]{0,280}$/im,
  /\nmanage preferences[\s\S]*$/im,
  /\nunsubscribe[\s\S]*$/im,
];

function stripCssNoise(value: string): string {
  return value
    .replace(/\b(?:margin|padding|font-family|font-size|line-height|color|background(?:-color)?):[^;]+;?/gi, ' ')
    .replace(/\{[^}]*\}/g, ' ');
}

function stripQuotedReplies(value: string): string {
  let next = value;
  for (const pattern of QUOTED_REPLY_PATTERNS) {
    const match = pattern.exec(next);
    pattern.lastIndex = 0;
    if (match && match.index >= 0) {
      next = next.slice(0, match.index).trim();
    }
  }
  return next;
}

function stripSignature(value: string): string {
  let next = value;
  for (const pattern of SIGNATURE_PATTERNS) {
    next = next.replace(pattern, '');
  }
  return next;
}

export function cleanHtml(html?: string | null): { text: string; domFingerprint: string; html: string | null } {
  if (!html) {
    return { text: '', domFingerprint: '', html: null };
  }

  const $ = load(html);
  $('script, style, head, meta, link, svg, noscript, footer, form').remove();

  $('[hidden], [aria-hidden="true"]').remove();
  $('[style]').each((_, element) => {
    const style = ($(element).attr('style') || '').toLowerCase();
    if (
      style.includes('display:none') ||
      style.includes('visibility:hidden') ||
      style.includes('opacity:0') ||
      style.includes('font-size:0') ||
      style.includes('max-height:0')
    ) {
      $(element).remove();
    }
  });

  $('img').each((_, element) => {
    const width = $(element).attr('width');
    const height = $(element).attr('height');
    const src = ($(element).attr('src') || '').toLowerCase();
    if (width === '1' || height === '1' || src.includes('open') || src.includes('track') || src.includes('pixel')) {
      $(element).remove();
    }
  });

  $('a, p, div, span, td, li').each((_, element) => {
    const text = normalizeWhitespace($(element).text()).toLowerCase();
    if (!text) return;
    if (text.includes('unsubscribe') || text.includes('manage preferences') || text.includes('email preferences')) {
      $(element).remove();
    }
  });

  const tags: string[] = [];
  $('body *').each((_, element) => {
    if (tags.length < 48) {
      const tagName = 'tagName' in element ? String(element.tagName || '') : '';
      tags.push(tagName.toLowerCase());
    }
  });
  const domFingerprint = tags.join('>').slice(0, 64);

  const cleanedHtml = $.html('body') || $.root().html() || html;
  const text = convert(cleanedHtml, {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: 'a', options: { ignoreHref: true } },
      { selector: 'img', format: 'skip' },
    ],
  })
  const cleanedText = normalizeWhitespace(stripSignature(stripQuotedReplies(stripCssNoise(text))));

  return { text: cleanedText, domFingerprint, html: cleanedHtml || null };
}

export function cleanPlainText(text?: string | null): string {
  if (!text) return '';
  const normalized = text
    .replace(/=\r?\n/g, '')
    .replace(/=([A-F0-9]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, ' ')
    .replace(/Content-Type:[^\n]+/gi, ' ')
    .replace(/Content-Transfer-Encoding:[^\n]+/gi, ' ')
    .replace(/--[-A-Za-z0-9_=]{6,}/g, ' ');
  return normalizeWhitespace(stripSignature(stripQuotedReplies(stripCssNoise(normalized))));
}

export function subjectShape(subject: string): string {
  return normalizeWhitespace(subject)
    .toLowerCase()
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,\s*\d{2,4})?/gi, '<date>')
    .replace(/\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b/g, '<date>')
    .replace(/\b\$?\d[\d,.]*\b/g, '<num>');
}

export function textFingerprint(text: string): string {
  return normalizeWhitespace(text).slice(0, 128);
}

export function bodyHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export function buildNormalizedEmail(options: {
  id: string;
  userId: string;
  provider: Provider;
  providerMessageId: string;
  subject: string;
  from: string;
  receivedAt: string;
  bodyPlain?: string | null;
  bodyHtml?: string | null;
  fallbackText?: string | null;
}): NormalizedEmail {
  const parsed = parseFromAddress(options.from);
  const htmlCleaned = cleanHtml(options.bodyHtml);
  const plainCleaned = cleanPlainText(options.bodyPlain);
  const fallbackText = cleanPlainText(options.fallbackText);
  const combined = normalizeWhitespace([
    options.subject,
    plainCleaned,
    htmlCleaned.text,
    fallbackText,
  ].filter(Boolean).join('\n'));

  return {
    id: options.id,
    userId: options.userId,
    provider: options.provider,
    providerMessageId: options.providerMessageId,
    subject: normalizeWhitespace(options.subject),
    from: options.from,
    fromName: parsed.fromName,
    fromEmail: parsed.fromEmail,
    senderDomain: parsed.senderDomain,
    receivedAt: options.receivedAt,
    headers: {},
    bodyPlain: plainCleaned,
    bodyHtml: htmlCleaned.html,
    bodyText: combined,
    bodyHash: bodyHash(combined),
    domFingerprint: htmlCleaned.domFingerprint,
    textFingerprint: textFingerprint(combined),
    subjectShape: subjectShape(options.subject),
  };
}
