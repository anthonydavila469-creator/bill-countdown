// Local path-selection tests for the Pay Later scanner. NO network:
// globalThis.fetch is stubbed to capture the request the SDK *would* have
// POSTed and to return a canned tool_use response. This lets us assert,
// fully offline, which model is used and whether an image is sent for
// strong / weak / missing on-device OCR text.
//
//   node --test lib/pay-later-vision.pathselect.test.mjs
//
// (.mjs so tsc ignores it; Node strips types from the imported .ts.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

// The SDK requires *an* api key to construct; it is never used because
// fetch is stubbed below before any client is built.
process.env.ANTHROPIC_API_KEY = 'test-key-not-used';

// Last request body the SDK handed to fetch (null until a model call).
let lastRequest = null;

function cannedToolUseResponse(echoModel) {
  const body = {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    model: echoModel ?? 'unknown',
    content: [
      {
        type: 'tool_use',
        id: 'toolu_test',
        name: 'extract_pay_later_plan',
        input: {
          sourceType: 'app',
          installments: [],
          confidence: 0.9,
          needsReview: false,
          missingFields: [],
          warnings: [],
          evidenceSummary: 'stub',
        },
      },
    ],
    stop_reason: 'tool_use',
    stop_sequence: null,
    usage: { input_tokens: 1, output_tokens: 1 },
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json', 'request-id': 'req_test' },
  });
}

// Install the stub BEFORE importing the module under test so the SDK
// resolves it as its global fetch.
globalThis.fetch = async (_url, init) => {
  const raw = typeof init?.body === 'string' ? init.body : '';
  const parsed = raw ? JSON.parse(raw) : {};
  lastRequest = { url: String(_url), body: parsed };
  return cannedToolUseResponse(parsed.model);
};

const { scanPayLaterPlan, PAY_LATER_VISION_MODEL, PAY_LATER_TEXT_MODEL } =
  await import('./pay-later-vision.ts');

const TEXT_MODEL = 'claude-haiku-4-5-20251001';
const VISION_MODEL = 'claude-sonnet-4-6';

// A realistic, strong BNPL OCR string: well over 40 chars, has digits.
const STRONG_OCR = [
  'Affirm',
  'Pottery Barn',
  'Total $400.00',
  'Payment 1 of 4: $100.00 due Jun 4, 2026',
  'Payment 2 of 4: $100.00 due Jul 4, 2026',
].join('\n');

const WEAK_OCR = 'hi'; // < 40 chars → not usable
const TINY_IMAGE_DATA_URL =
  'data:image/jpeg;base64,' + Buffer.from('not-a-real-jpeg').toString('base64');

function imageBlockCount(reqBody) {
  const content = reqBody?.messages?.[0]?.content ?? [];
  return content.filter((b) => b.type === 'image').length;
}

const base = {
  userId: 'u1',
  timezone: 'America/Chicago',
  currentDate: '2026-05-31',
};

test('strong OCR text → Haiku text path, image NOT sent', async () => {
  lastRequest = null;
  const res = await scanPayLaterPlan({
    ...base,
    screenshots: [{ dataURL: TINY_IMAGE_DATA_URL }], // present but should be ignored
    ocrText: STRONG_OCR,
  });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.body.model, TEXT_MODEL, 'uses Haiku text model');
  assert.equal(imageBlockCount(lastRequest.body), 0, 'no image block on text path');
  assert.equal(res.raw.model, TEXT_MODEL, 'records Haiku in result');
  const content = JSON.stringify(lastRequest.body.messages[0].content);
  assert.ok(content.includes('Pottery Barn'), 'OCR text forwarded to the model');
});

test('strong OCR text with NO images → text path still works', async () => {
  lastRequest = null;
  const res = await scanPayLaterPlan({ ...base, screenshots: [], ocrText: STRONG_OCR });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.body.model, TEXT_MODEL);
  assert.equal(imageBlockCount(lastRequest.body), 0);
});

test('weak OCR text → Sonnet vision fallback, image IS sent', async () => {
  lastRequest = null;
  const res = await scanPayLaterPlan({
    ...base,
    screenshots: [{ dataURL: TINY_IMAGE_DATA_URL }],
    ocrText: WEAK_OCR,
  });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.body.model, VISION_MODEL, 'falls back to Sonnet vision');
  assert.equal(imageBlockCount(lastRequest.body), 1, 'image block present on vision path');
  assert.equal(res.raw.model, VISION_MODEL, 'records Sonnet in result');
});

test('missing OCR text → Sonnet vision fallback, image IS sent', async () => {
  lastRequest = null;
  const res = await scanPayLaterPlan({
    ...base,
    screenshots: [{ dataURL: TINY_IMAGE_DATA_URL }],
  });
  assert.equal(res.ok, true);
  assert.equal(lastRequest.body.model, VISION_MODEL);
  assert.equal(imageBlockCount(lastRequest.body), 1);
});

test('no image AND no usable text → no_images, model NOT called', async () => {
  lastRequest = null;
  const res = await scanPayLaterPlan({ ...base, screenshots: [], ocrText: WEAK_OCR });
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'no_images');
  assert.equal(lastRequest, null, 'no model call when there is nothing to read');
});

test('exported model constants are the pinned IDs', () => {
  assert.equal(PAY_LATER_VISION_MODEL, VISION_MODEL);
  assert.equal(PAY_LATER_TEXT_MODEL, TEXT_MODEL);
});
