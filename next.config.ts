import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  // La stabilisation des Server Action IDs entre builds se fait via la
  // variable d'env NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (à configurer côté
  // Vercel Environment Variables sur Production + Preview + Development).
  // Le champ NextConfig.deploymentId a été retiré dans Next.js 16 → la
  // protection version-skew passe exclusivement par la clé d'encryption +
  // le fallback auto-reload dans src/app/global-error.tsx qui détecte
  // UnrecognizedActionError et recharge la page proprement.
  // Voir https://nextjs.org/docs/messages/failed-to-find-server-action
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  productionBrowserSourceMaps: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains; preload' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
          {
            key: 'Content-Security-Policy',
            // HOTFIX 2026-08-04 : réintégration temporaire de 'unsafe-inline' et
            // 'unsafe-eval' sur script-src. Le durcissement IMP-3 précédent
            // (Session 16) bloquait les scripts inline d'hydratation Next.js —
            // conséquence : composants "use client" partiellement hydratés,
            // aucun onClick fonctionnel sur /settings, /logbook, header menu.
            // TODO : implémenter le vrai fix nonce via middleware.ts + strict-dynamic
            //        (voir Next.js docs App Router CSP with nonce).
            // 'unsafe-inline' reste sur style-src car Tailwind + next/font génèrent
            // des styles inline non contournables sans réécriture majeure.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.paypal.com https://www.sandbox.paypal.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://*.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.brevo.com https://www.paypal.com https://www.sandbox.paypal.com https://*.sentry.io https://*.ingest.sentry.io",
              "frame-src https://www.paypal.com https://www.sandbox.paypal.com",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  // Pas de source maps uploadées (Hobby plan, pas d'auth token Sentry)
  sourcemaps: { disable: true },
  // Désactiver le tunnel Sentry (pas besoin sur Vercel)
  tunnelRoute: undefined,
  // Silencer les logs du build Sentry
  silent: true,
  // Désactiver la télémétrie Sentry
  telemetry: false,
});
