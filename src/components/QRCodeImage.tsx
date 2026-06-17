import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

export function QRCodeImage({ value, className = "w-12 h-12 border border-slate-100 rounded" }: { value: string; className?: string }) {
  const [src, setSrc] = useState<string>('');

  useEffect(() => {
    if (!value) return;
    QRCode.toDataURL(value, { width: 400, margin: 1 })
      .then(url => setSrc(url))
      .catch(err => console.error(err));
  }, [value]);

  if (!value) return null;
  return <img src={src} alt="qr-code" className={`${className} object-contain bg-white`} />;
}
