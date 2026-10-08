'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fmtDateTime } from '@/lib/utils';
import type { VisitorPass } from '@/lib/api/types';

function waNumber(phone?: string): string {
  return (phone ?? '').replace(/[^\d]/g, '').replace(/^0/, '254');
}

/**
 * A new pass's code and QR. The API returns them once, so this is the only time they show.
 * Sharing goes through a WhatsApp button, never raw link text.
 */
export function PassCodeCard({ pass, estateName }: { pass: VisitorPass; estateName: string }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    if (!pass.qr_token) return;
    QRCode.toDataURL(pass.qr_token, { margin: 1, width: 240, color: { dark: '#4E1240', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(''));
  }, [pass.qr_token]);

  const text = `Your gate pass for ${estateName}: code ${pass.code}. Valid ${fmtDateTime(pass.valid_from)} to ${fmtDateTime(pass.valid_to)}. Show this code to the guard.`;
  const to = waNumber(pass.visitor_phone);

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={qr} alt="Pass QR code" className="h-48 w-48 rounded-lg border" />
      )}
      <div>
        <p className="text-xs text-muted-foreground">Gate code</p>
        <p className="font-mono text-3xl font-semibold tracking-[0.3em]">{pass.code}</p>
      </div>
      <p className="text-sm text-muted-foreground">For {pass.visitor_name}, {fmtDateTime(pass.valid_from)} to {fmtDateTime(pass.valid_to)}</p>
      <Button
        size="lg"
        className="h-12 w-full bg-[#1F7A4D] text-white hover:bg-[#1F7A4D]/90"
        onClick={() => window.open(`https://wa.me/${to}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')}
      >
        <MessageCircle /> Share on WhatsApp
      </Button>
      <p className="text-xs text-muted-foreground">Save or share the code now. For security it is not shown again.</p>
    </div>
  );
}
