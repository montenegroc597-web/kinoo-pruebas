import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Button, PROTOTIPOS, PrototipoVista, urlPantalla } from './index';

afterEach(cleanup);

describe('prototipos de lienzo (PrototipoVista)', () => {
  it('el prototipo del estudio declara su tamaño y su página de inicio', () => {
    expect(PROTOTIPOS['kinoo-flujo']).toMatchObject({ ancho: 402, alto: 844, inicio: 'Flujo1_Descubrir.dc.html' });
  });
  it('la URL lleva el modo incrustado, las acciones y la marca', () => {
    const u = urlPantalla('kinoo-flujo', { pagina: 'FlujoV1_Feed.dc.html', acciones: [{ click: '← otra', hasta: 'Tu match del mazo', max: 12 }], marca: { selector: 'button[aria-pressed]' } });
    const q = new URL(u, 'http://x').searchParams;
    expect(u).toMatch(/kinoo-flujo\/FlujoV1_Feed\.dc\.html\?/);
    expect(q.get('embed')).toBe('1');
    expect(JSON.parse(q.get('acciones')!)[0].hasta).toBe('Tu match del mazo');
    expect(JSON.parse(q.get('marca')!)).toEqual({ selector: 'button[aria-pressed]' });
  });
  it('estática por defecto: el iframe no recibe toques (los mide la prueba); interactiva sí', () => {
    const { container, rerender } = render(<PrototipoVista prototipo="kinoo-flujo" pantalla={{ pagina: 'Flujo1_Descubrir.dc.html' }} id="pv" />);
    const f = () => container.querySelector('iframe') as HTMLElement;
    expect(f().style.pointerEvents).toBe('none');
    expect(container.querySelector('#pv')!.getAttribute('data-pagina')).toBe('Flujo1_Descubrir.dc.html');
    rerender(<PrototipoVista prototipo="kinoo-flujo" pantalla={{ pagina: 'Flujo1_Descubrir.dc.html' }} interactiva />);
    expect(f().style.pointerEvents).toBe('auto');
  });
  it('el marco escala la pantalla sin cambiar sus coordenadas (402 × 844)', () => {
    const { container } = render(<PrototipoVista prototipo="kinoo-flujo" pantalla={{ pagina: 'Flujo4_Eleccion.dc.html' }} escala={0.5} />);
    const marco = container.firstElementChild as HTMLElement;
    expect([marco.style.width, marco.style.height]).toEqual(['201px', '422px']);
    expect((container.querySelector('iframe') as HTMLElement).style.width).toBe('402px');
  });
});

describe('Button', () => {
  it('lleva data-track para identificar cada toque', () => {
    const { getByRole } = render(<Button track="x.y">Hola</Button>);
    expect(getByRole('button').getAttribute('data-track')).toBe('x.y');
  });
});
