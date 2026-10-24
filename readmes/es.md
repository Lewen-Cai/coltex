<h1 align="center">ColTex</h1>
<p align="center">
  <strong>Un editor de LaTeX colaborativo y autoalojado, con un agente de IA integrado.</strong><br>
  Tu servidor · Tus cuentas · Tus datos · Colaboración en tiempo real · Código abierto (AGPL-3.0)
</p>

<p align="center">
  <a href="../README.md"><kbd>English</kbd></a>
  <a href="./zh-CN.md"><kbd>简体中文</kbd></a>
  <a href="./zh-TW.md"><kbd>繁體中文</kbd></a>
  <a href="./ja.md"><kbd>日本語</kbd></a>
  <a href="./ko.md"><kbd>한국어</kbd></a>
  <a href="./es.md"><kbd><b>Español</b></kbd></a>
  <a href="./fr.md"><kbd>Français</kbd></a><br>
  <a href="./de.md"><kbd>Deutsch</kbd></a>
  <a href="./pt-BR.md"><kbd>Português (Brasil)</kbd></a>
  <a href="./it.md"><kbd>Italiano</kbd></a>
  <a href="./ru.md"><kbd>Русский</kbd></a>
  <a href="./tr.md"><kbd>Türkçe</kbd></a>
  <a href="./vi.md"><kbd>Tiếng Việt</kbd></a>
  <a href="./id.md"><kbd>Bahasa Indonesia</kbd></a>
</p>
<p align="center">
  <a href="#install">Instalación</a> · <a href="#configure">Configuración</a> · <a href="../CHANGELOG.md">Cambios</a> · <a href="https://github.com/Lewen-Cai/coltex/issues">Issues</a>
</p>
<p align="center">
  <a href="https://github.com/Lewen-Cai/coltex/releases/latest"><img src="https://img.shields.io/github/v/release/Lewen-Cai/coltex?style=flat-square&amp;color=2563eb" alt="Última versión"></a>
  <a href="../LICENSE"><img src="https://img.shields.io/badge/license-AGPL--3.0-2563eb?style=flat-square" alt="AGPL-3.0"></a>
  <a href="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml"><img src="https://github.com/Lewen-Cai/coltex/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
</p>

<p align="center">
  <img src="../docs/images/editor.png" alt="El editor de ColTex: los archivos, el código LaTeX, el PDF compilado y el agente de IA" width="900">
</p>

<a id="why"></a>
## ¿Por qué ColTex?

ColTex es una alternativa a Overleaf para un grupo de investigación, un laboratorio o para ti solo, que se ejecuta en un equipo que tú controlas: un ordenador de sobremesa del laboratorio, un servidor en casa o una máquina en la nube.

- **Todo se queda en tu servidor.** Los proyectos, el historial, las cuentas y las compilaciones nunca salen de él. TeX se ejecuta en un contenedor aislado sin acceso a internet.
- **Pensado para escribir en equipo.** Varias personas editan el mismo archivo a la vez, con comentarios, control de cambios, chat e historial de versiones.
- **Un agente de IA que trabaja en tu proyecto.** Lee los archivos y el registro de compilación, prepara cambios, los compila de prueba y te muestra un diff. No se escribe nada hasta que lo apliques.
- **Un solo comando para instalar, sin abrir puertos.** Tailscale y Cloudflare Tunnel vienen integrados para el acceso remoto.

<a id="features"></a>
## Funciones

### Escritura y compilación
- Editor de código (CodeMirror) y un editor visual con el editor de tablas y el diálogo de figuras de Overleaf, barra de herramientas, paleta de símbolos, esquema y ruta de navegación.
- Autocompletado de LaTeX, revisión de código, vista previa de ecuaciones, revisión ortográfica en muchos idiomas, recuento de palabras, búsqueda y reemplazo en todo el proyecto, y teclas de Vim o Emacs.
- Compila con latexmk sobre un TeX Live completo. El motor (pdfLaTeX, XeLaTeX o LuaLaTeX) se elige a partir del documento, incluido el chino (ctex, xeCJK).
- Vista previa del PDF con SyncTeX en ambos sentidos, también en una ventana aparte. Los errores de compilación se subrayan en el código, con indicaciones en lenguaje sencillo.
- Referencias: cita desde tus archivos `.bib`, busca en Crossref y arXiv (o pega un DOI o un id de arXiv) para añadir entradas, o importa una biblioteca o colección de Zotero y mantenla sincronizada.

### Colaboración
- Edición en tiempo real con los cursores de todos, comentarios con @menciones, control de cambios (aceptar, rechazar y deshacer una decisión), chat del proyecto y notificaciones en la aplicación.
- Roles por proyecto: propietario, editor, revisor (solo sugerencias) y lector.
- Historial de versiones como en git: versiones automáticas, versiones guardadas con un mensaje y la posibilidad de deshacer los cambios de una versión.
- Acceso por Git: clona un proyecto, trabaja en él en local y haz push de vuelta (tokens personales; las ediciones hechas mientras tanto en el navegador se combinan).

