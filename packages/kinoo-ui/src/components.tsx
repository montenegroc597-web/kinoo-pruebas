// Botón de la interfaz de la prueba (estilo del design system Kinoo). `track` → data-track: cada toque queda identificado.
import React from 'react';
import './styles/tokens.css';
import './styles/components.css';

export function Button(p: {
  variant?: 'primary' | 'secondary' | 'inverse' | 'ghost'; size?: 'lg' | 'md' | 'sm'; block?: boolean; type?: 'button' | 'submit';
  disabled?: boolean; onClick?: () => void; children?: React.ReactNode; track?: string; className?: string; 'aria-label'?: string;
}) {
  const cls = ['kn-btn', 'kn-btn-' + (p.variant ?? 'primary'), 'kn-btn-' + (p.size ?? 'lg'), p.block && 'kn-btn-block', p.className].filter(Boolean).join(' ');
  return <button type={p.type ?? 'button'} className={cls} onClick={p.onClick} disabled={p.disabled} aria-label={p['aria-label']} data-track={p.track}>{p.children}</button>;
}
