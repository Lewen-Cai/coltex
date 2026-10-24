# Agente de IA

**IA**, en la barra lateral izquierda, abre el agente de IA. Está disponible en cuanto un administrador ha conectado un servicio de modelos y te ha añadido a un grupo de IA; el grupo decide qué modelos puedes usar.

## Qué hace

- Responde preguntas sobre LaTeX y explica el código seleccionado.
- Explica o corrige errores de compilación (el registro también tiene un botón «Corregir con IA»).
- Reescribe, pule o traduce la selección.
- Ofrece un resumen del proyecto, encuentra etiquetas sin referenciar, etc.

El archivo abierto, la selección y los errores de compilación recientes se adjuntan a tu mensaje; haz clic en un adjunto para excluirlo.

## Permisos

Lo que el agente de IA puede cambiar lo decides tú: elígelo en **Configuración → Agente de IA**, o en el selector de modelo en la parte inferior del panel (bajo el nivel de razonamiento); la línea bajo el cuadro de mensaje lo muestra. La misma elección se aplica a tus propios agentes conectados mediante MCP (ver más abajo).

- **Manual** (el valor predeterminado): los cambios del agente de IA van a un borrador, y no cambia nada hasta que lo apliques.
  1. Cuando termina, el borrador se compila de prueba y se te indica si añade errores.
  2. **Revisar cambios** muestra el diff de cada archivo; puedes aplicar solo una parte.
  3. **Aplicar** escribe los cambios en el proyecto y compila; si la compilación empeora, se revierten. Antes de aplicar se guarda una versión.
  4. Después de aplicar, **Deshacer** revierte los cambios y conserva las ediciones que otras personas hicieron entretanto.
- **Automático**: el borrador se aplica en cuanto el agente de IA termina su respuesta, con las mismas protecciones: primero se guarda una versión, se compila el proyecto, una compilación peor se revierte, y **Deshacer** está disponible después. Si alguien cambió las mismas líneas entretanto, no se aplica nada y el borrador te espera. Si detienes el agente de IA, su borrador también te espera.
- **Acceso total**: como Automático, y además el agente de IA puede eliminar, mover y cambiar el nombre de archivos. Esto ocurre al instante, no en el borrador; se guarda una versión antes del primero de estos cambios en cada respuesta. La respuesta los enumera junto con los archivos que cambió.

Los lectores y los revisores pueden preguntar al agente de IA, pero este no puede cambiar nada por ellos.

## Modelos y razonamiento

- Elige el modelo en la parte inferior del panel. Con **Automático**, ColTex elige un modelo ligero o uno potente según la pregunta.
- En los modelos que pueden razonar, el nivel se define en el mismo selector; la línea bajo el cuadro de mensaje lo muestra.

## Chats y contexto

- Las conversaciones se guardan para ti, por proyecto (nadie más las ve). **Nuevo chat** empieza otra; **Chats** muestra las anteriores: ábrelas, cámbiales el nombre o elimínalas. Al reabrir un chat, continúa donde se quedó; un borrador que no se aplicó no se conserva, así que cambiar de chat te lo pregunta antes.
- El anillo bajo el cuadro de mensaje muestra cuánto de la ventana de contexto del modelo usa el chat (p. ej., `12k / 200k`). Se vuelve ámbar al 70 % y rojo al 90 %.
- Si tu grupo de IA tiene un límite de uso, una barra a su lado muestra lo que has usado este día, semana o mes (pasa el ratón para ver los detalles). Cuando lo alcanzas, los mensajes esperan al siguiente periodo. **Configuración → Agente de IA** muestra tu uso de los últimos 30 días y lo que te queda.
- Escribe `/` en el cuadro de mensaje para ver los comandos:
  - `/compact`: resume el chat hasta ahora y continúa a partir del resumen, liberando contexto. Los mensajes siguen visibles; el agente de IA los recuerda a través del resumen.
  - `/new`: empieza un chat nuevo.
  - `/chats`: los chats anteriores.

## Skills

Una skill es un conjunto de instrucciones para una tarea que haces una y otra vez, por ejemplo «acortar un resumen al límite de la revista» o «comprobar que todas las figuras están referenciadas». Las skills usan el formato Agent Skills (un `SKILL.md` con un nombre, una descripción y las instrucciones), así que las skills escritas para otros agentes de IA también funcionan aquí.

