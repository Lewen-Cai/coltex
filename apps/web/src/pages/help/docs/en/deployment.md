# Deployment and network

In production ColTex uses one port (3690 by default): pages, the API, live collaboration (WebSocket) and notifications all go through it. Anything that forwards HTTP and WebSocket works: this computer, a LAN, Tailscale, Cloudflare Tunnel, or a cloud server. (3000 and 5173 are the development server's ports.)

## Installing

On Linux or macOS with Docker, one command:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash
```

If the download is cut off (`curl: (35) Recv failure: Connection reset by peer`, common when GitHub is hard to reach), run the command again.

It asks for the language and the TeX Live edition (arrow keys; `--edition` and `--lang` answer them instead), checks Docker (on Linux it can install it), gets ColTex into `~/coltex`, writes the settings, downloads the prebuilt images (x86-64 and ARM64) and starts it, and prints the addresses to open on this machine and on your network. The first start downloads TeX Live. There are two editions:

| Edition | Download | On disk (all of ColTex) | Free space to have |
| --- | --- | --- | --- |
| **standard** (default) | about 3 GB | about 12 GB | 20 GB |
| **full** (`--edition full`) | about 8 GB | about 23 GB | 35 GB |

Both have the complete TeX Live and compile the same documents, and the AI agent works with either. The standard edition leaves out the packages' manuals and sources; the full edition adds them, and the AI agent can then also read the manuals. With the standard edition it answers from the package files and its own knowledge. Switch later with `coltex edition full` or `coltex edition standard`.

Remote access (Tailscale, Cloudflare Tunnel) is turned on after the install, in **Settings → Network** (see below). For scripted installs, options can also set it up during the install:

```sh
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --tailscale
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --cloudflare-token <token>
curl -fsSL https://raw.githubusercontent.com/Lewen-Cai/coltex/main/install.sh | bash -s -- --domain tex.example.org   # a cloud server with its own domain: HTTPS
```

Then manage it with `coltex`:

| Command | What it does |
| --- | --- |
| `coltex status` / `logs` | State / logs |
| `coltex edition [standard\|full]` | Show or switch the TeX Live edition (downloads the other compiler image) |
| `coltex update` | Update to the latest release (downloads the new images); data and settings stay |
| `coltex stop` / `start` | Stop / start |
| `coltex tailscale up` | Join your tailnet (prints a sign-in link and QR code) |
| `coltex cloudflare quick` | A temporary public Cloudflare address |
| `coltex cloudflare token` | A Cloudflare tunnel with your own domain (asks for the token) |
| `coltex reset` | Delete everything (accounts, projects, the database) and start again from the setup page; asks you to type `reset` first |
| `coltex uninstall` | Remove ColTex from this machine: containers, database, data, images, the `coltex` command and its folder (Docker stays); asks you to type `uninstall` first |

## Signing in from any address

The server accepts sign-ins made to its own address: open it at `localhost`, a LAN IP, a Tailscale address or a domain, without listing any of them first. A page on another site can't sign anyone in.

## Which addresses links use

Invitation links and Git clone addresses are offered once for every address ColTex can be reached at, each with its own copy button, so you pick the one the recipient can open:

- **LAN** or **Tailscale**: the address you opened ColTex at (recognised by its address);
- **Tailscale**, **Cloudflare**: the built-in Tailscale's or Cloudflare Tunnel's addresses while connected. They appear and disappear with them; nothing needs changing when one is turned off;
- **Public address**: the server's `COLTEX_URL`, when set.

A pending invitation's links stay in the invitation list until it is used or expires.

## Tailscale

ColTex has Tailscale built in: it can join your tailnet as a device of its own (named `coltex` by default). Nothing needs installing on the server, and it works on servers without a desktop.

1. In **Settings → Network**, turn Tailscale on.
2. Scan the QR code with a phone, or open the link on any device, and sign in to your tailnet. The page switches to Connected by itself.
3. Turn on **Serve ColTex on the tailnet**. With MagicDNS and HTTPS enabled for the tailnet the address is `https://coltex.<your tailnet>.ts.net`, otherwise `http://coltex.<your tailnet>.ts.net`.

When no browser can reach the settings page yet, run this on the server:

```sh
coltex tailscale up
```

It turns Tailscale on, prints the sign-in link and a QR code in the terminal, waits for the sign-in, then serves ColTex on the tailnet. `coltex tailscale status` shows the state, `coltex tailscale down` leaves the tailnet, `coltex tailscale off` turns it off.

`TS_HOSTNAME` changes the device name. The server runs Tailscale itself: no extra container or privileges. Its device keys are kept in `data/tailscale` and are not in backups; after a restore, sign in again.

If the server already runs Tailscale itself, the two don't get in each other's way: the built-in one is a device of its own and uses userspace networking, so it changes none of the server's network settings. You don't need it either: open ColTex at the server's Tailscale IP or MagicDNS name with `:3690`.

## Cloudflare Tunnel

ColTex also has Cloudflare Tunnel built in, as a tunnel only: people still sign in with their ColTex accounts; no Cloudflare Access is needed. The server needs no open port.

- **Quick tunnel**: no Cloudflare account; you get `https://<random>.trycloudflare.com`, which changes every time it starts. For trying things out.
- **My own domain**: with your domain on Cloudflare, create a tunnel under Zero Trust → Networks → Tunnels, copy the command under “Run the following command” (for any system: Windows, macOS, Debian, Red Hat or Docker); ColTex takes the token out of it; add a public hostname to the tunnel (e.g. `tex.example.org`) with the service `http://localhost:3690`.

Turn it on with the switch of the Cloudflare Tunnel card in **Settings → Network**, then pick a temporary link or a tunnel (the saved one, or a new one from the pasted command), or in a terminal with `coltex cloudflare quick` / `coltex cloudflare token`. Once connected, its addresses appear in invitation links by themselves. The token is stored encrypted and never shown again.

If the tunnel can't reach Cloudflare over QUIC (a firewall, or a proxy that drops UDP), ColTex switches it to HTTP/2 by itself. When trycloudflare.com limits temporary links (429 Too Many Requests), ColTex asks again less and less often. When you change the tunnel, move its public hostnames to the new tunnel in the Cloudflare dashboard; until then they answer with Error 1033.

If the server already runs cloudflared for a tunnel of its own, the two don't conflict, but don't give ColTex that tunnel's token: Cloudflare would treat both as connectors of the same tunnel and share the requests between them, so the server's other hostnames would sometimes reach ColTex and fail (502). Either add a public hostname for ColTex to that tunnel (service `http://localhost:3690`) and leave the built-in one off, or create a separate tunnel for ColTex.

## Server settings

These are environment variables of the server. With Docker, put them in the `.env` file next to `docker-compose.yml` and run `docker compose up -d`.

| Variable | What it does |
| --- | --- |
| `COLTEX_PORT` | The port, 3690 by default |
| `COLTEX_URL` | A public address offered in every link, e.g. `https://tex.example.org` |
| `TRUSTED_ORIGINS` | Other addresses sign-in accepts, comma-separated. Needed only when pages and the API are at different addresses |
| `TRUST_PROXY` | With a reverse proxy in front (Caddy, Nginx): `uniquelocal` (proxy on a private network) or `true`. Unset, the server takes the proxy for the visitor, and everyone shares one sign-in rate limit |
| `TS_HOSTNAME` | The built-in Tailscale's device name, `coltex` by default |

**How requests arrive** at the bottom of **Settings → Network** shows these settings and the IP the server sees, and points out problems.

## Common setups

| Setup | How |
| --- | --- |
| This computer only | The defaults: `http://localhost:3690` |
| LAN | Open it at the server's LAN address, e.g. `http://192.168.1.20:3690`. LAN addresses can change; reserve one in the router for long-term use |
| Tailscale | See Tailscale above |
| Cloudflare Tunnel | See Cloudflare Tunnel above |
| Cloud server | With a domain: install with `--domain tex.example.org` (point its DNS at the server and open ports 80 and 443). The bundled Caddy gets the HTTPS certificate; port 3690 then only answers on the server itself. Without a domain: Cloudflare Tunnel or Tailscale |

## Security

- For a small group, reaching ColTex only through Tailscale or a VPN is simplest: it isn't visible on the internet at all. With Cloudflare Tunnel it is public, protected by ColTex's sign-in.
- On the internet, use HTTPS (Caddy, as in the cloud setup).
- A firewall on the server (ufw, firewalld) doesn't close ports Docker publishes. With `--domain`, port 3690 only answers on the server itself; with Tailscale or a Cloudflare tunnel instead, close 3690 in your cloud provider's firewall.
- There is no public sign-up, only invitations; passwords have strength rules; sign-in allows 3 attempts per 10 seconds per IP.
- An unusual port doesn't stop scanners; don't count on it.
