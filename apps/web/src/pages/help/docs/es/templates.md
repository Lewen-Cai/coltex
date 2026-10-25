# Plantillas

## Nuevos proyectos desde plantillas

**Nuevo proyecto** muestra una sola lista: las plantillas integradas y las compartidas contigo. Una etiqueta en cada una dice de dónde viene:

- **Integradas**: vienen con ColTex.
- **Compartido por el administrador del sistema**: para todos en este servidor.
- **Compartido en** el nombre de un grupo: compartida con un grupo en el que estás.
- **Compartido por** un nombre: compartida contigo personalmente.

Los botones sobre la lista (**Todo** y luego los campos) muestran las plantillas de un campo. Solo ves las plantillas compartidas contigo. Ver también [Primeros pasos](#/help/getting-started).

## Publicar un proyecto como plantilla

Los administradores pueden publicar como plantilla un proyecto propio, por ejemplo el formato de tesis de un grupo:

1. En el menú del proyecto (⋯) en la lista de proyectos, o en la configuración del proyecto, elige **Publicar como plantilla…**.
2. Dale un nombre, una descripción y un **Campo** (dónde aparece), elige para quién en **Compartido con** y pulsa **Publicar**.

Para quién puede ser:

- Un administrador: los grupos en los que está y las personas que elija por nombre o correo.
- El administrador del sistema: además, **Todos en este servidor**.
- Los miembros no pueden publicar plantillas; pídeselo a un administrador.

A tener en cuenta:

- Los proyectos nuevos reciben los archivos del proyecto tal como están **en ese momento**, su compilador y su idioma de corrector; no sus miembros, historial ni comentarios.
- La plantilla sigue al proyecto: si cambias el proyecto, los proyectos nuevos posteriores reciben los cambios.
- Abre **Publicar como plantilla…** otra vez para cambiar su nombre, campo o destinatarios, o para **Retirar** la publicación. El administrador del sistema también puede quitar cualquier plantilla en el diálogo de nuevo proyecto.
- Desaparece cuando se elimina el proyecto.

## Importar la plantilla de una revista

Muchas revistas y congresos publican plantillas de LaTeX que no vienen incluidas en ColTex: sus licencias no permiten redistribuirlas, o no forman parte de TeX Live. Entre ellas están NeurIPS, ICML, ICLR, ACL, EMNLP, CVPR, ICCV, AAAI, IJCAI, USENIX, IEEE Access, Springer Nature (`sn-jnl`), PNAS, Science, Cell, eLife, PLOS, Frontiers, MDPI, BMC, Wiley, Taylor & Francis, SAGE, IOP, SIAM, Copernicus, AGU, Astronomy & Astrophysics. Descarga la plantilla oficial del sitio web del congreso o de la editorial e impórtala como plantilla:

1. Pulsa **Nuevo proyecto** y luego **Importar plantilla** (solo administradores).
2. Elige el zip, dale un nombre, una descripción y un **Campo**, elige para quién en **Compartido con** y pulsa **Importar**.

A tener en cuenta:

- Para quién puede ser sigue las reglas de publicar (arriba): los administradores comparten con sus grupos y con personas que elijan; el administrador del sistema, también con todos.
- El zip se convierte en un proyecto tuyo, publicado como plantilla. Su documento principal se detecta como al importar un proyecto; los archivos de compilación y del sistema se omiten.
- El menú ⋯ de la plantilla tiene **Abrir proyecto** (para cambiar sus archivos), **Editar plantilla…** (para cambiar el nombre o los destinatarios, o retirarla) y **Quitar plantilla**.

## Convertir a una plantilla de revista

**Convertir a plantilla…** en el menú de un proyecto (en la configuración del proyecto: «Convertir a una plantilla de revista») reescribe un artículo para otra revista o congreso: IEEE Transactions, Congreso IEEE, Congreso ACM, Revista ACM, Elsevier, Elsevier CAS, Oxford University Press (OUP), Springer LNCS, APS (REVTeX), AMS, APA 7, AAS (AASTeX), MNRAS, ACS o un artículo simple. Cualquier plantilla integrada se puede convertir a cualquiera de ellas.

- El título, los autores, las afiliaciones, el resumen, los paquetes y la bibliografía se reconstruyen en un **proyecto nuevo**, que después se compila. El original no cambia.
- También se leen los artículos escritos con la plantilla `sn-jnl` de Springer Nature, igual que los de BMC, OUP y Elsevier CAS: autores con nombre y apellidos, afiliaciones, `\abstract{}` y resúmenes estructurados, palabras clave y la parte final con las declaraciones.
- Un informe indica qué se cambió y qué hay que revisar. La IA puede ocuparse de lo que quede.
