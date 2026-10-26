# Administración

El administrador del sistema ve las páginas de administración en **Configuración**, en el menú del avatar; los administradores ven ahí **Gestionar usuarios** e **Invitaciones**, para su propio equipo.

## Usuarios e invitaciones

- No hay registro público: las cuentas solo se crean con enlaces de invitación, y los proyectos solo se comparten con personas que tienen cuenta.
- Las cuentas tienen uno de tres roles:
  - **Miembro**.
  - **Administrador**: dirige un **equipo**, por ejemplo un director y sus estudiantes. Los miembros que invita un administrador se unen a su equipo, y el administrador solo gestiona a esos miembros.
  - **Administrador del sistema**: hay exactamente uno, la cuenta creada en la configuración inicial. Gestiona toda la instancia (servicios de IA, copias de seguridad, red) y ve a todo el mundo. No se puede nombrar a un segundo, así que una cuenta de administrador no puede apoderarse de la instancia.
- **Invitaciones**: enlaces de un solo uso, para un correo electrónico o (con el correo vacío) para cualquiera con el enlace, con una fecha de caducidad. Los enlaces de una invitación pendiente siguen en la lista (**Enlace**), uno por cada dirección en la que se puede acceder a ColTex (LAN, Tailscale, Cloudflare). El administrador del sistema invita a miembros o administradores y elige el **Grupo de IA** de la nueva cuenta. Los administradores solo invitan a miembros, a su propio equipo; esos miembros reciben el grupo de IA del administrador. Los administradores solo ven y revocan sus propias invitaciones.
- **Gestionar usuarios**: el administrador del sistema ve todas las cuentas, hace a las personas miembros o administradores, mueve miembros entre equipos (**Equipo** en el menú de la fila), restablece contraseñas, abre **Inicios de sesión y dispositivos** y suspende o elimina cuentas. La lista marca las cuentas **Bloqueada** y las que tienen activada la verificación en **Dos pasos**. Un administrador se ve a sí mismo y a su equipo, y solo restablece contraseñas, suspende o elimina a los miembros de su equipo. Al eliminar una cuenta se eliminan los proyectos de los que es propietaria.
- Para pasar el rol de administrador del sistema a otra persona (o recuperarlo si se pierde esa cuenta), ejecuta `coltex cli system-admin <email>` en el servidor; el administrador del sistema anterior pasa a ser administrador.
- ¿Has olvidado una contraseña, incluida la del administrador del sistema? Ejecuta `coltex cli reset-password <email>` en el servidor: pide la nueva contraseña dos veces y cierra la sesión de esa cuenta en todas partes. El titular de la cuenta recibe una notificación de lo ocurrido, y el registro del servidor (`coltex logs`) lo deja anotado.
- ¿Se perdieron el teléfono de la verificación en dos pasos y los códigos de recuperación? `coltex reset-2fa <email>` la desactiva para esa cuenta (con una notificación a su titular y una línea en el registro del servidor).

## Inicios de sesión

Solo el administrador del sistema ve **Inicios de sesión**: todos los inicios de sesión en la instancia (también los intentos con correos que no tienen cuenta), con el resultado, el navegador y el sistema, y la dirección con su ubicación. Haz clic en una persona (o usa **Inicios de sesión y dispositivos** en Gestionar usuarios) para ver sus inicios de sesión y los dispositivos en los que tiene la sesión iniciada; **Cerrar sesión** termina la sesión de un dispositivo y **Cerrar sesión en todas partes**, la de todos. Los demás solo ven los suyos, en **Configuración → Cuenta**.

ColTex protege el inicio de sesión por sí mismo, sin servicios externos. Una dirección se considera conocida para una cuenta si la cuenta inició sesión desde ella en los últimos 90 días.

- Desde direcciones desconocidas, los fallos cuentan para la cuenta, sea cual sea la dirección: a partir del tercer intento, el navegador resuelve antes un pequeño acertijo (prueba de trabajo, alrededor de un segundo, automático); tras 5 fallos, hay que esperar 15 minutos; tras 10, la cuenta queda **bloqueada** para direcciones desconocidas. El administrador del sistema recibe una notificación y la desbloquea aquí o en Gestionar usuarios (**Desbloquear**).
- Desde direcciones conocidas, cada 5 fallos suponen 15 minutos de espera, y nunca se bloquean: el titular puede seguir iniciando sesión desde donde trabaja habitualmente mientras su cuenta está bloqueada.
- Una dirección de internet que falla 20 veces en una hora, con cualquier cuenta, queda bloqueada durante un día; las direcciones bloqueadas aparecen al principio de **Inicios de sesión** con **Desbloquear**. Las direcciones de la red local o de la tailnet nunca se bloquean: varias personas pueden compartir una.

¿Te has quedado fuera tú mismo? Ejecuta `coltex unlock <email>` (o `coltex unlock <address>` para una dirección bloqueada) en el servidor.

## Servicios de IA

