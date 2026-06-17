import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(weight: any): string {
  try {
    if (weight === undefined || weight === null) return "0.000";
    const n = Number(weight);
    if (isNaN(n) || !isFinite(n)) return "0.000";
    return n.toFixed(3);
  } catch (e) {
    console.warn('[CWMS] formatWeight error for:', weight, e);
    return "0.000";
  }
}

export function safeToFixed(value: any, decimals: number = 3): string {
  try {
    if (value === undefined || value === null) return (0).toFixed(decimals);
    const n = Number(value);
    if (isNaN(n) || !isFinite(n)) {
      return (0).toFixed(decimals);
    }
    return n.toFixed(decimals);
  } catch (e) {
    console.warn('[CWMS] safeToFixed error for:', value, e);
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
  // If format is a state history list starting with "X-", like "1-2026.05.22,2-2026.06.01"
  if (/^\d-/.test(dateStr)) {
    const records = dateStr.split(',');
    const firstRecord = records.find(r => r.startsWith('1-'));
    if (firstRecord) return firstRecord.split('-')[1];
    return records[0].split('-')[1] || '-';
  }
  return dateStr.split('T')[0];
}

export function formatSimpleDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}.${m}.${d}`;
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

export function formatDateTimeWithSeconds(dateStr: string): string {
  if (!dateStr) return '-';
  let date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    // Attempt normalization for SQLite ISO space vs T separation
    const normalized = dateStr.replace(' ', 'T');
    const d2 = new Date(normalized);
    if (!isNaN(d2.getTime())) {
      date = d2;
    }
  }
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function getCurrencySymbol(otrc: number): string {
  if (otrc === 2) return 'USD';
  if (otrc === 3) return 'CNY';
  return 'UZS';
}

export function getCurrencyShortSymbol(otrc: number): string {
  if (otrc === 2) return '$';
  if (otrc === 3) return '￥';
  return 'UZS';
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
