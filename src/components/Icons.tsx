import type { SVGProps } from 'react';

/** 24px 그리드 · stroke 1.8 · 라운드 처리로 통일한 아이콘 세트 */
type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}>
      {children}
    </svg>
  );
}

export function HomeIcon({ filled, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <path
        d="M3.5 10.2 12 3.6l8.5 6.6v8.6a1.7 1.7 0 0 1-1.7 1.7h-3.9v-5.2a1.2 1.2 0 0 0-1.2-1.2h-3.4a1.2 1.2 0 0 0-1.2 1.2v5.2H5.2a1.7 1.7 0 0 1-1.7-1.7z"
        fill={filled ? 'currentColor' : 'none'}
      />
    </Svg>
  );
}

export function MatchingIcon({ filled, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <circle cx="9" cy="8" r="3.4" fill={filled ? 'currentColor' : 'none'} />
      <path d="M2.8 19.8c.6-3.4 3.1-5.5 6.2-5.5s5.6 2.1 6.2 5.5" fill={filled ? 'currentColor' : 'none'} />
      <path d="M15.6 4.9a3.2 3.2 0 0 1 0 6.2M17.6 14.6c2 .7 3.3 2.5 3.6 5.2" />
    </Svg>
  );
}

export function ChatIcon({ filled, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <path
        d="M12 3.8c4.8 0 8.7 3.2 8.7 7.2s-3.9 7.2-8.7 7.2c-1 0-1.9-.1-2.8-.4L4.6 19.9l1.2-3.7C4.2 14.9 3.3 13 3.3 11c0-4 3.9-7.2 8.7-7.2z"
        fill={filled ? 'currentColor' : 'none'}
      />
      <path d="M8.6 11h.01M12 11h.01M15.4 11h.01" strokeWidth={2.6} stroke={filled ? 'var(--j-indigo)' : 'currentColor'} />
    </Svg>
  );
}

export function UserIcon({ filled, ...rest }: IconProps & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <circle cx="12" cy="8" r="3.8" fill={filled ? 'currentColor' : 'none'} />
      <path d="M4.5 20.2c.8-3.7 3.8-6 7.5-6s6.7 2.3 7.5 6" fill={filled ? 'currentColor' : 'none'} />
    </Svg>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 16V10.8a6 6 0 0 1 12 0V16l1.6 1.8H4.4z" />
      <path d="M10 20.4a2.2 2.2 0 0 0 4 0" />
    </Svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.6} {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.6} {...props}>
      <path d="M9 6l6 6-6 6" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg strokeWidth={3} {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

/** 여행 생성하기: 반짝이가 들어간 달력 */
export function CalendarSparkIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M12 12.6l.9 2 2 .9-2 .9-.9 2-.9-2-2-.9 2-.9z" fill="currentColor" strokeWidth={1.2} />
    </Svg>
  );
}

/** 여행 기록 보기: 접힌 지도 */
export function MapFoldIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M3.5 6.5l5-2 7 2 5-2v13l-5 2-7-2-5 2z" />
      <path d="M8.5 4.5v13M15.5 6.5v13" />
    </Svg>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </Svg>
  );
}

/** 카카오 로그인 버튼 심볼 (카카오 로그인 디자인 가이드의 말풍선 심볼) */
export function KakaoSymbol({ size = 20, ...rest }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...rest}>
      <path
        d="M12 3.5c-5.2 0-9.4 3.3-9.4 7.4 0 2.6 1.7 4.9 4.3 6.2l-1 3.6c-.1.3.3.6.6.4l4.3-2.8c.4 0 .8.1 1.2.1 5.2 0 9.4-3.3 9.4-7.5S17.2 3.5 12 3.5z"
        fill="currentColor"
      />
    </svg>
  );
}
