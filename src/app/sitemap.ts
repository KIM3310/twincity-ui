import type { MetadataRoute } from "next";

const baseUrl = "https://twincity-ui.pages.dev";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",
    "/brand",
    "/services",
    "/explore",
    "/events",
    "/reports",
    "/journal",
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/compliance",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date("2026-06-19"),
    changeFrequency: route === "" || route === "/services" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/services" ? 0.9 : 0.7,
  }));
}
