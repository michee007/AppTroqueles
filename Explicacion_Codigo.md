# 🧠 Guía Fácil para Entender el Código de TroquelApp

Para entender cómo funciona el código de tu aplicación, imagina que estás construyendo una **casa**. Nuestra aplicación tiene 3 pilares fundamentales, igual que una casa:

1. **El HTML (`index.html`) = Los Ladrillos y la Estructura.** Define dónde va cada cosa (el techo, las puertas, las ventanas).
2. **El CSS (`style.css`) = La Pintura y la Decoración.** Decide de qué color es la casa, qué tan grandes son las ventanas y si las luces están prendidas (modo claro) o apagadas (modo oscuro).
3. **El JavaScript (`app.js`) = La Electricidad y la Lógica.** Es el "cerebro". Decide qué pasa cuando presionas el interruptor de la luz, o cuando alguien toca el timbre.

A continuación, vamos a profundizar en el "cerebro" (el archivo `app.js`), explicado de forma muy sencilla.

---

## 1. La Memoria de la Aplicación (LocalStorage)
**¿Qué hace el código?**
```javascript
let troqueles = JSON.parse(localStorage.getItem('troquelesApp_data')) || [];
```
**Explicación sencilla:**
Imagina que `localStorage` es una **libreta de apuntes** mágica que vive dentro del navegador web de tu computadora.
- Cuando abres la aplicación, el código lee esa libreta. 
- Si la libreta tiene datos de troqueles guardados, los carga en la pantalla.
- Si la libreta está vacía (es la primera vez que abres la app), crea una lista en blanco `[]`.
- **Lo mejor:** Si apagas la computadora, la libreta no se borra. Por eso no necesitas internet ni un servidor externo para guardar tus troqueles.

## 2. Mostrando los Datos (Renderizado)
**¿Qué hace el código?**
Hay una función llamada `actualizarVista()` y otra llamada `renderTabla()`.
**Explicación sencilla:**
Cada vez que haces algo importante (guardar un troquel, borrar uno, o escribir en el buscador), el cerebro hace lo siguiente:
1. **Borra** todo lo que está en la tabla de la pantalla.
2. **Revisa** su libreta de apuntes.
3. **Dibuja** fila por fila (`<tr>`) los troqueles que correspondan. 
Es como si un pintor borrara su pizarrón y lo volviera a dibujar en milisegundos cada vez que hay un cambio.

## 3. El Buscador en Tiempo Real
**¿Qué hace el código?**
```javascript
t.nombre.toLowerCase().includes(query)
```
**Explicación sencilla:**
Cuando escribes algo en la barra de búsqueda, el cerebro no espera a que presiones la tecla "Enter". Inmediatamente, toma lo que escribiste, lo convierte a letras minúsculas (para que no importe si escribes "Troquel" o "troquel"), y busca si esa palabra está *incluida* en el nombre, la referencia o el cliente de algún troquel de tu libreta. Los que no coinciden, se ocultan temporalmente.

## 4. ¿Cómo guarda las Imágenes sin un servidor?
**¿Qué hace el código?**
Usa algo llamado `FileReader` y formato `Base64`.
**Explicación sencilla:**
Normalmente, las imágenes (los archivos `.jpg` o `.png`) son pesadas y se guardan en carpetas en la nube.
Para que tu app funcione sin internet, usamos un truco: **Base64**.
El código toma la foto que seleccionaste y la **traduce a un texto larguísimo** (miles de letras y números). 
Ese texto larguísimo se guarda en la libreta de apuntes (`localStorage`). Cuando la aplicación necesita mostrar la foto, lee el texto larguísimo y lo vuelve a traducir en una imagen.

## 5. Exportar a Excel y PDF
**¿Qué hace el código?**
Usa librerías externas (como `SheetJS` y `html2pdf`).
**Explicación sencilla:**
Una "librería" es como contratar a un experto externo para que haga un trabajo difícil.
- En lugar de que nosotros programemos desde cero cómo crear un archivo de Excel, llamamos al experto `SheetJS`. Le entregamos nuestra lista de troqueles y él nos devuelve un archivo `.xlsx` listo para descargar.
- Para el PDF (`html2pdf`), el experto toma una "fotografía" exacta de lo que estás viendo en tu pantalla (la tabla o la hoja de vida del troquel) y convierte esa fotografía en un documento PDF.

## 6. El Modo Oscuro
**¿Qué hace el código?**
Usa algo llamado `data-theme="dark"`.
**Explicación sencilla:**
Imagina que tu casa (el CSS) tiene dos juegos de pintura. Uno para el día y uno para la noche.
Cuando haces clic en el botón de la lunita, el cerebro (JavaScript) le pone una etiqueta a la casa que dice "es de noche". Automáticamente, las paredes pasan a ser grises oscuras y las letras blancas. Además, el cerebro anota en la libreta que te gusta el modo oscuro, para que la próxima vez que abras la app, siga de noche.
