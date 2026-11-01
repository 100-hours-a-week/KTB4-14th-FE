/** AUDIGO 캐릭터 "디고" — 일정표를 들고 인사하는 기본 포즈 (장식용) */
export function Digo({ className }: { className?: string }) {
  const ink = '#1c2430';
  const coral = '#ff6b57';
  const coralDark = '#d9473a';
  const cream = '#fff6ec';
  const pink = '#ff9fa0';
  const teal = '#2a9d8f';
  return (
    <svg className={className} viewBox="-10 -10 270 280" aria-hidden="true" focusable="false">
      <ellipse cx="96" cy="236" rx="19" ry="13" fill={coralDark} stroke={ink} strokeWidth="7" />
      <ellipse cx="144" cy="236" rx="19" ry="13" fill={coralDark} stroke={ink} strokeWidth="7" />
      <path d="M48 150 C 26 140, 18 116, 30 106" fill="none" stroke={ink} strokeWidth="23" strokeLinecap="round" />
      <path d="M48 150 C 26 140, 18 116, 30 106" fill="none" stroke={coral} strokeWidth="16" strokeLinecap="round" />
      <path
        d="M120 230 C 98 204, 40 168, 40 112 A80 80 0 1 1 200 112 C 200 168, 142 204, 120 230 Z"
        fill={coral}
        stroke={ink}
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M120 222 C 104 202, 66 176, 54 140 C 80 176, 110 196, 120 206 C 130 196, 160 176, 186 140 C 174 176, 136 202, 120 222Z"
        fill={coralDark}
        opacity=".55"
      />
      <path d="M66 78 Q 80 52 108 42" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" opacity=".85" />
      <circle cx="60" cy="96" r="5" fill="#fff" opacity=".85" />
      <circle cx="120" cy="114" r="54" fill={cream} stroke={ink} strokeWidth="7" />
      <ellipse cx="86" cy="130" rx="10" ry="6.5" fill={pink} />
      <ellipse cx="154" cy="130" rx="10" ry="6.5" fill={pink} />
      <ellipse cx="100" cy="110" rx="8.5" ry="11" fill={ink} />
      <circle cx="103" cy="105" r="3.4" fill="#fff" />
      <ellipse cx="140" cy="110" rx="8.5" ry="11" fill={ink} />
      <circle cx="143" cy="105" r="3.4" fill="#fff" />
      <path d="M106 126 Q 120 148 134 126 Z" fill="#7a2430" stroke={ink} strokeWidth="4" strokeLinejoin="round" />
      <path d="M112 136 Q 120 131 128 136 Q 124 142 120 142 Q 116 142 112 136Z" fill={pink} />
      <g stroke={teal} strokeWidth="7" strokeLinecap="round">
        <path d="M178 26 L 186 12" />
        <path d="M196 44 L 212 36" />
        <path d="M200 66 L 216 66" />
      </g>
      <g transform="translate(12 16) rotate(8 196 160)">
        <rect x="164" y="122" width="66" height="80" rx="10" fill={cream} stroke={ink} strokeWidth="6" />
        <rect x="164" y="122" width="66" height="20" rx="10" fill={teal} stroke={ink} strokeWidth="6" />
        <rect x="183" y="114" width="28" height="12" rx="5" fill={ink} />
        <path d="M174 156 l5 5 l9 -10" fill="none" stroke={teal} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M194 157 h24" stroke="#d9cfc3" strokeWidth="5" strokeLinecap="round" />
        <path d="M174 176 l5 5 l9 -10" fill="none" stroke={teal} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M194 177 h24" stroke="#d9cfc3" strokeWidth="5" strokeLinecap="round" />
        <rect x="174" y="188" width="12" height="9" rx="2.5" fill="none" stroke="#c9bdaf" strokeWidth="3" />
        <path d="M194 193 h18" stroke="#d9cfc3" strokeWidth="5" strokeLinecap="round" />
      </g>
      <circle cx="184" cy="186" r="13" fill={coral} stroke={ink} strokeWidth="7" />
    </svg>
  );
}
