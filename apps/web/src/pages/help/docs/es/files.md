# Archivos

## El árbol de archivos

- Los botones de su cabecera: nuevo archivo, nueva carpeta, subir y añadir un archivo vinculado.
- Arrastra un archivo sobre una carpeta para moverlo; haz doble clic en un nombre para cambiarlo. Los archivos que sueltes desde tu equipo se suben.
- Haz clic derecho en un archivo o una carpeta para crear, subir, cambiar el nombre o eliminar.
- Un punto de color junto a un archivo indica que otra persona lo tiene abierto.

Los archivos eliminados se pueden recuperar desde el historial.

## Archivos vinculados

Un archivo vinculado viene de otro lugar y se puede actualizar desde su origen en cualquier momento:

- **De otro proyecto**: cualquier archivo de otro proyecto, o su PDF compilado (se compila primero). Útil para figuras o un `.bib` compartidos, o para usar el PDF de un proyecto como figura en otro.
- **Desde una URL**: se descarga de una dirección pública (hasta 50 MB). No se pueden usar direcciones de la red local o privada.

> Los archivos vinculados llevan una marca de enlace en el árbol; pasa el ratón por encima para ver de dónde vienen. Con clic derecho, **Actualizar el archivo vinculado** lo vuelve a obtener y lo reemplaza. Para añadirlo o actualizarlo necesitas tener acceso propio al proyecto de origen.

## Git

Cada proyecto se puede clonar, y se pueden hacer pull y push con git:

1. Crea un token para Git en **Configuración → Servicios de sincronización** (se muestra una sola vez; guárdalo). Un token de **Solo lectura** puede clonar y hacer pull, pero no push.
2. Copia la dirección de clonado de la configuración del proyecto y ejecuta `git clone <address>`. Cuando git lo pida, usa cualquier nombre de usuario y el token como contraseña.
3. Haz commit en local y `git push`: los cambios entran en el proyecto al instante, donde los ven los colaboradores.

Conviene saber:

- Cada proyecto tiene una sola rama, `main`.
- Si alguien cambió el proyecto desde tu último pull, git rechaza el push: haz primero `git pull` y luego vuelve a hacer push.
- Antes de aplicar un push, el estado del proyecto se guarda como versión.
- Los revisores y los lectores no pueden hacer push.
- Para no escribir el token cada vez: `git config --global credential.helper store` (u `osxkeychain` en un Mac).
