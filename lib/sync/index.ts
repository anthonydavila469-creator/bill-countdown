/**
 * Sync Module
 * Automatic daily Gmail sync with race condition protection
 */

export {
  acquireSyncLock,
  releaseSyncLock,
  performAutoSync,
  preFilterEmails,
} from './auto-sync';

export {
  KNOWN_BILLER_DOMAINS,
  isKnownBillerDomain,
  getOptimizedGmailQuery,
  BILL_SUBJECT_KEYWORDS,
  PROMOTIONAL_FILTER_KEYWORDS,
  hasBillKeywords,
  isPromotionalEmail,
} from './known-billers';
