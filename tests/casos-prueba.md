# Casos de prueba — Publicador de Mensajes

Este documento describe las pruebas funcionales del proyecto **Publicador de Mensajes**.

## Cómo se obtuvieron los resultados

Se utilizaron dos métodos complementarios:

- **Verificación automatizada (Node):** los archivos
  [`tests/verificacion-logica.js`](./verificacion-logica.js) (funciones puras, serialización y
  errores con *mocks*) y [`tests/verificacion-dom.js`](./verificacion-dom.js) (flujo completo
  **end-to-end** con un mini-DOM en memoria: validación, éxito, historial, carga, bloqueo de
  duplicados y restauración). Se ejecutan con:

  ```bash
  node tests/verificacion-logica.js
  node tests/verificacion-dom.js
  ```

- **Prueba manual en navegador:** pasos que un integrante del equipo realiza en el navegador con
  **DevTools** (pestañas *Network* y *Console*). Los casos que dependen de la interfaz visual
  (por ejemplo, el aspecto del *spinner* o el layout responsive) aparecen como **Pendiente**
  hasta que se ejecuten en un navegador real.

> Según lo indicado en el trabajo práctico, **no se marca ninguna prueba como aprobada sin
> haberla ejecutado**. Las pruebas aprobadas indican con qué método se ejecutaron.

**Resultado de la última ejecución automatizada:** 26 aprobadas (lógica) + 32 aprobadas (E2E), 0 fallidas.

---

## Caso 01 — Ambos campos vacíos

- **Código:** CP-01
- **Objetivo:** Verificar que no se envía la petición cuando título y contenido están vacíos.
- **Datos de entrada:** `title = ""`, `body = ""`.
- **Pasos:** Dejar ambos campos vacíos y pulsar **Publicar mensaje**.
- **Resultado esperado:** Se muestran dos mensajes de error (uno por campo), la petición `fetch()` **no** se ejecuta y no aparece indicador de carga.
- **Resultado obtenido:** `validarFormulario("", "")` devuelve `valido = false` con error en `title` y en `body`. La función `manejarSubmit` retorna antes de llamar a `enviarPublicacion`.
- **Estado:** **Aprobado** (verificación automatizada, Node).

---

## Caso 02 — Título vacío

- **Código:** CP-02
- **Objetivo:** Validar que un título vacío impide el envío.
- **Datos de entrada:** `title = ""`, `body = "Contenido válido"`.
- **Pasos:** Completar solo el contenido y pulsar **Publicar mensaje**.
- **Resultado esperado:** Error en el título, sin error en el contenido, sin petición HTTP. El foco se coloca en el campo título.
- **Resultado obtenido:** `validarFormulario("", "Contenido")` → `valido = false`, `errores.title` presente y `errores.body = null`.
- **Estado:** **Aprobado** (verificación automatizada, Node).

---

## Caso 03 — Contenido vacío

- **Código:** CP-03
- **Objetivo:** Validar que un contenido vacío impide el envío.
- **Datos de entrada:** `title = "Título válido"`, `body = ""`.
- **Pasos:** Completar solo el título y pulsar **Publicar mensaje**.
- **Resultado esperado:** Error en el contenido, sin error en el título, sin petición HTTP.
- **Resultado obtenido:** `validarFormulario("Titulo", "")` → `valido = false`, `errores.body` presente y `errores.title = null`.
- **Estado:** **Aprobado** (verificación automatizada, Node).

---

## Caso 04 — Campos con únicamente espacios

- **Código:** CP-04
- **Objetivo:** Comprobar que `.trim()` descarta valores formados solo por espacios.
- **Datos de entrada:** `title = "   "`, `body = "     "`.
- **Pasos:** Escribir solo espacios en ambos campos y pulsar **Publicar mensaje**.
- **Resultado esperado:** Ambos campos se consideran inválidos; no se envía la petición.
- **Resultado obtenido:** `validarCampo("    ", "título").valido === false`; `validarFormulario("   ", "    ")` → `valido = false` con error en ambos campos.
- **Estado:** **Aprobado** (verificación automatizada, Node).

---

## Caso 05 — Publicación con información válida

- **Código:** CP-05
- **Objetivo:** Confirmar que datos válidos producen una publicación correcta.
- **Datos de entrada:** `title = "Prueba de verificación"`, `body = "Cuerpo de prueba"`.
- **Pasos:** Completar ambos campos válidos y pulsar **Publicar mensaje**.
- **Resultado esperado:** La API responde con un objeto que conserva `title` y `body` y agrega un `id`.
- **Resultado obtenido:** Petición POST real a JSONPlaceholder → respuesta con `id` válido, `title === "Prueba de verificación"` y `body === "Cuerpo de prueba"`.
- **Estado:** **Aprobado** (verificación automatizada + petición real).

