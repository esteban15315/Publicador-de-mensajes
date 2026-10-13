# Publicador de Mensajes

Miniaplicación web para crear una publicación (título + contenido), validarla, enviarla a una
API REST mediante una petición **HTTP POST** y mostrar la respuesta de forma asíncrona **sin
recargar la página**.

Desarrollada con **JavaScript Vanilla (ES6+)**, **Fetch API**, **async/await** y manipulación
del DOM, sin frameworks ni librerías externas.

---

## Tabla de contenidos

1. [Descripción](#descripción)
2. [Objetivo académico](#objetivo-académico)
3. [Tecnologías utilizadas](#tecnologías-utilizadas)
4. [Estructura de carpetas](#estructura-de-carpetas)
5. [Flujo de funcionamiento](#flujo-de-funcionamiento)
6. [Cómo ejecutar con un servidor local](#cómo-ejecutar-con-un-servidor-local)
7. [Ejemplo de solicitud y respuesta](#ejemplo-de-solicitud-y-respuesta)
8. [Explicación de los conceptos clave](#explicación-de-los-conceptos-clave)
9. [Manejo de errores](#manejo-de-errores)
10. [Cómo probar la aplicación](#cómo-probar-la-aplicación)
11. [Limitaciones de JSONPlaceholder](#limitaciones-de-jsonplaceholder)
12. [Subir el proyecto a GitHub](#subir-el-proyecto-a-github)
13. [Guía de demostración técnica](#guía-de-demostración-técnica)
14. [Cumplimiento de la rúbrica (20 criterios)](#cumplimiento-de-la-rúbrica-20-criterios)

---

## Descripción

El usuario escribe un **título** y un **contenido**, la aplicación **valida** los datos
(evitando campos vacíos o con solo espacios), construye un objeto JSON y lo envía mediante
`fetch()` a la API. Si la respuesta es correcta, la publicación devuelta por el servidor
(con su `id` generado) se muestra en una tarjeta. Todos los estados —inicial, validación
fallida, carga, éxito y error— están diferenciados visualmente.

> **Importante:** JSONPlaceholder **simula** la creación de recursos. Devuelve el objeto
> enviado más un `id`, pero **no almacena la publicación de forma permanente**. La respuesta
> HTTP es real; la persistencia es simulada.

## Características de la interfaz (dinámica)

La aplicación incluye varias mejoras de experiencia de usuario implementadas **íntegramente
con JavaScript Vanilla** y CSS3, sin librerías externas:

- **Vista previa en vivo:** una tarjeta se actualiza en tiempo real mientras escribes.
- **Contadores de caracteres** por campo, con aviso de color al acercarse al límite.
- **Historial de publicaciones:** cada respuesta de la API se guarda en pantalla (la más
  reciente arriba), con contador y botón para vaciarlo.
- **Notificaciones emergentes (toasts)** para éxito, error y avisos.
- **Barra de progreso** superior y **tarjeta "esqueleto"** durante la petición.
- **Botón "Copiar JSON"** en cada publicación devuelta.
- **Animaciones discretas:** fondo con degradados en movimiento, efecto *ripple* en los
  botones y transiciones suaves. Todas se desactivan con `prefers-reduced-motion`.

## Objetivo académico

Demostrar el dominio de los fundamentos del desarrollo web del lado del cliente:

- HTML5 semántico y accesible.
- CSS3 moderno, responsive y con estados visuales.
- JavaScript nativo: eventos, DOM, validación y seguridad.
- Comunicación asíncrona con una API REST mediante Fetch API y `async/await`.
- Buenas prácticas de organización, manejo de errores y documentación de pruebas.

## Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
|-----------|--------------------|
| HTML5 | Estructura semántica del formulario y las secciones (`header`, `main`, `section`, `form`, `label`, `input`, `textarea`, `button`). |
| CSS3 | Diseño moderno, variables, Grid/Flexbox, animaciones y `@media` (responsive, movimiento reducido, modo oscuro). |
| JavaScript ES6+ | Lógica, eventos, validación, DOM, módulo con funciones puras. |
| Fetch API | Petición HTTP POST a la API REST. |
| async/await | Programación asíncrona legible con `try/catch/finally`. |
| JSON | Serialización del cuerpo con `JSON.stringify()` y lectura con `response.json()`. |

**No** se usan React, Vue, Angular, Laravel, jQuery, Axios ni otras librerías.

## Estructura de carpetas

```text
publicador-mensajes/
├── index.html               # Estructura semántica de la interfaz
├── css/
│   └── styles.css           # Estilos, estados visuales y responsive
├── js/
│   └── app.js               # Lógica: validación, fetch, async/await, DOM, errores
├── tests/
│   ├── casos-prueba.md      # 18 casos de prueba documentados
│   ├── verificacion-logica.js  # Pruebas automatizadas (Node) de la lógica y errores
│   └── verificacion-dom.js     # Pruebas end-to-end con mini-DOM (flujo completo)
├── README.md                # Documentación del proyecto
└── .gitignore               # Archivos excluidos del control de versiones
```

**Separación de responsabilidades:** el HTML define la estructura, el CSS la presentación y
el JavaScript el comportamiento. No hay estilos en línea ni scripts embebidos.

## Flujo de funcionamiento

```text
Usuario escribe título y contenido
        │
        ▼
[submit] event → event.preventDefault()  (evita recargar)
        │
        ▼
¿Hay una solicitud en curso? ── sí ──► se ignora (anti-duplicados)
        │ no
        ▼
Leer campos + validar con .trim()  ── inválido ──► mostrar errores (sin fetch)
        │ válido
        ▼
Construir objeto { title, body, userId }
        │
        ▼
Activar spinner + deshabilitar botón
        │
        ▼
fetch(endpoint, { method: POST, headers, body: JSON.stringify(obj) })   ◄── async/await
        │
        ▼
¿response.ok? ── no ──► error HTTP (400/404/500…)  ──┐
        │ sí                                          │
        ▼                                             ▼
await response.json()  ── JSON inválido ──► error de procesamiento
        │
        ▼
Renderizar tarjeta con createElement + textContent
        │
        ▼
finally → ocultar spinner + restaurar botón (siempre)
```

## Cómo ejecutar con un servidor local

La aplicación **no necesita instalación de dependencias**. Basta servir los archivos con un
servidor local (recomendado para evitar restricciones del protocolo `file://`).

**Opción A — Python (ya instalado en la mayoría de sistemas):**

```bash
python -m http.server 5500
```

**Opción B — Node.js:**

```bash
npx serve .
```

**Opción C — Extensión "Live Server" de VS Code:**
Abrir `index.html` y pulsar *Go Live*.

Luego abrir en el navegador: **http://localhost:5500** (o el puerto indicado).

> También puede abrirse `index.html` directamente, pero **se recomienda** un servidor local
> para que DevTools muestre correctamente todas las peticiones.

## Ejemplo de solicitud y respuesta

**Solicitud HTTP POST** a `https://jsonplaceholder.typicode.com/posts`:

```http
POST /posts HTTP/1.1
Host: jsonplaceholder.typicode.com
Content-Type: application/json

{
  "title": "Mi primera publicación",
  "body": "Contenido de mi publicación",
  "userId": 1
}
```

**Respuesta JSON** (ejemplo):

```json
{
  "title": "Mi primera publicación",
  "body": "Contenido de mi publicación",
  "userId": 1,
  "id": 101
}
```

## Explicación de los conceptos clave

### `addEventListener()`
Registra una función ("escucha") que se ejecuta cuando ocurre un evento. Aquí se usa para
detectar el envío del formulario y la escritura en los campos:

```javascript
dom.form.addEventListener("submit", manejarSubmit);
dom.titleInput.addEventListener("input", manejarInputTitulo);
```

### `event.preventDefault()`
Cancela el comportamiento por defecto del navegador. En un `<form>`, evita que la página se
recargue al enviar, lo que permite procesar todo con JavaScript:

```javascript
function manejarSubmit(event) {
  event.preventDefault(); // sin recargar la página
  // ...
}
```

### `fetch()`
Realiza peticiones HTTP y devuelve una **promesa**. Se usa con el endpoint, el método, las
cabeceras y el cuerpo:

```javascript
response = await fetch(API_CONFIG.endpoint, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(publicacion)
});
```

### `JSON.stringify()`
Convierte un objeto de JavaScript en una cadena JSON, formato que la API espera en el cuerpo:

```javascript
const cuerpo = JSON.stringify({ title: "Hola", body: "Mundo", userId: 1 });
// '{"title":"Hola","body":"Mundo","userId":1}'
```

### `response.ok`
Propiedad booleana que es `true` cuando el código de estado HTTP está entre 200 y 299. Sirve
para verificar el éxito **antes** de procesar el cuerpo:

```javascript
if (!response.ok) {
  throw new Error(mensajeDeErrorHttp(response.status));
}
```

### `response.json()`
Lee el cuerpo de la respuesta y lo convierte a un objeto JavaScript. Es asíncrono, por lo que
requiere `await`:

```javascript
const datos = await response.json();
```

### `async/await`
`async` marca una función como asíncrona (siempre devuelve una promesa). `await` pausa la
ejecución de esa función hasta que la promesa se resuelve, sin bloquear la interfaz. Permite
escribir código asíncrono de forma secuencial y legible:

```javascript
async function manejarSubmit(event) {
  event.preventDefault();
  try {
    const respuesta = await enviarPublicacion(publicacion);
    renderizarPublicacion(respuesta);
  } catch (error) {
    mostrarEstado(error.message, "error");
  } finally {
    desactivarCarga(); // se ejecuta siempre
  }
}
```

### Actualización dinámica del DOM
La interfaz se actualiza **sin recargar** creando nodos y asignando texto de forma segura:

```javascript
const tarjeta = document.createElement("article");
const titulo = document.createElement("h3");
titulo.textContent = publicacion.title; // texto, no HTML → seguro
tarjeta.appendChild(titulo);
dom.resultado.replaceChildren(tarjeta); // reemplaza el contenido anterior
```

**Seguridad:** nunca se usa `innerHTML` para insertar datos del usuario o de la API. Con
`textContent` se evita la inyección de HTML/JavaScript.

## Manejo de errores

La aplicación distingue cuatro tipos de error y ofrece mensajes comprensibles:

| Tipo | Cuándo ocurre | Manejo |
|------|---------------|--------|
| **Validación** | Campos vacíos o con solo espacios | Mensajes por campo; **no** se ejecuta `fetch()`. |
| **Conexión** | Sin Internet, servidor inaccesible | `fetch` lanza `TypeError` → se captura y se informa. |
| **HTTP** | 400, 404, 500 u otros | Se verifica `response.ok` y se traduce el estado. |
| **Procesamiento** | JSON inválido o respuesta inesperada | `response.json()` falla → se captura. |

Todos los errores se propagan mediante `throw` y se capturan con `try/catch/finally`. El
bloque `finally` **siempre** restaura la interfaz (oculta el spinner, reactiva el botón).
Nunca se muestra un mensaje de éxito si `response.ok` es `false`.

## Cómo probar la aplicación

**1. Pruebas automatizadas de la lógica (Node.js 18+):**

```bash
node tests/verificacion-logica.js   # funciones puras, serialización, errores (mocks) y POST real
node tests/verificacion-dom.js      # flujo completo end-to-end con un mini-DOM en memoria
```

Resultados esperados: **26 aprobadas** (lógica) y **32 aprobadas** (end-to-end), 0 fallidas.

**2. Pruebas manuales en el navegador:**
Ver [`tests/casos-prueba.md`](tests/casos-prueba.md) para los 18 casos documentados.

**3. Web para pruebas:** la API oficial es JSONPlaceholder
(`https://jsonplaceholder.typicode.com/`), que permite probar POST sin autenticación.

## Limitaciones de JSONPlaceholder

- **No persiste datos:** los recursos creados con POST **no se guardan**. Una petición `GET`
  posterior no devolvería la publicación creada.
- **Datos ficticios:** solo existen 100 publicaciones de ejemplo; las rutas inexistentes
  devuelven `404`.
- **Sin autenticación ni validación de negocio:** acepta casi cualquier cuerpo.
- **Respuesta simulada:** devuelve `201 Created` de forma genérica con el objeto enviado más
  un `id`.

Por todo esto, el proyecto **aclara expresamente** que la operación de creación es simulada y
que **no hay persistencia real** de las publicaciones.

## Subir el proyecto a GitHub

```bash
# 1. Inicializar el repositorio local (si aún no existe)
git init

# 2. Revisar qué se va a subir
git status

# 3. Añadir los archivos y confirmar
git add .
git commit -m "feat: Publicador de Mensajes con Fetch API y async/await"

# 4. Crear el repositorio vacío en GitHub y enlazarlo
git branch -M main
git remote add origin https://github.com/USUARIO/publicador-mensajes.git

# 5. Subir
git push -u origin main
```

> El archivo `.gitignore` excluye archivos temporales y de sistema. Si un integrante usa
> Node.js para las pruebas, `node_modules/` queda excluido automáticamente.

---

## Guía de demostración técnica

Guion de ~7 minutos para la exposición. Cada bloque indica **qué archivo/ función mostrar**,
para que cualquier integrante pueda explicarlo.

### 0. Presentación (20 s)
- Mostrar la página funcionando: título, formulario y tarjeta de resultado.
- Enunciar el objetivo: enviar una publicación a una API REST y mostrar la respuesta sin recargar.

### 1. Estructura HTML (45 s) — `index.html`
- Señalar el `<form id="formulario">`, los `<label for="...">` asociados a sus campos y los
  atributos de accesibilidad (`aria-describedby`, `role="alert"`, `aria-live`).
- Mencionar que la estructura está separada de estilos y comportamiento.

### 2. Validaciones (50 s) — `js/app.js` → `validarCampo()` / `validarFormulario()`
- Mostrar cómo `.trim()` elimina espacios y cómo se devuelve un objeto con `valido`, `errores` y `datos`.
- Demostrar en vivo: enviar vacío → aparece el error y **no** se envía nada.

### 3. Eventos JavaScript (40 s) — `js/app.js` → `inicializar()` / `manejarSubmit()`
- Mostrar `addEventListener("submit", ...)` y `event.preventDefault()`.
- Explicar los eventos `input` que limpian los errores al corregir.

### 4. Petición Fetch (50 s) — `enviarPublicacion()`
- Mostrar el `fetch(endpoint, { method, headers, body })` y `JSON.stringify()`.
- Resaltar el endpoint, el método POST y el encabezado `Content-Type`.

### 5. Funcionamiento asíncrono (40 s)
- Explicar `async/await`, por qué `await response.json()` es asíncrono y que el `finally`
  restaura siempre la interfaz.

### 6. Respuesta HTTP y JSON (40 s) — DevTools → *Network*
- Abrir *Network*, enviar una publicación y mostrar: método POST, *status* 201, *Request
  Headers* (Content-Type) y *Response* (JSON con `id`).

### 7. Actualización del DOM (40 s) — `crearTarjetaPublicacion()` / `renderizarPublicacion()`
- Mostrar `createElement`, `appendChild`, `prepend`, `replaceChildren` y `textContent`.
- Explicar por qué **no** se usa `innerHTML` (seguridad).
- Mencionar las mejoras dinámicas: vista previa en vivo, toasts de notificación, historial y
  contador de publicaciones (`actualizarVistaPrevia()`, `mostrarToast()`).

### 8. Gestión de errores (40 s)
- Demostrar error de validación (campo vacío) y error de conexión (*Network* → *Offline*).
- Resaltar `response.ok`, los tipos de error y el `finally`.

### 9. Comprobación en Network (30 s)
- Recalcar cómo verificar método, encabezado y cuerpo desde DevTools (evidencia objetiva).

### 10. Creación simulada vs. persistencia real (30 s)
- Aclarar que JSONPlaceholder **simula** la creación: devuelve un `id` pero **no guarda** el
  recurso. La respuesta es real; la persistencia, no.

### Cierre (15 s)
- Recapitular: HTML semántico + CSS responsive + JS con Fetch/async y DOM seguro.
- Mencionar las pruebas en `tests/` como evidencia de calidad.

### Funciones clave para dominar

| Función | Archivo | Qué explicar |
|---------|---------|--------------|
| `manejarSubmit()` | `js/app.js` | Flujo completo: validar, cargar, enviar, mostrar, `finally`. |
| `validarCampo()` / `validarFormulario()` | `js/app.js` | Validación reutilizable con `.trim()`. |
| `enviarPublicacion()` | `js/app.js` | `fetch` + `response.ok` + `response.json()` + errores tipificados. |
| `crearTarjetaPublicacion()` | `js/app.js` | Render seguro con `createElement`/`textContent`. |
| `activarCarga()` / `desactivarCarga()` | `js/app.js` | Estado de carga y restauración de la interfaz. |
| `mensajeDeErrorHttp()` | `js/app.js` | Traducción de códigos HTTP a mensajes. |
| `actualizarVistaPrevia()` / `actualizarContadores()` | `js/app.js` | Dinamismo de la interfaz mientras se escribe. |
| `mostrarToast()` / `renderizarPublicacion()` | `js/app.js` | Notificaciones e historial dinámico. |

---

## Cumplimiento de la rúbrica (20 criterios)

| # | Criterio | Evidencia en el proyecto |
|---|----------|--------------------------|
| 1 | Estructura HTML del formulario | `index.html`: `<form>`, `<label>`, `<input>`, `<textarea>`, `<button>` semánticos. |
| 2 | Separación de responsabilidades | `index.html` + `css/styles.css` + `js/app.js` independientes. |
| 3 | Selección y acceso al DOM | Objeto `dom` con `getElementById` cacheado en `js/app.js`. |
| 4 | Gestión de eventos | `addEventListener` para `submit`, `input` y `reset`. |
| 5 | Validación de datos | `validarCampo`, `validarFormulario`, uso de `.trim()`. |
| 6 | Construcción de petición HTTP | `enviarPublicacion()` con método, cabeceras y endpoint. |
| 7 | Serialización JSON | `JSON.stringify(publicacion)`. |
| 8 | Programación asíncrona | `async/await`, `try/catch/finally`. |
| 9 | Verificación de respuesta HTTP | `if (!response.ok)` + `mensajeDeErrorHttp()`. |
| 10 | Procesamiento de respuesta JSON | `await response.json()`. |
| 11 | Actualización dinámica del DOM | `createElement`, `appendChild`, `replaceChildren`. |
| 12 | Seguridad al presentar datos | `textContent`, sin `innerHTML`. |
| 13 | Indicador de carga y control de envíos | `activarCarga`/`desactivarCarga`, bandera `isSubmitting`, `disabled`. |
| 14 | Gestión de errores | Cuatro tipos de error (validación, conexión, HTTP, procesamiento). |
| 15 | Pruebas funcionales y verificación técnica | `tests/casos-prueba.md` + `verificacion-logica.js` (26) + `verificacion-dom.js` (32 E2E). |
| 16 | Demostración funcional | [Guía de demostración técnica](#guía-de-demostración-técnica). |
| 17 | Dominio individual del código | Tabla de funciones clave para la exposición. |
| 18 | Organización y colaboración | Estructura de carpetas y secciones asignables por integrante. |
| 19 | Calidad y mantenibilidad | Código comentado, nombres descriptivos, funciones puras reutilizables. |
| 20 | Comprensión de la persistencia | Aviso en la interfaz y sección de limitaciones en este README. |

> Los criterios **16 (demostración)**, **17 (dominio individual)** y **18 (colaboración)**
> requieren evidencia del equipo (exposición en vivo, reparto de tareas y explicación oral) y
> no pueden acreditarse solo con el código. Esta guía y la documentación de pruebas sirven de
> apoyo para esas instancias.

---

**Licencia:** uso educativo.
