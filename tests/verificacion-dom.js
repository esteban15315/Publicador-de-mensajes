/* =============================================================================
 * tests/verificacion-dom.js
 * -----------------------------------------------------------------------------
 * Mecanismo de prueba END-TO-END SEPARADO de la aplicación.
 *
 * Carga `js/app.js` en un mini-DOM en memoria (sin navegador ni dependencias)
 * y ejecuta el flujo REAL disparando los eventos del DOM:
 *   - Flujo de validación (campos vacíos: no se llama a fetch).
 *   - Flujo exitoso (se muestra la publicación, contadores, toast, botón).
 *   - Historial (varias publicaciones y vaciado).
 *   - Indicador de carga visible DURANTE la petición y bloqueo de duplicados.
 *   - Restauración de la interfaz tras un error.
 *
 * NO modifica el comportamiento de producción: la app no importa este archivo.
 *
 * Uso:
 *   node tests/verificacion-dom.js
 * (Requiere Node.js 18 o superior por el uso de fetch global).
 * ===========================================================================*/
"use strict";

const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "js", "app.js");

/* ------------------------- Mini-DOM en memoria ---------------------------- */
const registry = {};

class El {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this._text = "";
    this._classes = new Set();
    this._listeners = {};
    this._id = "";
    this.value = "";
    this.maxLength = 0;
    this.hidden = false;
    this.disabled = false;
    this.type = "";
  }
  get id() { return this._id; }
  set id(v) { this._id = v; if (v) registry[v] = this; }
  get className() { return [...this._classes].join(" "); }
  set className(v) { this._classes = new Set(String(v).split(/\s+/).filter(Boolean)); }
  get classList() {
    const s = this;
    return {
      add(...c) { c.forEach((x) => s._classes.add(x)); },
      remove(...c) { c.forEach((x) => s._classes.delete(x)); },
      toggle(c, force) {
        if (force === undefined) { s._classes.has(c) ? s._classes.delete(c) : s._classes.add(c); }
        else if (force) { s._classes.add(c); } else { s._classes.delete(c); }
      },
      contains(c) { return s._classes.has(c); }
    };
  }
  set textContent(v) { this._text = String(v); this.children = []; }
  get textContent() {
    if (this.children.length) return this.children.map((c) => c.textContent || "").join("");
    return this._text;
  }
  get firstChild() { return this.children[0] || null; }
  get lastChild() { return this.children[this.children.length - 1] || null; }
  appendChild(c) { c.parentNode = this; this.children.push(c); return c; }
  prepend(c) { c.parentNode = this; this.children.unshift(c); return c; }
  insertBefore(c, ref) { const i = this.children.indexOf(ref); if (i < 0) this.children.push(c); else this.children.splice(i, 0, c); c.parentNode = this; return c; }
  removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; }
  replaceChildren(...nodes) { this.children.forEach((c) => (c.parentNode = null)); this.children = nodes; nodes.forEach((n) => (n.parentNode = this)); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v); }
  getAttribute(k) { return this.attrs[k]; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(t, fn) { (this._listeners[t] = this._listeners[t] || []).push(fn); }
  dispatch(t, ev) { return (this._listeners[t] || []).map((fn) => fn(ev || { preventDefault() {} })); }
  focus() {}
  reset() { this.querySelectorAll("input").concat(this.querySelectorAll("textarea")).forEach((i) => (i.value = "")); }
  scrollIntoView() {}
  getBoundingClientRect() { return { left: 0, top: 0, width: 120, height: 40 }; }
  querySelector(sel) { return this._findAll(sel)[0] || null; }
  querySelectorAll(sel) { return this._findAll(sel); }
  _findAll(sel) {
    const out = [];
    const match = (n) => {
      if (sel.startsWith(".")) return n._classes.has(sel.slice(1));
      if (sel.startsWith("#")) return n.id === sel.slice(1);
      return n.tagName === sel.toUpperCase();
    };
    const walk = (n) => n.children.forEach((c) => { if (match(c)) out.push(c); walk(c); });
    walk(this);
    return out;
  }
}

