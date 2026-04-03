import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  // Block ALL crawlers on ALL environments — this is an internal app
  return {
    rules: { userAgent: '*', disallow: '/' },
  }
}
