// Ejecuta el Code.gs REAL dentro de un contexto vm con un Google Sheet simulado en memoria.
// Lo usan los tests del backend y el backend simulado de los E2E.
import vm from 'node:vm';
import { construirCodeGs } from '../scripts/build-backend.mjs';

class FakeRange {
  constructor(sh, r, c, nr, nc) { Object.assign(this, { sh, r, c, nr, nc }); }
  getValues() {
    const out = [];
    for (let i = 0; i < this.nr; i++) {
      const row = [];
      for (let j = 0; j < this.nc; j++) row.push(this.sh.data[this.r - 1 + i]?.[this.c - 1 + j] ?? '');
      out.push(row);
    }
    return out;
  }
  getValue() { return this.getValues()[0][0]; }
  setValues(v) {
    for (let i = 0; i < v.length; i++) {
      const rr = this.r - 1 + i;
      while (this.sh.data.length <= rr) this.sh.data.push([]);
      for (let j = 0; j < v[i].length; j++) this.sh.data[rr][this.c - 1 + j] = v[i][j];
    }
    return this;
  }
  setValue(v) { return this.setValues([[v]]); }
}
class FakeSheet {
  constructor(name) { this.name = name; this.data = []; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getRange(r, c, nr = 1, nc = 1) { return new FakeRange(this, r, c, nr, nc); }
  appendRow(row) { this.data.push([...row]); }
  clear() { this.data = []; }
  setFrozenRows() {}
}
class FakeSS {
  constructor() { this.sheets = new Map(); }
  getSheetByName(n) { return this.sheets.get(n) ?? null; }
  insertSheet(n) { const s = new FakeSheet(n); this.sheets.set(n, s); return s; }
}

export async function crearBackend({ writeKey = 'W', readKey = 'R' } = {}) {
  const ss = new FakeSS();
  const props = { WRITE_KEY: writeKey, READ_KEY: readKey };
  let lockDepth = 0;
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss, flush() {} },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] ?? null }) },
    LockService: { getScriptLock: () => ({ waitLock() { lockDepth++; if (lockDepth > 1) throw new Error('lock reentrante'); }, releaseLock() { lockDepth--; } }) },
    Utilities: { getUuid: () => crypto.randomUUID() },
    ContentService: {
      MimeType: { JSON: 'json', CSV: 'csv' },
      createTextOutput: (t) => ({ t, setMimeType() { return this; }, getContent() { return t; } }),
    },
  };
  vm.createContext(ctx);
  vm.runInContext(await construirCodeGs(), ctx);
  const leer = (o) => JSON.parse(o.getContent());
  return {
    ss,
    sheet: (n) => ss.getSheetByName(n),
    post: (body) => leer(ctx.doPost({ postData: { contents: JSON.stringify(body) } })),
    get: (parameter) => {
      const o = ctx.doGet({ parameter });
      const t = o.getContent();
      try { return JSON.parse(t); } catch { return t; }
    },
  };
}
