import { useWindowDimensions } from 'react-native';

/**
 * Breakpoints driven by window width rather than CSS media queries, so the
 * same logic works if these screens are ever run on a real native target.
 */
export const BREAKPOINTS = { sm: 480, md: 768, lg: 1024 } as const;

export interface Responsive {
  width: number;
  /** < 768px — phones. Tables collapse to stacked cards here. */
  isCompact: boolean;
  /** >= 1024px — room for the side-by-side login layout. */
  isWide: boolean;
  isTiny: boolean;
}

export function useBreakpoint(): Responsive {
  const { width } = useWindowDimensions();
  return {
    width,
    isTiny: width < BREAKPOINTS.sm,
    isCompact: width < BREAKPOINTS.md,
    isWide: width >= BREAKPOINTS.lg,
  };
}