---

## Caso 06 — Verificación del método POST

- **Código:** CP-06
- **Objetivo:** Comprobar que la petición usa el método HTTP `POST`.
- **Datos de entrada:** Publicación válida.
- **Pasos:** Abrir DevTools → *Network*, enviar una publicación y revisar la columna *Method* de la petición a `posts`.
- **Resultado esperado:** El método de la petición es `POST`.
- **Resultado obtenido:** `API_CONFIG.method === "POST"` y la petición real a JSONPlaceholder se realizó por POST (JSONPlaceholder genera un `id` que solo devuelve en POST).
- **Estado:** **Aprobado** (verificación automatizada + petición real; confirmación visual en *Network* recomendada para la exposición).

---

## Caso 07 — Verificación del encabezado Content-Type

- **Código:** CP-07
- **Objetivo:** Comprobar el encabezado obligatorio `Content-Type: application/json`.
- **Datos de entrada:** Publicación válida.
- **Pasos:** DevTools → *Network* → seleccionar la petición `posts` → *Headers* → *Request Headers*.
- **Resultado esperado:** `Content-Type: application/json`.
- **Resultado obtenido:** `API_CONFIG.headers["Content-Type"] === "application/json"` (configuración usada en el `fetch`).
- **Estado:** **Aprobado** (verificación automatizada; confirmación visual en *Network* recomendada).

---

## Caso 08 — Verificación del cuerpo JSON

- **Código:** CP-08
- **Objetivo:** Comprobar que el cuerpo se serializa con `JSON.stringify()`.
- **Datos de entrada:** `{ title: "T", body: "B", userId: 1 }`.
- **Pasos:** DevTools → *Network* → petición `posts` → *Payload* / *Request*.
- **Resultado esperado:** El cuerpo enviado es `{"title":"T","body":"B","userId":1}`.
- **Resultado obtenido:** `JSON.stringify(construirPublicacion("T","B",1))` produce exactamente `{"title":"T","body":"B","userId":1}`.
- **Estado:** **Aprobado** (verificación automatizada).

---

## Caso 09 — Verificación de la respuesta recibida

- **Código:** CP-09
- **Objetivo:** Comprobar que la respuesta se procesa con `response.ok` y `await response.json()`.
- **Datos de entrada:** Publicación válida.
- **Pasos:** Enviar una publicación y revisar en *Console* o en la tarjeta de resultado el `id` devuelto.
- **Resultado esperado:** Se obtiene un objeto JSON con `id` generado por la API.
- **Resultado obtenido:** La petición real devolvió un objeto con `id` (`typeof respuesta.id !== "undefined"`).
- **Estado:** **Aprobado** (petición real).

---

## Caso 10 — Actualización del DOM sin recarga

- **Código:** CP-10
- **Objetivo:** Verificar que el resultado se muestra sin recargar la página.
- **Datos de entrada:** Publicación válida.
- **Pasos:** Anotar la URL; enviar una publicación; comprobar que la URL no cambia y que aparece la tarjeta con ID, título, contenido y estado.
- **Resultado esperado:** Sin recarga (`event.preventDefault()`), aparece la tarjeta de la publicación devuelta.
- **Resultado obtenido:** Emulación DOM en Node: al enviar datos válidos, el historial (`#resultado`) incorpora la tarjeta y la URL nunca cambia (la función `manejarSubmit` ejecuta `event.preventDefault()`). *(La confirmación visual de que la barra de direcciones no cambia se recomienda hacerla en el navegador.)*
- **Estado:** **Aprobado** (verificación end-to-end con mini-DOM, `verificacion-dom.js`).

---

## Caso 11 — Indicador de carga

- **Código:** CP-11
- **Objetivo:** Comprobar el spinner y el cambio de texto del botón durante la petición.
- **Datos de entrada:** Publicación válida.
- **Pasos:** Enviar una publicación con la pestaña *Network* en modo *Slow 3G* para observar el estado de carga.
- **Resultado esperado:** Se muestra el spinner, el botón cambia a **"Publicando..."** y se deshabilita; al terminar se restauran el spinner y el texto.
- **Resultado obtenido:** Emulación DOM en Node con `fetch` diferido: durante la petición `#loading` y `#progress-bar` están visibles, el botón queda deshabilitado y su texto pasa a "Publicando...". Al finalizar, la interfaz se restaura. *(El aspecto gráfico concreto del spinner se confirma visualmente en el navegador.)*
- **Estado:** **Aprobado** (verificación end-to-end con mini-DOM; aspecto visual recomendado en navegador).

