import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/dashboard", "/onboarding", "/plans", "/subscription", "/login", "/demo", "/forgot-password", "/reset-password", "/auth/"],
    },
    sitemap: "https://headbarber.com.br/sitemap.xml",
  };
}