- **Tus skills** están en **Configuración → Skills de IA**; solo tú las ves, y puedes usarlas en todos los proyectos.
- Para añadir skills que ya tienes, usa **Importar**: **Subir archivos** acepta un `SKILL.md` con sus archivos de referencia, o un `.zip` de carpetas de skills; **Subir carpeta** acepta la carpeta de una skill, o una carpeta que contenga varias. Los scripts de una skill se guardan como texto que el agente de IA puede leer; nada de una skill se ejecuta nunca.
- Usa una escribiendo `/` y eligiéndola, y añade tu mensaje (`/polish-abstract keep it under 200 words`). El agente de IA también lee las descripciones y carga una skill por su cuenta cuando tu petición encaja con ella.
- Pide al agente de IA que convierta algo en una skill («guarda como skill lo que acabamos de hacer para arreglar la bibliografía»): redacta una en el chat, y tú la editas o la guardas en tus skills.
- En **Configuración → Skills de IA**, tus skills aparecen a la izquierda; elige una para leer sus instrucciones y archivos de referencia, o **Crear con IA** para abrir un chat con el agente de IA para escribir skills (**Mejorar en el chat** en una de tus skills empieza un mensaje sobre ella). El chat sigue la skill integrada **skill-creator**: te pregunta cómo usarías la skill, la redacta (con archivos de referencia cuando ayudan) y puede probar un borrador con un texto que pegues. Los borradores solo se guardan cuando tú los guardas; guardar uno con un nombre que ya usas te pregunta antes de reemplazarlo. El chat se conserva hasta que empiezas uno nuevo.
- ColTex incluye skills integradas (en **Integradas**). Puedes leerlas y descargarlas, pero no modificarlas; si tienes una skill propia con el mismo nombre, se usa la tuya.
  - **skill-creator**: para escribir skills (el chat de skills la sigue).

## Tus propias herramientas de IA (MCP)

Herramientas de IA como Claude Code, Codex, Cursor, VS Code (Copilot), Windsurf, Gemini CLI, Cline u OpenCode pueden trabajar directamente en tus proyectos: listarlos, leer y buscar en sus archivos, editarlos, compilar y leer el registro, ver el historial, y leer, añadir y responder comentarios. ColTex es un servidor MCP para ellas, con una sola dirección para todos tus proyectos; la herramienta indica el proyecto con el que trabaja.

En **Configuración → Agente de IA**, en **Tus herramientas de IA (MCP)**, elige tu herramienta a la izquierda y sigue los tres pasos: la dirección, un token (**Crear token**; se muestra una sola vez) y la configuración para copiar, con ambos ya incluidos. Cualquier otra herramienta que se conecte a servidores MCP por HTTP con una cabecera para el token también funciona (**Otros**). Las aplicaciones que solo aceptan servidores que inician sesión mediante OAuth (como los conectores personalizados de Claude o ChatGPT) todavía no pueden conectarse.

Lo que tus herramientas pueden cambiar sigue tu permiso en **Configuración → Agente de IA**:

- **Manual** (el valor predeterminado): sus cambios se convierten en tus sugerencias, que tú y tus colaboradores aceptan o rechazan en **Revisión**. Los archivos nuevos se crean directamente.
- **Automático**: sus cambios se aplican directamente, como si fueran tuyos. Si el control de cambios está activado para ti, son sugerencias de todos modos.
- **Acceso total**: como Automático, y además pueden eliminar, mover y cambiar el nombre de archivos.

Antes del primer cambio de una herramienta en un tiempo, el estado del proyecto se guarda como versión, para que puedas volver atrás. Las herramientas de los revisores solo pueden sugerir cambios, y las de los lectores solo pueden leer y comentar.

### Seguridad

- Cualquiera que tenga tu token actúa como tú: guárdalo como una contraseña y revócalo en la lista de tokens cuando ya no lo necesites (un token por herramienta o por equipo lo hace fácil). Al crear cada token, dale solo lo que necesita:
  - **Uso**: Git, MCP o ambos. Un token creado solo para MCP no puede clonar ni hacer push, y viceversa.
  - **Acceso**: **Solo lectura** permite a una herramienta listar, leer, buscar y compilar, pero no cambiar archivos ni comentarios (y permite a git clonar y hacer pull, no push), sea cual sea tu permiso.
  - **Proyectos**: todos tus proyectos, o solo los que elijas; los demás no existen para el token.
  - **Caduca**: a los 30 días, a los 90 días, al año o nunca. Un token caducado deja de funcionar; revócalo y crea uno nuevo.
- ColTex solo responde a tu herramienta; nunca se conecta a otros servidores MCP. Lo que más pueda hacer tu herramienta (un navegador mediante Playwright MCP, una terminal, otros servicios) depende de la herramienta y de su propia configuración. El texto, los comentarios y los registros de un proyecto pueden haberlos escrito tus colaboradores, así que a una herramienta que los lea se le podría pedir, en ese texto, que haga algo con sus otras capacidades. ColTex indica a las herramientas que traten el contenido del proyecto como contenido, no como instrucciones, pero solo tu herramienta puede hacerlo cumplir: mantén activadas sus propias confirmaciones para las acciones fuera de ColTex, y usa **Manual** cuando una herramienta también tenga un navegador o una terminal.
- Una herramienta con un navegador que tenga la sesión iniciada en ColTex actúa con todos tus permisos a través de las páginas web, no a través de MCP, así que el permiso anterior no la limita ahí. Haz que esas herramientas usen un perfil de navegador sin la sesión iniciada.
