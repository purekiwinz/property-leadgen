import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/ads/', '/admin/'],
      },
    ],
    sitemap: 'https://leads.edscanlan.co.nz/sitemap.xml',
  };
}
