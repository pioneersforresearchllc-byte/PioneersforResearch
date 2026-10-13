// Minimal SMTP client — a drop-in replacement for the subset of denomailer's
// SMTPClient we use (constructor + send + close).
//
// Why: denomailer 1.6 ends every send() with `NOOP` and then loops
// `while (true) { readCmd() }` until it sees a 250. When the server closes
// the connection instead, readCmd() keeps resolving null instantly, the loop
// spins the CPU and the edge worker is killed with 546 — AFTER the email was
// already delivered, so the customer sees an error for a mail that arrived.
// This client never loops on a dead connection: every read fails on EOF and
// every step has a timeout.

interface ConnectionConfig {
  hostname: string
  port: number
  /** true = implicit TLS (port 465); false = plain + STARTTLS (port 587). */
  tls: boolean
  auth: { username: string; password: string }
}

export interface SendConfig {
  from: string
  to?: string | string[]
  bcc?: string | string[]
  subject: string
  content: string
  html?: string
}

const STEP_TIMEOUT_MS = 20_000
const enc = new TextEncoder()
const dec = new TextDecoder()

function list(v: string | string[] | undefined): string[] {
  if (!v) return []
  return (Array.isArray(v) ? v : [v]).map((s) => s.trim()).filter(Boolean)
}

/** "Name <a@b.c>" → "a@b.c" */
function address(v: string): string {
  const m = v.match(/<([^>]+)>/)
  return (m ? m[1] : v).trim()
}

function base64(bytes: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function base64Lines(text: string): string {
  return (base64(enc.encode(text)).match(/.{1,76}/g) ?? ['']).join('\r\n')
}

function header(text: string): string {
  // ASCII stays as-is; anything else is RFC 2047 encoded.
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${base64(enc.encode(text))}?=`
}

function withTimeout<T>(p: Promise<T>, what: string): Promise<T> {
  let timer: number | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`smtp timeout: ${what}`)), STEP_TIMEOUT_MS)
  })
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer))
}

export class SMTPClient {
  #config: ConnectionConfig
  #conn: Deno.Conn | null = null
  #buffer = ''
  #ready: Promise<void> | null = null

  constructor({ connection }: { connection: ConnectionConfig }) {
    this.#config = connection
  }

  async #readLine(): Promise<string> {
    while (!this.#buffer.includes('\r\n')) {
      const chunk = new Uint8Array(4096)
      const n = await this.#conn!.read(chunk)
      if (n === null) throw new Error('smtp connection closed by server')
      this.#buffer += dec.decode(chunk.subarray(0, n), { stream: true })
    }
    const i = this.#buffer.indexOf('\r\n')
    const line = this.#buffer.slice(0, i)
    this.#buffer = this.#buffer.slice(i + 2)
    return line
  }

  /** Reads one (possibly multi-line) reply and checks its code. */
  async #expect(codes: number[], what: string): Promise<string> {
    return await withTimeout(
      (async () => {
        let line = await this.#readLine()
        const lines = [line]
        while (line.length >= 4 && line[3] === '-') {
          line = await this.#readLine()
          lines.push(line)
        }
        const code = Number(line.slice(0, 3))
        if (!codes.includes(code)) throw new Error(`smtp ${what} failed: ${lines.join(' | ')}`)
        return lines.join('\n')
      })(),
      what,
    )
  }

  async #write(text: string) {
    const data = enc.encode(text)
    let written = 0
    while (written < data.length) written += await withTimeout(this.#conn!.write(data.subarray(written)), 'write')
  }

  async #cmd(line: string, codes: number[], what: string) {
    await this.#write(line + '\r\n')
    return await this.#expect(codes, what)
  }

  async #connect() {
    const { hostname, port, tls, auth } = this.#config
    this.#conn = await withTimeout(
      tls ? Deno.connectTls({ hostname, port }) : Deno.connect({ hostname, port }),
      'connect',
    )
    await this.#expect([220], 'greeting')
    const ehlo = await this.#cmd('EHLO pioneersresearch.com', [250], 'EHLO')
    if (!tls) {
      if (!/STARTTLS/i.test(ehlo)) throw new Error('smtp server does not offer STARTTLS')
      await this.#cmd('STARTTLS', [220], 'STARTTLS')
      this.#conn = await withTimeout(Deno.startTls(this.#conn as Deno.TcpConn, { hostname }), 'starttls')
      this.#buffer = ''
      await this.#cmd('EHLO pioneersresearch.com', [250], 'EHLO')
    }
    await this.#cmd('AUTH LOGIN', [334], 'AUTH')
    await this.#cmd(base64(enc.encode(auth.username)), [334], 'AUTH user')
    await this.#cmd(base64(enc.encode(auth.password)), [235], 'AUTH password')
  }

  async send(mail: SendConfig): Promise<void> {
    if (!this.#ready) this.#ready = this.#connect()
    await this.#ready

    const to = list(mail.to)
    const bcc = list(mail.bcc)
    const rcpts = [...to, ...bcc]
    if (rcpts.length === 0) throw new Error('smtp: no recipients')

    await this.#cmd(`MAIL FROM:<${address(mail.from)}>`, [250], 'MAIL FROM')
    for (const r of rcpts) await this.#cmd(`RCPT TO:<${address(r)}>`, [250, 251], 'RCPT TO')
    await this.#cmd('DATA', [354], 'DATA')

    const domain = address(mail.from).split('@')[1] || 'pioneersresearch.com'
    const headers = [
      `From: ${mail.from}`,
      `To: ${to.length ? to.join(', ') : 'undisclosed-recipients:;'}`,
      `Subject: ${header(mail.subject)}`,
      `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
      `Message-ID: <${crypto.randomUUID()}@${domain}>`,
      'MIME-Version: 1.0',
    ]
    let body: string
    if (mail.html) {
      const boundary = `b_${crypto.randomUUID()}`
      headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`)
      body = [
        `--${boundary}`,
        'Content-Type: text/plain; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        base64Lines(mail.content),
        `--${boundary}`,
        'Content-Type: text/html; charset=utf-8',
        'Content-Transfer-Encoding: base64',
        '',
        base64Lines(mail.html),
        `--${boundary}--`,
      ].join('\r\n')
    } else {
      headers.push('Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: base64')
      body = base64Lines(mail.content)
    }
    // Base64 lines never start with '.', so no dot-stuffing is needed.
    await this.#write(`${headers.join('\r\n')}\r\n\r\n${body}\r\n.\r\n`)
    await this.#expect([250], 'message')
  }

  /** Best effort and quick: never waits on the server. */
  async close(): Promise<void> {
    const conn = this.#conn
    this.#conn = null
    this.#ready = null
    if (!conn) return
    try {
      await withTimeout(conn.write(enc.encode('QUIT\r\n')), 'QUIT')
    } catch {
      // ignore
    }
    try {
      conn.close()
    } catch {
      // already closed
    }
  }
}
