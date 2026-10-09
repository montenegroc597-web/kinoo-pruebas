import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Kicker, Next, P, Page, Title } from '../ui/kit';

/** En escritorio (pantalla ancha y sin táctil) no se empieza: la prueba es para el celular de cada participante. */
export function esEscritorio(): boolean {
  try {
    const fino = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    return window.innerWidth > 820 && !fino;
  } catch { return false; }
}

export function Gate({ onForzar }: { onForzar: () => void }) {
  const [qr, setQr] = useState('');
  const url = window.location.href.split('?')[0];
  useEffect(() => { void QRCode.toDataURL(url, { margin: 1, width: 240, color: { dark: '#17120F', light: '#F4E7D0' } }).then(setQr).catch(() => setQr('')); }, [url]);
  return (
    <Page>
      <div className="sh-qr">
        <Kicker>ábrelo en tu celular</Kicker>
        <Title>Esta prueba es para el celular</Title>
        <P>Escanea el código con la cámara de tu teléfono para empezar.</P>
        {qr ? <img src={qr} width={240} height={240} alt="Código QR con el enlace de la prueba" style={{ borderRadius: 12 }} /> : null}
        <span className="sh-hint" style={{ wordBreak: 'break-all' }}>{url}</span>
        <Next variant="ghost" onClick={onForzar} track="gate.forzar">Continuar aquí (solo para el equipo)</Next>
      </div>
    </Page>
  );
}