function make(tag, id, opts) {
  const el = new El(tag);
  Object.assign(el, opts || {});
  if (id) el.id = id;
  return el;
}

/* --------------- Elementos que la aplicación obtiene por id --------------- */
make("form", "formulario");
make("input", "title", { maxLength: 120, value: "" });
make("textarea", "body", { maxLength: 1000, value: "" });
make("span", "title-count"); make("span", "body-count");
make("button", "submit-btn"); make("span", "submit-label", { _text: "Publicar mensaje" });
make("button", "reset-btn"); make("div", "loading", { hidden: true });
make("div", "progress-bar", { hidden: true });
make("div", "status-message", { hidden: true });
make("div", "resultado"); make("span", "resultado-count", { _text: "0" });
make("button", "clear-history", { hidden: true });
make("p", "title-error", { hidden: true }); make("p", "body-error", { hidden: true });
make("article", "preview-card"); make("h3", "preview-title"); make("p", "preview-body");
make("span", "stat-count", { _text: "0" }); make("div", "toast-container");
make("p", "resultado-empty", { _text: "vacío" });

global.window = global;
global.document = {
  readyState: "complete",
  getElementById: (id) => registry[id] || null,
  createElement: (t) => new El(t),
  createElementNS: (ns, t) => new El(t),
  createTextNode: (txt) => { const n = new El("#text"); n.textContent = txt; return n; },
  body: new El("body"),
  addEventListener() {},
  execCommand() { return true; }
};

/* --------------------- Espía de fetch y consola --------------------------- */
const realFetch = global.fetch;
let fetchCalls = 0;
global.fetch = async (...args) => { fetchCalls++; return realFetch(...args); };

const realConsoleError = console.error;
console.error = () => {}; // silencia los errores esperados del flujo de prueba

/* --------------------------- Carga de la app ------------------------------ */
// eslint-disable-next-line no-eval
eval(fs.readFileSync(appPath, "utf8"));
const App = global.window.PublicadorApp;

/* ------------------------------ Mini runner ------------------------------- */
let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log("  PASS  " + name); }
  else { fail++; console.log("  FAIL  " + name + (extra ? " -> " + extra : "")); }
}

