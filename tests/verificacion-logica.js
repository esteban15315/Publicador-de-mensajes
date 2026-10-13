/* =============================================================================
 * tests/verificacion-logica.js
 * -----------------------------------------------------------------------------
 * Mecanismo de prueba AUTOMATIZADA y SEPARADA de la aplicación.
 *
 * Carga `js/app.js` en un entorno Node con un DOM mínimo simulado y ejecuta
 * comprobaciones reales sobre:
 *   - Funciones de validación (campos vacíos / solo espacios / válidos).
 *   - Construcción del objeto de publicación y serialización JSON.
 *   - Configuración de la petición (método, encabezado, endpoint).
 *   - Traducción de estados HTTP a mensajes.
 *   - Clasificación de errores de conexión, HTTP y de procesamiento (mocks).
 *   - Una petición POST REAL contra JSONPlaceholder.
 *
 * NO modifica el comportamiento de producción: la app no importa este archivo.
 *
 * Uso:
 *   node tests/verificacion-logica.js
 * (Requiere Node.js 18 o superior por el uso de fetch global).
 * ===========================================================================*/
"use strict";

const fs = require("fs");
const path = require("path");

const appPath = path.join(__dirname, "..", "js", "app.js");

/* --------------------------- DOM mínimo simulado -------------------------- */
function crearElementoFalso() {
  return {
    value: "",
    textContent: "",
    className: "",
    id: "",
    maxLength: 0,
    hidden: true,
    disabled: false,
    firstChild: null,
    lastChild: null,
    parentNode: null,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    setAttribute() {},
    removeAttribute() {},
    addEventListener() {},
    appendChild() {},
    prepend() {},
    replaceChildren() {},
    removeChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    scrollIntoView() {},
    getBoundingClientRect() { return { left: 0, top: 0, width: 100, height: 40 }; },
    focus() {},
    reset() {}
  };
}

global.window = global;
global.document = {
  readyState: "complete",
  getElementById: () => crearElementoFalso(),
  createElement: () => crearElementoFalso(),
  createElementNS: () => crearElementoFalso(),
  createTextNode: () => ({}),
  body: crearElementoFalso(),
  execCommand() { return true; },
  addEventListener() {}
};

/* --------------------------- Carga de la aplicación ----------------------- */
// eslint-disable-next-line no-eval
eval(fs.readFileSync(appPath, "utf8"));
const App = global.window.PublicadorApp;

/* ------------------------------ Mini runner ------------------------------- */
let aprobadas = 0;
let fallidas = 0;

function comprobar(nombre, condicion, extra) {
  if (condicion) {
    aprobadas++;
    console.log("  PASS  " + nombre);
  } else {
    fallidas++;
    console.log("  FAIL  " + nombre + (extra ? " -> " + extra : ""));
  }
}

