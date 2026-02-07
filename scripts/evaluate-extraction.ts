/**
 * Evaluation script for Bill Extraction Engine
 *
 * Tests the extraction pipeline against a set of fixture emails
 * with expected outputs to measure accuracy.
 *
 * Run with: npx ts-node scripts/evaluate-extraction.ts
 * Or: npx tsx scripts/evaluate-extraction.ts
 */

import {
  preprocessEmail,
  extractCandidates,
  createMockExtraction,
  validateExtraction,
  determineRoute,
} from '../lib/bill-extraction';
import { BillCategory } from '../types';

// ============================================================================
// Test Fixtures
// ============================================================================

interface TestFixture {
  name: string;
  email: {
    from: string;
    subject: string;
    body_plain: string;
    body_html?: string;
  };
  expected: {
    isBill: boolean;
    name?: string;
    amount?: number;
    dueDate?: string;
    category?: BillCategory;
  };
}

const fixtures: TestFixture[] = [
  // Chase Credit Card Statement
  {
    name: 'Chase Credit Card Statement',
    email: {
      from: 'no-reply@alertsp.chase.com',
      subject: 'Your January statement is ready',
      body_plain: `
        Your Sapphire Preferred account statement is now available.

        Account ending in (...5316)

        Statement Date: January 10, 2026
        Payment Due Date: February 7, 2026

        New Balance: $1,247.83
        Minimum Payment Due: $35.00

        Pay online at chase.com or set up AutoPay.
      `,
    },
    expected: {
      isBill: true,
      name: 'Chase Sapphire',
      amount: 1247.83,
      dueDate: '2026-02-07',
      category: 'credit_card',
    },
  },

  // Chase Auto Loan (should be category: loan, not credit_card)
  {
    name: 'Chase Auto Loan',
    email: {
      from: 'no-reply@alertsp.chase.com',
      subject: 'Your Auto Account statement is ready',
      body_plain: `
        Your Chase Auto Account payment is due.

        Account ending in (...8742)

        Payment Amount: $387.45
        Payment Due Date: January 25, 2026

        Set up AutoPay at chase.com/auto
      `,
    },
    expected: {
      isBill: true,
      name: 'Chase Auto',
      amount: 387.45,
      dueDate: '2026-01-25',
      category: 'loan',
    },
  },

  // Citi Custom Cash (specific product)
  {
    name: 'Citi Custom Cash Card',
    email: {
      from: 'alerts@citibank.com',
      subject: 'Citi Custom Cash - Your statement is ready',
      body_plain: `
        Your Citi Custom Cash statement is available.

        Total Amount Due: $89.50
        Minimum Payment: $25.00
        Due Date: 01/20/2026

        Thank you for being a valued Citi customer.
      `,
    },
    expected: {
      isBill: true,
      name: 'Citi Custom Cash',
      amount: 89.50,
      dueDate: '2026-01-20',
      category: 'credit_card',
    },
  },

  // Citi Double Cash (different product from same sender)
  {
    name: 'Citi Double Cash Card',
    email: {
      from: 'alerts@citibank.com',
      subject: 'Your Double Cash statement is ready',
      body_plain: `
        Your Citi Double Cash account statement is ready.

        New Balance: $456.12
        Minimum Payment Due: $25.00
        Payment Due Date: February 15, 2026

        Earn 2% cash back on every purchase!
      `,
    },
    expected: {
      isBill: true,
      name: 'Citi Double Cash',
      amount: 456.12,
      dueDate: '2026-02-15',
      category: 'credit_card',
    },
  },

  // Utility Bill
  {
    name: 'Electric Utility Bill',
    email: {
      from: 'billing@sce.com',
      subject: 'Your SCE bill is ready - Amount Due: $136.87',
      body_plain: `
        Southern California Edison

        Account: ****1234

        Your bill for December 2025 is ready.

        Amount Due: $136.87
        Due Date: January 28, 2026

        Pay online at sce.com or call 1-800-655-4555.
      `,
    },
    expected: {
      isBill: true,
      name: 'Electric',
      amount: 136.87,
      dueDate: '2026-01-28',
      category: 'utilities',
    },
  },

  // Subscription (Netflix)
  {
    name: 'Netflix Subscription',
    email: {
      from: 'info@members.netflix.com',
      subject: 'Your Netflix subscription renews soon',
      body_plain: `
        Hi there,

        Your Netflix subscription will renew on January 15, 2026.

        Plan: Standard
        Amount: $15.49

        Update your payment method at netflix.com/account.
      `,
    },
    expected: {
      isBill: true,
      name: 'Netflix',
      amount: 15.49,
      dueDate: '2026-01-15',
      category: 'subscription',
    },
  },

  // Promotional Email (should NOT be a bill)
  {
    name: 'Promotional Email - Should Reject',
    email: {
      from: 'deals@amazon.com',
      subject: "Don't miss out! 50% off today only",
      body_plain: `
        Flash Sale!

        Save up to 50% on electronics.

        Shop now at amazon.com

        This offer expires at midnight.

        Unsubscribe from marketing emails.
      `,
    },
    expected: {
      isBill: false,
    },
  },

  // Payment Confirmation (should NOT be a bill)
  {
    name: 'Payment Confirmation - Should Reject',
    email: {
      from: 'noreply@chase.com',
      subject: 'Payment received - Thank you',
      body_plain: `
        Thank you for your payment!

        We received your payment of $500.00 on January 10, 2026.

        Your payment has been applied to your account ending in 5316.

        Transaction complete.
      `,
    },
    expected: {
      isBill: false,
    },
  },

  // Multiple Amounts - Should pick total, not minimum
  {
    name: 'Multiple Amounts - Total vs Minimum',
    email: {
      from: 'statements@discover.com',
      subject: 'Your Discover it statement is ready',
      body_plain: `
        Discover it Card Statement

        Statement Date: January 5, 2026
        Due Date: February 2, 2026

        Previous Balance: $800.00
        Payments: -$800.00
        New Purchases: $234.56
        Interest: $0.00

        New Balance: $234.56
        Minimum Payment Due: $25.00

        Pay online at discover.com
      `,
    },
    expected: {
      isBill: true,
      name: 'Discover it',
      amount: 234.56, // Should pick new balance, not minimum
      dueDate: '2026-02-02',
      category: 'credit_card',
    },
  },

  // Multiple Dates - Should pick due date, not statement date
  {
    name: 'Multiple Dates - Due Date vs Statement Date',
    email: {
      from: 'alerts@bankofamerica.com',
      subject: 'Statement ready for Customized Cash',
      body_plain: `
        Bank of America Customized Cash Rewards

        Statement Closing Date: January 8, 2026
        Payment Due Date: February 5, 2026

        Total Balance Due: $567.89
        Minimum Payment: $25.00

        Manage your account at bankofamerica.com
      `,
    },
    expected: {
      isBill: true,
      name: 'BofA Customized Cash',
      amount: 567.89,
      dueDate: '2026-02-05', // Should pick due date, not closing date
      category: 'credit_card',
    },
  },

  // Phone Bill
  {
    name: 'Verizon Phone Bill',
    email: {
      from: 'VZWMail@ecrm.verizonwireless.com',
      subject: 'Your Verizon bill is ready',
      body_plain: `
        Your Verizon Wireless bill is ready.

        Account: ending in 1234

        Total Due: $89.99
        Due Date: Jan 22, 2026

        Pay at verizon.com or with the My Verizon app.
      `,
    },
    expected: {
      isBill: true,
      name: 'Verizon',
      amount: 89.99,
      dueDate: '2026-01-22',
      category: 'phone',
    },
  },

  // Insurance Bill
  {
    name: 'GEICO Insurance',
    email: {
      from: 'noreply@geico.com',
      subject: 'Your GEICO policy payment is due',
      body_plain: `
        GEICO Auto Insurance

        Policy: ****5678

        Your payment of $156.00 is due on February 1, 2026.

        Pay online at geico.com or call 1-800-841-3000.
      `,
    },
    expected: {
      isBill: true,
      name: 'GEICO',
      amount: 156.00,
      dueDate: '2026-02-01',
      category: 'insurance',
    },
  },

  // Relative Date ("due in X days")
  {
    name: 'Relative Due Date',
    email: {
      from: 'billing@spotify.com',
      subject: 'Your Spotify payment is coming up',
      body_plain: `
        Hi there,

        Your Spotify Premium subscription payment of $10.99 is due in 5 days.

        Update your payment method at spotify.com/account.
      `,
    },
    expected: {
      isBill: true,
      name: 'Spotify',
      amount: 10.99,
      // Due date should be calculated dynamically
      category: 'subscription',
    },
  },
];

