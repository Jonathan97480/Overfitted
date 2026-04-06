/** @type {import('next-sitemap').IConfig} */
module.exports = {
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://overfitted.io",
    generateRobotsTxt: true,
    exclude: ["/admin/*", "/api/*"],
    robotsTxtOptions: {
        policies: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
        additionalSitemaps: [],
    },
};