(async function ejecutar() {
  console.log("\n== Validaciones ==");
  comprobar("campo vacío -> inválido", App.validarCampo("", "título").valido === false);
  comprobar("solo espacios -> inválido", App.validarCampo("    ", "título").valido === false);
  comprobar("texto válido -> válido", App.validarCampo("  Hola  ", "título").valido === true);
  comprobar("se aplica .trim()", App.validarCampo("  Hola  ", "título").valor === "Hola");
  comprobar("mensaje específico de título", /título/.test(App.validarCampo("", "título").mensaje || ""));
  comprobar("mensaje específico de contenido", /contenido/.test(App.validarCampo("", "contenido").mensaje || ""));

  const fVacio = App.validarFormulario("", "");
  comprobar("formulario vacío -> inválido con 2 errores", fVacio.valido === false && !!fVacio.errores.title && !!fVacio.errores.body);
  const fOk = App.validarFormulario("Titulo", "Cuerpo");
  comprobar("formulario válido -> datos normalizados", fOk.valido === true && fOk.datos.title === "Titulo" && fOk.datos.body === "Cuerpo");
  const fTitulo = App.validarFormulario("   ", "Cuerpo");
  comprobar("título solo espacios -> inválido", fTitulo.valido === false && !!fTitulo.errores.title && !fTitulo.errores.body);
  const fBody = App.validarFormulario("Titulo", "   ");
  comprobar("contenido solo espacios -> inválido", fBody.valido === false && !fBody.errores.title && !!fBody.errores.body);

  console.log("\n== Construcción y serialización ==");
  const pub = App.construirPublicacion("T", "B", 1);
  comprobar("objeto con title/body/userId", pub.title === "T" && pub.body === "B" && pub.userId === 1);
  comprobar("JSON.stringify correcto", JSON.stringify(pub) === '{"title":"T","body":"B","userId":1}');
  comprobar("encabezado Content-Type = application/json", App.API_CONFIG.headers["Content-Type"] === "application/json");
  comprobar("método POST", App.API_CONFIG.method === "POST");
  comprobar("endpoint correcto", App.API_CONFIG.endpoint === "https://jsonplaceholder.typicode.com/posts");

  console.log("\n== Mensajes de error HTTP ==");
  comprobar("400 -> solicitud incorrecta", /400/.test(App.mensajeDeErrorHttp(400)));
  comprobar("404 -> no encontrado", /no encontrado/i.test(App.mensajeDeErrorHttp(404)));
  comprobar("500 -> error de servidor", /servidor/i.test(App.mensajeDeErrorHttp(500)));
  comprobar("estado raro -> inesperado", /inesperado|estado/i.test(App.mensajeDeErrorHttp(418)));

  console.log("\n== Render seguro (createElement/textContent) ==");
  const tarjeta = App.crearTarjetaPublicacion({ id: 101, title: "<img src=x onerror=alert(1)>", body: "<b>x</b>", userId: 7 });
  comprobar("tarjeta de publicación creada", tarjeta && typeof tarjeta === "object");

  console.log("\n== Errores simulados con mocks de fetch ==");
  const fetchReal = global.fetch;

  global.fetch = async () => { throw new TypeError("Failed to fetch"); };
  try {
    await App.enviarPublicacion({ title: "x", body: "y", userId: 1 });
    comprobar("fallo de red -> error de conexión", false);
  } catch (e) {
    comprobar("fallo de red -> error de conexión", e.tipo === "conexion", e.tipo);
  }

  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  try {
    await App.enviarPublicacion({ title: "x", body: "y", userId: 1 });
    comprobar("HTTP 500 -> error http", false);
  } catch (e) {
    comprobar("HTTP 500 -> error http", e.tipo === "http" && e.status === 500, e.tipo);
  }

  global.fetch = async () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("bad json"); } });
  try {
    await App.enviarPublicacion({ title: "x", body: "y", userId: 1 });
    comprobar("JSON inválido -> error de procesamiento", false);
  } catch (e) {
    comprobar("JSON inválido -> error de procesamiento", e.tipo === "procesamiento", e.tipo);
  }

  global.fetch = fetchReal;

  console.log("\n== Petición POST REAL a JSONPlaceholder ==");
  try {
    const publicacion = App.construirPublicacion("Prueba de verificación", "Cuerpo de prueba", 1);
    const respuesta = await App.enviarPublicacion(publicacion);
    comprobar("respuesta con id generado", respuesta && typeof respuesta.id !== "undefined", JSON.stringify(respuesta));
    comprobar("respuesta conserva title", respuesta.title === "Prueba de verificación");
    comprobar("respuesta conserva body", respuesta.body === "Cuerpo de prueba");
  } catch (e) {
    console.log("  INFO  no se pudo completar la petición real (¿sin red?): " + e.message);
  }

  console.log("\n=====================================================");
  console.log(`RESULTADO: ${aprobadas} aprobadas, ${fallidas} fallidas`);
  console.log("=====================================================");
  process.exitCode = fallidas === 0 ? 0 : 1;
})();
