"use client";
import React, { useEffect, useRef, useState } from 'react';

type Props = React.PropsWithChildren<{
  open: boolean;
  className?: string;
  durationMs?: number;
  easing?: string;
  withOpacity?: boolean;
}>;

export default function Collapse({ open, className = '', durationMs = 250, easing = 'cubic-bezier(0.22, 1, 0.36, 1)', withOpacity = true, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<string>(open ? 'auto' : '0px');
  const [animating, setAnimating] = useState(false);
  const [opacity, setOpacity] = useState<number>(open ? 1 : 0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const run = () => {
      setAnimating(true);
      if (open) {
        // from 0 -> content height -> auto
        setHeight(`${el.scrollHeight}px`);
        if (withOpacity) setOpacity(1);
        const timer = setTimeout(() => {
          setHeight('auto');
          setAnimating(false);
        }, prefersReduced ? 0 : durationMs);
        return () => clearTimeout(timer);
      } else {
        // from current auto -> fixed height -> 0
        const current = el.getBoundingClientRect().height;
        setHeight(`${current}px`);
        requestAnimationFrame(() => {
          setHeight('0px');
          if (withOpacity) setOpacity(0);
        });
        const timer = setTimeout(() => setAnimating(false), prefersReduced ? 0 : durationMs);
        return () => clearTimeout(timer);
      }
    };

    return run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, durationMs]);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        height: height,
        overflow: 'hidden',
        transition: `height ${durationMs}ms ${easing}${withOpacity ? `, opacity ${Math.max(150, durationMs - 50)}ms ease` : ''}`,
        opacity: withOpacity ? opacity : 1,
        willChange: 'height, opacity',
      }}
      aria-hidden={!open && !animating}
    >
      {children}
    </div>
  );
}
