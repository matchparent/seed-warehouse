import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatWeight(weight: number): string {
  return weight.toFixed(3);
}

export function addWeights(a: number, b: number): number {
  return (Math.round(a * 1000) + Math.round(b * 1000)) / 1000;
}

export function subWeights(a: number, b: number): number {
  return (Math.round(a * 1000) - Math.round(b * 1000)) / 1000;
}

export function isWeightExceeded(weight: number, limit: number): boolean {
  return Math.round(weight * 1000) > Math.round(limit * 1000);
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