### Agente de IA
- Pregunta sobre LaTeX, tu proyecto o tu redacción, o deja que corrija errores de compilación. Prepara los cambios en una copia privada, los compila de prueba y muestra un diff; tú aplicas todo o una parte.
- Al aplicar, primero se guarda una versión y se recompila; si la compilación empeora, el cambio se revierte automáticamente.
- Proveedores: claves de API (Anthropic, OpenAI, DeepSeek, Google, OpenRouter y más), inicio de sesión con suscripción (Claude Pro/Max, ChatGPT, GitHub Copilot y más) o tu propio servidor compatible con OpenAI (Ollama, vLLM, LM Studio).
- Elección automática de modelo (un modelo ligero o uno potente por mensaje), acceso por grupos de personas, uso por persona y límites de uso por día, semana o mes.
- Chats guardados por proyecto, la ventana de contexto visible en todo momento y `/compact` para resumir un chat largo.
- Skills: tus propias instrucciones (formato Agent Skills), para todos tus proyectos, que sigue el agente, usadas con `/name`; escríbelas tú, impórtalas o créalas con la IA en Configuración.
- Permisos como los de Claude Code: los cambios del agente de IA esperan tu revisión (Manual), se aplican cuando termina (Automático) o además puede eliminar y mover archivos (Acceso total).
- Tu propio agente (Claude Code, Codex, Cursor…) mediante MCP: una sola dirección para todos tus proyectos, con los mismos permisos (en Manual sus cambios se convierten en tus sugerencias).

### Proyectos y administración
- Plantillas para IEEE, ACM, Springer LNCS, Elsevier, REVTeX y arXiv, y conversión de un artículo de una plantilla de revista a otra.
- Importación y exportación de zip de Overleaf, archivos vinculados desde una URL o desde otro proyecto, etiquetas, archivo y papelera.
- Sin registro público: las cuentas se crean con enlaces de invitación. Un administrador del sistema y administradores que gestionan cada uno el equipo que invitaron.
- Monitorización, copias de seguridad en WebDAV (con cifrado opcional), almacenamiento local o compatible con S3, temas claro y oscuro, y una interfaz en 14 idiomas (inglés, chino, japonés, coreano, español, francés, alemán, portugués, italiano, ruso, turco, vietnamita e indonesio).

<a id="install"></a>
## Instalación

Necesitas una máquina Linux o macOS con Docker (en Linux el instalador puede configurarlo), al menos 2 núcleos de CPU y 4 GB de memoria. Las imágenes vienen precompiladas para x86-64 y ARM64.

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

Si la descarga se corta (`curl: (35) Recv failure: Connection reset by peer`, habitual cuando GitHub es difícil de alcanzar), vuelve a ejecutar el comando.

Pregunta el idioma y la edición de TeX Live (con las flechas), descarga la última versión en `~/coltex`, descarga las imágenes precompiladas con una barra de progreso, inicia ColTex y muestra las direcciones que puedes abrir. La salida completa va a `~/coltex/install.log`. Después abre `http://<server>:3690` y crea la cuenta de administrador. El acceso remoto mediante Tailscale o Cloudflare Tunnel se activa después en **Configuración → Red**.

El primer inicio descarga TeX Live. Elige una edición:

| Edición | Descarga | Disco (todo ColTex) | Espacio libre necesario |
| --- | --- | --- | --- |
| **standard** (predeterminada) | unos 3 GB | unos 12 GB | 20 GB |
| **full** (`--edition full`) | unos 8 GB | unos 23 GB | 35 GB |

Ambas incluyen todos los paquetes de TeX Live y compilan los mismos documentos, y el agente de IA funciona con cualquiera de las dos. La standard no trae los manuales de los paquetes; la full añade los manuales y las fuentes, que el agente de IA también puede leer.

`--edition` y `--lang` responden a las preguntas, o las sustituyen donde no hay terminal. `--domain`, `--tailscale` y las opciones de Cloudflare configuran el acceso remoto durante la instalación, para instalaciones automatizadas. Añade las opciones después de `bash -s --`:

| Opción | |
| --- | --- |
| `--domain tex.example.org` | HTTPS para un servidor con dominio propio, mediante el Caddy incluido. Apunta el dominio al servidor y abre los puertos 80 y 443 |
| `--tailscale` | Pone ColTex en tu tailnet: muestra un enlace de inicio de sesión y un código QR |
| `--cloudflare-token TOKEN` | Conecta un túnel de Cloudflare que creaste para tu propio dominio |
| `--cloudflare-quick` | Una dirección pública temporal de `trycloudflare.com`, para probarlo |
| `--edition full` | La edición full de TeX Live |
| `--lang LANG` | El idioma del instalador, de `coltex` y de la página de configuración inicial: `en`, `zh-CN`, `zh-TW`, `ja`, `ko`, `es`, `fr`, `de`, `pt-BR`, `it`, `ru`, `tr`, `vi` o `id` (se pregunta si no se indica) |
| `--port 3690` | Otro puerto |
| `--version v0.0.1` | Una versión concreta (`main` para la rama de desarrollo) |
| `--build` | Compila las imágenes a partir del código fuente en esta máquina en lugar de descargarlas |
| `--images REGISTRY` | De dónde descargar las imágenes: `aliyun` (las mismas imágenes en Alibaba Cloud), `ghcr` (`ghcr.io/lewen-cai`) u otro mirror de ghcr.io. Sin esta opción, el instalador usa Alibaba Cloud en China continental y ghcr.io en el resto (los `registry-mirrors` de Docker solo se aplican a Docker Hub, no a ghcr.io) |

