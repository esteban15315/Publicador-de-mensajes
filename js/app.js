/* =============================================================================
 * Publicador de Mensajes - Lógica principal de la aplicación
 * -----------------------------------------------------------------------------
 * Tecnologías: JavaScript Vanilla (ES6+), Fetch API, async/await, DOM.
 * Responsabilidades:
 *   1. Seleccionar y cachear elementos del DOM.
 *   2. Gestionar eventos (submit, input, reset).
 *   3. Validar los datos introducidos por el usuario.
 *   4. Enviar una petición HTTP POST a la API REST con fetch().
 *   5. Procesar la respuesta de forma asíncrona (async/await).
 *   6. Actualizar el DOM de manera dinámica y segura.
 *   7. Gestionar estados y errores (validación, HTTP, conexión, procesamiento).
 *
 * Mejoras dinámicas añadidas (sin romper los requisitos del trabajo):
 *   - Contadores de caracteres en vivo.
 *   - Vista previa que se actualiza mientras el usuario escribe.
 *   - Historial de publicaciones devueltas por la API.
 *   - Notificaciones emergentes (toasts) y barra de progreso.
 *   - Tarjeta "esqueleto" mientras se espera la respuesta.
 *
 * El módulo se expone en window.PublicadorApp para poder reutilizar y probar
 * sus funciones puras (validación, construcción de mensajes de error, etc.).
 * ===========================================================================*/

