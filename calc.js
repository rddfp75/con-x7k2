/* Cálculos y generador de Excel (.xlsx). Sin dependencias salvo JSZip para el Excel. */
(function (root) {
  var CT = {
    arco: { nombre: 'Arco', prod: 'Zotal', lcm: 1, rmin: 1, rmax: 2 },
    pel: { nombre: 'Peladora CS1', prod: 'Antiespumante', lcm: 11.07 },
    jum: { nombre: 'Jumbos CS3', prod: 'Deogen', lcm: 10.62, eur: 0.67 }
  };

  /* límites de aviso (los puede cambiar la app desde Ajustes) */
  var LIM = { aguaMin: 400, aguaMax: 1800, jMin: null, jMax: null };
  /* días laborables (lunes a viernes) entre dos lecturas; mínimo 1 */
  function laborables(t0, t1) {
    var d = new Date(t0); d.setHours(0, 0, 0, 0);
    var f = new Date(t1); f.setHours(0, 0, 0, 0), n = 0;
    while (d < f) { d.setDate(d.getDate() + 1); var w = d.getDay(); if (w !== 0 && w !== 6) n++; }
    return n < 1 ? 1 : n;
  }

  /* lista: lecturas de UN control, sin anuladas. Se ordena por ts. Devuelve [{r, ...derivados}] */
  function calcular(ctl, lista) {
    var ls = lista.slice().sort(function (a, b) { return a.ts - b.ts; });
    var out = [], prev = null, prevJ = null;
    ls.forEach(function (r) {
      var d = { r: r };
      if (prev) {
        var base = r.cambio ? r.antes : r.v;
        if (base !== null && base !== undefined && !isNaN(base)) {
          if (ctl === 'arco') {
            var agua = (r.c - prev.c) * 1000, pr = (prev.v - base) * CT.arco.lcm, t = agua + pr;
            d.agua = agua; d.prod = pr;
            d.conc = t > 0 ? pr / t * 100 : null;
            d.enRango = d.conc !== null && d.conc >= CT.arco.rmin && d.conc <= CT.arco.rmax;
            d.dias = laborables(prev.ts, r.ts); d.aguaDia = agua / d.dias;
            if (agua >= 0) { if (LIM.aguaMin != null && d.aguaDia < LIM.aguaMin) d.aguaEst = 'BAJO'; else if (LIM.aguaMax != null && d.aguaDia > LIM.aguaMax) d.aguaEst = 'ALTO'; }
            if (d.conc !== null) { if (d.conc < CT.arco.rmin) d.concEst = 'BAJA'; else if (d.conc > CT.arco.rmax) d.concEst = 'ALTA'; }
          } else {
            d.cm = prev.v - base;
            d.litros = d.cm * CT[ctl].lcm;
            if (ctl === 'jum') {
              d.dias = laborables(prev.ts, r.ts); d.litrosDia = d.litros / d.dias;
              if (d.litros >= 0) { if (LIM.jMin != null && d.litrosDia < LIM.jMin) d.jEst = 'BAJO'; else if (LIM.jMax != null && d.litrosDia > LIM.jMax) d.jEst = 'ALTO'; }
            }
            if (ctl === 'pel' && r.q) d.lcerdo = d.litros / r.q;
            if (ctl === 'jum' && r.j !== null && r.j !== undefined && prevJ !== null) {
              d.jumbos = r.j - prevJ;
              if (d.jumbos > 0) { d.ljumbo = d.litros / d.jumbos; d.ejumbo = d.ljumbo * CT.jum.eur; }
            }
          }
        }
      }
      if (ctl === 'jum' && r.j !== null && r.j !== undefined) prevJ = r.j;
      out.push(d); prev = r;
    });
    return out;
  }

  /* ---------- Excel ---------- */
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function colL(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  var STY = { txt: 0, hdr: 1, n0: 2, n1: 3, n2: 4, n3: 5, bad: 6, ok: 7 };

  function hojaXml(h) {
    var x = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>';
    h.cols.forEach(function (c, i) { x += '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + c.w + '" customWidth="1"/>'; });
    x += '</cols><sheetData><row r="1" ht="32" customHeight="1">';
    h.cols.forEach(function (c, i) { x += '<c r="' + colL(i) + '1" s="1" t="inlineStr"><is><t>' + esc(c.h) + '</t></is></c>'; });
    x += '</row>';
    h.filas.forEach(function (f, ri) {
      var r = ri + 2;
      x += '<row r="' + r + '">';
      f.forEach(function (cel, ci) {
        if (cel === null || cel === undefined || cel === '') return;
        var ref = colL(ci) + r, fmt = h.cols[ci].f || 'txt', v = cel, st = STY[fmt];
        if (typeof cel === 'object') { v = cel.v; st = STY[cel.s] !== undefined ? STY[cel.s] : st; }
        if (typeof v === 'number') { if (!isFinite(v)) return; x += '<c r="' + ref + '" s="' + st + '"><v>' + (Math.round(v * 1e6) / 1e6) + '</v></c>'; }
        else x += '<c r="' + ref + '" s="' + st + '" t="inlineStr"><is><t>' + esc(v) + '</t></is></c>';
      });
      x += '</row>';
    });
    x += '</sheetData></worksheet>';
    return x;
  }

  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="2"><numFmt numFmtId="164" formatCode="0.0"/><numFmt numFmtId="165" formatCode="0.000"/></numFmts>' +
    '<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFA3261D"/><name val="Calibri"/></font></fonts>' +
    '<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFD9E7EF"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFFDE3E1"/><bgColor indexed="64"/></patternFill></fill>' +
    '<fill><patternFill patternType="solid"><fgColor rgb="FFDFF3E4"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
    '<cellXfs count="8">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="2" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>' +
    '<xf numFmtId="2" fontId="2" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
    '<xf numFmtId="2" fontId="1" fillId="4" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

  /* hojas: [{nombre, cols:[{h,w,f}], filas:[[...]]}] -> Promise<Uint8Array> */
  function crearXlsx(JSZip, hojas) {
    var z = new JSZip(), n = hojas.length, i;
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>';
    for (i = 1; i <= n; i++) ct += '<Override PartName="/xl/worksheets/sheet' + i + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>';
    z.file('[Content_Types].xml', ct + '</Types>');
    z.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>');
    var wb = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>';
    var rel = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">';
    hojas.forEach(function (h, k) {
      wb += '<sheet name="' + esc(h.nombre) + '" sheetId="' + (k + 1) + '" r:id="rId' + (k + 1) + '"/>';
      rel += '<Relationship Id="rId' + (k + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (k + 1) + '.xml"/>';
      z.file('xl/worksheets/sheet' + (k + 1) + '.xml', hojaXml(h));
    });
    rel += '<Relationship Id="rId' + (n + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
    z.file('xl/workbook.xml', wb + '</sheets></workbook>');
    z.file('xl/_rels/workbook.xml.rels', rel);
    z.file('xl/styles.xml', STYLES);
    return z.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  var api = { CT: CT, LIM: LIM, laborables: laborables, calcular: calcular, crearXlsx: crearXlsx };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Calc = api;
})(typeof window !== 'undefined' ? window : this);