En un servidor accesible desde internet, no inicies sesión por `http://` sin cifrar: usa `--domain`, Tailscale o un túnel de Cloudflare.

### Gestión y actualización

```sh
coltex status          # running? at which address
coltex logs            # the server's log (coltex logs compiler for the compiler)
coltex update          # to the latest release; your settings and data stay
coltex version
coltex edition full    # switch the TeX Live edition
coltex tailscale up    # or: coltex cloudflare quick | token
coltex stop | start
coltex reset           # delete all data and start again from the setup page (asks first)
coltex uninstall       # remove ColTex from this machine: containers, data, images, this folder (asks first)
```

<a id="configure"></a>
## Configuración

Todo se configura en el navegador, en **Configuración** dentro del menú de usuario:

1. **Gestionar usuarios** e **Invitaciones**: invita a personas con enlaces (cada uno funciona una sola vez, opcionalmente para un correo electrónico concreto).
2. **Servicios de IA**: conecta un proveedor. Después, en **Uso y acceso a la IA**, pon a las personas en un grupo que pueda usarlo. Sin grupo, nadie salvo el administrador del sistema tiene el agente de IA.
3. **Red**: las direcciones en las que se accede a ColTex, y Tailscale y Cloudflare Tunnel.
4. **Almacenamiento y copias de seguridad**: copias diarias o semanales en una carpeta WebDAV (Nextcloud, un NAS…).

La documentación de ayuda está integrada: **Documentación de ayuda** en el menú de usuario. Las operaciones del servidor (variables de entorno, S3, restaurar una copia de seguridad) están en [docs/operations.md](../docs/operations.md) (en inglés).

<a id="feedback"></a>
## Primeras versiones: abre issues

ColTex es joven (0.0.x). Se usa y se prueba a diario, pero todavía no se ha encontrado todo. Si algo falla, se ve mal o es difícil de usar, por favor [abre un issue](https://github.com/Lewen-Cai/coltex/issues): cada informe ayuda.

Un informe útil incluye la versión (`coltex version`), qué hiciste y qué pasó y, si el servidor está implicado, las líneas relevantes de `coltex logs`. No incluyas contraseñas, claves de API ni contenido privado de tus documentos.

<a id="development"></a>
## Desarrollo

Node 24 o posterior, pnpm 11 y Docker.

```sh
pnpm install
cp .env.example .env
pnpm infra:up        # Postgres, Valkey and the TeX Live compiler in Docker
pnpm dev             # API on :3000, web app on http://localhost:5173
pnpm -r typecheck
pnpm -r test         # the server tests need Postgres from infra:up
```

| Ruta | |
| --- | --- |
| `apps/web` | La aplicación web: React, CodeMirror 6, PDF.js |
| `apps/server` | La API: Fastify, cuentas, proyectos, colaboración en tiempo real, el agente de IA |
| `services/compiler` | El proceso de compilación en un contenedor de TeX Live |
| `packages/*` | Esquemas compartidos, el analizador de registros, el soporte del lenguaje LaTeX, los datos de revisión y la conversión de plantillas |

El diseño se describe en [docs/architecture.md](../docs/architecture.md) (en inglés).

<a id="acknowledgements"></a>
## Agradecimientos

- [Overleaf](https://github.com/overleaf/overleaf) (AGPL-3.0): ColTex adapta su analizador de registros y sus indicaciones, el soporte del lenguaje LaTeX, el editor visual, el editor de tablas, la revisión ortográfica y el recuento de palabras. Cada archivo adaptado aparece en [NOTICE](../NOTICE).
- [Pi](https://github.com/earendil-works) (`pi-ai`, `pi-agent-core`): los proveedores de modelos y el bucle del agente detrás del agente de IA.
- [PilotDeck](https://github.com/OpenBMB/PilotDeck) (AGPL-3.0): el seguimiento del estado de los proveedores y la elección automática de modelo están adaptados de él.
- [Yjs](https://github.com/yjs/yjs) y [Hocuspocus](https://github.com/ueberdosis/hocuspocus), [CodeMirror](https://codemirror.net), [PDF.js](https://mozilla.github.io/pdf.js/), [better-auth](https://www.better-auth.com), [shadcn/ui](https://ui.shadcn.com), [TeX Live](https://tug.org/texlive/).
- [Lobe Icons](https://github.com/lobehub/lobe-icons) (MIT): los logotipos de los proveedores. Las marcas pertenecen a sus propietarios y solo identifican el servicio.

<a id="license"></a>
## Licencia

[AGPL-3.0](../LICENSE). Si ofreces una versión modificada de ColTex a otras personas a través de una red, debes ofrecerles su código fuente. El código de terceros conserva su propia licencia; consulta [NOTICE](../NOTICE).
