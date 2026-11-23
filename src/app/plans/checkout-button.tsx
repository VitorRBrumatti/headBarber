"use client";

import { trackCheckoutStarted, type CheckoutPlan } from "@/lib/analytics";

export function CheckoutSubmitButton({
  plan,
  value,
  disabled,
  className,
  children,
}: {
  plan: CheckoutPlan;
  value: number;
  disabled?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      onClick={() => trackCheckoutStarted(plan, value)}
      className={className}
    >
      {children}
    </button>
  );
}