// ============================================================================
// Evaluation Runner
// ============================================================================

interface EvaluationResult {
  fixture: string;
  passed: boolean;
  details: {
    isBillCorrect: boolean;
    nameCorrect: boolean;
    amountCorrect: boolean;
    dueDateCorrect: boolean;
    categoryCorrect: boolean;
  };
  extracted: {
    isBill: boolean;
    name: string | null;
    amount: number | null;
    dueDate: string | null;
    category: BillCategory | null;
    route: string;
  };
  expected: TestFixture['expected'];
  errors: string[];
}

function evaluateFixture(fixture: TestFixture, debug: boolean = false): EvaluationResult {
  const errors: string[] = [];

  // Step 1: Preprocess
  const { cleanedText } = preprocessEmail(
    fixture.email.body_plain,
    fixture.email.body_html || null
  );

  // Step 2: Extract candidates
  const candidates = extractCandidates(
    fixture.email.from,
    fixture.email.subject,
    cleanedText
  );

  // Debug output
  if (debug && fixture.expected.amount) {
    console.log(`\n  DEBUG: Amount candidates for "${fixture.name}":`);
    for (const amt of candidates.amounts.slice(0, 5)) {
      console.log(`    $${amt.value.toFixed(2)} | score: ${amt.keywordScore.toFixed(1)} | isMin: ${amt.isMinimum} | ctx: "${amt.context.substring(0, 50)}..."`);
    }
  }

  // Check if should skip (promotional/low score)
  if (candidates.skipReason) {
    const isBillCorrect = !fixture.expected.isBill;
    return {
      fixture: fixture.name,
      passed: isBillCorrect,
      details: {
        isBillCorrect,
        nameCorrect: !fixture.expected.name,
        amountCorrect: !fixture.expected.amount,
        dueDateCorrect: !fixture.expected.dueDate,
        categoryCorrect: !fixture.expected.category,
      },
      extracted: {
        isBill: false,
        name: null,
        amount: null,
        dueDate: null,
        category: null,
        route: 'rejected',
      },
      expected: fixture.expected,
      errors: isBillCorrect ? [] : ['Expected bill but got promotional/skip'],
    };
  }

  // Step 3: Mock AI extraction (use candidates)
  const aiRequest = {
    emailId: 'test',
    subject: fixture.email.subject,
    from: fixture.email.from,
    cleanedBody: cleanedText,
    candidateAmounts: candidates.amounts,
    candidateDates: candidates.dates,
    candidateNames: candidates.names,
  };

  const aiResult = createMockExtraction(aiRequest);

  // Step 4: Validate
  const validation = validateExtraction(
    aiResult,
    { amounts: candidates.amounts, dates: candidates.dates },
    []
  );

  // Step 5: Route
  const route = determineRoute(
    validation.adjustedConfidence.overall,
    validation.isDuplicate
  );

  // Evaluate results
  const isBillCorrect = aiResult.isBill === fixture.expected.isBill;

  // Name comparison (case-insensitive, partial match)
  const extractedName = aiResult.name?.toLowerCase() || '';
  const expectedName = fixture.expected.name?.toLowerCase() || '';
  const nameCorrect = !fixture.expected.name ||
    extractedName.includes(expectedName) ||
    expectedName.includes(extractedName);

  // Amount comparison (within 1 cent)
  const amountCorrect = !fixture.expected.amount ||
    (aiResult.amount !== null &&
      Math.abs(aiResult.amount - fixture.expected.amount) < 0.01);

  // Date comparison
  const dueDateCorrect = !fixture.expected.dueDate ||
    aiResult.dueDate === fixture.expected.dueDate;

  // Category comparison
  const categoryCorrect = !fixture.expected.category ||
    aiResult.category === fixture.expected.category;

  // Build errors
  if (!isBillCorrect) {
    errors.push(`isBill: expected ${fixture.expected.isBill}, got ${aiResult.isBill}`);
  }
  if (!nameCorrect && fixture.expected.isBill) {
    errors.push(`name: expected "${fixture.expected.name}", got "${aiResult.name}"`);
  }
  if (!amountCorrect && fixture.expected.isBill) {
    errors.push(`amount: expected ${fixture.expected.amount}, got ${aiResult.amount}`);
  }
  if (!dueDateCorrect && fixture.expected.isBill) {
    errors.push(`dueDate: expected ${fixture.expected.dueDate}, got ${aiResult.dueDate}`);
  }
  if (!categoryCorrect && fixture.expected.isBill) {
    errors.push(`category: expected ${fixture.expected.category}, got ${aiResult.category}`);
  }

  const passed = isBillCorrect && nameCorrect && amountCorrect &&
    (dueDateCorrect || !fixture.expected.dueDate) && categoryCorrect;

  return {
    fixture: fixture.name,
    passed,
    details: {
      isBillCorrect,
      nameCorrect,
      amountCorrect,
      dueDateCorrect,
      categoryCorrect,
    },
    extracted: {
      isBill: aiResult.isBill,
      name: aiResult.name,
      amount: aiResult.amount,
      dueDate: aiResult.dueDate,
      category: aiResult.category,
      route,
    },
    expected: fixture.expected,
    errors,
  };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  console.log('Bill Extraction Engine Evaluation');
  console.log('==================================\n');

  const results: EvaluationResult[] = [];

  const debugMode = process.argv.includes('--debug');

  for (const fixture of fixtures) {
    console.log(`Testing: ${fixture.name}`);
    const result = evaluateFixture(fixture, debugMode);
    results.push(result);

    if (result.passed) {
      console.log('  \x1b[32m✓ PASSED\x1b[0m');
    } else {
      console.log('  \x1b[31m✗ FAILED\x1b[0m');
      for (const error of result.errors) {
        console.log(`    - ${error}`);
      }
    }
  }

  console.log('\n==================================');
  console.log('Summary:');

  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  const accuracy = ((passed / total) * 100).toFixed(1);

  console.log(`  Total: ${total}`);
  console.log(`  Passed: \x1b[32m${passed}\x1b[0m`);
  console.log(`  Failed: \x1b[31m${total - passed}\x1b[0m`);
  console.log(`  Accuracy: ${accuracy}%`);

  // Field-level accuracy
  const billClassification = results.filter(r => r.details.isBillCorrect).length;
  const nameAccuracy = results.filter(r => r.details.nameCorrect).length;
  const amountAccuracy = results.filter(r => r.details.amountCorrect).length;
  const dateAccuracy = results.filter(r => r.details.dueDateCorrect).length;
  const categoryAccuracy = results.filter(r => r.details.categoryCorrect).length;

  console.log('\nField-level accuracy:');
  console.log(`  Bill Classification: ${((billClassification / total) * 100).toFixed(1)}%`);
  console.log(`  Name Extraction: ${((nameAccuracy / total) * 100).toFixed(1)}%`);
  console.log(`  Amount Extraction: ${((amountAccuracy / total) * 100).toFixed(1)}%`);
  console.log(`  Date Extraction: ${((dateAccuracy / total) * 100).toFixed(1)}%`);
  console.log(`  Category Detection: ${((categoryAccuracy / total) * 100).toFixed(1)}%`);

  // Exit with error code if not all tests passed
  process.exit(passed === total ? 0 : 1);
}

main();
