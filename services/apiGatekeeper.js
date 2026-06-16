const WORKER_URL = 'https://snapomat-ai-proxy.terrana.workers.dev';

const RATE_LIMIT = {
  maxRequests: 10,
  windowMs: 60_000,
};

const requestLog = [];

function pruneLog(now) {
  while (requestLog.length > 0 && now - requestLog[0] > RATE_LIMIT.windowMs) {
    requestLog.shift();
  }
}

export function canMakeRequest() {
  const now = Date.now();
  pruneLog(now);
  return requestLog.length < RATE_LIMIT.maxRequests;
}

export function recordRequest() {
  requestLog.push(Date.now());
}

export async function guardedFetch(url, options = {}) {
  if (!canMakeRequest()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }

  recordRequest();

  const response = await fetch(url, options);

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response;
}

export async function analyzeImage(imageBase64) {
  try {
    if (!canMakeRequest()) {
      console.log('[analyzeImage] rate limit reached');
      return null;
    }

    recordRequest();

    // TODO: DEV ONLY – remove before release
    console.log('[analyzeImage] base64 length:', imageBase64?.length ?? 0);

    const response = await fetch(WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: imageBase64 }),
    });

    // TODO: DEV ONLY – remove before release
    console.log('[analyzeImage] HTTP status:', response.status);

    const responseText = await response.text();

    // TODO: DEV ONLY – remove before release
    console.log('[analyzeImage] response body:', responseText);

    if (!response.ok) {
      return null;
    }

    let json;
    try {
      json = JSON.parse(responseText);
    } catch {
      console.log('[analyzeImage] invalid JSON in response');
      return null;
    }

    if (!json.success || !Array.isArray(json.data)) {
      console.log('[analyzeImage] unexpected response shape:', json);
      return null;
    }

    return json.data;
  } catch (err) {
    console.log('[analyzeImage] error:', err);
    return null;
  }
}
