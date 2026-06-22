const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const MODEL = 'claude-haiku-4-5';

const RECEIPT_SYSTEM_PROMPT =
  'You are a receipt analyzer. Extract the following from the receipt photo: ' +
  '1. MERCHANT: The store or business name as printed on the receipt. ' +
  '2. AMOUNT: The final total amount paid (look for "Total", "Summe", "Gesamt", "Betrag" at the bottom). Return as a number without currency symbol. ' +
  '3. DATE: The purchase date exactly as on the receipt. Format as YYYY-MM-DD. Convert DD.MM.YYYY correctly. ' +
  '4. CATEGORY: Choose exactly one from: food, going-out, mobility, home, fixed, shopping, health. ' +
  'food = supermarket, grocery, bakery, food store. ' +
  'going-out = restaurant, cafe, bar, fast food, cinema, entertainment. ' +
  'mobility = gas station, parking, public transport, car service. ' +
  'home = furniture, hardware store, household items. ' +
  'fixed = insurance, subscription, utility, phone, internet. ' +
  'shopping = clothing, electronics, books, general retail. ' +
  'health = pharmacy, doctor, sports, wellness. ' +
  '5. merchantConfidence: number between 0.0 and 1.0 indicating how clearly the merchant name was readable. Set below 0.7 if the store name is unclear, partially visible, or uncertain. ' +
  '6. dateConfidence: number between 0.0 and 1.0 indicating how clearly the date was readable. Set below 0.7 if the date is small, blurry, cut off, partially hidden, or uncertain. ' +
  '7. amountConfidence: number between 0.0 and 1.0 indicating how clearly the total amount was readable. Set below 0.7 if unclear. ' +
  '8. warning: set to "DATE_UNCERTAIN" if dateConfidence is below 0.7, "AMOUNT_UNCERTAIN" if amountConfidence is below 0.7, "MERCHANT_UNCERTAIN" if merchantConfidence is below 0.7, null if all are clearly readable. ' +
  'Return ONLY valid JSON array with exactly one object: [{merchant, amount, date, category, merchantConfidence, dateConfidence, amountConfidence, warning}]. No explanation, no markdown.';

const RECEIPT_USER_PROMPT = 'Extract the receipt total as a JSON array with one object.';

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
    merchantConfidence: Number.isFinite(Number(item.merchantConfidence)) ? Number(item.merchantConfidence) : 0.9,
    dateConfidence: Number.isFinite(Number(item.dateConfidence)) ? Number(item.dateConfidence) : 0.9,
    amountConfidence: Number.isFinite(Number(item.amountConfidence)) ? Number(item.amountConfidence) : 0.9,
    warning: item.warning ?? null,
  }));
}

async function analyzeImage(apiKey, base64, mediaType) {
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
      system: RECEIPT_SYSTEM_PROMPT,
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
              text: RECEIPT_USER_PROMPT,
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

    try {
      const expenses = await analyzeImage(env.ANTHROPIC_API_KEY, base64, mediaType);
      return jsonResponse({ success: true, data: expenses });
    } catch (err) {
      return jsonResponse({ success: false, error: err.message ?? 'Analysis failed' }, 500);
    }
  },
};
