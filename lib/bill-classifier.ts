export function classifyDocument(
  fileName: string,
  fileSizeBytes: number,
  imageHash?: string
): { isBill: boolean; confidence: number; reason: string } {
  const normalizedFileName = fileName.trim().toLowerCase();
  const hasDuplicateHint = Boolean(imageHash && imageHash.trim());

  if (normalizedFileName.includes('invoice')
    || normalizedFileName.includes('bill')
    || normalizedFileName.includes('statement')
    || normalizedFileName.includes('receipt')
    || normalizedFileName.includes('notice')
    || normalizedFileName.includes('payment')) {
    return {
      isBill: true,
      confidence: 0.9,
      reason: hasDuplicateHint ? 'filename_bill_keyword_duplicate_check_pending' : 'filename_bill_keyword',
    };
  }

  if (normalizedFileName.includes('screenshot')
    || normalizedFileName.includes('selfie')
    || normalizedFileName.includes('photo')) {
    return {
      isBill: false,
      confidence: 0.8,
      reason: hasDuplicateHint ? 'filename_non_bill_keyword_duplicate_check_pending' : 'filename_non_bill_keyword',
    };
  }

  if (fileSizeBytes < 10 * 1024) {
    return {
      isBill: false,
      confidence: 0.6,
      reason: hasDuplicateHint ? 'file_too_small_duplicate_check_pending' : 'file_too_small',
    };
  }

  if (fileSizeBytes > 10 * 1024 * 1024) {
    return {
      isBill: false,
      confidence: 0,
      reason: hasDuplicateHint ? 'file_too_large_defer_to_claude_duplicate_check_pending' : 'file_too_large_defer_to_claude',
    };
  }

  return {
    isBill: false,
    confidence: 0,
    reason: hasDuplicateHint ? 'defer_to_claude_duplicate_check_pending' : 'defer_to_claude',
  };
}
