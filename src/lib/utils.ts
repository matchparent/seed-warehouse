import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(weight: number | string | undefined | null): string {
  try {
    const n = Number(weight);
    const val = isNaN(n) || !isFinite(n) ? 0 : n;
    return Number(val).toFixed(3);
  } catch (e) {
    console.error('formatWeight error:', e);
    return "0.000";
  }
}

export function safeToFixed(value: number | string | undefined | null, decimals: number = 3): string {
  try {
    const n = Number(value);
    const val = isNaN(n) || !isFinite(n) ? 0 : n;
    return Number(val).toFixed(decimals);
  } catch (e) {
    console.error('safeToFixed error:', e);
    return "0";
  }
}

export function addWeights(a: number | string, b: number | string): number {
  const n1 = Number(a);
  const n2 = Number(b);
  const v1 = isNaN(n1) ? 0 : n1;
  const v2 = isNaN(n2) ? 0 : n2;
  return (Math.round(v1 * 1000) + Math.round(v2 * 1000)) / 1000;
}

export function subWeights(a: number | string, b: number | string): number {
  const n1 = Number(a);
  const n2 = Number(b);
  const v1 = isNaN(n1) ? 0 : n1;
  const v2 = isNaN(n2) ? 0 : n2;
  return (Math.round(v1 * 1000) - Math.round(v2 * 1000)) / 1000;
}

export function isWeightExceeded(weight: number | string, limit: number | string): boolean {
  return Math.round(Number(weight) * 1000) > Math.round(Number(limit) * 1000);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.split('T')[0];
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Try modern API first
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback for older browsers or non-secure contexts (like some mobile iframes)
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure the textarea is not visible but part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    textArea.style.top = "0";
    textArea.style.opacity = "0";
    
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error('Copy failed:', err);
    return false;
  }
}
