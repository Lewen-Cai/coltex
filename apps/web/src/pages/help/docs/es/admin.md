# Administración

El administrador del sistema ve las páginas de administración en **Configuración**, en el menú del avatar; los administradores ven ahí **Gestionar usuarios** e **Invitaciones**, para su propio equipo.

## Usuarios e invitaciones

- No hay registro público: las cuentas solo se crean con enlaces de invitación, y los proyectos solo se comparten con personas que tienen cuenta.
- Las cuentas tienen uno de tres roles:
  - **Miembro**.
  - **Administrador**: dirige un **equipo**, por ejemplo un director y sus estudiantes. Los miembros que invita un administrador se unen a su equipo, y el administrador solo gestiona a esos miembros.
  - **Administrador del sistema**: hay exactamente uno, la cuenta creada en la configuración inicial. Gestiona toda la instancia (servicios de IA, copias de seguridad, red) y ve a todo el mundo. No se puede nombrar a un segundo, así que una cuenta de administrador no puede apoderarse de la instancia.
- **Invitaciones**: enlaces de un solo uso, para un correo electrónico o (con el correo vacío) para cualquiera con el enlace, con una fecha de caducidad. Los enlaces de una invitación pendiente siguen en la lista (**Enlace**), uno por cada dirección en la que se puede acceder a ColTex (LAN, Tailscale, Cloudflare). El administrador del sistema invita a miembros o administradores y elige el **Grupo de IA** de la nueva cuenta. Los administradores solo invitan a miembros, a su propio equipo; esos miembros reciben el grupo de IA del administrador. Los administradores solo ven y revocan sus propias invitaciones.
- **Gestionar usuarios**: el administrador del sistema ve todas las cuentas, hace a las personas miembros o administradores, mueve miembros entre equipos (**Equipo** en el menú de la fila), restablece contraseñas y suspende o elimina cuentas. Un administrador se ve a sí mismo y a su equipo, y solo restablece contraseñas, suspende o elimina a los miembros de su equipo. Al eliminar una cuenta se eliminan los proyectos de los que es propietaria.
- Para pasar el rol de administrador del sistema a otra persona (o recuperarlo si se pierde esa cuenta), ejecuta `coltex cli system-admin <email>` en el servidor; el administrador del sistema anterior pasa a ser administrador.

## Servicios de IA

- **Servicios de IA**: conecta proveedores con claves de API o con inicio de sesión de suscripción (Claude Pro/Max, ChatGPT, Copilot…), o tus propios servidores compatibles con OpenAI (Ollama, vLLM, LM Studio…). Las claves se guardan cifradas, los miembros nunca las ven y las solicitudes pasan por este servidor.
- Si el inicio de sesión de una suscripción termina en una dirección localhost que no carga, copia esa dirección completa de la barra de direcciones y pégala en ColTex.
- Configura los tres modelos de **Automático** y todos empiezan con la elección automática: el **evaluador** (un modelo barato y rápido) lee cada mensaje y lo pasa al modelo **ligero** (preguntas rápidas, correcciones pequeñas) o al **potente** (varios errores, cambios en varios archivos, redacción cuidadosa). Hasta que los tres estén configurados, cada persona empieza con el primer modelo que tiene permitido.
- **Uso y acceso a la IA**: solicitudes y tokens del grupo y por persona. Quién puede usar qué modelos se define con los **Grupos de IA**: cada grupo permite proveedores (incluidos los modelos que se añadan después) o modelos concretos, p. ej., «Doctorandos» con el modelo potente y «Estudiantes de grado» con el ligero. Cada persona está como mucho en un grupo, elegido en la invitación o después abriendo a la persona en la lista. Las personas sin grupo no pueden usar el agente de IA, así que las nuevas no tienen IA hasta que el administrador del sistema las añade (los miembros invitados por un administrador reciben el grupo del administrador). El administrador del sistema siempre puede usar todos los modelos. Al eliminar un grupo, sus personas se quedan sin IA hasta que se unen a otro.

  Un grupo también puede limitar cuánto usa cada uno de sus miembros por día, semana o mes: tokens, coste (a precio de lista) o ambos. Un mensaje se rechaza cuando un miembro ha alcanzado el límite, hasta que empieza el siguiente periodo (días naturales, semanas a partir del lunes, meses, en la zona horaria del servidor); el mensaje que lo supera termina igualmente. Los miembros ven lo que han usado bajo el cuadro de mensaje del agente de IA. El administrador del sistema no tiene límites.

  Para ajustar a una persona concreta, ábrela en la lista: en **Personalizar**, **Acceso propio a modelos** y **Límite de uso propio** reemplazan los de su grupo mientras están activados (el acceso propio también funciona sin grupo). La lista la marca como **Personalizado**.

## Almacenamiento y copias de seguridad

- Los archivos de los proyectos se guardan en el disco local o en un almacenamiento compatible con S3, según se configure al iniciar el servidor (`STORAGE` y `S3_*`). El historial, los resultados de compilación y las copias de trabajo del compilador se quedan en el directorio de datos.
- Las **copias de seguridad en WebDAV** van a una carpeta en Nextcloud, ownCloud, un NAS o cualquier servidor WebDAV. Cada copia es un archivo con la base de datos, los archivos de todos los proyectos y su historial. Prográmalas a diario o cada semana y elige cuántas conservar. Usa una contraseña de aplicación si el servidor la ofrece.
> **Cifrado**: las copias cifradas (AES-256) también contienen el secreto de la instancia, para que los servicios de IA conectados sigan funcionando tras una restauración. **Guarda la contraseña en otro lugar: sin ella no se puede abrir una copia.**
- La restauración se hace en el servidor con el comando `restore` mientras el servidor está detenido; consulta la guía de operaciones.

## Monitorización

**Resumen** muestra el estado en vivo del servidor, el compilador y la base de datos, con gráficos históricos de CPU, memoria y compilaciones. El servidor toma muestras cada 10 segundos y las conserva 30 días, también mientras nadie tiene la página abierta.

## Red

**Red** muestra las direcciones en las que se accede a ColTex (las invitaciones y las direcciones de Git las usan), activa Tailscale y Cloudflare Tunnel integrados, y muestra cómo llegan las solicitudes al servidor. Consulta [Despliegue y red](#/help/deployment).