(function () {
  "use strict";

  /* ==========================================================================
   * 1. CONFIGURACIÓN DE LA API REST
   * ========================================================================*/
  const API_CONFIG = {
    // Endpoint exacto indicado en el trabajo práctico.
    endpoint: "https://jsonplaceholder.typicode.com/posts",
    method: "POST",
    // Encabezado obligatorio para enviar JSON.
    headers: { "Content-Type": "application/json" },
    // Usuario simulado que se adjunta a la publicación (API de prueba).
    defaultUserId: 1
  };

  /* ==========================================================================
   * 2. REFERENCIAS AL DOM
   * Se consultan una sola vez y se reutilizan (mejor rendimiento y orden).
   * ========================================================================*/
  const dom = {
    form: document.getElementById("formulario"),
    titleInput: document.getElementById("title"),
    bodyInput: document.getElementById("body"),
    titleCount: document.getElementById("title-count"),
    bodyCount: document.getElementById("body-count"),
    submitBtn: document.getElementById("submit-btn"),
    submitLabel: document.getElementById("submit-label"),
    resetBtn: document.getElementById("reset-btn"),
    loading: document.getElementById("loading"),
    progressBar: document.getElementById("progress-bar"),
    statusMessage: document.getElementById("status-message"),
    resultado: document.getElementById("resultado"),
    resultadoCount: document.getElementById("resultado-count"),
    clearHistoryBtn: document.getElementById("clear-history"),
    titleError: document.getElementById("title-error"),
    bodyError: document.getElementById("body-error"),
    // Vista previa
    previewCard: document.getElementById("preview-card"),
    previewTitle: document.getElementById("preview-title"),
    previewBody: document.getElementById("preview-body"),
    // Estado global
    statCount: document.getElementById("stat-count"),
    toastContainer: document.getElementById("toast-container")
  };

  // Textos de la vista previa cuando los campos están vacíos.
  const PREVIEW_PLACEHOLDER = {
    title: "Tu título aparecerá aquí",
    body: "El contenido de tu publicación se mostrará en esta tarjeta a medida que escribas."
  };

  /* ==========================================================================
   * 3. ESTADO DE LA APLICACIÓN
   * Controla si hay una solicitud en curso y los contadores de la sesión.
   * ========================================================================*/
  const state = {
    isSubmitting: false,
    submitLabelOriginal: dom.submitLabel ? dom.submitLabel.textContent : "Publicar mensaje",
    publicadas: 0
  };

  /* ==========================================================================
   * 4. FUNCIONES PURAS DE VALIDACIÓN (reutilizables y testeables)
   * ========================================================================*/

  /**
   * Normaliza un texto: convierte a string y elimina espacios al inicio/final.
   * @param {*} value Valor a normalizar.
   * @returns {string} Texto limpio.
   */
  function normalizarTexto(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  /**
   * Valida un único campo de texto.
   * @param {string} valor Texto original del campo.
   * @param {string} nombreCampo Nombre legible para el mensaje ("título", "contenido").
   * @returns {{valido: boolean, mensaje: string|null, valor: string}}
   */
  function validarCampo(valor, nombreCampo) {
    const limpio = normalizarTexto(valor);

    if (limpio.length === 0) {
      return {
        valido: false,
        valor: limpio,
        mensaje: `El ${nombreCampo} no puede estar vacío ni contener solo espacios.`
      };
    }

    return { valido: true, valor: limpio, mensaje: null };
  }

  /**
   * Valida el formulario completo (título y contenido).
   * @param {string} titulo
   * @param {string} contenido
   * @returns {{valido: boolean, errores: {title: string|null, body: string|null},
   *            datos: {title: string, body: string}}}
   */
  function validarFormulario(titulo, contenido) {
    const resultadoTitulo = validarCampo(titulo, "título");
    const resultadoBody = validarCampo(contenido, "contenido");

    return {
      valido: resultadoTitulo.valido && resultadoBody.valido,
      errores: {
        title: resultadoTitulo.mensaje,
        body: resultadoBody.mensaje
      },
      datos: {
        title: resultadoTitulo.valor,
        body: resultadoBody.valor
      }
    };
  }

  /**
   * Construye el objeto de publicación que se enviará a la API.
   * @param {string} titulo
   * @param {string} contenido
   * @param {number} [userId]
   * @returns {{title: string, body: string, userId: number}}
   */
  function construirPublicacion(titulo, contenido, userId) {
    return {
      title: titulo,
      body: contenido,
      userId: typeof userId === "number" ? userId : API_CONFIG.defaultUserId
    };
  }

  /**
   * Traduce un estado HTTP a un mensaje comprensible para el usuario.
   * @param {number} status
   * @returns {string}
   */
  function mensajeDeErrorHttp(status) {
    if (status === 400) return "La solicitud es incorrecta (400). Revisa los datos enviados.";
    if (status === 401) return "No autorizado (401). La API rechazó la petición.";
    if (status === 403) return "Acceso prohibido (403) por parte de la API.";
    if (status === 404) return "Recurso no encontrado (404). Verifica el endpoint.";
    if (status >= 500) return `Error del servidor (${status}). Intenta de nuevo más tarde.`;
    return `La API respondió con un estado inesperado (${status}).`;
  }

  /* ==========================================================================
   * 5. FUNCIONES DE INTERFAZ (estados visuales)
   * ========================================================================*/

  /** Limpia los mensajes de error de un campo y su estado visual. */
  function limpiarErrorCampo(campo, elementoError) {
    if (campo) {
      campo.classList.remove("is-invalid");
      campo.setAttribute("aria-invalid", "false");
    }
    if (elementoError) {
      elementoError.textContent = "";
      elementoError.hidden = true;
    }
  }

  /** Muestra el error de un campo y marca el campo como inválido. */
  function mostrarErrorCampo(campo, elementoError, mensaje) {
    if (campo) {
      campo.classList.add("is-invalid");
      campo.setAttribute("aria-invalid", "true");
    }
    if (elementoError) {
      elementoError.textContent = mensaje;
      elementoError.hidden = false;
    }
  }

  /** Limpia todos los errores de validación del formulario. */
  function limpiarErrores() {
    limpiarErrorCampo(dom.titleInput, dom.titleError);
    limpiarErrorCampo(dom.bodyInput, dom.bodyError);
  }

  /**
   * Muestra un mensaje general de estado (success, error, warning).
   * Usa textContent para evitar inyección de HTML.
   */
  function mostrarEstado(mensaje, tipo) {
    if (!dom.statusMessage) return;
    dom.statusMessage.className = "status " + (tipo || "warning");
    dom.statusMessage.textContent = mensaje;
    dom.statusMessage.hidden = false;
  }

  /** Oculta el mensaje general de estado. */
  function ocultarEstado() {
    if (!dom.statusMessage) return;
    dom.statusMessage.hidden = true;
    dom.statusMessage.textContent = "";
    dom.statusMessage.className = "status";
  }

  /** Muestra el indicador de carga y bloquea el botón. */
  function activarCarga() {
    if (dom.loading) dom.loading.hidden = false;
    if (dom.progressBar) dom.progressBar.hidden = false;
    if (dom.submitBtn) {
      dom.submitBtn.disabled = true;
      dom.submitBtn.classList.add("is-loading");
      dom.submitBtn.setAttribute("aria-busy", "true");
    }
    if (dom.submitLabel) dom.submitLabel.textContent = "Publicando...";
  }

  /** Restaura la interfaz tras finalizar una solicitud (éxito o error). */
  function desactivarCarga() {
    if (dom.loading) dom.loading.hidden = true;
    if (dom.progressBar) dom.progressBar.hidden = true;
    if (dom.submitBtn) {
      dom.submitBtn.disabled = false;
      dom.submitBtn.classList.remove("is-loading");
      dom.submitBtn.removeAttribute("aria-busy");
    }
    if (dom.submitLabel) dom.submitLabel.textContent = state.submitLabelOriginal;
  }

  /* ------------------------------------------------------------------------
   * 5.b Contadores de caracteres en vivo
   * ---------------------------------------------------------------------- */

  /**
   * Actualiza el contador de un campo y su color según el límite.
   * @param {HTMLInputElement|HTMLTextAreaElement} input
   * @param {HTMLElement} contador
   */
  function actualizarContador(input, contador) {
    if (!input || !contador) return;
    const longitud = input.value.length;
    const maximo = input.maxLength > 0 ? input.maxLength : 0;
    contador.textContent = `${longitud}/${maximo}`;

    contador.classList.remove("is-near", "is-max");
    if (maximo > 0) {
      if (longitud >= maximo) {
        contador.classList.add("is-max");
      } else if (longitud >= maximo * 0.9) {
        contador.classList.add("is-near");
      }
    }
  }

  /** Actualiza todos los contadores del formulario. */
  function actualizarContadores() {
    actualizarContador(dom.titleInput, dom.titleCount);
    actualizarContador(dom.bodyInput, dom.bodyCount);
  }

  /* ------------------------------------------------------------------------
   * 5.c Vista previa en vivo
   * ---------------------------------------------------------------------- */

  /** Refresca la tarjeta de vista previa con lo escrito en el formulario. */
  function actualizarVistaPrevia() {
    if (!dom.previewCard) return;

    const titulo = dom.titleInput ? dom.titleInput.value : "";
    const cuerpo = dom.bodyInput ? dom.bodyInput.value : "";
    const hayContenido = normalizarTexto(titulo).length > 0 || normalizarTexto(cuerpo).length > 0;

    if (dom.previewTitle) {
      dom.previewTitle.textContent = titulo.length ? titulo : PREVIEW_PLACEHOLDER.title;
    }
    if (dom.previewBody) {
      dom.previewBody.textContent = cuerpo.length ? cuerpo : PREVIEW_PLACEHOLDER.body;
    }

    dom.previewCard.classList.toggle("has-content", hayContenido);
  }

  /* ==========================================================================
   * 6. ACTUALIZACIÓN DINÁMICA DEL DOM (render seguro)
   * Se usa document.createElement + textContent + appendChild/replaceChildren.
   * NUNCA innerHTML con datos del usuario o de la API.
   * ========================================================================*/

  /**
   * Crea un elemento HTML con clase y texto opcionales.
   * @param {string} etiqueta
   * @param {string} [clase]
   * @param {string} [texto]
   * @returns {HTMLElement}
   */
  function crearElemento(etiqueta, clase, texto) {
    const el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (typeof texto === "string") el.textContent = texto;
    return el;
  }

  /**
   * Crea un nodo de metadato "<strong>etiqueta</strong> valor" de forma segura.
   * @param {string} etiqueta
   * @param {string} valor
   * @returns {HTMLElement}
   */
  function crearMeta(etiqueta, valor) {
    const span = crearElemento("span");
    span.appendChild(crearElemento("strong", null, etiqueta + ": "));
    span.appendChild(document.createTextNode(String(valor)));
    return span;
  }

  /**
   * Crea un botón con icono SVG (seguro: el SVG es estático, creado por código).
   * @param {string} etiqueta
   * @param {string} texto
   * @returns {HTMLButtonElement}
   */
  function crearBotonIcono(etiqueta, texto) {
    const boton = crearElemento("button", "icon-btn");
    boton.type = "button";
    boton.setAttribute("aria-label", etiqueta);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "14");
    svg.setAttribute("height", "14");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");

    const path1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    path1.setAttribute("x", "9");
    path1.setAttribute("y", "9");
    path1.setAttribute("width", "12");
    path1.setAttribute("height", "12");
    path1.setAttribute("rx", "2");
    const path2 = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path2.setAttribute("d", "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1");

    svg.appendChild(path1);
    svg.appendChild(path2);
    boton.appendChild(svg);
    boton.appendChild(document.createTextNode(texto));

    return boton;
  }

  /**
   * Construye la tarjeta con la publicación devuelta por la API.
   * Todos los datos (incluido el id) se insertan con textContent.
   * @param {{id:number, title:string, body:string, userId?:number}} publicacion
   * @returns {HTMLElement}
   */
  function crearTarjetaPublicacion(publicacion) {
    const article = crearElemento("article", "publicacion");

    // Cabecera: id + estado
    const top = crearElemento("div", "publicacion-top");
    const idTexto =
      publicacion && publicacion.id !== undefined
        ? `ID: ${publicacion.id}`
        : "ID: no informado";
    top.appendChild(crearElemento("span", "publicacion-id", idTexto));
    top.appendChild(crearElemento("span", "badge badge-success", "Creado"));
    article.appendChild(top);

    // Título
    article.appendChild(
      crearElemento("h3", "publicacion-title", String(publicacion.title ?? ""))
    );

    // Contenido
    article.appendChild(
      crearElemento("p", "publicacion-body", String(publicacion.body ?? ""))
    );

    // Metadatos (userId y estado de la operación)
    const meta = crearElemento("div", "publicacion-meta");
    if (publicacion && publicacion.userId !== undefined) {
      meta.appendChild(crearMeta("Usuario", publicacion.userId));
    }
    meta.appendChild(crearMeta("Estado", "Publicación recibida por la API"));
    article.appendChild(meta);

    // Acciones: copiar JSON
    const acciones = crearElemento("div", "publicacion-actions");
    const botonCopiar = crearBotonIcono("Copiar publicación en formato JSON", "Copiar JSON");
    botonCopiar.addEventListener("click", function () {
      copiarAlPortapapeles(JSON.stringify(publicacion, null, 2), botonCopiar);
    });
    acciones.appendChild(botonCopiar);
    article.appendChild(acciones);

    return article;
  }

  /**
   * Añade una publicación al historial (la más reciente arriba).
   * @param {object} publicacion
   */
  function renderizarPublicacion(publicacion) {
    if (!dom.resultado) return;

    // Quita el estado vacío si existe.
    const vacio = document.getElementById("resultado-empty");
    if (vacio && vacio.parentNode === dom.resultado) {
      dom.resultado.removeChild(vacio);
    }

    // Inserta la nueva tarjeta al principio (historial cronológico inverso).
    dom.resultado.prepend(crearTarjetaPublicacion(publicacion));

    // Actualiza contadores de la sesión.
    state.publicadas += 1;
    if (dom.resultadoCount) dom.resultadoCount.textContent = String(state.publicadas);
    if (dom.statCount) dom.statCount.textContent = String(state.publicadas);
    if (dom.clearHistoryBtn) dom.clearHistoryBtn.hidden = false;
  }

  /** Restaura el contenedor de resultados al estado vacío inicial. */
  function limpiarResultado() {
    if (!dom.resultado) return;
    const vacio = crearElemento("p", "resultado-empty");
    vacio.id = "resultado-empty";

    const icono = crearElemento("span", "resultado-empty-icon", "📭");
    icono.setAttribute("aria-hidden", "true");
    vacio.appendChild(icono);
    vacio.appendChild(
      document.createTextNode(
        "Todavía no has publicado ningún mensaje. Envía uno para verlo aquí."
      )
    );

    dom.resultado.replaceChildren(vacio);

    state.publicadas = 0;
    if (dom.resultadoCount) dom.resultadoCount.textContent = "0";
    if (dom.statCount) dom.statCount.textContent = "0";
    if (dom.clearHistoryBtn) dom.clearHistoryBtn.hidden = true;
  }

  /* ------------------------------------------------------------------------
   * 6.b Esqueleto de carga
   * ---------------------------------------------------------------------- */

  /** Inserta una tarjeta "esqueleto" al principio del historial. */
  function mostrarEsqueleto() {
    if (!dom.resultado || document.getElementById("skeleton")) return;
    const vacio = document.getElementById("resultado-empty");
    if (vacio && vacio.parentNode === dom.resultado) {
      dom.resultado.removeChild(vacio);
    }

    const skeleton = crearElemento("div", "skeleton-card");
    skeleton.id = "skeleton";
    skeleton.setAttribute("aria-hidden", "true");
    skeleton.appendChild(crearElemento("div", "skeleton-line lg"));
    skeleton.appendChild(crearElemento("div", "skeleton-line md"));
    skeleton.appendChild(crearElemento("div", "skeleton-line md"));
    skeleton.appendChild(crearElemento("div", "skeleton-line sm"));
    dom.resultado.prepend(skeleton);
  }

  /** Elimina la tarjeta "esqueleto" si está presente. */
  function quitarEsqueleto() {
    const skeleton = document.getElementById("skeleton");
    if (skeleton && skeleton.parentNode) {
      skeleton.parentNode.removeChild(skeleton);
    }
    // Si el historial se quedó vacío, vuelve a mostrar el mensaje vacío.
    if (dom.resultado && !dom.resultado.querySelector(".publicacion")) {
      const vacio = document.getElementById("resultado-empty");
      if (!vacio) limpiarResultado();
    }
  }

  /* ------------------------------------------------------------------------
   * 6.c Toasts (notificaciones emergentes)
   * ---------------------------------------------------------------------- */

  const TOAST_ICONS = { success: "✓", error: "✕", warning: "⚠", info: "ℹ" };
  const TOAST_TITLES = {
    success: "¡Listo!",
    error: "Ocurrió un error",
    warning: "Atención",
    info: "Información"
  };

  /**
   * Muestra una notificación emergente que se elimina sola.
   * @param {string} mensaje
   * @param {"success"|"error"|"warning"|"info"} tipo
   * @param {string} [titulo]
   */
  function mostrarToast(mensaje, tipo, titulo) {
    if (!dom.toastContainer) return;
    const clase = TOAST_ICONS[tipo] ? tipo : "info";

    const toast = crearElemento("div", "toast " + clase);
    toast.setAttribute("role", "status");

    const icono = crearElemento("span", "toast-icon", TOAST_ICONS[clase]);
    icono.setAttribute("aria-hidden", "true");

    const cuerpo = crearElemento("div", "toast-body");
    cuerpo.appendChild(crearElemento("span", "toast-title", titulo || TOAST_TITLES[clase]));
    const texto = crearElemento("span", "toast-message", mensaje);
    cuerpo.appendChild(texto);

    toast.appendChild(icono);
    toast.appendChild(cuerpo);
    dom.toastContainer.appendChild(toast);

    window.setTimeout(function () {
      toast.classList.add("is-hiding");
      window.setTimeout(function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 280);
    }, 4200);
  }

  /* ------------------------------------------------------------------------
   * 6.d Portapapeles y efectos (ripple)
   * ---------------------------------------------------------------------- */

  /**
   * Copia un texto al portapapeles y da retroalimentación visual.
   * @param {string} texto
   * @param {HTMLElement} [boton]
   */
  async function copiarAlPortapapeles(texto, boton) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(texto);
      } else {
        // Respaldo para contextos sin API de portapapeles.
        const temporal = document.createElement("textarea");
        temporal.value = texto;
        temporal.setAttribute("readonly", "");
        temporal.style.position = "absolute";
        temporal.style.left = "-9999px";
        document.body.appendChild(temporal);
        temporal.select();
        document.execCommand("copy");
        document.body.removeChild(temporal);
      }
      if (boton) {
        boton.classList.add("is-copied");
        window.setTimeout(function () {
          boton.classList.remove("is-copied");
        }, 1600);
      }
      mostrarToast("La publicación se copió como JSON.", "info", "Copiado");
    } catch (e) {
      mostrarToast("No se pudo copiar al portapapeles.", "warning");
    }
  }

  /**
   * Crea el efecto de onda (ripple) al pulsar un botón.
   * @param {MouseEvent} event
   */
  function crearRipple(event) {
    const boton = event.currentTarget;
    const rect = boton.getBoundingClientRect();
    const diametro = Math.max(rect.width, rect.height);
    const ripple = document.createElement("span");
    ripple.className = "ripple";
    ripple.style.width = ripple.style.height = diametro + "px";
    ripple.style.left = event.clientX - rect.left - diametro / 2 + "px";
    ripple.style.top = event.clientY - rect.top - diametro / 2 + "px";
    boton.appendChild(ripple);
    window.setTimeout(function () {
      if (ripple.parentNode) ripple.parentNode.removeChild(ripple);
    }, 620);
  }

  /* ==========================================================================
   * 7. PETICIÓN A LA API (fetch + async/await)
   * ========================================================================*/

  /**
   * Envía la publicación a la API mediante POST.
   * @param {{title:string, body:string, userId:number}} publicacion
   * @returns {Promise<object>} Objeto devuelto por la API.
   * @throws {Error} Errores clasificados con la propiedad `tipo`.
   */
  async function enviarPublicacion(publicacion) {
    let response;

    // 1) Ejecutar la petición. Si falla la red, fetch lanza un TypeError.
    try {
      response = await fetch(API_CONFIG.endpoint, {
        method: API_CONFIG.method,
        headers: API_CONFIG.headers,
        body: JSON.stringify(publicacion) // Serialización JSON obligatoria.
      });
    } catch (errorRed) {
      const err = new Error(
        "No se pudo conectar con el servidor. Revisa tu conexión a Internet e inténtalo de nuevo."
      );
      err.tipo = "conexion";
      throw err;
    }

    // 2) Verificar el estado HTTP antes de procesar el cuerpo.
    if (!response.ok) {
      const err = new Error(mensajeDeErrorHttp(response.status));
      err.tipo = "http";
      err.status = response.status;
      throw err;
    }

    // 3) Convertir la respuesta a JSON.
    try {
      return await response.json();
    } catch (errorJson) {
      const err = new Error(
        "La API devolvió una respuesta que no es un JSON válido."
      );
      err.tipo = "procesamiento";
      throw err;
    }
  }

  /* ==========================================================================
   * 8. GESTIÓN DEL EVENTO SUBMIT
   * ========================================================================*/

  /**
   * Flujo principal ejecutado al enviar el formulario.
   * @param {SubmitEvent} event
   */
  async function manejarSubmit(event) {
    // 1) Evitar la recarga de la página.
    event.preventDefault();

    // 2) Evitar solicitudes duplicadas.
    if (state.isSubmitting) {
      return;
    }

    ocultarEstado();
    limpiarErrores();

    // 3) Leer y validar los campos.
    const titulo = dom.titleInput.value;
    const contenido = dom.bodyInput.value;
    const validacion = validarFormulario(titulo, contenido);

    if (!validacion.valido) {
      if (validacion.errores.title) {
        mostrarErrorCampo(dom.titleInput, dom.titleError, validacion.errores.title);
      }
      if (validacion.errores.body) {
        mostrarErrorCampo(dom.bodyInput, dom.bodyError, validacion.errores.body);
      }
      mostrarEstado(
        "No se pudo enviar: corrige los campos marcados en rojo.",
        "warning"
      );
      mostrarToast("Revisa el título y el contenido antes de publicar.", "warning");
      // Enfocar el primer campo inválido para accesibilidad.
      const primerInvalido = validacion.errores.title ? dom.titleInput : dom.bodyInput;
      if (primerInvalido) primerInvalido.focus();
      return; // No se ejecuta fetch().
    }

    // 4) Preparar el objeto de publicación.
    const publicacion = construirPublicacion(
      validacion.datos.title,
      validacion.datos.body,
      API_CONFIG.defaultUserId
    );

    // 5) Activar indicador de carga y bloquear el botón.
    state.isSubmitting = true;
    activarCarga();
    mostrarEsqueleto();

    try {
      // 6) Enviar la petición y esperar la respuesta.
      const respuesta = await enviarPublicacion(publicacion);

      // 7) Actualizar el DOM con la publicación devuelta.
      quitarEsqueleto();
      renderizarPublicacion(respuesta);

      // 8) Mensaje de éxito (solo si response.ok fue verdadero).
      const mensaje = `¡Publicación creada con éxito! La API devolvió el id ${respuesta.id}.`;
      mostrarEstado(mensaje, "success");
      mostrarToast(mensaje, "success");

      // 9) Limpiar el formulario tras una publicación exitosa.
      dom.form.reset();
      limpiarErrores();
      actualizarContadores();
      actualizarVistaPrevia();

      // 10) Llevar la vista al historial (animación discreta).
      if (dom.resultado && dom.resultado.scrollIntoView) {
        try {
          dom.resultado.scrollIntoView({ behavior: "smooth", block: "nearest" });
        } catch (e) {
          dom.resultado.scrollIntoView();
        }
      }
    } catch (error) {
      // 11) Presentar el error según su tipo.
      quitarEsqueleto();
      mostrarEstado(error.message, "error");
      const tituloToast = error.tipo === "conexion" ? "Sin conexión" : "No se pudo publicar";
      mostrarToast(error.message, "error", tituloToast);
      console.error("[Publicador de Mensajes] Error:", error.tipo || "desconocido", error);
    } finally {
      // 12) Restaurar la interfaz SIEMPRE (éxito o error).
      state.isSubmitting = false;
      desactivarCarga();
    }
  }

  /* ==========================================================================
   * 9. EVENTOS AUXILIARES
   * ========================================================================*/

  /** Actualiza contadores y vista previa mientras se escribe en el título. */
  function manejarInputTitulo() {
    if (normalizarTexto(dom.titleInput.value).length > 0) {
      limpiarErrorCampo(dom.titleInput, dom.titleError);
    }
    actualizarContadores();
    actualizarVistaPrevia();
  }

  /** Actualiza contadores y vista previa mientras se escribe en el contenido. */
  function manejarInputContenido() {
    if (normalizarTexto(dom.bodyInput.value).length > 0) {
      limpiarErrorCampo(dom.bodyInput, dom.bodyError);
    }
    actualizarContadores();
    actualizarVistaPrevia();
  }

  /** Maneja el botón "Limpiar": borra errores, estado y vista previa. */
  function manejarReset() {
    // setTimeout permite que el formulario se vacíe antes de limpiar UI.
    window.setTimeout(function () {
      limpiarErrores();
      ocultarEstado();
      actualizarContadores();
      actualizarVistaPrevia();
    }, 0);
  }

  /** Vacía el historial de publicaciones. */
  function manejarVaciarHistorial() {
    limpiarResultado();
    mostrarToast("Se vació el historial de publicaciones.", "info");
  }

  /* ==========================================================================
   * 10. INICIALIZACIÓN
   * ========================================================================*/
  function inicializar() {
    if (!dom.form) {
      console.error("[Publicador de Mensajes] No se encontró el formulario.");
      return;
    }

    // Evento principal del formulario.
    dom.form.addEventListener("submit", manejarSubmit);

    // Actualización reactiva al escribir.
    if (dom.titleInput) dom.titleInput.addEventListener("input", manejarInputTitulo);
    if (dom.bodyInput) dom.bodyInput.addEventListener("input", manejarInputContenido);

    // Botón limpiar.
    if (dom.resetBtn) dom.resetBtn.addEventListener("click", manejarReset);

    // Botón vaciar historial.
    if (dom.clearHistoryBtn) {
      dom.clearHistoryBtn.addEventListener("click", manejarVaciarHistorial);
    }

    // Efecto ripple en los botones principales.
    [dom.submitBtn, dom.resetBtn].forEach(function (boton) {
      if (boton) boton.addEventListener("click", crearRipple);
    });

    // Estado inicial de contadores y vista previa.
    actualizarContadores();
    actualizarVistaPrevia();
  }

  // Arrancar cuando el DOM esté listo (el script usa `defer`, pero por seguridad).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", inicializar);
  } else {
    inicializar();
  }

  /* ==========================================================================
   * 11. API PÚBLICA DEL MÓDULO (para pruebas)
   * Permite probar las funciones puras desde la consola o con un runner.
   * ========================================================================*/
  window.PublicadorApp = {
    API_CONFIG,
    normalizarTexto,
    validarCampo,
    validarFormulario,
    construirPublicacion,
    mensajeDeErrorHttp,
    crearTarjetaPublicacion,
    enviarPublicacion,
    mostrarToast
  };
})();
