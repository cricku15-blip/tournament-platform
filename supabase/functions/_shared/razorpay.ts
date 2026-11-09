// supabase/functions/_shared/razorpay.ts
const KEY_ID = Deno.env.get("RAZORPAY_KEY_ID")!;
const KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET")!;

export const razorpayKeyId = KEY_ID;

export async function rzp(path: string, method: "GET" | "POST", body?: unknown) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: { Authorization: "Basic " + btoa(`${KEY_ID}:${KEY_SECRET}`), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.description ?? "razorpay_error");
  return data;
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifySignature(rawBody: string, signature: string, secret: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const hex = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(hex, signature);
}

// Money maths: always integers in paise
export function withTax(amountPaise: number, percent: number, inclusive: boolean) {
  if (inclusive) {
    const tax = Math.round(amountPaise - amountPaise / (1 + percent / 100));
    return { amount: amountPaise - tax, tax, total: amountPaise };
  }
  const tax = Math.round((amountPaise * percent) / 100);
  return { amount: amountPaise, tax, total: amountPaise + tax };
}
