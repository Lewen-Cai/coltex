# Despliegue y red

En producción ColTex usa un solo puerto (3690 por defecto): las páginas, la API, la colaboración en tiempo real (WebSocket) y las notificaciones pasan todas por él. Funciona cualquier cosa que reenvíe HTTP y WebSocket: este equipo, una LAN, Tailscale, Cloudflare Tunnel o un servidor en la nube. (3000 y 5173 son los puertos del servidor de desarrollo.)

## Instalación

En Linux o macOS con Docker, un solo comando:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash
```

Si la descarga se corta (`curl: (35) Recv failure: Connection reset by peer`, habitual cuando GitHub es difícil de alcanzar), vuelve a ejecutar el comando.

Pregunta el idioma y la edición de TeX Live (con las flechas; `--edition` y `--lang` responden en su lugar), comprueba Docker (en Linux puede instalarlo), descarga ColTex en `~/coltex`, escribe la configuración, descarga las imágenes precompiladas (x86-64 y ARM64), lo inicia y muestra las direcciones que puedes abrir en este equipo y en tu red. El primer inicio descarga TeX Live. Hay dos ediciones:

| Edición | Descarga | En disco (todo ColTex) | Espacio libre necesario |
| --- | --- | --- | --- |
| **standard** (predeterminada) | unos 3 GB | unos 12 GB | 20 GB |
| **full** (`--edition full`) | unos 8 GB | unos 23 GB | 35 GB |

Ambas tienen el TeX Live completo y compilan igual, y el agente de IA funciona con cualquiera de las dos. La standard no trae los manuales ni las fuentes de los paquetes; la full los añade, y el agente de IA también puede leer los manuales. Con la standard responde a partir de los archivos de los paquetes y de su propio conocimiento. Puedes cambiar más tarde con `coltex edition full` o `coltex edition standard`.

El acceso remoto (Tailscale, Cloudflare Tunnel) se activa después de instalar, en **Configuración → Red** (ver más abajo). En instalaciones automatizadas, también se puede configurar durante la instalación con opciones:

```sh
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --tailscale
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://coltexeditor.github.io/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Después se gestiona con `coltex`:

| Comando | Qué hace |
| --- | --- |
| `coltex status` / `logs` | Estado / registros |
| `coltex edition [standard\|full]` | Muestra o cambia la edición de TeX Live (descarga la otra imagen del compilador) |
| `coltex update` | Actualiza a la última versión publicada y descarga solo lo que cambió (la actualización anual que trae un TeX Live nuevo tarda más); los datos y la configuración se conservan |
| `coltex stop` / `start` | Detiene / inicia |
| `coltex tailscale up` | Se une a tu tailnet (muestra un enlace de inicio de sesión y un código QR) |
| `coltex cloudflare quick` | Una dirección pública temporal de Cloudflare |
| `coltex cloudflare token` | Un túnel de Cloudflare con tu propio dominio (pide el token) |
| `coltex reset` | Borra todo (cuentas, proyectos, la base de datos) y vuelve a empezar desde la página de configuración inicial; antes te pide que escribas `reset` |
| `coltex uninstall` | Quita ColTex de esta máquina: contenedores, base de datos, datos, imágenes, el comando `coltex` y su carpeta (Docker se queda); antes te pide que escribas `uninstall` |

## Iniciar sesión desde cualquier dirección

El servidor acepta los inicios de sesión hechos en su propia dirección: ábrelo en `localhost`, una IP de la LAN, una dirección de Tailscale o un dominio, sin tener que registrar ninguna antes. Una página de otro sitio no puede iniciar la sesión de nadie.

## Qué direcciones usan los enlaces

Los enlaces de invitación y las direcciones de clonado de Git se ofrecen una vez por cada dirección en la que se puede acceder a ColTex, cada una con su botón de copiar, para que elijas la que el destinatario puede abrir:

