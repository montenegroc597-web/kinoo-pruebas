import React, { useState } from 'react';
import { LINK_TEXTOS } from '@kinoo/tracking';
import { Kicker, Next, P, Page, Title } from '../ui/kit';
import { client, emit, nuevoId, resetReloj, setCtx } from '../track';
import { linkDeUrl, nuevaSesion, useSession } from '../session';
import { configActual } from '../config';

const RONDA = (() => {
  try { const q = new URLSearchParams(window.location.search).get('ronda'); if (q && /^\d+$/.test(q)) return parseInt(q, 10); } catch { /* ignorar */ }
  const e = parseInt(import.meta.env.VITE_RONDA ?? '1', 10);
  return Number.isNaN(e) ? 1 : e;
})();

/** iOS / Android / Otro (el protocolo pide repartir entre los dos sistemas). */
export const sistema = (): string => (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'iOS' : /android/i.test(navigator.userAgent) ? 'Android' : 'Otro');

/** Bienvenida y consentimiento (Anexo A). Al continuar se registra a la persona: código P01, P02… y card A o B. Anónimo. */
export function Bienvenida({ onListo }: { onListo: () => void }) {
  const [enviando, setEnviando] = useState(false);
  const set = useSession((x) => x.set);
  const empezar = async () => {
    setEnviando(true);
    setCtx({ bloque: 'registro', estimulo: null, pantalla: 'bienvenida' });
    resetReloj();
    const { textos, estudio } = configActual();
    const link = linkDeUrl();
    const a = await client.registrar({
      ronda: RONDA, flujo: link.flujo, variante: link.variante, dispositivo: sistema(), agente: navigator.userAgent.slice(0, 300),
      versionTextos: textos.version, versionEstudio: estudio.version,
    }, nuevoId());
    set(nuevaSesion(a, RONDA, textos, estudio));
    emit('session.start', { extra: { provisional: !!a.provisional, ronda: RONDA, flujo: a.flujo } });
    emit('consent', { valor: 'acepta' });
    onListo();
  };
  return (
    <Page>
      <Kicker>hola</Kicker>
      <Title>Antes de empezar</Title>
      <P>{LINK_TEXTOS.bienvenida}</P>
      <div className="sh-grow" />
      <Next disabled={enviando} onClick={empezar} track="bienvenida.empezar">{enviando ? 'Un momento…' : 'Empezar'}</Next>
    </Page>
  );
}

export function Final() {
  return (
    <Page>
      <Kicker>¡gracias!</Kicker>
      <Title>Listo</Title>
      <P>{LINK_TEXTOS.final}</P>
    </Page>
  );
}
