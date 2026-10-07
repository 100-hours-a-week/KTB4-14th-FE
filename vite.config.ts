import { defineConfig, loadEnv, type ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const BACKEND_PROXY_PATH = '/__backend';

/**
 * 개발 서버 전용 백엔드 프록시.
 * - E2E(live): playwright.config.ts 가 E2E_PROXY_TARGET 을 넣어 줄 때 켜진다.
 * - 로컬 개발: .env 에 DEV_PROXY_TARGET 을 넣으면 켜진다.
 * 브라우저는 같은 출처(/__backend/*)로 요청하므로 CORS 가 없고, 백엔드로 넘길 때 Origin 을 지워 백엔드 CORS 검사도 거치지 않는다.
 * 백엔드 쿠키는 localhost(http) 에서도 저장 · 전송되도록 Domain / Secure / SameSite=None 을 떼어 낸다.
 */
function backendProxy(target: string | undefined): Record<string, ProxyOptions> | undefined {
  if (!target) return undefined;
  return {
    [BACKEND_PROXY_PATH]: {
      target,
      changeOrigin: true,
      // IP 로 접속하는 https 백엔드처럼 인증서가 호스트와 맞지 않아도 넘긴다(개발 서버 전용).
      secure: false,
      rewrite: (path) => path.replace(new RegExp(`^${BACKEND_PROXY_PATH}`), ''),
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

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const e2eTarget = process.env.E2E_PROXY_TARGET;
  const devTarget = command === 'serve' && !e2eTarget ? env.DEV_PROXY_TARGET : undefined;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    // 로컬 프록시를 쓰면 앱의 API 주소를 프록시 경로로 바꿔 VITE_API_BASE_URL 을 따로 고칠 필요가 없게 한다.
    define: devTarget
      ? { 'import.meta.env.VITE_API_BASE_URL': JSON.stringify(BACKEND_PROXY_PATH) }
      : undefined,
    server: {
      port: 5173,
      open: true,
      proxy: backendProxy(e2eTarget || devTarget),
    },
  };
});