- **LAN** o **Tailscale**: la dirección en la que abriste ColTex (se reconoce por la dirección);
- **Tailscale**, **Cloudflare**: las direcciones del Tailscale o del Cloudflare Tunnel integrados mientras están conectados. Aparecen y desaparecen con ellos; no hay que cambiar nada cuando se desactiva uno;
- **Dirección pública**: el `COLTEX_URL` del servidor, si está configurado.

Los enlaces de una invitación pendiente siguen en la lista de invitaciones hasta que se usa o caduca.

## Tailscale

ColTex lleva Tailscale integrado: puede unirse a tu tailnet como un dispositivo propio (llamado `coltex` por defecto). No hay que instalar nada en el servidor, y funciona en servidores sin escritorio.

1. En **Configuración → Red**, activa Tailscale.
2. Escanea el código QR con un teléfono, o abre el enlace en cualquier dispositivo, e inicia sesión en tu tailnet. La página cambia a Conectado por sí sola.
3. Activa **Servir ColTex en la tailnet**. Con MagicDNS y HTTPS habilitados en la tailnet, la dirección es `https://coltex.<your tailnet>.ts.net`; si no, `http://coltex.<your tailnet>.ts.net`.

Si todavía ningún navegador puede llegar a la página de configuración, ejecuta esto en el servidor:

```sh
coltex tailscale up
```

Activa Tailscale, muestra el enlace de inicio de sesión y un código QR en la terminal, espera al inicio de sesión y después sirve ColTex en la tailnet. `coltex tailscale status` muestra el estado, `coltex tailscale down` sale de la tailnet y `coltex tailscale off` lo desactiva.

`TS_HOSTNAME` cambia el nombre del dispositivo. El servidor ejecuta Tailscale por sí mismo: sin contenedores ni privilegios adicionales. Las claves del dispositivo se guardan en `data/tailscale` y no están en las copias de seguridad; después de una restauración, vuelve a iniciar sesión.

Si el servidor ya ejecuta Tailscale por su cuenta, los dos no se estorban: el integrado es un dispositivo propio y usa red en espacio de usuario (userspace networking), así que no cambia ninguna configuración de red del servidor. Tampoco lo necesitas: abre ColTex en la IP de Tailscale del servidor o en su nombre de MagicDNS con `:3690`.

## Cloudflare Tunnel

ColTex también lleva Cloudflare Tunnel integrado, solo como túnel: las personas siguen iniciando sesión con sus cuentas de ColTex; no hace falta Cloudflare Access. El servidor no necesita ningún puerto abierto.

- **Túnel rápido**: sin cuenta de Cloudflare; obtienes `https://<random>.trycloudflare.com`, que cambia cada vez que se inicia. Para hacer pruebas.
- **Mi propio dominio**: con tu dominio en Cloudflare, crea un túnel en Zero Trust → Networks → Tunnels y copia el comando que aparece bajo “Run the following command” (de cualquier sistema: Windows, macOS, Debian, Red Hat o Docker); ColTex extrae el token de él; añade al túnel un nombre de host público (p. ej., `tex.example.org`) con el servicio `http://localhost:3690`.

Actívalo con el interruptor de la tarjeta de Cloudflare Tunnel en **Configuración → Red** y elige después un enlace temporal o un túnel (el guardado, o uno nuevo a partir del comando pegado), o en una terminal con `coltex cloudflare quick` / `coltex cloudflare token`. Una vez conectado, sus direcciones aparecen solas en los enlaces de invitación. El token se guarda cifrado y no se vuelve a mostrar.

Si el túnel no puede llegar a Cloudflare por QUIC (un cortafuegos, o un proxy que descarta UDP), ColTex lo cambia a HTTP/2 por sí solo. Cuando trycloudflare.com limita los enlaces temporales (429 Too Many Requests), ColTex vuelve a pedirlos cada vez con menos frecuencia. Si cambias el túnel, mueve sus nombres de host públicos al nuevo túnel en el panel de Cloudflare; hasta entonces responden con Error 1033.

