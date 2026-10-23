# Referencias

**Referencias**, en la barra lateral izquierda, trabaja con los archivos `.bib` del proyecto.

## Citar

**Citar** muestra todas las entradas `.bib` del proyecto; busca por autor, título, año o clave. Haz clic en una entrada para insertar `\cite{key}` en el cursor. Al escribir `\cite{` en el editor también se sugieren claves.

## Buscar y añadir

En la pestaña **Añadir**, escribe un título, autores o palabras clave y pulsa Enter: ColTex busca en Crossref (revistas, actas, libros) y arXiv (preprints) y muestra lo que encuentra, con las mejores coincidencias de cada uno primero. **+** añade un artículo al archivo `.bib` elegido bajo el campo. Si arXiv conoce la versión publicada de un preprint, se añade con el DOI de esa versión.

Un DOI (p. ej., `10.1145/3290605.3300857`), un enlace de doi.org o un id de arXiv se añade directamente, sin búsqueda.

Las entradas se obtienen de doi.org y se añaden al final del archivo con una clave única; una que ya esté en el archivo (mismo DOI) no se añade dos veces. Revisa lo que se ha obtenido.

## Zotero

1. En **Configuración → Servicios de sincronización**, introduce una clave de API de Zotero (creada en tu configuración de zotero.org; basta con acceso de lectura). Se guarda cifrada en este servidor y solo se usa para leer tu biblioteca.
2. En la pestaña **Zotero** del panel de referencias, elige una biblioteca o colección para importarla como archivo `.bib` en el proyecto.
3. **Actualizar desde Zotero** reemplaza ese archivo con lo que hay ahora en Zotero, así que edita las entradas en Zotero y no en el archivo.

La actualización usa la conexión de Zotero de quien importó el archivo.
