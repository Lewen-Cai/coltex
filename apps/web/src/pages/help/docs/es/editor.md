# Editor

## Modo código y modo visual

**Código / Visual** en la barra de herramientas cambia la forma de editar; ambos editan el mismo código LaTeX.

- **Código**: el código tal cual, con resaltado, autocompletado y emparejamiento de paréntesis. Con el cursor en una fórmula, la ecuación compuesta se muestra encima (`Esc` la oculta).
- **Visual**: los encabezados, la negrita, las listas, las matemáticas, las tablas y las figuras se ven compuestos; el código se muestra donde está el cursor. Ideal para leer y editar texto.

## Barra de herramientas

Nivel de encabezado, negrita, cursiva, matemáticas, símbolos, enlaces, `\ref`, `\cite`, figuras, tablas, listas y búsqueda. Los botones que no caben pasan al menú **⋯**.

- **Símbolos** (Σ): letras griegas, operadores, flechas y más, por categorías; haz clic para insertar.
- **Tablas**: elige el tamaño al insertarla. En modo visual, haz clic en una tabla para editar sus celdas (`Tab` pasa de una a otra); su barra de herramientas añade y quita filas y columnas, combina celdas y define la alineación y los bordes.
- **Figuras**: sube una imagen, elige una del proyecto, o pega o suelta una imagen en el editor. En modo visual, el botón de edición de una figura cambia su ancho, su leyenda y su etiqueta.

## Autocompletado

Al escribir `\` se sugieren comandos; `\ref{` y `\cite{` muestran las etiquetas y las claves bibliográficas del proyecto. `Ctrl+Space` abre las sugerencias en cualquier momento.

## Errores

- **Errores de compilación**: los errores y advertencias de la última compilación en el archivo abierto llevan un punto junto al número de línea, y los errores aparecen subrayados. Pasa el ratón por encima para ver el mensaje de LaTeX y una explicación.
- **Revisión de código**: revisa mientras escribes, sin compilar: entornos sin cerrar o mal emparejados, una `}` o un `$` sueltos, comandos matemáticos fuera de las matemáticas. No se marca lo que estás escribiendo en ese momento. Rodea una parte con `%%begin novalidate` y `%%end novalidate` para omitirla.

## Revisión ortográfica

Las palabras mal escritas llevan un subrayado rojo de puntos (el texto CJK no se revisa). Haz clic derecho en una para ver sugerencias o **Añadir al diccionario**. El idioma es una opción del proyecto.

Tu diccionario está en **Configuración → Diccionario**, en la parte inferior de la barra lateral del editor; sus palabras cuentan como correctas en todos tus proyectos. Escribe en el campo para buscar una palabra y pulsa Enter para añadirla si aún no está; las letras sobre la lista saltan a esa letra. El menú **⋯** importa un archivo de texto (una palabra por línea, o separadas por espacios o comas; también sirven los archivos `.dic` de Hunspell), exporta tus palabras como `dictionary.txt` y las quita todas. Los editores abiertos vuelven a revisar las palabras al instante.

## Menú contextual

Cortar, copiar, pegar, seleccionar todo, eliminar, ir al PDF y añadir un comentario. Sobre `\ref{…}` ofrece **Ir a la etiqueta**; sobre `\input{…}` o `\include{…}`, **Abrir archivo**.

## Esquema y ruta de navegación

- **Esquema del archivo**, bajo el árbol de archivos, muestra las secciones del archivo abierto; haz clic en una para ir allí. La sección en la que estás aparece resaltada.
- La fila sobre el editor muestra «archivo › sección › subsección» para el cursor; haz clic en una sección para ir a ella. Se puede desactivar en la configuración del editor.

## Búsqueda

`Mod+F` (o `Mod+Shift+F`, o el botón de búsqueda de la barra de herramientas) abre el panel **Buscar** a la izquierda con el texto seleccionado ya escrito. Busca en todo el proyecto, con las coincidencias del archivo abierto primero, con expresiones regulares, distinción de mayúsculas y palabra completa, y reemplaza una coincidencia o todas. Antes de reemplazar todo se guarda una versión.

## Configuración del editor

**Configuración**, en la parte inferior de la barra lateral izquierda, agrupa sus opciones en categorías a la izquierda:

- **Proyecto**: compilador, documento principal, idioma de la revisión ortográfica (los cambian los editores, para todos) y la dirección de clonado de Git;
- **Apariencia**: tamaño de fuente, fuente (monoespaciada o sans serif), interlineado, **Colores del código** (GitHub, Solarized, Monokai, Dracula, Nord, One Dark y más, solo en modo código), ruta de navegación;
- **Edición**: combinaciones de teclas (predeterminadas, Vim o Emacs) e interruptores para la revisión de código, la vista previa de ecuaciones, el cierre automático de paréntesis y el autocompletado;
- **Atajos de teclado**: consulta más abajo;
- **Acciones**: recuento de palabras, copia, conversión de plantilla, publicación como plantilla.

La apariencia, la edición y los atajos son tuyos, se guardan en este navegador y valen para todos los proyectos.

## Atajos de teclado

**Atajos**, en la barra lateral izquierda, los muestra todos. Los más usados:

| Acción | Teclas |
| --- | --- |
| Compilar | `Mod+S` o `Mod+Enter` |
| Deshacer / rehacer | `Mod+Z` / `Mod+Shift+Z` |
| Buscar y reemplazar | `Mod+F` |
| Negrita / cursiva | `Mod+B` / `Mod+I` |
| Comentar o descomentar líneas | `Mod+/` |
| Ir a la línea | `Mod+Alt+G` |
| Comentar la selección | `Mod+Alt+M` |
| Mostrar sugerencias | `Ctrl+Space` |

Las teclas se muestran según tu sistema: ⌘, ⌥ y ⇧ en un Mac, Ctrl, Alt y Shift en Windows y Linux. Estas son las teclas predeterminadas.

### Tus propios atajos

En **Atajos de teclado**, en la configuración, haz clic en **Cambiar** junto a un comando y pulsa las nuevas teclas. Necesitan Ctrl (⌘ en un Mac) o Alt; no se pueden usar las teclas que ya usa otro comando ni las que quedan reservadas para el navegador y la edición básica (deshacer, copiar, pegar, seleccionar todo…). Restablece una o todas. Las indicaciones de la barra de herramientas y la lista de atajos mostrarán entonces tus teclas.
