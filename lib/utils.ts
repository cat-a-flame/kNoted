export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function patternMeta(hookSize: string | null, yarnSummary: string | null): string {
  return [hookSize && `${hookSize} hook`, yarnSummary].filter(Boolean).join(' · ');
}