Si el servidor ya ejecuta cloudflared para un túnel propio, los dos no entran en conflicto, pero no le des a ColTex el token de ese túnel: Cloudflare trataría a ambos como conectores del mismo túnel y repartiría las solicitudes entre ellos, así que los otros nombres de host del servidor llegarían a veces a ColTex y fallarían (502). Añade a ese túnel un nombre de host público para ColTex (servicio `http://localhost:3690`) y deja el integrado desactivado, o crea un túnel aparte para ColTex.

## Configuración del servidor

Son variables de entorno del servidor. Con Docker, ponlas en el archivo `.env` junto a `docker-compose.yml` y ejecuta `docker compose up -d`.

| Variable | Qué hace |
| --- | --- |
| `COLTEX_PORT` | El puerto, 3690 por defecto |
| `COLTEX_URL` | Una dirección pública que se ofrece en todos los enlaces, p. ej., `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Otras direcciones que acepta el inicio de sesión, separadas por comas. Solo hace falta cuando las páginas y la API están en direcciones distintas |
| `TRUST_PROXY` | Con un proxy inverso delante (Caddy, Nginx): `uniquelocal` (proxy en una red privada) o `true`. Si no se define, el servidor toma el proxy por el visitante: todos comparten una misma dirección, así que los inicios de sesión fallidos de una persona cuentan contra todos, y los registros de inicio de sesión muestran la dirección del proxy. El Tailscale y el Cloudflare Tunnel integrados no necesitan nada aquí |
| `TS_HOSTNAME` | El nombre de dispositivo del Tailscale integrado, `coltex` por defecto |

**Cómo llegan las solicitudes**, al final de **Configuración → Red**, muestra esta configuración y la IP que ve el servidor, y señala los problemas.

## Configuraciones habituales

| Configuración | Cómo |
| --- | --- |
| Solo este equipo | Los valores predeterminados: `http://localhost:3690` |
| LAN | Ábrelo en la dirección LAN del servidor, p. ej., `http://192.168.1.20:3690`. Las direcciones LAN pueden cambiar; reserva una en el router para un uso prolongado |
| Tailscale | Consulta Tailscale más arriba |
| Cloudflare Tunnel | Consulta Cloudflare Tunnel más arriba |
| Servidor en la nube | Con un dominio: instala con `--domain tex.example.org` (apunta su DNS al servidor y abre los puertos 80 y 443). El Caddy incluido obtiene el certificado HTTPS; entonces el puerto 3690 solo responde en el propio servidor. Sin dominio: Cloudflare Tunnel o Tailscale |

## Seguridad

- Para un grupo pequeño, lo más sencillo es acceder a ColTex solo a través de Tailscale o una VPN: así no es visible en internet en absoluto. Con Cloudflare Tunnel es público, protegido por el inicio de sesión de ColTex.
- En internet, usa HTTPS (Caddy, como en la configuración en la nube).
- Un cortafuegos en el servidor (ufw, firewalld) no cierra los puertos que publica Docker. Con `--domain`, el puerto 3690 solo responde en el propio servidor; si usas Tailscale o un túnel de Cloudflare, cierra el 3690 en el cortafuegos de tu proveedor de nube.
- No hay registro público, solo invitaciones; las contraseñas tienen reglas de seguridad; cada persona puede activar la verificación en dos pasos. Los inicios de sesión fallidos se ralentizan y después bloquean una cuenta para direcciones desconocidas, y una dirección que sigue fallando queda bloqueada durante un día (consulta [Administración](#/help/admin)).
- Las páginas de ColTex indican a los navegadores que no lo muestren dentro de otros sitios (contra el clickjacking) y que solo ejecuten sus propios scripts; con `--domain`, Caddy también les indica que usen solo HTTPS (HSTS).
- Un puerto poco habitual no detiene a los escáneres; no confíes en ello.
