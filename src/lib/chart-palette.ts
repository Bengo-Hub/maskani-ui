'use client';

import { useTheme } from 'next-themes';
import { useMemo } from 'react';

/**
 * Chart colours, validated with the dataviz skill's validate_palette.js (2026-10-08): every check
 * passes for these pairs on the light (#fcfcfb) and dark (#1a1a19) chart surfaces. The brand plum
 * #6E1A5A and gold #C8963E failed the lightness band and contrast, so these are their stepped
 * neighbours. Series order is fixed: plum first, gold second. Re-run the validator before adding a
 * third series.
 */
const LIGHT = { series: ['#8E2C76', '#A8782A'], grid: '#ECE6EA', axis: '#6A6E78', surface: '#FFFFFF' } as const;
const DARK = { series: ['#B0629C', '#A88238'], grid: '#2E2530', axis: '#A8A2A8', surface: '#1F1720' } as const;

export type ChartPalette = typeof LIGHT | typeof DARK;

/** Stable palette object per theme, so chart props never change identity between renders (React #185). */
export function useChartPalette(): ChartPalette {
  const { resolvedTheme } = useTheme();
  return useMemo(() => (resolvedTheme === 'dark' ? DARK : LIGHT), [resolvedTheme]);
}

/** Axis tick for KES amounts: compact on the axis only; tooltips and tables show full figures. */
export function axisKes(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(v % 1_000_000 === 0 ? 0 : 1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}
