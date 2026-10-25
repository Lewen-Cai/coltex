# Primeros pasos

ColTex es un editor colaborativo de LaTeX que se ejecuta en tu propio servidor. Funciona de forma muy parecida a Overleaf: el código a la izquierda, el PDF a la derecha, y varias personas pueden editar el mismo proyecto a la vez.

## Nuevos proyectos

Haz clic en **Nuevo proyecto** arriba a la izquierda, ponle un nombre y elige una plantilla:

| Campo | Plantillas |
| --- | --- |
| General | Artículo en blanco, Preprint de arXiv, Revista de Elsevier, Revista de Elsevier (autor–año), Revista de Elsevier (dos columnas), Revista CAS de Elsevier (dos columnas), Nature, Artículo de revisión, Comunicación breve |
| Informática e ingeniería eléctrica | Congreso IEEE, Revista IEEE, Congreso de la IEEE Computer Society, Revista de la IEEE Computer Society, Revista de la IEEE Communications Society, Congreso ACM, Revista ACM, Envío a ACM (anónimo), Congreso ACM SIGPLAN, ACM Transactions on Graphics, Springer LNCS, Actas de PMLR |
| Ingeniería | Congreso de la ASME, Revista de la ASCE, Artículo de congreso de la AIAA, Actas de SPIE |
| Física | APS (REVTeX 4.2), Physical Review Letters, Revista de AIP, Journal of the Physical Society of Japan, Artículo de congreso JACoW |
| Astronomía | Revistas de la AAS (AASTeX), Monthly Notices of the RAS |
| Química | Artículo de revista de la ACS, Letter de la ACS |
| Ciencias de la vida | Artículo de investigación en ciencias de la vida, Nota de aplicación en bioinformática |
| Medicina | Informe de ensayo clínico, Protocolo de ensayo clínico, Estudio observacional, Estudio de precisión diagnóstica, Revisión sistemática y metaanálisis, Caso clínico, Carta de investigación médica, Revista Elsevier CAS, Revista de Oxford University Press |
| Matemáticas y estadística | Artículo AMS, Actas de la AMS, Annals of Mathematics, Artículo de métodos estadísticos |
| Economía | Artículo de economía (estilo AEA), Artículo de econometría |
| Ciencias sociales y humanidades | Manuscrito APA 7, Diseño de revista APA 7, Trabajo de estudiante APA 7, Artículo de humanidades (notas Chicago), Ensayo literario (MLA), Artículo jurídico (OSCOLA) |
| Tierra y medio ambiente | Artículo de geociencias (estilo AGU), Estudio de campo en ecología, Revista de Canadian Science Publishing |

Salvo el artículo en blanco, todas traen un resumen, secciones de ejemplo y un `references.bib`, y compilan tal cual. Las clases son las oficiales que incluye TeX Live. Muchas plantillas conocidas de revistas y congresos no vienen incluidas; en [Plantillas](#/help/templates) se explica por qué y cómo añadirlas.

Los botones sobre las plantillas muestran las de un campo. Las plantillas compartidas contigo (el formato de tesis de un grupo, por ejemplo) están en la misma lista, con una etiqueta que dice quién las compartió; ver [Plantillas](#/help/templates).

Los nuevos proyectos compilan con **Automático**: el motor se elige en cada compilación a partir del documento; consulta [Compilación y PDF](#/help/compiling).

Para traer un proyecto desde Overleaf, elige allí **Download Source** e **Importar** el zip aquí (hasta 200 MB). El documento principal se detecta solo, y el compilador también queda en Automático. Los archivos de compilación que dejan otros editores (`.aux`, `.log`, `.synctex.gz` y similares) y carpetas como `.vscode` se omiten, igual que en Overleaf; los archivos `latexmkrc` y `.bbl` se conservan.

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
