# Primeros pasos

ColTex es un editor colaborativo de LaTeX que se ejecuta en tu propio servidor. Funciona de forma muy parecida a Overleaf: el código a la izquierda, el PDF a la derecha, y varias personas pueden editar el mismo proyecto a la vez.

## Nuevos proyectos

Haz clic en **Nuevo proyecto** arriba a la izquierda, ponle un nombre y elige una plantilla:

| Plantilla | Clase |
| --- | --- |
| Artículo en blanco | La clase estándar `article`, el comienzo más sencillo |
| Preprint de arXiv | `article`, una columna, autores con afiliaciones (authblk), referencias con natbib |
| Congreso IEEE / Revista IEEE | `IEEEtran` en modo congreso / revista |
| Congreso ACM / Revista ACM | `acmart` sigconf / acmsmall |
| Springer LNCS | `llncs`, para LNCS y otras actas de Springer |
| Revista de Elsevier | `elsarticle`, preprint a una columna |
| APS (REVTeX 4.2) | `revtex4-2`, para revistas de Physical Review y AIP |

Salvo el artículo en blanco, todas incluyen un resumen, palabras clave, una ecuación, una figura, una tabla y un `references.bib`, y compilan tal como están. Las clases son las oficiales que vienen con TeX Live. Los congresos que publican archivos de estilo nuevos cada año (NeurIPS, ICML) no están en TeX Live: sube los archivos de ese año a un proyecto y publícalo como plantilla.

Los proyectos que otras personas han publicado como plantillas (por ejemplo, el formato de tesis de un grupo) aparecen en «Compartidas en este servidor».

Los nuevos proyectos compilan con **Automático**: el motor se elige en cada compilación a partir del documento; consulta [Compilación y PDF](#/help/compiling).

Para traer un proyecto desde Overleaf, elige allí **Download Source** e **Importar** el zip aquí (hasta 200 MB). El documento principal se detecta solo, y el compilador también queda en Automático.

## El editor

- **Arriba**: el nombre del proyecto, quién está conectado, **Historial** y **Compartir**.
- **Barra lateral izquierda**: cambia el panel izquierdo entre archivos, búsqueda, referencias, revisión, chat e IA; los atajos de teclado y la configuración del proyecto están en su parte inferior.
- **Centro**: el editor, con **Código / Visual** en su barra de herramientas.
- **Derecha**: el PDF, con **Recompilar**, **Registros**, el botón para ir al PDF, abrir en una ventana nueva y descargar.

## Compilación y PDF

- Haz clic en **Recompilar** o pulsa `Mod+S` / `Mod+Enter`. La compilación automática está activada por defecto y compila cuando dejas de escribir.
- **Registros** muestra el número de errores; ábrelo para ver cada uno con una explicación, y haz clic en uno para saltar a su línea. Los errores también se marcan junto a los números de línea en el editor.
- **Código ↔ PDF**: con el cursor en el código, haz clic en la mira de la barra del PDF y el PDF se desplaza hasta ese punto; haz doble clic en el PDF para volver al código.
- **El PDF en su propia ventana**: «Abrir el PDF en una ventana nueva» en la barra del PDF te permite llevar el PDF a otra pantalla mientras el editor ocupa toda su ventana. Consulta [Compilación y PDF](#/help/compiling).

## Siguientes pasos

- [Editor](#/help/editor): los dos modos, tablas y figuras, vista previa de ecuaciones, revisión ortográfica, el menú contextual.
- [Colaboración](#/help/collaboration): invitar a personas, comentarios, control de cambios, chat.
- [Agente de IA](#/help/ai): explicaciones y cambios, que solo se aplican después de que los revises.
