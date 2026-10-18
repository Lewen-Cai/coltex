import { spawn } from 'node:child_process'

/** Connection URL without the password, which goes in PGPASSWORD (not on the command line). */
function connection(databaseUrl: string): { url: string; env: NodeJS.ProcessEnv } {
  const url = new URL(databaseUrl)
  const password = decodeURIComponent(url.password)
  url.password = ''
  return { url: url.toString(), env: { ...process.env, ...(password ? { PGPASSWORD: password } : {}) } }
}

function run(program: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(program, args, { env, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (c: Buffer) => (stderr = (stderr + c.toString()).slice(-4000)))
    child.on('error', err =>
      reject(
        (err as NodeJS.ErrnoException).code === 'ENOENT'
          ? new Error(`${program} not found: backups and restore need the PostgreSQL client programs (set PG_DUMP / PSQL to their paths)`)
          : err,
      ),
    )
    child.on('close', code => (code === 0 ? resolve() : reject(new Error(`${program} failed: ${stderr.trim() || `exit code ${code}`}`))))
  })
}

/** Plain SQL dump of the whole database (schema and data, all schemas), restorable with psql. */
export function dumpDatabase(databaseUrl: string, out: string, pgDump = 'pg_dump'): Promise<void> {
  const { url, env } = connection(databaseUrl)
  return run(pgDump, ['--no-owner', '--no-privileges', `--file=${out}`, `--dbname=${url}`], env)
}

/** Run a SQL file in one transaction, stopping at the first error. */
export function runSqlFile(databaseUrl: string, file: string, psql = 'psql'): Promise<void> {
  const { url, env } = connection(databaseUrl)
  return run(psql, ['--quiet', '--no-psqlrc', '--single-transaction', '-v', 'ON_ERROR_STOP=1', `--file=${file}`, `--dbname=${url}`], env)
}
