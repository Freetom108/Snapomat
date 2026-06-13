import { guardedFetch } from './apiGatekeeper';

export async function processReceipt(imageUri) {
  // Placeholder for OCR / AI receipt parsing
  const response = await guardedFetch('https://api.snapomat.app/receipts/parse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageUri }),
  });

  const data = await response.json();

  return {
    amount: data.amount ?? 0,
    merchant: data.merchant ?? '',
    date: data.date ?? new Date().toISOString(),
    categoryId: data.categoryId ?? 'food',
    items: data.items ?? [],
  };
}

export function createManualExpense({ amount, merchant, categoryId, date = new Date() }) {
  return {
    id: `${Date.now()}`,
    amount: Number(amount),
    merchant: merchant ?? '',
    categoryId,
    date: date instanceof Date ? date.toISOString() : date,
    source: 'manual',
  };
}
