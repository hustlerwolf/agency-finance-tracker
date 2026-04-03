import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Block all crawlers on non-production environments
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      rules: { userAgent: '*', disallow: '/' },
    }
  }

  // Production — allow indexing of the login page only (app is behind auth)
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
      allow: '/login',
    },
    sitemap: undefined,
  }
}