(async function run() {
  const form = registry["formulario"];

  console.log("\n== Flujo de VALIDACIÓN (campos vacíos) ==");
  registry["title"].value = "   ";
  registry["body"].value = "";
  fetchCalls = 0;
  await Promise.all(form.dispatch("submit"));
  check("no se llamó a fetch", fetchCalls === 0, "fetchCalls=" + fetchCalls);
  check("error de título visible", registry["title-error"].hidden === false);
  check("error de contenido visible", registry["body-error"].hidden === false);
  check("estado = warning", /warning/.test(registry["status-message"].className), registry["status-message"].className);
  check("historial sin publicaciones", registry["resultado"].querySelectorAll(".publicacion").length === 0);

  console.log("\n== Flujo EXITOSO (datos válidos) ==");
  registry["title"].value = "Título e2e";
  registry["body"].value = "Contenido e2e";
  fetchCalls = 0;
  await Promise.all(form.dispatch("submit"));
  check("se llamó a fetch una vez", fetchCalls === 1, "fetchCalls=" + fetchCalls);
  check("historial con 1 publicación", registry["resultado"].querySelectorAll(".publicacion").length === 1);
  check("contador resultado = 1", registry["resultado-count"].textContent === "1", registry["resultado-count"].textContent);
  check("estadística = 1", registry["stat-count"].textContent === "1", registry["stat-count"].textContent);
  check("estado = success", /success/.test(registry["status-message"].className), registry["status-message"].className);
  check("aparece un toast", registry["toast-container"].children.length >= 1, registry["toast-container"].children.length);
  check("botón restaurado y habilitado", registry["submit-btn"].disabled === false && registry["submit-label"].textContent === "Publicar mensaje");
  check("barra de progreso oculta", registry["progress-bar"].hidden === true);
  const tarjeta = registry["resultado"].querySelectorAll(".publicacion")[0];
  check("la tarjeta muestra el título como texto", /Título e2e/.test(tarjeta.textContent));

  console.log("\n== Historial con varias publicaciones ==");
  registry["title"].value = "Segunda";
  registry["body"].value = "Otra";
  await Promise.all(form.dispatch("submit"));
  check("historial con 2 publicaciones", registry["resultado"].querySelectorAll(".publicacion").length === 2);
  check("contador resultado = 2", registry["resultado-count"].textContent === "2", registry["resultado-count"].textContent);

  console.log("\n== Vaciar historial ==");
  await Promise.all(registry["clear-history"].dispatch("click"));
  check("historial vacío", registry["resultado"].querySelectorAll(".publicacion").length === 0);
  check("contador resultado = 0", registry["resultado-count"].textContent === "0");
  check("botón vaciar oculto", registry["clear-history"].hidden === true);

  console.log("\n== Indicador de carga y bloqueo de duplicados ==");
  let resolverFetch = null;
  let llamadasDiferidas = 0;
  global.fetch = () => {
    llamadasDiferidas++;
    return new Promise((resolve) => {
      resolverFetch = (payload) => resolve({ ok: true, status: 201, json: async () => payload });
    });
  };
  registry["title"].value = "Carga";
  registry["body"].value = "Prueba de carga";
  const pendiente = Promise.all(form.dispatch("submit"));
  await new Promise((r) => setImmediate(r));
  check("indicador visible durante la petición", registry["loading"].hidden === false);
  check("barra de progreso visible", registry["progress-bar"].hidden === false);
  check("botón deshabilitado", registry["submit-btn"].disabled === true);
  check("texto del botón = Publicando...", registry["submit-label"].textContent === "Publicando...");
  await Promise.all(form.dispatch("submit")); // intento duplicado
  check("no se dispara petición duplicada", llamadasDiferidas === 1, "calls=" + llamadasDiferidas);
  resolverFetch({ id: 777, title: "Carga", body: "Prueba", userId: 1 });
  await pendiente;
  check("interfaz restaurada tras éxito", registry["loading"].hidden === true && registry["submit-btn"].disabled === false && registry["submit-label"].textContent === "Publicar mensaje");

  console.log("\n== Restauración de la interfaz tras ERROR ==");
  global.fetch = async () => { throw new TypeError("Failed to fetch"); };
  registry["title"].value = "Error";
  registry["body"].value = "Prueba de error";
  await Promise.all(form.dispatch("submit"));
  check("indicador oculto tras error", registry["loading"].hidden === true);
  check("botón habilitado tras error", registry["submit-btn"].disabled === false);
  check("texto del botón restaurado tras error", registry["submit-label"].textContent === "Publicar mensaje");
  check("estado = error", /error/.test(registry["status-message"].className), registry["status-message"].className);

  global.fetch = realFetch;

  console.log("\n== Presentación segura de contenido (anti-inyección) ==");
  const malicioso = App.crearTarjetaPublicacion({
    id: 1,
    title: "<img src=x onerror=alert(1)>",
    body: "<b>hola</b>",
    userId: 1
  });
  check("el HTML se conserva como texto literal", /<img src=x onerror=alert\(1\)>/.test(malicioso.textContent));
  check("no se creó ningún nodo <img>", malicioso.querySelectorAll("img").length === 0);
  check("no se creó ningún nodo <b>", malicioso.querySelectorAll("b").length === 0);

  console.error = realConsoleError;

  console.log("\n=========================================");
  console.log(`RESULTADO E2E: ${pass} aprobadas, ${fail} fallidas`);
  console.log("=========================================");
  process.exitCode = fail === 0 ? 0 : 1;
})();
