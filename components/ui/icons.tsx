type IconProps = { size?: number; strokeWidth?: number };

function Svg({ size = 16, strokeWidth = 2.4, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const PlusIcon = (p: IconProps) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p: IconProps) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const CloseIcon = (p: IconProps) => <Svg strokeWidth={2.2} {...p}><path d="M6 6l12 12M18 6L6 18" /></Svg>;
export const CheckIcon = (p: IconProps) => <Svg {...p}><path d="M20 6L9 17l-5-5" /></Svg>;
export const ChevronLeftIcon = (p: IconProps) => <Svg strokeWidth={2.6} {...p}><path d="M15 6l-6 6 6 6" /></Svg>;
export const ChevronUpIcon = (p: IconProps) => <Svg {...p}><path d="M6 15l6-6 6 6" /></Svg>;
export const ChevronDownIcon = (p: IconProps) => <Svg {...p}><path d="M6 9l6 6 6-6" /></Svg>;
export const CopyIcon = (p: IconProps) => <Svg strokeWidth={2} {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a1 1 0 0 1 1-1h10" /></Svg>;
export const PencilIcon = (p: IconProps) => <Svg strokeWidth={2} {...p}><path d="M4 20h4L19 9l-4-4L4 16v4Z" /><path d="M14 6l4 4" /></Svg>;
export const BackspaceIcon = (p: IconProps) => <Svg strokeWidth={2} {...p}><path d="M9 5h11v14H9l-6-7 6-7Z" /><path d="M12 10l4 4M16 10l-4 4" /></Svg>;

/** Ball of yarn — the default pattern thumbnail. */
export const YarnBallIcon = (p: IconProps) => (
  <Svg size={32} strokeWidth={1.8} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M5 8.5c4 1 9.5 5 11 11.5" />
    <path d="M9 3.9c1.5 3.5 5.5 8 11.4 9" />
    <path d="M3.6 13.2c3.2-.3 7.2 2 8.8 7.2" />
    <path d="M14.8 4c-.4 3 .9 6.4 5.6 5.4" />
  </Svg>
);

export const ImageIcon = (p: IconProps) => (
  <Svg strokeWidth={2} {...p}>
    <rect x="3" y="4" width="18" height="16" rx="3" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M21 16l-5-5-8 9" />
  </Svg>
);

export const ExpandIcon = (p: IconProps) => <Svg strokeWidth={2.2} {...p}><path d="M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6" /></Svg>;
export const ArrowUpIcon = (p: IconProps) => <Svg strokeWidth={2.2} {...p}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const ArrowDownIcon = (p: IconProps) => <Svg strokeWidth={2.2} {...p}><path d="M12 5v14M6 13l6 6 6-6" /></Svg>;
