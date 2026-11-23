import posthog from "posthog-js";
import type {
  MetaPixelParams,
  MetaPixelStandardEvent,
} from "@/types/analytics";

export type TrialLocation = "navbar" | "hero" | "pricing" | "footer";
export type WhatsAppLocation = "hero" | "floating" | "footer" | "faq";
export type CheckoutPlan = "monthly" | "annual";

function isAnalyticsEnabled(): boolean {
  return (
    process.env.NODE_ENV === "production" && typeof window !== "undefined"
  );
}

function capturePostHog(
  event: string,
  properties?: Record<string, string | number | boolean | undefined>,
): void {
  if (!isAnalyticsEnabled() || !process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim()) {
    return;
  }

  try {
    posthog.capture(event, properties);
  } catch {
    // Fail silently so analytics never disrupts user flows.
  }
}

function trackMetaPixel(
  event: MetaPixelStandardEvent,
  params?: MetaPixelParams,
): void {
  if (!isAnalyticsEnabled() || !process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim()) {
    return;
  }

  if (typeof window.fbq !== "function") {
    return;
  }

  try {
    if (params) {
      window.fbq("track", event, params);
    } else {
      window.fbq("track", event);
    }
  } catch {
    // Fail silently so analytics never disrupts user flows.
  }
}

export function trackPricingViewed(): void {
  capturePostHog("pricing_viewed");
  trackMetaPixel("ViewContent", { content_name: "Pricing" });
}

export function trackTrialClick(location: TrialLocation): void {
  capturePostHog("cta_trial_clicked", { location });
  trackMetaPixel("Lead", { content_name: location });
}

export function trackWhatsAppClick(location: WhatsAppLocation): void {
  capturePostHog("whatsapp_clicked", { location });
  trackMetaPixel("Contact", { content_name: location });
}

export function trackSignupCompleted(method?: string): void {
  capturePostHog("signup_completed", { method });
  trackMetaPixel("CompleteRegistration");
}

export function trackCheckoutStarted(plan: CheckoutPlan, value: number): void {
  capturePostHog("checkout_started", {
    plan,
    value,
    currency: "BRL",
  });
  trackMetaPixel("InitiateCheckout", {
    value,
    currency: "BRL",
    content_name: plan,
  });
}
