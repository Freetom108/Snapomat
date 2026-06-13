const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MODEL = 'claude-haiku-4-5';

const RECEIPT_SYSTEM_PROMPT =
  'You analyze a receipt photo. Extract ONLY the final total amount paid, the merchant name, and the date. ' +
  'Return ONLY valid JSON with exactly ONE object: [{merchant, amount, date, category}]. ' +
  'Take the bold total sum at the bottom, not individual items. ' +
  "Category is always 'food' unless the merchant is clearly not a food store.";

const STATEMENT_SYSTEM_PROMPT =
  'You analyze receipt and bank statement photos. Extract every expense line you can read. ' +
  'Return ONLY valid JSON: an array of objects. Each object must have: ' +
  'merchant (string), amount (number, use dot as decimal separator), ' +
  'date (string ISO 8601 YYYY-MM-DD), category (one of: food, going-out (Restaurant, Café, Bar, Kino, Theater, Sport, Freizeit), mobility, home, fixed, shopping, health). ' +
  'If unsure about category pick the closest match. No markdown, no explanation.';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json',
    },
  });
}

function normalizeMediaType(mediaType) {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  return allowed.includes(mediaType) ? mediaType : 'image/jpeg';
}

function normalizeScanType(type) {
  return type === 'receipt' ? 'receipt' : 'statement';
}

function getSystemPrompt(type) {
  return type === 'receipt' ? RECEIPT_SYSTEM_PROMPT : STATEMENT_SYSTEM_PROMPT;
}

function getUserPrompt(type) {
  if (type === 'receipt') {
    return 'Extract the receipt total as a JSON array with one object.';
  }
  return 'Extract all expenses from this image as a JSON array.';
}

function parseExpenses(text) {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('[');
  const jsonEnd = trimmed.lastIndexOf(']');
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error('No JSON array in model response');
  }
  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1));
  if (!Array.isArray(parsed)) {
    throw new Error('Model response is not an array');
  }
  return parsed.map((item) => ({
    merchant: String(item.merchant ?? '').trim(),
    amount: Number(item.amount) || 0,
    date: String(item.date ?? '').trim(),
    category: String(item.category ?? 'food').trim(),
  }));
}

async function analyzeImage(apiKey, base64, mediaType, scanType) {
  const type = normalizeScanType(scanType);
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: getSystemPrompt(type),
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: normalizeMediaType(mediaType),
                data: base64,
              },
            },
            {
              type: 'text',
              text: getUserPrompt(type),
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error('Anthropic API error ' + response.status + ': ' + errText);
  }

  const data = await response.json();
  const textBlock = data.content?.find((block) => block.type === 'text');
  if (!textBlock?.text) {
    throw new Error('No text content in Anthropic response');
  }

  return parseExpenses(textBlock.text);
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ success: false, error: 'Missing ANTHROPIC_API_KEY' }, 500);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ success: false, error: 'Invalid JSON body' }, 400);
    }

    const base64 = body.image ?? body.base64 ?? '';
    if (!base64 || typeof base64 !== 'string') {
      return jsonResponse({ success: false, error: 'Missing image base64 field' }, 400);
    }

    const mediaType = body.mediaType ?? body.media_type ?? 'image/jpeg';
    const scanType = normalizeScanType(body.type);

    try {
      const expenses = await analyzeImage(env.ANTHROPIC_API_KEY, base64, mediaType, scanType);
      return jsonResponse({ success: true, data: expenses });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message ?? 'Analysis failed' }, 500);
    }
  },
};
