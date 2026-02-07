/**
 * Payment Link Validation
 *
 * Validates selected payment URLs for security:
 * - Must be HTTPS
 * - No URL shorteners
 * - Domain must match sender OR be in vendor_rules.allowed_payment_domains
 */

import { createClient } from '@/lib/supabase/server';
import { PaymentLinkValidationResult } from './types';
import {
  URL_SHORTENERS,
  PAYMENT_LINK_VALIDATION,
} from './constants';

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Get the base domain (remove subdomains)
 * e.g., "secure.chase.com" -> "chase.com"
 */
function getBaseDomain(domain: string): string {
  const parts = domain.split('.');
  if (parts.length <= 2) {
    return domain;
  }
  // Return last two parts (handles most cases)
  // Note: This is simplified and doesn't handle all TLDs correctly
  return parts.slice(-2).join('.');
}

/**
 * Check if a URL is from a shortener service
 */
function isShortenerUrl(domain: string): boolean {
  return URL_SHORTENERS.some(shortener =>
    domain === shortener || domain.endsWith('.' + shortener)
  );
}

/**
 * Check if two domains match (considering subdomains)
 */
function doDomainsMatch(
  urlDomain: string,
  referenceDomain: string,
  allowSubdomains: boolean = true
): boolean {
  if (urlDomain === referenceDomain) {
    return true;
  }

  if (allowSubdomains) {
    // Check if urlDomain is a subdomain of referenceDomain
    if (urlDomain.endsWith('.' + referenceDomain)) {
      return true;
    }
    // Check if they share the same base domain
    return getBaseDomain(urlDomain) === getBaseDomain(referenceDomain);
  }

  return false;
}

/**
 * Check if URL domain is in the allowed payment domains for a vendor
 */
async function isAllowedVendorDomain(
  urlDomain: string,
  vendorName: string | null
): Promise<{ allowed: boolean; matchedRule?: string }> {
  if (!vendorName) {
    return { allowed: false };
  }

  try {
    const supabase = await createClient();

    // Try to find vendor rules matching the vendor name
    const { data: rules } = await supabase
      .from('vendor_rules')
      .select('vendor_name, allowed_payment_domains')
      .ilike('vendor_name', `%${vendorName}%`)
      .limit(5);

    if (!rules || rules.length === 0) {
      return { allowed: false };
    }

    // Check if urlDomain matches any allowed domain
    for (const rule of rules) {
      const allowedDomains = rule.allowed_payment_domains as string[];
      for (const allowedDomain of allowedDomains) {
        if (doDomainsMatch(urlDomain, allowedDomain, PAYMENT_LINK_VALIDATION.allowSubdomains)) {
          return {
            allowed: true,
            matchedRule: `${rule.vendor_name}: ${allowedDomain}`,
          };
        }
      }
    }

    return { allowed: false };
  } catch (error) {
    console.error('Error checking vendor rules:', error);
    return { allowed: false };
  }
}

/**
 * Main validation function for payment links
 */
export async function validatePaymentLink(
  url: string | null,
  senderDomain: string,
  vendorName: string | null
): Promise<PaymentLinkValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Handle null URL
  if (!url) {
    return {
      isValid: false,
      url: null,
      errors: ['No URL provided'],
      warnings: [],
      finalDomain: null,
    };
  }

  // Extract and validate domain
  const urlDomain = extractDomain(url);
  if (!urlDomain) {
    return {
      isValid: false,
      url: null,
      errors: ['Invalid URL format'],
      warnings: [],
      finalDomain: null,
    };
  }

  // Check HTTPS requirement
  if (PAYMENT_LINK_VALIDATION.requireHttps && !url.startsWith('https://')) {
    errors.push('URL must use HTTPS');
  }

  // Check for URL shorteners
  if (isShortenerUrl(urlDomain)) {
    errors.push(`URL shortener detected: ${urlDomain}`);
  }

  // Check domain matching
  let domainValid = false;
  let domainSource = '';

  // First, check if domain matches sender
  if (doDomainsMatch(urlDomain, senderDomain, PAYMENT_LINK_VALIDATION.allowSubdomains)) {
    domainValid = true;
    domainSource = 'sender domain';
  }

  // If not matching sender, check vendor rules
  if (!domainValid) {
    const vendorCheck = await isAllowedVendorDomain(urlDomain, vendorName);
    if (vendorCheck.allowed) {
      domainValid = true;
      domainSource = `vendor rule: ${vendorCheck.matchedRule}`;
    }
  }

  // Also allow if URL domain contains vendor name (fuzzy match)
  if (!domainValid && vendorName) {
    const normalizedVendor = vendorName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normalizedDomain = urlDomain.replace(/[^a-z0-9.]/g, '');
    if (normalizedDomain.includes(normalizedVendor) || normalizedVendor.includes(normalizedDomain.replace('.com', '').replace('.', ''))) {
      domainValid = true;
      domainSource = 'fuzzy vendor match';
      warnings.push(`Domain matched via fuzzy vendor name: ${urlDomain}`);
    }
  }

  if (!domainValid) {
    errors.push(`Domain mismatch: ${urlDomain} does not match sender (${senderDomain}) or vendor rules`);
  }

  // Determine overall validity
  const isValid = errors.length === 0;

  return {
    isValid,
    url: isValid ? url : null,
    errors,
    warnings,
    finalDomain: urlDomain,
  };
}

/**
 * Simplified validation for testing without database access
 */
export function validatePaymentLinkSimple(
  url: string | null,
  senderDomain: string
): PaymentLinkValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url) {
    return {
      isValid: false,
      url: null,
      errors: ['No URL provided'],
      warnings: [],
      finalDomain: null,
    };
  }

  const urlDomain = extractDomain(url);
  if (!urlDomain) {
    return {
      isValid: false,
      url: null,
      errors: ['Invalid URL format'],
      warnings: [],
      finalDomain: null,
    };
  }

  // Check HTTPS
  if (PAYMENT_LINK_VALIDATION.requireHttps && !url.startsWith('https://')) {
    errors.push('URL must use HTTPS');
  }

  // Check shorteners
  if (isShortenerUrl(urlDomain)) {
    errors.push(`URL shortener detected: ${urlDomain}`);
  }

  // Simple domain check
  if (!doDomainsMatch(urlDomain, senderDomain, true)) {
    warnings.push(`Domain may not match sender: ${urlDomain} vs ${senderDomain}`);
  }

  return {
    isValid: errors.length === 0,
    url: errors.length === 0 ? url : null,
    errors,
    warnings,
    finalDomain: urlDomain,
  };
}
