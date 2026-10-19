import { describe, expect, it } from "vitest";
import { config } from "@/proxy";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

describe("SEO discovery routes", () => {
  it("lists only the public marketing page and advertises the sitemap", () => {
    expect(sitemap()).toEqual([{ url: "https://headbarber.com.br/" }]);
    expect(robots().sitemap).toBe("https://headbarber.com.br/sitemap.xml");
  });

  it.each(["/robots.txt", "/sitemap.xml", "/icon.png"])("serves %s without session checks", (url) => {
    expect(new RegExp(`^${config.matcher[0]}$`).test(url)).toBe(false);
  });

  it.each(["/dashboard", "/dashboard/agenda", "/login", "/plans", "/onboarding", "/subscription/confirm", "/api/stripe/webhook"])("preserves proxy coverage for %s", (url) => {
    expect(new RegExp(`^${config.matcher[0]}$`).test(url)).toBe(true);
  });
});
