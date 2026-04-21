'use client';

import { useState, useRef, ReactNode } from 'react';

interface TooltipProps {
  content: string;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="bg-text-primary text-white text-xs rounded-sm px-2.5 py-1.5 max-w-[200px] text-center leading-snug whitespace-normal shadow-md">
            {content}
          </div>
          <div className="w-2 h-2 bg-text-primary rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </div>
  );
}
