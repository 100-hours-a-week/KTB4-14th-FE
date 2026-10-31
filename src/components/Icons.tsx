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

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M15 6l-6 6 6 6" />
    </Svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M6 9.5l6 6 6-6" />
    </Svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="3.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2M12 7.8v.1" />
    </Svg>
  );
}

export function PencilIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M14.5 5.5l4 4M4.5 19.5l1-4.6L15.6 4.8a1.9 1.9 0 0 1 2.7 0l.9.9a1.9 1.9 0 0 1 0 2.7L9.1 18.5z" />
    </Svg>
  );
}

export function RefreshIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.2} {...props}>
      <path d="M19.5 12a7.5 7.5 0 0 1-13.3 4.8M4.5 12a7.5 7.5 0 0 1 13.3-4.8" />
      <path d="M18.3 3.6v3.8h-3.8M5.7 20.4v-3.8h3.8" />
    </Svg>
  );
}

/** 이동 경로 탭: 두 지점을 잇는 경로 */
export function RouteIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <circle cx="6" cy="18" r="2.3" />
      <circle cx="18" cy="6" r="2.3" />
      <path d="M8.3 18h7.2a3 3 0 0 0 0-6h-7a3 3 0 0 1 0-6h7.2" />
    </Svg>
  );
}

export function BusIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="5" y="3.5" width="14" height="14.5" rx="3" />
      <path d="M5 11h14M8.5 14.6h.01M15.5 14.6h.01M7.5 18v2.5M16.5 18v2.5" />
    </Svg>
  );
}

export function WalkIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <circle cx="13" cy="4.6" r="1.8" />
      <path d="M10.2 20.5l2-6 2.6 2.4v3.6M8.2 11.2l2.6-3.2 3.6.8 1.6 3.4 2.4 1M12.2 14.5l-1.4-6.5" />
    </Svg>
  );
}

export function CarIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M4.5 16.5v-4l2-5.2A1.8 1.8 0 0 1 8.2 6h7.6a1.8 1.8 0 0 1 1.7 1.3l2 5.2v4z" />
      <path d="M4.5 12.5h15M7.5 16.5v2.2M16.5 16.5v2.2M8 14.5h.01M16 14.5h.01" />
    </Svg>
  );
}

export function ForkIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M7 3.5v17M4.5 3.5v4.2A2.5 2.5 0 0 0 7 10.2a2.5 2.5 0 0 0 2.5-2.5V3.5M17 20.5v-17c-2.2 1-3.4 3.4-3.4 6.2v4.1H17" />
    </Svg>
  );
}

export function BedIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <path d="M3.5 19V6M3.5 15h17v4M20.5 15v-3.2a2.8 2.8 0 0 0-2.8-2.8H11v6" />
      <circle cx="7.2" cy="11.2" r="1.9" />
    </Svg>
  );
}

export function ChecklistIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="4" y="4" width="16" height="16" rx="3.5" />
      <path d="M8 12.2l2.6 2.6L16 9.4" />
    </Svg>
  );
}

export function VideoIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2} {...props}>
      <rect x="3.5" y="5" width="17" height="14" rx="3.5" />
      <path d="M10.4 9.3v5.4l4.4-2.7z" fill="currentColor" />
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