---

## Caso 12 — Bloqueo de envíos duplicados

- **Código:** CP-12
- **Objetivo:** Impedir que se disparen varias peticiones simultáneas.
- **Datos de entrada:** Publicación válida; pulsar el botón repetidamente y usar Enter.
- **Pasos:** Con la pestaña *Network* abierta en modo lento, pulsar **Publicar mensaje** varias veces.
- **Resultado esperado:** Solo se envía **una** petición; las pulsaciones extra se ignoran mientras `isSubmitting` es `true`.
- **Resultado obtenido:** Emulación DOM en Node: con una petición "en vuelo", un segundo envío no dispara una nueva llamada a `fetch` (contador = 1).
- **Estado:** **Aprobado** (verificación end-to-end con mini-DOM).

---

## Caso 13 — Error de conexión

- **Código:** CP-13
- **Objetivo:** Manejar la pérdida de conexión o servidor inaccesible.
- **Datos de entrada:** `fetch` simulado que lanza `TypeError` (mock).
- **Pasos:** Alternativa de prueba: DevTools → *Network* → activar *Offline* y enviar una publicación. Método automatizado: *mock* de `fetch`.
- **Resultado esperado:** Mensaje "No se pudo conectar con el servidor..." y posibilidad de reintentar; el botón se restaura.
- **Resultado obtenido:** Con `fetch` que lanza `TypeError`, `enviarPublicacion` lanza un error con `tipo === "conexion"`.
- **Estado:** **Aprobado** (verificación automatizada con mock de `fetch`).

---

## Caso 14 — Error HTTP

- **Código:** CP-14
- **Objetivo:** Manejar respuestas 400/404/500 y otros estados no satisfactorios.
- **Datos de entrada:** Respuestas simuladas con `ok: false` y `status` 400/404/500.
- **Pasos:** Automatizado con *mock*; manualmente puede simularse con la extensión de DevTools o cambiando el endpoint a una ruta inexistente.
- **Resultado esperado:** Mensaje específico según el código (400 incorrecta, 404 no encontrado, 500 error de servidor) y **sin** mensaje de éxito.
- **Resultado obtenido:** `mensajeDeErrorHttp(400/404/500)` genera mensajes correctos; con `fetch` simulado que devuelve `ok:false, status:500` se lanza un error con `tipo === "http"` y `status === 500`. La petición real a una ruta inexistente (`/posts/999999999`) también devolvió un error clasificado.
- **Estado:** **Aprobado** (verificación automatizada con mock + petición real).

---

## Caso 15 — Respuesta JSON inválida

- **Código:** CP-15
- **Objetivo:** Manejar una respuesta que no es JSON válido.
- **Datos de entrada:** `fetch` simulado con `ok: true` cuyo `json()` lanza `SyntaxError`.
- **Pasos:** Automatizado con *mock* de `response.json()`.
- **Resultado esperado:** Mensaje "La API devolvió una respuesta que no es un JSON válido." y control del error.
- **Resultado obtenido:** Se lanza un error con `tipo === "procesamiento"` capturado en el `catch`.
- **Estado:** **Aprobado** (verificación automatizada con mock).

---

## Caso 16 — Restauración del botón después del error

- **Código:** CP-16
- **Objetivo:** Comprobar que tras cualquier error el botón vuelve a estar operativo.
- **Datos de entrada:** Cualquier error (conexión, HTTP o procesamiento).
- **Pasos:** Provocar un error (por ejemplo, modo *Offline*) y comprobar que el botón recupera su texto original y se habilita.
- **Resultado esperado:** Gracias al bloque `finally`, el botón se restaura y `isSubmitting` vuelve a `false` en todo caso.
- **Resultado obtenido:** Emulación DOM en Node: tras un error de conexión, `#loading` se oculta, el botón vuelve a habilitarse y recupera el texto "Publicar mensaje".
- **Estado:** **Aprobado** (verificación end-to-end con mini-DOM).

---

## Caso 17 — Presentación segura de contenido HTML