- **Servicios de IA**: conecta proveedores con claves de API o con inicio de sesión de suscripción (Claude Pro/Max, ChatGPT, Copilot…), o tus propios servidores compatibles con OpenAI (Ollama, vLLM, LM Studio…). Las claves se guardan cifradas, los miembros nunca las ven y las solicitudes pasan por este servidor.
- Si el inicio de sesión de una suscripción termina en una dirección localhost que no carga, copia esa dirección completa de la barra de direcciones y pégala en ColTex.
- Configura los tres modelos de **Automático** y todos empiezan con la elección automática: el **evaluador** (un modelo barato y rápido) lee cada mensaje y lo pasa al modelo **ligero** (preguntas rápidas, correcciones pequeñas) o al **potente** (varios errores, cambios en varios archivos, redacción cuidadosa). Hasta que los tres estén configurados, cada persona empieza con el primer modelo que tiene permitido.
- **Búsqueda web**: los modelos de Anthropic, OpenAI y ChatGPT buscan con su propia búsqueda integrada, sin nada que configurar. Para los demás modelos, **conecta** un servicio de búsqueda (DeepSeek, Tavily, Exa o Brave Search) y pega su clave de API; DeepSeek también puede usar la clave de un proveedor DeepSeek conectado. **Probar**, en su menú, hace una búsqueda. Algunas cuentas deben permitir antes la búsqueda integrada en el proveedor: si las solicitudes fallan, desactívala en el menú de ese proveedor y sus modelos usarán el servicio de búsqueda. Todos los que tienen el agente de IA pueden usar la web y, mientras puedan, los cambios del agente de IA siempre esperan revisión.
- **Uso y acceso a la IA**: solicitudes y tokens del grupo y por persona. Quién puede usar qué modelos se define con los **Grupos de IA**: cada grupo permite proveedores (incluidos los modelos que se añadan después) o modelos concretos, p. ej., «Doctorandos» con el modelo potente y «Estudiantes de grado» con el ligero. Cada persona está como mucho en un grupo, elegido en la invitación o después abriendo a la persona en la lista. Las personas sin grupo no pueden usar el agente de IA, así que las nuevas no tienen IA hasta que el administrador del sistema las añade (los miembros invitados por un administrador reciben el grupo del administrador). El administrador del sistema siempre puede usar todos los modelos. Al eliminar un grupo, sus personas se quedan sin IA hasta que se unen a otro.

  Un grupo también puede limitar cuánto usa cada uno de sus miembros por día, semana o mes: tokens, coste (a precio de lista) o ambos. Un mensaje se rechaza cuando un miembro ha alcanzado el límite, hasta que empieza el siguiente periodo (días naturales, semanas a partir del lunes, meses, en la zona horaria del servidor); el mensaje que lo supera termina igualmente. Los miembros ven lo que han usado bajo el cuadro de mensaje del agente de IA. El administrador del sistema no tiene límites.

  Para ajustar a una persona concreta, ábrela en la lista: en **Personalizar**, **Acceso propio a modelos** y **Límite de uso propio** reemplazan los de su grupo mientras están activados (el acceso propio también funciona sin grupo). La lista la marca como **Personalizado**.

## Almacenamiento y copias de seguridad

- Los archivos de los proyectos se guardan en el disco local o en un almacenamiento compatible con S3, según se configure al iniciar el servidor (`STORAGE` y `S3_*`). El historial, los resultados de compilación y las copias de trabajo del compilador se quedan en el directorio de datos.
- Las **copias de seguridad en WebDAV** van a una carpeta en Nextcloud, ownCloud, un NAS o cualquier servidor WebDAV. Cada copia es un archivo con la base de datos, los archivos de todos los proyectos y su historial. Prográmalas a diario o cada semana y elige cuántas conservar. Usa una contraseña de aplicación si el servidor la ofrece.
> **Cifrado**: las copias cifradas (AES-256) también contienen el secreto de la instancia, para que los servicios de IA conectados y la verificación en dos pasos sigan funcionando tras una restauración. **Guarda la contraseña en otro lugar: sin ella no se puede abrir una copia.** Si restauras una copia sin cifrar en un servidor nuevo (con un nuevo secreto de la instancia), las personas con verificación en dos pasos no pueden iniciar sesión hasta que ejecutes `coltex reset-2fa <email>` para ellas.
- La restauración se hace en el servidor con el comando `restore` mientras el servidor está detenido; consulta la guía de operaciones.

## Monitorización

**Resumen** muestra el estado en vivo del servidor, el compilador y la base de datos, con gráficos históricos de CPU, memoria y compilaciones. El servidor toma muestras cada 10 segundos y las conserva 30 días, también mientras nadie tiene la página abierta.

## Red

**Red** muestra las direcciones en las que se accede a ColTex (las invitaciones y las direcciones de Git las usan), activa Tailscale y Cloudflare Tunnel integrados, y muestra cómo llegan las solicitudes al servidor. Consulta [Despliegue y red](#/help/deployment).
