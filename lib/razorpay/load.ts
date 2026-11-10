const SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<void> | null = null;

/** Loads Razorpay Checkout on demand. Call only from the two payment pages, never from a global layout. */
export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("browser_only"));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (loading) return loading;
  loading = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      s.remove();
      reject(new Error("razorpay_load_failed"));
    };
    document.head.appendChild(s);
  });
  return loading;
}
