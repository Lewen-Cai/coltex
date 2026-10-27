# Compilación y PDF

## Compilador y documento principal

La configuración del proyecto incluye el **Compilador** y el **Documento principal**:

- **Automático** (el valor predeterminado de los nuevos proyectos): se elige en cada compilación a partir del documento. XeLaTeX cuando el preámbulo (con los archivos que incluye con `\input` y los `.sty`/`.cls` propios del proyecto) carga `ctex`, `xeCJK`, `fontspec`, `unicode-math` y similares, o la clase es `ctexart`/`ctexbook`, etc.; LuaLaTeX cuando carga `luacode` o `luatexja`; pdfLaTeX en los demás casos. Una primera línea `% !TEX program = xelatex`, o un `latexmkrc` en el proyecto, decide en su lugar.
- **pdfLaTeX**: la opción habitual para documentos en inglés.
- **XeLaTeX**: necesario para el chino (ctex) y las fuentes del sistema.
- **LuaLaTeX**: también admite fuentes del sistema.

Si eliges un motor, se usa siempre, sin detección.

> Para el chino, carga `\usepackage[UTF8]{ctex}` (o usa la clase `ctexart`) y Automático cambia a XeLaTeX. El texto en chino sin ctex falla con pdfLaTeX con el mensaje “Unicode character … not set up for use with LaTeX”.

El documento principal es el archivo desde el que empieza una compilación; elígelo en **Documento principal** en la configuración del proyecto.

Las compilaciones usan TeX Live completo con latexmk, que ejecuta LaTeX, BibTeX/Biber y los índices tantas veces como haga falta. Se ejecutan aisladas, sin acceso a la red, y el shell escape está restringido.

## Opciones de compilación

La flecha junto a **Recompilar** ofrece:

- **Compilación automática**: compila cuando dejas de escribir (una compilación a la vez por proyecto, por muchas personas que escriban).
- **Modo de compilación**: Normal o Rápido [borrador]. El modo borrador omite las imágenes y es más rápido.
- **Gestión de errores de compilación**: detenerse en el primer error o intentar compilar a pesar de los errores.
- **Limpiar y recompilar**: cuando una compilación sale mal, elimina los archivos auxiliares y compila desde cero.

Estas opciones se guardan por proyecto en este navegador.

## Registros

El número en **Registros** es la cantidad de errores. El registro muestra errores, advertencias y problemas de composición:

- cada uno con el mensaje de LaTeX y, para los problemas habituales, una explicación (si falta un paquete, por ejemplo, indica qué paquete añadir);
- haz clic en uno para saltar a su archivo y línea;
- también está el registro sin procesar, y la IA puede explicar o corregir los errores.

> Cuando una compilación falla, el PDF de la última compilación correcta sigue en pantalla.

## Entre el código y el PDF

- **Código → PDF**: con el cursor en el código, haz clic en **Localizar** en la barra del PDF (o en «Ir al PDF» en el menú contextual); el PDF se desplaza hasta allí y lo resalta.
- **PDF → código**: haz doble clic en el PDF; el editor abre el archivo en esa línea.
- **Enlaces en el PDF**: las citas, las referencias a figuras, tablas, ecuaciones y secciones, y el índice saltan a su lugar en el PDF (con `hyperref`); las direcciones web se abren en una pestaña nueva.

## Diseño: editor, PDF o ambos

El selector de vista (cuatro botones pequeños a la derecha de la barra del PDF) muestra **Solo el editor**, **Editor y PDF** uno al lado del otro o **Solo el PDF**, como en Overleaf, y el cuarto abre el PDF en una ventana nueva; este navegador recuerda la elección. Arrastrar el divisor del todo hacia un lado también oculta ese panel.

- Con solo el editor, **Recompilar** y el mismo selector están al final de la barra de herramientas del editor.
- **Ir al PDF** desde el editor muestra el PDF cuando está oculto.
- En una ventana estrecha (una tableta o un teléfono) solo cabe uno a la vez, y los paneles laterales (archivos, búsqueda…) cubren el editor mientras están abiertos.

## El PDF en su propia ventana

**Abrir el PDF en una ventana nueva** (el último botón del selector de vista) abre el PDF en una ventana aparte que puedes llevar a otra pantalla:

- La ventana del editor quita su panel del PDF y el editor la ocupa entera; **Recompilar** pasa al final de la barra de herramientas del editor.
- La ventana del PDF tiene Recompilar, Registros, ir al PDF y descargar. Al hacer doble clic en su PDF se salta al código en la ventana del editor.
- **Mostrar el PDF aquí** en la barra de herramientas del editor, o cerrar la ventana, recupera el panel del PDF.

## Descargas

- La barra del PDF descarga el PDF actual.
- El botón de descarga en la parte superior del árbol de archivos descarga los archivos fuente del proyecto como .zip.
- En la lista de proyectos, el menú de un proyecto (⋯) tiene **Descargar PDF**, que lo compila primero, y **Descargar .zip** para todos sus archivos fuente.

## Exportar a Word

Algunas revistas solo aceptan archivos de Word. **Exportar a Word…** en el menú de un proyecto (⋯) de la lista de proyectos, o en **Acciones** dentro de la configuración del proyecto, convierte el proyecto en un .docx.

- La portada sale del documento: título, autores, afiliaciones, autor de correspondencia, resumen y palabras clave, para las clases que lee la conversión de plantillas (Springer Nature `sn-jnl`, Elsevier, Elsevier CAS, OUP, BMC, IEEE, ACM, LNCS, REVTeX, `article`).
- Las fórmulas se convierten en ecuaciones de Word. Word numera las figuras y las tablas, las figuras PDF y EPS pasan a ser imágenes y las ecuaciones numeradas conservan su número, así que `\eqref` sigue apuntando a ellas.
- Las tablas se convierten en tablas de Word editables, con las celdas combinadas incluidas. La lista de referencias queda donde estaba la bibliografía, bajo su título (References o el del propio documento), y las citas enlazan con sus entradas.
- **Estilo de citas**: **Como en el documento** sigue el estilo bibliográfico del documento. También puedes elegir APA, Vancouver, AMA, IEEE, Nature o Chicago, o un archivo `.csl` subido al proyecto.
- **Plantilla de Word**: sube al proyecto la plantilla de Word (`.docx`) de la revista y elígela aquí; el documento toma sus estilos. El campo aparece cuando el proyecto tiene un archivo `.docx`.
- Revisa el resultado antes de enviarlo: tus propias macros y las tablas complejas pueden necesitar retoques en Word. Los dibujos TikZ no se convierten: compílalos como imágenes e incluye esas imágenes.
