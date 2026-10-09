/*
 * Kino · modo incrustado (versión B de la prueba de marca).
 * index.html es el prototipo H «Kino · mazos» SIN CAMBIOS (copia de _artefacto_B/project/H_Prototipo.dc.html;
 * solo cambia support.js -> dc-runtime.js y esta línea). Sin parámetros se ve el prototipo completo con su panel.
 * Con ?pantalla=S02|S04|S05 (y S01, S03, S06–S08 para el catálogo) abre esa pantalla con los propios atajos del prototipo y muestra SOLO la
 * pantalla del teléfono (390×844) en la esquina superior izquierda, para que coincida con el marco #kinoo-frame.
 */
(function () {
  var q = new URLSearchParams(location.search);
  var pantalla = q.get('pantalla');
  if (!pantalla) return;
  // S02/S04/S05 son las pantallas de la prueba de marca; el resto solo se usa en el catálogo del equipo (?catalogo=1)
  var ATAJO = { S01: 'INICIO', S02: 'MAZO · CARTAS', S03: 'EN LA PLATAFORMA', S04: 'CARTAS', S05: 'ELEGIR MAZO', S06: 'MOOD', S07: 'MAZO TERMINADO', S08: 'MI BIBLIOTECA' };
  var etiqueta = ATAJO[pantalla] || 'INICIO';
  var css = document.createElement('style');
  css.textContent = 'html,body{margin:0!important;background:#111010!important;overflow:hidden!important}html{visibility:hidden}';
  document.head.appendChild(css);

  function pantallaTel() {
    var divs = document.querySelectorAll('div');
    for (var i = 0; i < divs.length; i++) {
      var s = divs[i].style;
      if (s.width === '390px' && s.height === '844px' && s.borderRadius) return divs[i];
    }
    return null;
  }
  function boton(txt, tel) {
    // los atajos del panel lateral del prototipo (fuera del teléfono)
    var bs = document.querySelectorAll('button, [role="button"], a');
    for (var i = 0; i < bs.length; i++) if (!(tel && tel.contains(bs[i])) && (bs[i].textContent || '').replace(/\s+/g, ' ').trim() === txt) return bs[i];
    return null;
  }
  var intentos = 0, saltado = false;
  function listo(tel) {
    tel.style.borderRadius = '0';
    document.body.style.transform = 'none';
    var r = tel.getBoundingClientRect();
    document.body.style.transformOrigin = '0 0';
    document.body.style.transform = 'translate(' + (-r.left) + 'px,' + (-r.top) + 'px)';
    document.documentElement.style.visibility = 'visible';
    window.__kinoListo = true;
    try { window.parent.postMessage({ type: 'kino-listo', pantalla: pantalla }, '*'); } catch (e) { /* nada */ }
  }
  (function paso() {
    intentos++;
    var tel = pantallaTel(), b = tel ? boton(etiqueta, tel) : null;
    if (tel && b && !saltado) { b.click(); saltado = true; }
    if (tel && saltado) { requestAnimationFrame(function () { requestAnimationFrame(function () { listo(tel); }); }); return; }
    if (intentos < 400) setTimeout(paso, 25); else document.documentElement.style.visibility = 'visible';
  })();
})();
