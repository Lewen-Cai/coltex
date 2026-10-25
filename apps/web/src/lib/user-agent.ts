/**
 * A browser's user agent as "Chrome · macOS": enough to tell devices apart in a list of sign-ins.
 * Anything that isn't a browser (git, a script) is shown as it is, shortened.
 */
export function deviceName(ua: string | null | undefined): string | null {
  if (!ua) return null
  const browser =
    /Edg(?:e|A|iOS)?\//.test(ua) ? 'Edge'
    : /OPR\/|Opera/.test(ua) ? 'Opera'
    : /SamsungBrowser\//.test(ua) ? 'Samsung Internet'
    : /Firefox\/|FxiOS\//.test(ua) ? 'Firefox'
    : /Chrome\/|CriOS\//.test(ua) ? 'Chrome'
    : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
    : null
  const system =
    /iPad/.test(ua) ? 'iPadOS'
    : /iPhone|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /CrOS/.test(ua) ? 'ChromeOS'
    : /Mac OS X|Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : null
  if (browser) return system ? `${browser} · ${system}` : browser
  return ua.length > 60 ? `${ua.slice(0, 60)}…` : ua
}
