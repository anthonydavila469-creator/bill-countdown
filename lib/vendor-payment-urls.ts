/**
 * Fallback Payment URLs for Common Vendors
 *
 * When AI extraction can't find a payment URL in an email,
 * we use these known payment portal URLs as fallbacks.
 */

export const VENDOR_PAYMENT_URLS: Record<string, string> = {
  // Credit Cards
  'chase': 'https://secure.chase.com/web/auth/dashboard',
  'citi': 'https://online.citi.com/',
  'capital one': 'https://myaccounts.capitalone.com/',
  'american express': 'https://www.americanexpress.com/en-us/account/login',
  'amex': 'https://www.americanexpress.com/en-us/account/login',
  'discover': 'https://card.discover.com/',
  'bank of america': 'https://www.bankofamerica.com/online-banking/sign-in/',
  'wells fargo': 'https://connect.secure.wellsfargo.com/auth/login',
  'best buy': 'https://www.bestbuy.com/site/clp/manage-your-credit-card/pcmcat1528386595498.c',
  'synchrony': 'https://www.synchrony.com/',

  // Insurance
  'progressive': 'https://www.progressive.com/',
  'geico': 'https://www.geico.com/login/',
  'state farm': 'https://proofing.statefarm.com/',
  'allstate': 'https://myaccount.allstate.com/',
  'liberty mutual': 'https://www.libertymutual.com/login',
  'usaa': 'https://www.usaa.com/inet/wc/login',
  'nationwide': 'https://www.nationwide.com/personal/login/',
  'farmers': 'https://www.farmers.com/login/',

  // Utilities
  'txu': 'https://www.txu.com/',
  'txu energy': 'https://www.txu.com/',
  'texas gas': 'https://www.texasgasservice.com/myaccount',
  'texas gas service': 'https://www.texasgasservice.com/myaccount',
  'oncor': 'https://www.oncor.com/',
  'atmos': 'https://www.atmosenergy.com/myaccount',
  'atmos energy': 'https://www.atmosenergy.com/myaccount',
  'mineral wells': 'https://mineralwellstx.municipalonlinepayments.com/mineralwellstx',
  'city of mineral wells': 'https://mineralwellstx.municipalonlinepayments.com/mineralwellstx',
  'pge': 'https://www.pge.com/en/account/dashboard.html',
  'pg&e': 'https://www.pge.com/en/account/dashboard.html',
  'southern california edison': 'https://www.sce.com/mysce/myaccount',
  'sce': 'https://www.sce.com/mysce/myaccount',
  'duke energy': 'https://www.duke-energy.com/my-account/sign-in',
  'con edison': 'https://www.coned.com/en/login',

  // Phone/Internet
  'verizon': 'https://www.verizon.com/signin',
  'at&t': 'https://www.att.com/acctmgmt/login',
  'att': 'https://www.att.com/acctmgmt/login',
  't-mobile': 'https://my.t-mobile.com/',
  'tmobile': 'https://my.t-mobile.com/',
  'xfinity': 'https://customer.xfinity.com/#/billing',
  'comcast': 'https://customer.xfinity.com/#/billing',
  'spectrum': 'https://www.spectrum.net/account',
  'cox': 'https://www.cox.com/resaccount/sign-in.html',

  // Streaming/Subscriptions
  'netflix': 'https://www.netflix.com/youraccount',
  'spotify': 'https://www.spotify.com/account/',
  'disney': 'https://www.disneyplus.com/account',
  'hulu': 'https://secure.hulu.com/account',
  'hbo': 'https://www.max.com/account',
  'max': 'https://www.max.com/account',
  'apple': 'https://appleid.apple.com/account/manage',
  'youtube': 'https://www.youtube.com/paid_memberships',
  'amazon prime': 'https://www.amazon.com/gp/primecentral',

  // Loans
  'toyota financial': 'https://www.toyotafinancial.com/',
  'honda financial': 'https://www.hondafinancialservices.com/',
  'ford credit': 'https://www.ford.com/finance/account/',
  'ally': 'https://www.ally.com/auto/signin/',
  'navient': 'https://www.navient.com/loan-servicing/',
  'nelnet': 'https://www.nelnet.com/',
  'great lakes': 'https://www.mygreatlakes.org/',
  'mohela': 'https://www.mohela.com/',
};

/**
 * Check if a payment URL is valid (not a PDF, document, or tracking link)
 */
export function isValidPaymentUrl(url: string | null): boolean {
  if (!url) return false;

  const urlLower = url.toLowerCase();

  // Reject PDF and document links
  if (urlLower.endsWith('.pdf') || urlLower.includes('/document') || urlLower.includes('/pdf')) {
    return false;
  }

  // Reject email tracking links
  if (urlLower.includes('click.') || urlLower.includes('track.') || urlLower.includes('email.')) {
    return false;
  }

  // Reject download links
  if (urlLower.includes('/download') || urlLower.includes('attachment')) {
    return false;
  }

  return true;
}

/**
 * Get a fallback payment URL for a bill based on its name
 *
 * @param billName - The name of the bill (e.g., "Chase Credit Card", "TXU Energy")
 * @returns The fallback payment URL or null if no match found
 */
export function getFallbackPaymentUrl(billName: string): string | null {
  if (!billName) return null;

  const nameLower = billName.toLowerCase();

  // Try exact vendor matches first (longer patterns first for specificity)
  const sortedVendors = Object.entries(VENDOR_PAYMENT_URLS)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [vendor, url] of sortedVendors) {
    if (nameLower.includes(vendor)) {
      return url;
    }
  }

  return null;
}
