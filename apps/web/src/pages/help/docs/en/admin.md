# Administration

The system administrator sees the Administration pages under **Settings** in the avatar menu; admins see **Manage users** and **Invitations** there, for their own team.

## Users and invitations

- There is no public sign-up: accounts come only from invitation links, and projects are shared only with people who have an account.
- Accounts have one of three roles:
  - **Member**.
  - **Admin**: leads a **team**, say a supervisor and their students. The members an admin invites join the admin's team, and the admin manages only them.
  - **System admin**: there is exactly one, the account made at first-run setup. It runs the whole instance (AI services, backups, network) and sees everyone. Nobody can be made a second one, so one admin account can't take the instance over.
- **Invitations**: single-use links, for one email or (with the email left empty) for anyone with the link, with an expiry. A pending invitation's links stay in the list (**Link**), one for every address ColTex can be reached at (LAN, Tailscale, Cloudflare). The system admin invites members or admins and chooses the new account's **AI group**. Admins invite members only, into their own team; those members get the admin's AI group. Admins see and revoke only their own invitations.
- **Manage users**: the system admin sees every account, makes people members or admins, moves members between teams (**Team** in the row's menu), resets passwords, and suspends or deletes accounts. An admin sees themselves and their team, and resets passwords, suspends or deletes only their team's members. Deleting an account deletes the projects it owns.
- To hand the system admin role to someone else (or get it back when that account is lost), run `coltex cli system-admin <email>` on the server; the previous system admin becomes an admin.

## AI services

- **AI services**: connect providers with API keys or subscription sign-in (Claude Pro/Max, ChatGPT, Copilot…), or your own OpenAI-compatible servers (Ollama, vLLM, LM Studio…). Keys are stored encrypted, members never see them, and requests go through this server.
- If a subscription sign-in ends on a localhost address that doesn't load, copy that full address from the address bar back into ColTex.
- Set the three models of **Auto** and everyone starts on automatic choice: the **judge** (a cheap, fast model) reads each message and hands it to the **light** model (quick questions, small fixes) or the **strong** one (several errors, changes across files, careful writing). Until all three are set, people start on the first model they may use.
- **AI usage & access**: requests and tokens for the group and per person. Who may use which models is set with **AI groups**: each group allows providers (including models added later) or single models, e.g. "PhD students" with the strong model and "Undergraduates" with the light one. Everyone is in at most one group, chosen in the invitation or later by opening the person in the list. People in no group can't use the AI agent, so new people have no AI until the system admin adds them (members invited by an admin get the admin's group). The system admin can always use every model. Deleting a group leaves its people without AI until they join another.

## Storage and backups

- Project files are kept on the local disk or in S3-compatible storage, set when the server starts (`STORAGE` and `S3_*`). History, build output and the compiler's working copies stay in the data directory.
- **WebDAV backups** go to a folder on Nextcloud, ownCloud, a NAS or any WebDAV server. Each backup is one file with the database, every project's files and their history. Schedule them daily or weekly and choose how many to keep. Use an app password where the server offers one.
> **Encryption**: encrypted backups (AES-256) also contain the instance secret, so connected AI services keep working after a restore. **Keep the password somewhere else: without it a backup can't be opened.**
- Restoring is done on the server with the `restore` command while the server is stopped; see the operations guide.

## Monitoring

**Overview** shows the live state of the server, compiler and database, with history charts for CPU, memory and builds. The server samples every 10 seconds and keeps 30 days, also while nobody has the page open.

## Network

**Network** lists the addresses ColTex is reached at (invitation links use them), turns on the built-in Tailscale and Cloudflare Tunnel, and shows how requests reach the server. See [Deployment and network](#/help/deployment).
