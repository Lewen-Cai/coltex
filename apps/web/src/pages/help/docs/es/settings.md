# Configuración

Haz clic en tu avatar abajo a la izquierda y elige **Configuración**.

- **Cuenta**: tu nombre visible (lo ven los colaboradores, en los comentarios y en el historial), el color de tu avatar (también es tu cursor en el editor; **Automático** es el que eligió ColTex) y tu contraseña. Al cambiar la contraseña puedes cerrar la sesión en tus otros dispositivos. Las contraseñas necesitan 8 caracteres o más, con una mayúscula, una minúscula y un número; los símbolos son opcionales. La valoración que se muestra mientras escribes (débil, aceptable, buena, fuerte) sube con la longitud y los símbolos. El registro y los restablecimientos hechos por un administrador siguen las mismas reglas. El correo electrónico con el que inicias sesión solo lo puede cambiar un administrador. La verificación en dos pasos y tu actividad de inicio de sesión también están en esta página (ver más abajo).
- **Apariencia**: el tema (Claro y Oscuro en azul, Bosque y Musgo en verde, Lavanda y Ciruela en violeta; Claro por defecto) y el idioma de la interfaz (14 idiomas, entre ellos English, 简体中文, 繁體中文, 日本語, 한국어, Español, Français y Deutsch; empieza en el idioma de tu navegador). Los temas oscuros también se aplican al editor; las páginas del PDF siguen siendo blancas. El tema se guarda con tu cuenta, así que te sigue a otros navegadores (la página de inicio de sesión siempre usa Claro); el idioma se guarda en este navegador.
- **Servicios de sincronización**: conecta tu cuenta de Zotero (consulta [Referencias](#/help/references)) y crea y revoca tokens de git (consulta [Archivos](#/help/files)): cada uno para Git, MCP o ambos, de lectura y escritura o de solo lectura, para todos tus proyectos o algunos, con una fecha de caducidad. Usa un token por equipo, para poder revocarlo por separado.
- **Grupos**: los grupos en los que estás, las invitaciones por responder y los grupos nuevos; ver más abajo.
- **Agente de IA**: tu uso de la IA en los últimos 7, 30 o 90 días (solicitudes, tokens, coste, por día y por modelo) y lo que te queda de tu límite (si tienes el agente de IA), lo que los agentes de IA pueden cambiar por ti (**Permisos**), y la conexión de tus propios agentes de IA mediante **MCP**, con sus tokens; consulta [Agente de IA](#/help/ai).
- **Skills de IA** (si tienes el agente de IA): tus propias skills, las integradas y un chat con el agente de IA para escribir skills; consulta [Agente de IA](#/help/ai).

## Grupos

**Configuración → Grupos** muestra los grupos en los que estás. Un proyecto puede compartirse con un grupo entero (ver [Colaboración](#/help/collaboration)), y los administradores comparten plantillas con grupos (ver [Plantillas](#/help/templates)).

- Cualquiera puede crear un grupo: **Crear grupo** y darle un nombre. Quedas como propietario.
- Los propietarios invitan a cualquiera con cuenta en este servidor con **Invita a alguien por nombre o correo**. La persona recibe una notificación y se une con **Unirse** en **Invitaciones** de esta página, o la rechaza con **Rechazar**. Mientras tanto aparece como **Invitado**, y el propietario puede **Retirar invitación**.
- En el menú ⋯ de un miembro, los propietarios pueden **Hacer propietario** (o **Hacer miembro**) y **Quitar**. El menú ⋯ del grupo tiene **Cambiar nombre** y **Eliminar grupo** para los propietarios, y **Salir del grupo**.
- Un grupo siempre tiene propietario: el último hace propietario a otra persona antes de salir, o elimina el grupo.
- Al salir de un grupo, ser quitado o eliminarse el grupo, pierdes los proyectos compartidos con él, salvo aquellos a los que se te añadió por tu cuenta.

## Verificación en dos pasos

Con la verificación en dos pasos activada, al iniciar sesión se te pide, después de la contraseña, un código de una aplicación de autenticación en tu teléfono (Google Authenticator, Microsoft Authenticator, 1Password, Bitwarden…). Es decisión tuya; nadie más puede activarla por ti.

1. En **Configuración → Cuenta**, en **Verificación en dos pasos**, haz clic en **Activar** e introduce tu contraseña.
2. Escanea el código QR con la aplicación (o escribe en ella la clave de configuración) e introduce el código de 6 dígitos que muestra.
3. Guarda los 10 **códigos de recuperación** (cópialos o descárgalos como archivo). Cada uno te permite iniciar sesión una vez en lugar de un código, si pierdes el teléfono. Solo se muestran ahora.

Al iniciar sesión, después de la contraseña, introduce el código de la aplicación o haz clic en **Usar un código de recuperación**. **No volver a preguntar en este dispositivo durante 30 días** omite el código en ese navegador. **Nuevos códigos de recuperación** reemplaza los anteriores (guarda los nuevos); **Desactivar** vuelve a la contraseña sola. Los tokens de Git y MCP funcionan como antes.

> ¿Has perdido el teléfono y también los códigos de recuperación? El administrador del sistema puede desactivar la verificación en dos pasos de tu cuenta en el servidor (`coltex reset-2fa <email>`); después inicias sesión con tu contraseña y puedes volver a activarla.

## Actividad de inicio de sesión

**Actividad de inicio de sesión**, al final de **Configuración → Cuenta**, muestra los inicios de sesión en tu cuenta, del más reciente al más antiguo: cuándo, el resultado (sesión iniciada, contraseña incorrecta, código incorrecto, rechazado), el navegador y el sistema, y la dirección con su ubicación: la red local, Tailscale o, para una dirección de internet, su país, región, ciudad y operador de red. Las ubicaciones salen de una base de datos en el servidor; las direcciones nunca se envían a otro sitio para consultarlas. Los registros se conservan 90 días.

La configuración del editor (tamaño de fuente, colores, Vim…) está en **Configuración**, en la parte inferior de la barra lateral izquierda del editor; consulta [Editor](#/help/editor).
