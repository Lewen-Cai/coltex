# Historial

**Historial**, en la parte superior del editor, abre la vista del historial. Funciona como un git log: cada versión tiene un identificador corto (como `a1b2c3d`), una descripción, cuándo se hizo y quién la hizo.

- Las versiones se registran automáticamente tras una pausa en la edición, junto con quién hizo los cambios.
- **Guardar versión** registra el estado actual en ese momento, con tu descripción (como un mensaje de commit). Si nada cambió desde la última versión, la descripción se convierte en una etiqueta de esa versión.
- Selecciona una versión para ver qué archivos cambió y cómo, o compárala con el proyecto actual.
- **Revertir estos cambios** deshace solo lo que cambió esa versión y conserva todo lo cambiado después (como `git revert`). Si un archivo se volvió a cambiar después de una forma que entra en conflicto, no se cambia nada y se indica el archivo.
- **Restaurar proyecto** devuelve cada archivo a como estaba en esa versión; los archivos añadidos después se quitan. **Restaurar este archivo** hace lo mismo con un solo archivo.
- Las reversiones y restauraciones son versiones propias («Revierte a1b2c3d», «Vuelta a a1b2c3d»; haz clic en el identificador para ir a esa versión), así que también se pueden deshacer.
- **Añadir etiqueta** pone nombre a una versión (p. ej., «Enviado») para encontrarla después.
- Los archivos de cualquier versión se pueden descargar como .zip.

> También se guarda una versión antes de aplicar cambios de la IA, antes de un reemplazo en todo el proyecto, de un git push, de una reversión y de una restauración.