- **Código:** CP-17
- **Objetivo:** Evitar inyección de HTML/JavaScript al mostrar datos.
- **Datos de entrada:** `title = "<img src=x onerror=alert(1)>"`, `body = "<b>hola</b>"`.
- **Pasos:** Enviar esos datos y comprobar que se muestran **como texto literal**, sin ejecutar scripts ni renderizar etiquetas. Verificar en *Elements* que el contenido está en nodos de texto.
- **Resultado esperado:** El texto se muestra tal cual; no se crea ningún `<img>` ni se ejecuta `alert`.
- **Resultado obtenido:** Emulación DOM en Node: el título malicioso se conserva como **texto literal** y no se crea ningún nodo `<img>` ni `<b>`. *(La inspección visual en la pestaña Elements del navegador se recomienda como complemento.)*
- **Estado:** **Aprobado** (verificación end-to-end con mini-DOM). El código usa exclusivamente `createElement` + `textContent`; **no** usa `innerHTML`.

---

## Caso 18 — Funcionamiento responsive

- **Código:** CP-18
- **Objetivo:** Comprobar la adaptación a computadoras, tablets y móviles.
- **Datos de entrada:** No aplica.
- **Pasos:** Con DevTools activar el *Device Toolbar* y probar anchos de 360 px, 768 px y 1280 px.
- **Resultado esperado:** El diseño se adapta: botones a ancho completo en móvil, tipografía legible, sin desbordes horizontales.
- **Resultado obtenido:** *(pendiente de ejecución en navegador)*.
- **Estado:** **Pendiente** (requiere navegador). Definido en las `@media` de `css/styles.css`.

---

## Resumen

| Código | Caso | Estado | Método |
|--------|------|--------|--------|
| CP-01 | Ambos campos vacíos | Aprobado | Automatizado |
| CP-02 | Título vacío | Aprobado | Automatizado |
| CP-03 | Contenido vacío | Aprobado | Automatizado |
| CP-04 | Campos solo con espacios | Aprobado | Automatizado |
| CP-05 | Publicación válida | Aprobado | Automatizado + real |
| CP-06 | Método POST | Aprobado | Automatizado + real |
| CP-07 | Encabezado Content-Type | Aprobado | Automatizado |
| CP-08 | Cuerpo JSON | Aprobado | Automatizado |
| CP-09 | Respuesta recibida | Aprobado | Petición real |
| CP-10 | DOM sin recarga | Aprobado | E2E mini-DOM |
| CP-11 | Indicador de carga | Aprobado | E2E mini-DOM |
| CP-12 | Bloqueo de duplicados | Aprobado | E2E mini-DOM |
| CP-13 | Error de conexión | Aprobado | Mock |
| CP-14 | Error HTTP | Aprobado | Mock + real |
| CP-15 | JSON inválido | Aprobado | Mock |
| CP-16 | Restauración tras error | Aprobado | E2E mini-DOM |
| CP-17 | Presentación segura | Aprobado | E2E mini-DOM |
| CP-18 | Responsive | Pendiente | Navegador |

**Aprobadas:** 17 · **Pendientes:** 1 (CP-18, requiere inspección visual en navegador) · **Fallidas:** 0

---

## Comprobación en DevTools (Network y Console)

**Pestaña Network (peticiones):**
1. Abrir DevTools con `F12` → pestaña **Network** → filtro **Fetch/XHR**.
2. Enviar una publicación. Aparecerá una petición a `posts`.
3. Seleccionarla y revisar:
   - **Headers → General:** *Request Method* = `POST`, *Status Code* = `201` (o `200`).
   - **Headers → Request Headers:** `Content-Type: application/json` y `content-type` correcto.
   - **Payload / Request:** cuerpo JSON con `title`, `body`, `userId`.
   - **Response / Preview:** `id`, `title`, `body`, `userId`.
4. Para simular fallos: *Network* → *Throttling* → **Offline** (error de conexión); o usar el bloqueo de URL para forzar errores.

**Pestaña Console (errores y depuración):**
1. Los errores se registran con `console.error("[Publicador de Mensajes] Error:", tipo, error)`.
2. Se puede inspeccionar el módulo y sus funciones puras:

   ```js
   PublicadorApp.validarFormulario("", "contenido");
   PublicadorApp.construirPublicacion("Título", "Contenido", 1);
   await PublicadorApp.enviarPublicacion({ title: "x", body: "y", userId: 1 });
   ```

3. Escribir `PublicadorApp` y desplegarlo muestra la API pública del módulo para pruebas.

> Las pruebas con *mocks* (CP-13, CP-14, CP-15) y las peticiones reales se ejecutan de forma
> aislada en `tests/verificacion-logica.js`, **sin modificar** el comportamiento de producción.
