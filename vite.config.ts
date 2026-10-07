import { defineConfig, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { fileURLToPath, URL } from 'node:url';

const hasSentryBuildConfig = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT,
);

const sentryBuildPlugin = hasSentryBuildConfig
  ? sentryVitePlugin({
      org: process.env.SENTRY_ORG!,
      project: process.env.SENTRY_PROJECT!,
      authToken: process.env.SENTRY_AUTH_TOKEN!,
      sourcemaps: {
        // JavaScript 번들과 소스맵만 Sentry에 업로드한다.
        assets: ['dist/**/*.js', 'dist/**/*.map'],
        // Sentry 업로드 후 배포 산출물에서 소스맵을 제거해 원본 코드 노출을 막는다.
        filesToDeleteAfterUpload: ['dist/**/*.map'],
      },
    })
  : undefined;

/**
 * E2E(live) 전용 백엔드 프록시. playwright.config.ts 가 E2E_PROXY_TARGET 을 넣어 줄 때만 켜진다.
 * 브라우저는 같은 출처(/__backend/*)로 요청하므로 CORS 가 없고, 백엔드로 넘길 때 Origin 을 지워 백엔드 CORS 검사도 거치지 않는다.
 * 백엔드 쿠키는 localhost(http) 에서도 저장 · 전송되도록 Domain / Secure / SameSite=None 을 떼어 낸다.
 */
function e2eBackendProxy(target: string | undefined): Record<string, ProxyOptions> | undefined {
  if (!target) return undefined;
  return {
    '/__backend': {
      target,
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/__backend/, ''),
      configure: (proxy) => {
        proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        proxy.on('proxyRes', (proxyRes) => {
          const cookies = proxyRes.headers['set-cookie'];
          if (!cookies) return;
          proxyRes.headers['set-cookie'] = cookies.map((cookie) =>
            cookie
              .replace(/;\s*Domain=[^;]*/gi, '')
              .replace(/;\s*Secure/gi, '')
              .replace(/;\s*SameSite=None/gi, '; SameSite=Lax'),
          );
        });
      },
    },
  };
}

export default defineConfig({
  plugins: [react(), ...(sentryBuildPlugin ? [sentryBuildPlugin] : [])],
  build: {
    // Sentry 빌드 환경에서만 소스맵을 생성하고 업로드한다.
    sourcemap: hasSentryBuildConfig,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
    proxy: e2eBackendProxy(process.env.E2E_PROXY_TARGET),
  },
});
