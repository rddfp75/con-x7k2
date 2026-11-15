(function () {
  var C = window.Calc, CT = C.CT;
  function $(id) { return document.getElementById(id); }
  var MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var st = { ctl: 'arco', lect: [], cache: false, pend: false, err: '', file: null };
  var col = null;
  function cargarLim() {
    var o = {}; try { o = JSON.parse(LS.get('cs_lim') || '{}') || {}; } catch (e) {}
    ['aguaMin', 'aguaMax', 'jMin', 'jMax'].forEach(function (k) { if (o[k] !== undefined) C.LIM[k] = o[k]; });
  }
  cargarLim();

  /* ---------- utilidades ---------- */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtF(ts) { var d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function fmtC(ts) { var d = new Date(ts); return d.getDate() + '/' + (d.getMonth() + 1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function inputDT(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function ym(ts) { var d = new Date(ts); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function ymLabel(k) { var p = k.split('-'); return MESES[parseInt(p[1], 10) - 1] + ' ' + p[0]; }
  function fn(x, d) { return Number(x).toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d }); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function num(id) { var e = $(id); if (!e || e.value === '') return null; var x = parseFloat(String(e.value).replace(',', '.')); return isNaN(x) ? null : x; }
  function nombre() { return LS.get('cs_nombre'); }
  function codigo() { return LS.get('cs_codigo'); }
  function lista(ctl) { return st.lect.filter(function (l) { return l.ctl === ctl && !l.anulada; }); }
  function ordenadas(ctl) { return lista(ctl).sort(function (a, b) { return a.ts - b.ts; }); }
  function exportados() { try { return JSON.parse(LS.get('cs_exp') || '[]'); } catch (e) { return []; } }
  function marcar(k) { var e = exportados(); if (e.indexOf(k) < 0) { e.push(k); LS.set('cs_exp', JSON.stringify(e)); } }
  function box(big, txt, cls) { return '<div class="big ' + cls + '"><span>' + big + '</span>' + txt + '</div>'; }

  /* ---------- pantallas de configuración ---------- */
  function pantallaAjustes(msg) {
    $('main').style.display = 'none';
    var a = $('setup'); a.style.display = 'block';
    a.innerHTML = '<div class="card"><h2>' + (msg || 'Ajustes') + '</h2>' +
      '<label>¿Quién apunta? (tu nombre)</label><input id="s_n" type="text" value="' + esc(nombre() || '') + '" placeholder="Rubén">' +
      '<label>Código del equipo</label><input id="s_c" type="text" value="' + esc(codigo() || '') + '" placeholder="el que os diga Rubén" autocapitalize="none" autocorrect="off">' +
      '<div class="prev">El código tiene que ser <b>el mismo en todos los móviles</b>: así todos ven las mismas lecturas. Solo letras, números y guiones.</div>' +
      '<h2 style="margin-top:16px">Avisos a mantenimiento</h2>' +
      '<label>Correo servicios generales (arco, CS1)</label><input id="s_mg" type="text" value="' + esc(LS.get('cs_mail_sg') || '') + '" autocapitalize="none" autocorrect="off">' +
      '<label>Correo mantenimiento CS3 (jumbos)</label><input id="s_m3" type="text" value="' + esc(LS.get('cs_mail_cs3') || '') + '" autocapitalize="none" autocorrect="off">' +
      '<label>Arco · agua por día laborable: mínimo (L)</label><input id="s_amin" type="number" inputmode="decimal" value="' + (C.LIM.aguaMin == null ? '' : C.LIM.aguaMin) + '">' +
      '<label>Arco · agua por día laborable: máximo (L)</label><input id="s_amax" type="number" inputmode="decimal" value="' + (C.LIM.aguaMax == null ? '' : C.LIM.aguaMax) + '">' +
      '<label>Jumbos CS3 · consumo por día laborable: mínimo (L)</label><input id="s_jmin" type="number" inputmode="decimal" value="' + (C.LIM.jMin == null ? '' : C.LIM.jMin) + '">' +
      '<label>Jumbos CS3 · consumo por día laborable: máximo (L)</label><input id="s_jmax" type="number" inputmode="decimal" value="' + (C.LIM.jMax == null ? '' : C.LIM.jMax) + '">' +
      '<div class="prev">Si dejas un límite vacío, no se avisa por ese lado. Estos ajustes son de este móvil.</div>' +
      '<button class="p" id="s_ok">Guardar y entrar</button></div>';
    $('s_ok').onclick = function () {
      var n = $('s_n').value.trim(), c = $('s_c').value.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
      if (!n || c.length < 4) { alert('Escribe tu nombre y un código de al menos 4 letras o números.'); return; }
      LS.set('cs_nombre', n); LS.set('cs_codigo', c);
      LS.set('cs_mail_sg', $('s_mg').value.trim()); LS.set('cs_mail_cs3', $('s_m3').value.trim());
      function lim(id) { var v = $(id).value.trim().replace(',', '.'); if (v === '') return null; var x = parseFloat(v); return isNaN(x) ? null : x; }
      LS.set('cs_lim', JSON.stringify({ aguaMin: lim('s_amin'), aguaMax: lim('s_amax'), jMin: lim('s_jmin'), jMax: lim('s_jmax') }));
      location.reload();
    };
  }

  /* ---------- formulario ---------- */
  function inp(id, lab, extra) {
    return '<label>' + lab + '</label><input id="' + id + '" type="number" inputmode="decimal" step="any" autocomplete="off">' + (extra || '') + '<div class="prev" id="p_' + id + '"></div>';
  }
  function drawForm() {
    var c = st.ctl, h = '';
    h += '<label>Fecha y hora</label><input id="f_ts" type="datetime-local">';
    if (c === 'arco') h += inp('f_c', 'Contador de agua (m³)') + inp('f_v', 'Varilla del barril (marca que lees)');
    if (c === 'pel') h += inp('f_v', 'Varilla del GRG (cm)') + inp('f_q', 'Nº de cerdos (opcional, lo da producción)') + '<label>Dosificación de la bomba</label><input id="f_b" type="text" placeholder="37,5/37,5">';
    if (c === 'jum') h += inp('f_v', 'Varilla del GRG (cm)') + inp('f_j', 'Contador de jumbos lavados (opcional)');
    h += '<label class="chk"><input id="f_cam" type="checkbox"> ' + (c === 'arco' ? 'Cambio de barril (apunta la marca del barril nuevo)' : c === 'jum' ? 'Cambio de GRG (800 L)' : 'Cambio de GRG') + '</label><div id="antes"></div>';
    h += '<label>Observaciones (opcional)</label><input id="f_obs" type="text">';
    $('formtit').textContent = 'Nueva lectura · ' + CT[c].nombre + ' (' + CT[c].prod + ')';
    $('form').innerHTML = h;
    $('f_ts').value = inputDT(Date.now());
    $('form').oninput = live;
    $('f_cam').onchange = function () {
      $('antes').innerHTML = this.checked ? '<label>' + (c === 'arco' ? 'Varilla ANTES del cambio' : 'cm ANTES del cambio') + '</label><input id="f_ant" type="number" inputmode="decimal" step="any"><div class="prev">Lo que marcaba antes de cambiar; la varilla de arriba es la del nuevo.</div>' : '';
      live();
    };
    updateAll();
  }

  function leer() {
    var c = st.ctl, o = { ctl: c, v: num('f_v') };
    if (o.v === null) return null;
    if (c === 'arco') { o.c = num('f_c'); if (o.c === null) return null; }
    if (c === 'pel') { var q = num('f_q'); if (q !== null) o.q = q; var b = $('f_b').value.trim(); if (b) o.b = b; }
    if (c === 'jum') { var j = num('f_j'); if (j !== null) o.j = j; }
    o.cambio = $('f_cam').checked;
    if (o.cambio) { var a = num('f_ant'); if (a !== null) o.antes = a; }
    var ob = $('f_obs').value.trim(); if (ob) o.obs = ob;
    var t = $('f_ts').value; o.ts = t ? new Date(t).getTime() : Date.now(); if (isNaN(o.ts)) o.ts = Date.now();
    o.fecha = fmtF(o.ts); o.autor = nombre(); o.anulada = false;
    return o;
  }

  function live() {
    var r = $('res'), o = leer(), c = st.ctl;
    if (!o) { r.innerHTML = ''; return; }
    var ls = ordenadas(c);
    if (!ls.length) { r.innerHTML = box('—', 'Primera lectura: se guarda como punto de partida', 'na'); return; }
    if (o.cambio && o.antes === undefined) { r.innerHTML = box('—', 'Escribe lo que marcaba la varilla antes del cambio', 'na'); return; }
    var d = dActual(o), was = $('f_avis') && $('f_avis').checked;
    r.innerHTML = consumo(c, d, true) + avisoHtml(c, o, d);
    if (was && $('f_avis')) $('f_avis').checked = true;
  }
  function dActual(o) {
    var ls = ordenadas(o.ctl); if (!ls.length) return null;
    var res = C.calcular(o.ctl, ls.concat([o])), d = null;
    for (var i = 0; i < res.length; i++) if (res[i].r === o) d = res[i];
    return d;
  }

  /* ---------- avisos a mantenimiento ---------- */
  function fmtL(x) { return fn(x, 0); }
  function hora(ts) { var d = new Date(ts); return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear(); }
  function hhmm(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function rangoTxt(mn, mx, u, pre) {
    if (mn != null && mx != null) return pre + ': ' + fn(mn, 0) + '–' + fn(mx, 0) + ' ' + u;
    if (mn != null) return pre + ': mínimo ' + fn(mn, 0) + ' ' + u;
    if (mx != null) return pre + ': máximo ' + fn(mx, 0) + ' ' + u;
    return '';
  }
  /* incidencias de una lectura: [{k, txt, linea}] */
  function incidencias(c, d) {
    var L = [];
    if (!d) return L;
    if (c === 'arco') {
      if (d.aguaEst) {
        var rg = rangoTxt(C.LIM.aguaMin, C.LIM.aguaMax, 'L', 'rango habitual');
        var q = d.dias === 1 ? fmtL(d.agua) + ' L en el día' : fmtL(d.agua) + ' L en ' + d.dias + ' días laborables (' + fmtL(d.aguaDia) + ' L por día)';
        L.push({ k: 'agua', cod: 'Agua ' + d.aguaEst, txt: 'consumo de agua ' + d.aguaEst, linea: 'Consumo de agua ' + d.aguaEst + ': ' + q + (rg ? ' (' + rg + ')' : '') });
      }
      if (d.concEst) L.push({ k: 'conc', cod: 'Concentración ' + d.concEst, txt: 'concentración ' + d.concEst, linea: 'Concentración de Zotal ' + d.concEst + ': ' + fn(d.conc, 1) + ' % (rango correcto: ' + CT.arco.rmin + '–' + CT.arco.rmax + ' %)' });
    } else if (c === 'jum' && d.jEst) {
      var rj = rangoTxt(C.LIM.jMin, C.LIM.jMax, 'L por día laborable', 'rango habitual');
      L.push({ k: 'jum', cod: 'Consumo ' + d.jEst, txt: 'consumo ' + d.jEst, linea: 'Consumo de Deogen ' + d.jEst + ': ' + fn(d.cm, 1) + ' cm (' + fmtL(d.litros) + ' L) desde la última lectura' + (d.dias > 1 ? ' (' + d.dias + ' días laborables)' : '') + (rj ? ' (' + rj + ')' : '') });
    }
    return L;
  }
  function correo(c, o, d) {
    var L = incidencias(c, d); if (!L.length) return null;
    var f = hora(o.ts), solo = L.length === 1 ? L[0] : null, cuerpo = 'Buenos días:\n\n', asunto, para;
    if (c === 'arco') {
      cuerpo += 'En la lectura del arco de desinfección de CS1 del ' + f + ' (' + hhmm(o.ts) + ') ';
      if (solo) {
        cuerpo += solo.k === 'agua' ? 'el consumo de agua ha sido ' + d.aguaEst + ': ' + L[0].linea.split(': ').slice(1).join(': ') + '.' : 'la concentración de Zotal está ' + d.concEst + ': ' + fn(d.conc, 1) + ' % (rango correcto: ' + CT.arco.rmin + '–' + CT.arco.rmax + ' %).';
        asunto = 'Arco de desinfección CS1 · ' + (solo.k === 'agua' ? 'Consumo de agua ' + (d.aguaEst === 'ALTO' ? 'alto' : 'bajo') : 'Concentración ' + (d.concEst === 'ALTA' ? 'alta' : 'baja')) + ' · ' + f;
      } else {
        cuerpo += 'hemos detectado dos incidencias:\n\n' + L.map(function (x) { return '- ' + x.linea + '.'; }).join('\n');
        asunto = 'Arco de desinfección CS1 · Consumo de agua y concentración fuera de rango · ' + f;
      }
      cuerpo += '\n\nOs pedimos que ' + (solo && solo.k === 'conc' ? 'reviséis la dosificación' : 'lo reviséis') + '.';
      para = LS.get('cs_mail_sg') || '';
    } else {
      cuerpo += 'En la lectura del GRG de Deogen de la lavadora de jumbos de CS3 del ' + f + ' el consumo ha sido ' + d.jEst + ': ' + L[0].linea.split(': ').slice(1).join(': ') + '.\n\nOs pedimos que lo reviséis.';
      asunto = 'Lavadora de jumbos CS3 · Consumo de Deogen ' + (d.jEst === 'ALTO' ? 'alto' : 'bajo') + ' · ' + f;
      para = LS.get('cs_mail_cs3') || '';
    }
    cuerpo += '\n\nGracias.\n' + (nombre() || '');
    return { para: para, asunto: asunto, cuerpo: cuerpo, L: L };
  }
  function avisoHtml(c, o, d) {
    var m = correo(c, o, d); if (!m) return '';
    var dest = c === 'arco' ? 'servicios generales' : 'mantenimiento de CS3';
    var href = 'mailto:' + encodeURIComponent(m.para).replace(/%40/g, '@') + '?subject=' + encodeURIComponent(m.asunto) + '&body=' + encodeURIComponent(m.cuerpo);
    return '<div class="ban" style="margin:10px 0 0">⚠ Avisar a ' + dest + '<div style="font-weight:400;font-size:13px;margin-top:2px">' + m.L.map(function (x) { return esc(x.cod); }).join(' · ') + '</div>' +
      '<a href="' + href + '" style="display:block;margin-top:8px;padding:11px;border-radius:10px;background:#e8b931;color:#3d2b00;font:700 15px Barlow;text-align:center;text-decoration:none">✉️ Enviar aviso por correo</a>' +
      (m.para ? '' : '<div style="font-weight:400;font-size:12px;margin-top:6px">Falta el correo de ' + dest + ': ponlo en ⚙️ Ajustes.</div>') +
      '<label class="chk" style="margin-top:8px;background:#fffaf0"><input id="f_avis" type="checkbox"> Ya he avisado</label></div>';
  }

  /* HTML de resultado: grande si grande=true */
  function consumo(c, d, grande) {
    if (!d || (d.agua === undefined && d.litros === undefined)) return '';
    var x = '';
    if (c === 'arco') {
      var ok = d.enRango;
      if (grande) {
        x += box(fn(d.agua, 0) + ' L', 'AGUA CONSUMIDA', 'na');
        x += box(d.conc === null ? '—' : fn(d.conc, 2) + ' %', d.conc === null ? 'Revisa las lecturas' : ok ? 'EN RANGO (1–2 %)' : 'FUERA DE RANGO (1–2 %)', d.conc === null ? 'na' : ok ? 'ok' : 'bad');
        x += '<div class="res"><div>Zotal consumido<b>' + fn(d.prod, 1) + ' L</b></div></div>';
      } else {
        x = '<b>Agua ' + fn(d.agua, 0) + ' L</b> · <span class="' + (d.conc === null ? '' : ok ? 'tg' : 'tr') + '"><b>' + (d.conc === null ? '—' : fn(d.conc, 2) + ' % ' + (ok ? '✔' : '✖')) + '</b></span> · Zotal ' + fn(d.prod, 1) + ' L';
      }
      return x;
    }
    if (grande) {
      x += box(fn(d.litros, 1) + ' L', 'LITROS CONSUMIDOS desde la última lectura', 'na');
      x += '<div class="res"><div>Consumo en cm<b>' + fn(d.cm, 1) + ' cm</b></div>';
      if (d.lcerdo !== undefined) x += '<div>Litros por cerdo<b>' + fn(d.lcerdo, 4) + ' L</b></div>';
      if (d.jumbos !== undefined) { x += '<div>Jumbos lavados<b>' + d.jumbos + '</b></div>'; if (d.ljumbo !== undefined) x += '<div>Litros por jumbo<b>' + fn(d.ljumbo, 3) + ' L</b></div><div>€ por jumbo<b>' + fn(d.ejumbo, 3) + ' €</b></div>'; }
      x += '</div>';
    } else {
      x = '<b>' + fn(d.litros, 1) + ' L</b> (' + fn(d.cm, 1) + ' cm)';
      if (d.lcerdo !== undefined) x += ' · ' + fn(d.lcerdo, 4) + ' L/cerdo';
      if (d.ljumbo !== undefined) x += ' · ' + d.jumbos + ' jumbos · ' + fn(d.ljumbo, 3) + ' L/jumbo';
    }
    return x;
  }

  /* ---------- guardar / anular ---------- */
  function guardar() {
    var o = leer();
    if (!o) { alert('Faltan datos: rellena los campos de arriba.'); return; }
    if (o.cambio && o.antes === undefined) { alert('Escribe lo que marcaba la varilla antes del cambio.'); return; }
    if (!col) return;
    var dd = dActual(o), inc = dd ? incidencias(o.ctl, dd) : [];
    if (inc.length) { o.inc = inc.map(function (x) { return x.cod; }); o.avisado = !!($('f_avis') && $('f_avis').checked); }
    col.add(o).catch(function (e) { st.err = e.message; updateAll(); });
    flash('Lectura guardada ✔');
    drawForm();
  }
  function flash(t) { var e = $('flash'); e.textContent = t; e.style.opacity = 1; setTimeout(function () { e.style.opacity = 0; }, 2200); }
  function anular(id) {
    if (!confirm('¿Anular esta lectura? Dejará de contar en los cálculos.')) return;
    col.doc(id).update({ anulada: true, anuladaPor: nombre() }).catch(function (e) { st.err = e.message; updateAll(); });
  }

  /* ---------- historial ---------- */
  function hist() {
    var c = st.ctl, ls = ordenadas(c), res = C.calcular(c, ls).reverse().slice(0, 12), h = '';
    if (!res.length) h = '<div class="prev">Todavía no hay lecturas.</div>';
    res.forEach(function (d) {
      var r = d.r, v;
      if (c === 'arco') v = 'Contador ' + fn(r.c, 3) + ' · Varilla ' + fn(r.v, 1);
      else if (c === 'pel') v = 'Varilla ' + fn(r.v, 1) + ' cm' + (r.q ? ' · ' + fn(r.q, 0) + ' cerdos' : '') + (r.b ? ' · bomba ' + esc(r.b) : '');
      else v = 'Varilla ' + fn(r.v, 1) + ' cm' + (r.j != null ? ' · contador ' + fn(r.j, 0) : '');
      if (r.cambio) v += ' · <b>CAMBIO</b>' + (r.antes != null ? ' (antes ' + fn(r.antes, 1) + ')' : '');
      h += '<div class="hr"><div class="hh"><b>' + fmtC(r.ts) + '</b><span>' + esc(r.autor || '') + '</span></div><div class="hv">' + v + '</div>';
      var cs = consumo(c, d, false); if (cs) h += '<div class="hc">' + cs + '</div>';
      if (r.inc && r.inc.length) h += '<div class="ho">⚠ ' + esc(r.inc.join(' · ')) + ' · ' + (r.avisado ? 'avisado ✔' : '<b>SIN AVISAR</b>') + '</div>';
      if (r.obs) h += '<div class="ho">' + esc(r.obs) + '</div>';
      h += '<button class="an" data-id="' + r.id + '">Anular</button></div>';
    });
    $('hist').innerHTML = h;
    var bs = $('hist').querySelectorAll('.an');
    for (var i = 0; i < bs.length; i++) bs[i].onclick = function () { anular(this.getAttribute('data-id')); };
  }

  /* ---------- exportación ---------- */
  function meses() {
    var m = {}; st.lect.forEach(function (l) { if (!l.anulada) m[ym(l.ts)] = 1; });
    return Object.keys(m).sort().reverse();
  }
  function aviso() {
    var cur = ym(Date.now()), ex = exportados(), p = meses().filter(function (k) { return k < cur && ex.indexOf(k) < 0; }).sort(), e = $('ban');
    if (!p.length) { e.innerHTML = ''; return; }
    e.innerHTML = '<div class="ban">📅 ' + ymLabel(p[0]) + ' sin exportar<button id="b_exp">Exportar ahora</button><button class="b2" id="b_ya">Ya lo exporté</button></div>';
    $('b_exp').onclick = function () { abrirExport(p[0]); };
    $('b_ya').onclick = function () { marcar(p[0]); aviso(); };
  }
  function abrirExport(sel) {
    var ms = meses(); if (!ms.length) { alert('Todavía no hay lecturas que exportar.'); return; }
    sel = sel || ms[0]; st.file = null;
    var h = '<div class="card"><h2>Exportar a Excel</h2><label>Mes</label><select class="mes" id="e_m">' + ms.map(function (k) { return '<option value="' + k + '"' + (k === sel ? ' selected' : '') + '>' + ymLabel(k) + '</option>'; }).join('') + '</select>' +
      '<div class="file"><b id="e_n"></b>Hojas: Arco (Zotal) · Peladora CS1 · Jumbos CS3</div><div id="e_r"></div>' +
      '<button class="s" id="e_x">Cerrar</button></div>';
    $('ex').innerHTML = h; $('ex').style.display = 'block';
    function nom() { $('e_n').textContent = 'Consumos_' + $('e_m').value + '.xlsx'; $('e_r').innerHTML = ''; }
    nom(); generar($('e_m').value); $('e_m').onchange = function () { nom(); generar($('e_m').value); };
    $('e_x').onclick = function () { $('ex').style.display = 'none'; };
    $('ex').scrollIntoView();
  }
  function filasMes(k) {
    var ar = [], pe = [], ju = [];
    C.calcular('arco', ordenadas('arco')).forEach(function (d) {
      var r = d.r; if (ym(r.ts) !== k) return;
      var ob = (r.cambio ? 'Cambio de barril' + (r.antes != null ? ' (antes: ' + r.antes + ')' : '') + (r.obs ? '. ' : '') : '') + (r.obs || '');
      ar.push([fmtF(r.ts), r.c, d.agua !== undefined ? d.agua : null, r.cambio ? 'SÍ' : '', r.v, d.prod !== undefined ? d.prod : null,
        d.conc != null ? { v: d.conc, s: d.enRango ? 'ok' : 'bad' } : null, d.conc != null ? (d.enRango ? 'En rango' : 'FUERA DE RANGO') : '', ob, r.autor || '', (r.inc || []).join(' · '), r.inc && r.inc.length ? (r.avisado ? 'Sí' : 'NO') : '']);
    });
    C.calcular('pel', ordenadas('pel')).forEach(function (d) {
      var r = d.r; if (ym(r.ts) !== k) return;
      var ob = (r.cambio ? 'Cambio de GRG' + (r.antes != null ? ' (antes: ' + r.antes + ' cm)' : '') + (r.obs ? '. ' : '') : '') + (r.obs || '');
      pe.push([fmtF(r.ts), r.v, r.cambio ? 'SÍ' : '', d.cm !== undefined ? d.cm : null, d.litros !== undefined ? d.litros : null, r.b || '', r.q != null ? r.q : null, d.lcerdo !== undefined ? d.lcerdo : null, ob, r.autor || '']);
    });
    C.calcular('jum', ordenadas('jum')).forEach(function (d) {
      var r = d.r; if (ym(r.ts) !== k) return;
      var ob = (r.cambio ? 'Cambio de GRG' + (r.antes != null ? ' (antes: ' + r.antes + ' cm)' : '') + (r.obs ? '. ' : '') : '') + (r.obs || '');
      ju.push([fmtF(r.ts), r.v, r.cambio ? 'SÍ' : '', d.cm !== undefined ? d.cm : null, d.litros !== undefined ? d.litros : null, r.j != null ? r.j : null, d.jumbos !== undefined ? d.jumbos : null, d.ljumbo !== undefined ? d.ljumbo : null, d.ejumbo !== undefined ? d.ejumbo : null, ob, r.autor || '', (r.inc || []).join(' · '), r.inc && r.inc.length ? (r.avisado ? 'Sí' : 'NO') : '']);
    });
    return [
      { nombre: 'Arco', cols: [{ h: 'FECHA Y HORA', w: 18 }, { h: 'CONTADOR AGUA (m³)', w: 14, f: 'n3' }, { h: 'CONSUMO AGUA (L)', w: 14, f: 'n0' }, { h: 'CAMBIO BARRIL', w: 10 }, { h: 'VARILLA (L)', w: 11, f: 'n1' }, { h: 'CONSUMO ZOTAL (L)', w: 13, f: 'n1' }, { h: 'CONCENTRACIÓN (%) rango 1–2', w: 16, f: 'n2' }, { h: 'ESTADO', w: 16 }, { h: 'OBSERVACIONES', w: 40 }, { h: 'REGISTRADO POR', w: 14 }, { h: 'INCIDENCIA', w: 24 }, { h: 'AVISADO A MANTENIMIENTO', w: 14 }], filas: ar },
      { nombre: 'Peladora CS1', cols: [{ h: 'FECHA Y HORA', w: 18 }, { h: 'VARILLA (cm)', w: 11, f: 'n1' }, { h: 'CAMBIO GRG', w: 10 }, { h: 'CONSUMO (cm)', w: 12, f: 'n1' }, { h: 'CONSUMO (L)', w: 12, f: 'n1' }, { h: 'DOSIFICACIÓN BOMBA', w: 14 }, { h: 'Nº CERDOS', w: 11, f: 'n0' }, { h: 'L/CERDO', w: 10, f: 'n3' }, { h: 'OBSERVACIONES', w: 40 }, { h: 'REGISTRADO POR', w: 14 }], filas: pe },
      { nombre: 'Jumbos CS3', cols: [{ h: 'FECHA Y HORA', w: 18 }, { h: 'VARILLA (cm)', w: 11, f: 'n1' }, { h: 'CAMBIO GRG', w: 10 }, { h: 'CONSUMO (cm)', w: 12, f: 'n1' }, { h: 'CONSUMO (L)', w: 12, f: 'n1' }, { h: 'CONTADOR JUMBOS', w: 14, f: 'n0' }, { h: 'JUMBOS LAVADOS', w: 12, f: 'n0' }, { h: 'L/JUMBO', w: 10, f: 'n3' }, { h: '€/JUMBO', w: 10, f: 'n3' }, { h: 'OBSERVACIONES', w: 40 }, { h: 'REGISTRADO POR', w: 14 }, { h: 'INCIDENCIA', w: 24 }, { h: 'AVISADO A MANTENIMIENTO', w: 14 }], filas: ju }
    ];
  }
  function generar(k) {
    if (!window.JSZip) { alert('No se pudo cargar el generador de Excel. Abre la app con internet una vez.'); return; }
    $('e_r').innerHTML = '<div class="prev">Preparando Excel…</div>';
    var tk = (generar.tk = (generar.tk || 0) + 1);
    C.crearXlsx(window.JSZip, filasMes(k)).then(function (bytes) {
      if (tk !== generar.tk) return;
      var name = 'Consumos_' + k + '.xlsx', type = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      var blob = new Blob([bytes], { type: type }), file = null;
      try { file = new File([blob], name, { type: type }); } catch (e) {}
      st.file = { blob: blob, file: file, name: name, k: k };
      var puede = file && navigator.canShare && navigator.canShare({ files: [file] });
      $('e_r').innerHTML = (puede ? '<button class="p" id="e_s">✉️ Enviar por correo</button>' : '<button class="p" id="e_d">Descargar Excel</button>');
      if (puede) $('e_s').onclick = function () {
        navigator.share({ files: [st.file.file], title: 'Consumos ' + ymLabel(st.file.k), text: 'Consumos ' + ymLabel(st.file.k) }).then(function () { marcar(st.file.k); aviso(); }).catch(function () {});
      };
      if (!puede) $('e_d').onclick = function () {
        var u = URL.createObjectURL(st.file.blob), a = document.createElement('a');
        a.href = u; a.download = st.file.name; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 4000);
        marcar(st.file.k); aviso();
      };
    }).catch(function (e) { $('e_r').innerHTML = '<div class="big bad"><span style="font-size:18px">Error</span>' + esc(e.message) + '</div>'; });
  }

  /* ---------- refresco general ---------- */
  function tabs() {
    $('tabs').innerHTML = ['arco', 'pel', 'jum'].map(function (k) {
      return '<div class="tab' + (k === st.ctl ? ' on' : '') + '" data-k="' + k + '">' + CT[k].nombre + '<small>' + CT[k].prod + '</small></div>';
    }).join('');
    var t = $('tabs').querySelectorAll('.tab');
    for (var i = 0; i < t.length; i++) t[i].onclick = function () { st.ctl = this.getAttribute('data-k'); tabs(); drawForm(); };
  }
  function updateAll() {
    var c = st.ctl, ls = ordenadas(c), l = ls[ls.length - 1];
    var ids = c === 'arco' ? ['f_c', 'f_v'] : c === 'pel' ? ['f_v', 'f_q'] : ['f_v', 'f_j'];
    ids.forEach(function (id) {
      var e = $('p_' + id); if (!e) return;
      if (!l) { e.textContent = 'Sin lecturas anteriores'; return; }
      var key = id.slice(2), val = l[key];
      e.textContent = 'Anterior: ' + (val == null ? '—' : fn(val, key === 'c' ? 3 : key === 'v' ? 1 : 0)) + (key === ids[0].slice(2) ? ' · ' + fmtC(l.ts) + ' · ' + (l.autor || '') : '');
    });
    live(); hist(); aviso();
    var s = $('estado');
    var sin = !navigator.onLine || st.cache;
    s.className = 'estado ' + (st.err ? 'e' : sin ? 'w' : 'o');
    s.textContent = st.err ? '⚠ ' + st.err : (sin ? '⏳ Sin conexión: se subirá solo' : st.pend ? '↑ Subiendo…' : '✔ Sincronizado');
    $('quien').textContent = '👤 ' + (nombre() || '');
  }

  /* ---------- arranque ---------- */
  function init() {
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(function () {});
    $('ajustes').onclick = function () { pantallaAjustes('Ajustes'); };
    $('b_exp_fijo').onclick = function () { abrirExport(meses()[0]); };
    var cfg = window.FB_CONFIG;
    if (!window.firebase || !cfg || !cfg.apiKey || String(cfg.apiKey).indexOf('PEGAR') === 0) {
      $('main').style.display = 'none'; $('setup').style.display = 'block';
      $('setup').innerHTML = '<div class="card"><h2>Falta configurar</h2><div class="prev">' + (!window.firebase ? 'No se pudo cargar Firebase. Abre la app con internet.' : 'Falta pegar los datos de Firebase en firebase-config.js.') + '</div></div>';
      return;
    }
    if (!nombre() || !codigo()) { pantallaAjustes('Bienvenido'); return; }
    firebase.initializeApp(cfg);
    var db = firebase.firestore();
    try { db.enablePersistence({ synchronizeTabs: true }).catch(function () {}); } catch (e) {}
    col = db.collection('equipos').doc(codigo()).collection('lecturas');
    col.orderBy('ts').onSnapshot({ includeMetadataChanges: true }, function (s) {
      st.lect = s.docs.map(function (d) { var o = d.data(); o.id = d.id; return o; });
      st.cache = s.metadata.fromCache; st.pend = s.metadata.hasPendingWrites; st.err = '';
      updateAll();
    }, function (e) { st.err = e.code === 'permission-denied' ? 'Sin permiso: revisa las reglas de Firebase' : e.message; updateAll(); });
    $('guardar').onclick = guardar;
    window.addEventListener('online', updateAll); window.addEventListener('offline', updateAll);
    tabs(); drawForm();
  }
  window.addEventListener('load', init);
})();
