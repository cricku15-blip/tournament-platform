import { loadRazorpay } from "./load";

type Prefill = { name?: string; email?: string; contact?: string };
export type CheckoutResult = "success" | "dismissed" | "failed";

interface RazorpayInstance {
  open: () => void;
  on: (event: string, cb: () => void) => void;
}
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

function launch(options: Record<string, unknown>): Promise<CheckoutResult> {
  return new Promise((resolve) => {
    const Ctor = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
    let settled = false;
    const done = (r: CheckoutResult) => {
      if (!settled) {
        settled = true;
        resolve(r);
      }
    };
    const rz = new Ctor({
      ...options,
      theme: { color: "#1F7A4D" },
      // Success only means "go and check the server". The webhook is the only thing that marks anything paid.
      handler: () => done("success"),
      modal: { ondismiss: () => done("dismissed") },
    });
    rz.on("payment.failed", () => done("failed"));
    rz.open();
  });
}

export async function openOrderCheckout(o: { orderId: string; amount: number; keyId: string; name: string; prefill?: Prefill }): Promise<CheckoutResult> {
  await loadRazorpay();
  return launch({ key: o.keyId, order_id: o.orderId, amount: o.amount, currency: "INR", name: "GroundWar", description: o.name, prefill: o.prefill });
}

export async function openSubscriptionCheckout(o: { subscriptionId: string; keyId: string; prefill?: Prefill }): Promise<CheckoutResult> {
  await loadRazorpay();
  return launch({ key: o.keyId, subscription_id: o.subscriptionId, name: "GroundWar", description: "Player subscription", prefill: o.prefill });
}
