# 🏭 Documentación Técnica: TroquelApp

**Versión:** 1.0.0  
**Desarrollado con:** Antigravity (IA)  
**Propósito:** Aplicación local para la gestión, registro y control de ciclo de vida (hoja de vida) de troqueles industriales.

---

## 🛠 Tecnologías Utilizadas

La aplicación está construida usando tecnologías web estándar, sin requerir la instalación de servidores locales (Node.js, Apache, etc.).

- **HTML5:** Estructura semántica de la interfaz.
- **CSS3 Vanilla:** Diseño "premium", variables CSS, Flexbox/Grid, responsivo y soporte nativo para Tema Oscuro/Claro. No utiliza frameworks como Bootstrap o Tailwind, lo que hace el código ultra ligero.
- **JavaScript (ES6):** Lógica de negocio, manipulación del DOM y almacenamiento de datos.
- **LocalStorage:** Base de datos NoSQL temporal integrada directamente en el navegador web del usuario (persistencia de datos sin servidor).
- **Librerías Externas (Vía CDN):**
  - *FontAwesome:* Iconografía.
  - *SheetJS (`xlsx`):* Generación y exportación de tablas a Microsoft Excel.
  - *html2pdf.js:* Renderizado de vistas HTML a documentos PDF.

---

## 📂 Estructura de Archivos

```text
AppTroqueles/
│
├── index.html     # Estructura de la aplicación, Modales y UI Principal.
├── style.css      # Hoja de estilos principal (modo claro y oscuro).
├── app.js         # Motor lógico, guardado y renderizado dinámico.
└── Documentacion.md # Este archivo.
```

---

## 💾 Modelo de Datos (Data Structure)

Cada "Troquel" se guarda en el LocalStorage bajo la clave `troquelesApp_data` con la siguiente estructura de objeto (JSON):

```json
{
  "id": "TRQ-1682451234567",         // Identificador único generado por Date.now()
  "nombre": "Troquel Base Plana",    // String (Requerido)
  "referencia": "REF-001",           // String (Requerido)
  "cliente": "Empresa S.A.",         // String
  "ubicacion": "Estante A - Fila 2", // String
  "cantidad": 5,                     // Number (Stock físico)
  "cavidades": 4,                    // Number (Cavidades de inyección/corte)
  "costo": 1250.50,                  // Number (Valor monetario)
  "proveedor": "Metalúrgica X",      // String
  "fechaIngreso": "2023-05-12",      // String (YYYY-MM-DD)
  "estadoDepurado": "Activo",        // String: "Activo" | "En Mantenimiento" | "Depurado"
  "fechaDepuracion": "",             // String (YYYY-MM-DD)
  "imagenes": ["data:image/jpeg;base64,/9j/4AA..."] // Array de Strings (Base64)
}
```

---

## ✨ Funcionalidades Principales

### 1. Gestión de Pestañas (Tabs)
El sistema divide inteligentemente los registros:
- **Activos:** Lista únicamente los troqueles cuyo estado sea `Activo` o `En Mantenimiento`.
- **Depurados:** Lista únicamente los troqueles marcados como `Depurado`.

### 2. Guardado de Imágenes en Base64
El formulario incluye un input file con soporte `capture="environment"`. En dispositivos móviles, esto abre directamente la cámara del celular.
Las imágenes seleccionadas se convierten instantáneamente a cadenas de texto **Base64** mediante la API `FileReader` de JS. Esto permite que las imágenes se guarden dentro del LocalStorage de manera autónoma.

### 3. Modo Oscuro (Dark Theme)
Utiliza un atributo `data-theme="dark"` inyectado en el nodo `:root` del DOM.
Al presionar el botón de la luna/sol, JavaScript intercambia el atributo y guarda la preferencia en LocalStorage bajo la clave `troquelesApp_theme`.

### 4. Búsqueda y Filtros en Tiempo Real
Un evento `oninput` captura el texto del buscador global. El array de datos se filtra si el texto coincide parcialmente con el `nombre`, `referencia` o `cliente`. El renderizado ocurre instantáneamente sin recargar la página.

### 5. Exportaciones Dinámicas
- **Excel:** La función `exportarExcel()` construye una hoja de cálculo al vuelo mapeando solo los datos de la pestaña visible. Omite intencionalmente las imágenes (Base64) para evitar la corrupción o tamaño excesivo del documento Excel.
- **PDF de Lista:** Utiliza la librería `html2pdf.js` para tomar un "screenshot" vectorial de la tabla visible (ocultando botones de acciones vía CSS `.no-print`). Se ajusta a tamaño A4 Horizontal (`landscape`).
- **Hoja de Vida en PDF:** Imprime la ficha técnica individual y la galería de fotos del modal de detalles.

---

## 🚀 Despliegue y Próximos Pasos

Dado que es una "Progressive Web App" puramente estática, el despliegue es inmediato. Para usarla, el usuario simplemente debe abrir el archivo `index.html` en Chrome, Safari o Edge.

**Consideraciones para el futuro (Escalabilidad):**
Si el inventario de troqueles crece masivamente o las imágenes son muy pesadas, el LocalStorage del navegador se quedará sin espacio (su límite suele ser de 5MB a 10MB). 
En ese caso, el siguiente paso evolutivo recomendado es conectar `app.js` a **Firebase Firestore** (para los datos de texto) y **Firebase Storage** (para guardar los archivos de imagen), transformando la herramienta en un sistema Cloud multi-usuario real.
