import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const posthogMocks = vi.hoisted(() => ({
  capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
  default: {
    capture: posthogMocks.capture,
  },
}));

import {
  trackCheckoutStarted,
  trackPricingViewed,
  trackSignupCompleted,
  trackTrialClick,
  trackWhatsAppClick,
} from "@/lib/analytics";

describe("analytics helpers", () => {
  const fbqMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("window", { fbq: fbqMock });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("does nothing outside production", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_test");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "123456");

    trackPricingViewed();
    trackTrialClick("hero");
    trackWhatsAppClick("floating");
    trackSignupCompleted("email");
    trackCheckoutStarted("annual", 249.99);

    expect(posthogMocks.capture).not.toHaveBeenCalled();
    expect(fbqMock).not.toHaveBeenCalled();
  });

  it("fails silently in production when env vars are missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "");

    expect(() => {
      trackPricingViewed();
      trackTrialClick("navbar");
      trackWhatsAppClick("hero");
      trackSignupCompleted("email");
      trackCheckoutStarted("monthly", 24.9);
    }).not.toThrow();

    expect(posthogMocks.capture).not.toHaveBeenCalled();
    expect(fbqMock).not.toHaveBeenCalled();
  });

  it("dispatches mapped PostHog and Meta Pixel events in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", "phc_prod");
    vi.stubEnv("NEXT_PUBLIC_META_PIXEL_ID", "987654321");

    trackPricingViewed();
    trackTrialClick("pricing");
    trackWhatsAppClick("faq");
    trackSignupCompleted("email");
    trackCheckoutStarted("annual", 249.99);

    expect(posthogMocks.capture).toHaveBeenNthCalledWith(
      1,
      "pricing_viewed",
      undefined,
    );
    expect(fbqMock).toHaveBeenNthCalledWith(1, "track", "ViewContent", {
      content_name: "Pricing",
    });

    expect(posthogMocks.capture).toHaveBeenNthCalledWith(
      2,
      "cta_trial_clicked",
      { location: "pricing" },
    );
    expect(fbqMock).toHaveBeenNthCalledWith(2, "track", "Lead", {
      content_name: "pricing",
    });

    expect(posthogMocks.capture).toHaveBeenNthCalledWith(
      3,
      "whatsapp_clicked",
      { location: "faq" },
    );
    expect(fbqMock).toHaveBeenNthCalledWith(3, "track", "Contact", {
      content_name: "faq",
    });

    expect(posthogMocks.capture).toHaveBeenNthCalledWith(
      4,
      "signup_completed",
      { method: "email" },
    );
    expect(fbqMock).toHaveBeenNthCalledWith(
      4,
      "track",
      "CompleteRegistration",
    );

    expect(posthogMocks.capture).toHaveBeenNthCalledWith(
      5,
      "checkout_started",
      { plan: "annual", value: 249.99, currency: "BRL" },
    );
    expect(fbqMock).toHaveBeenNthCalledWith(5, "track", "InitiateCheckout", {
      value: 249.99,
      currency: "BRL",
      content_name: "annual",
    });
  });
});
