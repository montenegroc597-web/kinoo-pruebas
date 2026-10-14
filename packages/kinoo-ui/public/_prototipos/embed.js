/*
 * Modo incrustado para CUALQUIER prototipo de lienzo (.dc.html) importado con scripts/importar-prototipo.mjs.
 * Sin ?embed=1 la página se ve tal cual (el prototipo completo, navegable).
 * Con ?embed=1 (lo pone <PrototipoVista>):
 *   - acciones=[{"click":"texto","hasta":"texto","max":12}]  toca el elemento cuyo texto visible es `click`
 *     (repite hasta que aparezca `hasta`), para llegar a un estado concreto (p. ej. «Tu match del mazo»);
 *   - marca={"selector":"css"} | {"texto":"…"}               mide ese elemento (unión de todos los que coinciden) en px de la página.
 * Al terminar: window.__prototipoListo = true, window.__prototipoMarca = [x1, y1, x2, y2] | null y un postMessage al padre.
 */
(function () {
  var q = new URLSearchParams(location.search);
  if (q.get('embed') !== '1') return;
  var leer = function (k) { try { return JSON.parse(q.get(k) || 'null'); } catch (e) { return null; } };
  var acciones = leer('acciones') || [];
  var marca = leer('marca');
  var css = document.createElement('style');
  css.textContent = 'html,body{margin:0!important;overflow:hidden!important;background:#17120f!important}';
  document.head.appendChild(css);

  // sin distinguir mayúsculas: muchos textos se ven en mayúsculas solo por CSS (text-transform)
  var limpio = function (t) { return (t || '').replace(/\s+/g, ' ').trim().toLowerCase(); };
  function porTexto(txt, soloAcciones) {
    // el elemento más pequeño cuyo texto visible es (o contiene, si no hay exacto) `txt`
    var sel = soloAcciones ? 'button, a, [role="button"], [onclick]' : '*';
    var els = document.querySelectorAll(sel), exacto = null, contiene = null, area = Infinity;
    for (var i = 0; i < els.length; i++) {
      var t = limpio(els[i].textContent), r = els[i].getBoundingClientRect();
      if (!r.width || !r.height) continue;
      if (t === limpio(txt)) { if (!exacto || r.width * r.height < area) { exacto = els[i]; area = r.width * r.height; } }
      else if (!soloAcciones && t.indexOf(limpio(txt)) >= 0 && (!contiene || r.width * r.height < contiene.getBoundingClientRect().width * contiene.getBoundingClientRect().height)) contiene = els[i];
    }
    return exacto || contiene;
  }
  var hay = function (txt) { return limpio(document.body.innerText).indexOf(limpio(txt)) >= 0; };
  function medir() {
    if (!marca) return null;
    var els = marca.selector ? Array.prototype.slice.call(document.querySelectorAll(marca.selector)) : [porTexto(marca.texto || '', false)];
    var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    els.forEach(function (el) {
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      x1 = Math.min(x1, r.left); y1 = Math.min(y1, r.top); x2 = Math.max(x2, r.right); y2 = Math.max(y2, r.bottom);
    });
    if (x1 === Infinity) return null;
    // solo la parte visible (una tira con scroll horizontal tiene elementos fuera de la pantalla)
    return [Math.max(0, x1), Math.max(0, y1), Math.min(innerWidth, x2), Math.min(innerHeight, y2)].map(Math.round);
  }
  function listo() {
    window.__prototipoMarca = medir();
    window.__prototipoListo = true;
    try { window.parent.postMessage({ type: 'prototipo-listo', marca: window.__prototipoMarca }, '*'); } catch (e) { /* sin padre */ }
  }
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  async function correr() {
    // el runtime pinta la página después de cargar: se espera a que haya contenido
    for (var i = 0; i < 200 && limpio(document.body.innerText).length < 10; i++) await espera(25);
    for (var a = 0; a < acciones.length; a++) {
      var paso = acciones[a], max = paso.max || 1;
      for (var n = 0; n < max && !(paso.hasta && hay(paso.hasta)); n++) {
        var el = porTexto(paso.click, true);
        if (!el) { console.warn('[prototipo] no encontré «' + paso.click + '»'); break; }
        el.click();
        await espera(450);
      }
    }
    requestAnimationFrame(function () { requestAnimationFrame(listo); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', correr); else correr();
})();
