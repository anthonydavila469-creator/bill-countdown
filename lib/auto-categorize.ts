import { BillCategory, BillIconKey, categoryIconKeys } from '@/types';

interface AutoCategorizeResult {
  category: BillCategory;
  iconKey: BillIconKey;
}

// Keyword patterns for auto-categorization (case-insensitive)
const categoryPatterns: { category: BillCategory; patterns: RegExp[]; iconKey?: BillIconKey }[] = [
  // Subscriptions - Streaming & Entertainment
  {
    category: 'subscription',
    patterns: [
      /netflix/i,
      /spotify/i,
      /hulu/i,
      /disney\+?/i,
      /youtube\s*(premium|tv|music)?/i,
      /amazon\s*prime/i,
      /hbo\s*max/i,
      /paramount/i,
      /peacock/i,
      /apple\s*(tv|music|one|arcade)/i,
      /audible/i,
      /kindle/i,
      /dropbox/i,
      /icloud/i,
      /google\s*(one|drive|storage)/i,
      /microsoft\s*365/i,
      /office\s*365/i,
      /adobe/i,
      /creative\s*cloud/i,
      /playstation\s*(plus|now)/i,
      /xbox\s*(game\s*pass|live)/i,
      /nintendo/i,
      /twitch/i,
      /crunchyroll/i,
      /funimation/i,
    ],
    iconKey: 'tv',
  },

  // Utilities - Electric, Water, Gas, Trash
  {
    category: 'utilities',
    patterns: [
      /electric/i,
      /power/i,
      /energy/i,
      /water/i,
      /gas\b/i,
      /trash/i,
      /garbage/i,
      /waste/i,
      /sewage/i,
      /sewer/i,
      /utility/i,
      /utilities/i,
      /pge/i,
      /pg&e/i,
      /con\s*ed/i,
      /duke\s*energy/i,
      /fpl/i,
      /sce/i,
      /sdge/i,
      /xcel/i,
    ],
    iconKey: 'bolt',
  },

  // Internet & Cable
  {
    category: 'internet',
    patterns: [
      /internet/i,
      /wifi/i,
      /wi-fi/i,
      /broadband/i,
      /fiber/i,
      /cable/i,
      /comcast/i,
      /xfinity/i,
      /spectrum/i,
      /att\b/i,
      /at&t/i,
      /verizon\s*(fios|home)/i,
      /cox/i,
      /centurylink/i,
      /frontier/i,
      /optimum/i,
      /starlink/i,
      /google\s*fiber/i,
    ],
    iconKey: 'wifi',
  },

  // Phone & Mobile
  {
    category: 'phone',
    patterns: [
      /\bphone\b/i,
      /mobile/i,
      /cellular/i,
      /cell\s*phone/i,
      /wireless/i,
      /verizon\s*(wireless)?/i,
      /t-mobile/i,
      /tmobile/i,
      /sprint/i,
      /mint\s*mobile/i,
      /cricket/i,
      /metro\s*pcs/i,
      /boost\s*mobile/i,
      /visible/i,
      /google\s*fi/i,
      /us\s*cellular/i,
    ],
    iconKey: 'phone',
  },

  // Rent & Housing
  {
    category: 'rent',
    patterns: [
      /\brent\b/i,
      /apartment/i,
      /lease/i,
      /landlord/i,
      /rental/i,
    ],
    iconKey: 'home',
  },

  // Housing - Mortgage & HOA
  {
    category: 'housing',
    patterns: [
      /mortgage/i,
      /\bhoa\b/i,
      /homeowner/i,
      /home\s*owner/i,
      /property\s*tax/i,
      /condo\s*fee/i,
      /maintenance\s*fee/i,
    ],
    iconKey: 'building',
  },

  // Credit Cards
  {
    category: 'credit_card',
    patterns: [
      /visa/i,
      /mastercard/i,
      /master\s*card/i,
      /amex/i,
      /american\s*express/i,
      /discover/i,
      /capital\s*one/i,
      /chase/i,
      /citi/i,
      /citibank/i,
      /wells\s*fargo/i,
      /bank\s*of\s*america/i,
      /credit\s*card/i,
      /barclays/i,
      /synchrony/i,
      /apple\s*card/i,
    ],
    iconKey: 'creditcard',
  },

  // Insurance
  {
    category: 'insurance',
    patterns: [
      /insurance/i,
      /geico/i,
      /progressive/i,
      /state\s*farm/i,
      /allstate/i,
      /liberty\s*mutual/i,
      /nationwide/i,
      /farmers/i,
      /usaa/i,
      /travelers/i,
      /aetna/i,
      /cigna/i,
      /blue\s*cross/i,
      /blue\s*shield/i,
      /united\s*health/i,
      /humana/i,
      /kaiser/i,
      /anthem/i,
      /metlife/i,
      /prudential/i,
      /car\s*insurance/i,
      /auto\s*insurance/i,
      /home\s*insurance/i,
      /health\s*insurance/i,
      /life\s*insurance/i,
      /renters?\s*insurance/i,
    ],
    iconKey: 'shield',
  },

  // Health & Fitness
  {
    category: 'health',
    patterns: [
      /gym/i,
      /fitness/i,
      /planet\s*fitness/i,
      /la\s*fitness/i,
      /24\s*hour\s*fitness/i,
      /anytime\s*fitness/i,
      /equinox/i,
      /crossfit/i,
      /orange\s*theory/i,
      /peloton/i,
      /yoga/i,
      /pilates/i,
      /health\s*club/i,
      /wellness/i,
      /medical/i,
      /doctor/i,
      /dental/i,
      /vision/i,
      /pharmacy/i,
      /prescription/i,
    ],
    iconKey: 'heart',
  },

  // Loans
  {
    category: 'loan',
    patterns: [
      /\bloan\b/i,
      /student\s*loan/i,
      /car\s*loan/i,
      /auto\s*loan/i,
      /personal\s*loan/i,
      /sallie\s*mae/i,
      /navient/i,
      /great\s*lakes/i,
      /fedloan/i,
      /nelnet/i,
      /sofi/i,
      /earnest/i,
      /lending\s*club/i,
      /prosper/i,
      /upstart/i,
    ],
    iconKey: 'dollar',
  },
];

/**
 * Auto-categorize a bill based on its name.
 * Returns category and icon key if a match is found, or null if no match.
 */
export function autoCategorize(billName: string): AutoCategorizeResult | null {
  const normalizedName = billName.trim();

  for (const { category, patterns, iconKey } of categoryPatterns) {
    for (const pattern of patterns) {
      if (pattern.test(normalizedName)) {
        return {
          category,
          iconKey: iconKey || categoryIconKeys[category],
        };
      }
    }
  }

  return null;
}

/**
 * Get the icon key for a given category.
 */
export function getIconKeyForCategory(category: BillCategory): BillIconKey {
  return categoryIconKeys[category];
}

/**
 * Apply auto-categorization to a bill if no category is set.
 * Returns the original category and icon if already set, otherwise auto-detected values.
 */
export function applyAutoCategorization(
  billName: string,
  existingCategory: BillCategory | null,
  existingIconKey: BillIconKey | null
): { category: BillCategory | null; iconKey: BillIconKey | null } {
  // If category is already set, just ensure icon key matches
  if (existingCategory) {
    return {
      category: existingCategory,
      iconKey: existingIconKey || categoryIconKeys[existingCategory],
    };
  }

  // Try to auto-categorize
  const result = autoCategorize(billName);

  if (result) {
    return {
      category: result.category,
      iconKey: result.iconKey,
    };
  }

  // No match found, return nulls
  return {
    category: null,
    iconKey: null,
  };
}
