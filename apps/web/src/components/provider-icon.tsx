import { useEffect, useState } from 'react'
import { Bot } from 'lucide-react'
import { cn } from '@/lib/utils'

// Provider logos from LobeHub's icon set (MIT, @lobehub/icons-static-svg).
// Loaded lazily so only the logos on screen end up downloaded.
const LOGOS: Record<string, () => Promise<{ default: string }>> = {
  bedrock: () => import('@lobehub/icons-static-svg/icons/bedrock-color.svg?raw'),
  antgroup: () => import('@lobehub/icons-static-svg/icons/antgroup-color.svg?raw'),
  claude: () => import('@lobehub/icons-static-svg/icons/claude-color.svg?raw'),
  azure: () => import('@lobehub/icons-static-svg/icons/azure-color.svg?raw'),
  baseten: () => import('@lobehub/icons-static-svg/icons/baseten.svg?raw'),
  cerebras: () => import('@lobehub/icons-static-svg/icons/cerebras-color.svg?raw'),
  cloudflare: () => import('@lobehub/icons-static-svg/icons/cloudflare-color.svg?raw'),
  workersai: () => import('@lobehub/icons-static-svg/icons/workersai-color.svg?raw'),
  deepseek: () => import('@lobehub/icons-static-svg/icons/deepseek-color.svg?raw'),
  fireworks: () => import('@lobehub/icons-static-svg/icons/fireworks-color.svg?raw'),
  githubcopilot: () => import('@lobehub/icons-static-svg/icons/githubcopilot.svg?raw'),
  gemini: () => import('@lobehub/icons-static-svg/icons/gemini-color.svg?raw'),
  vertexai: () => import('@lobehub/icons-static-svg/icons/vertexai-color.svg?raw'),
  groq: () => import('@lobehub/icons-static-svg/icons/groq.svg?raw'),
  huggingface: () => import('@lobehub/icons-static-svg/icons/huggingface-color.svg?raw'),
  kimi: () => import('@lobehub/icons-static-svg/icons/kimi-color.svg?raw'),
  meta: () => import('@lobehub/icons-static-svg/icons/meta-color.svg?raw'),
  minimax: () => import('@lobehub/icons-static-svg/icons/minimax-color.svg?raw'),
  mistral: () => import('@lobehub/icons-static-svg/icons/mistral-color.svg?raw'),
  moonshot: () => import('@lobehub/icons-static-svg/icons/moonshot.svg?raw'),
  nvidia: () => import('@lobehub/icons-static-svg/icons/nvidia-color.svg?raw'),
  openai: () => import('@lobehub/icons-static-svg/icons/openai.svg?raw'),
  codex: () => import('@lobehub/icons-static-svg/icons/codex-color.svg?raw'),
  opencode: () => import('@lobehub/icons-static-svg/icons/opencode.svg?raw'),
  openrouter: () => import('@lobehub/icons-static-svg/icons/openrouter.svg?raw'),
  qwen: () => import('@lobehub/icons-static-svg/icons/qwen-color.svg?raw'),
  together: () => import('@lobehub/icons-static-svg/icons/together-color.svg?raw'),
  vercel: () => import('@lobehub/icons-static-svg/icons/vercel.svg?raw'),
  xai: () => import('@lobehub/icons-static-svg/icons/xai.svg?raw'),
  xiaomimimo: () => import('@lobehub/icons-static-svg/icons/xiaomimimo.svg?raw'),
  zai: () => import('@lobehub/icons-static-svg/icons/zai.svg?raw'),
  ollama: () => import('@lobehub/icons-static-svg/icons/ollama.svg?raw'),
  vllm: () => import('@lobehub/icons-static-svg/icons/vllm-color.svg?raw'),
  lmstudio: () => import('@lobehub/icons-static-svg/icons/lmstudio.svg?raw'),
  // AI tools that connect over MCP (Settings → AI agent).
  claudecode: () => import('@lobehub/icons-static-svg/icons/claudecode-color.svg?raw'),
  cursor: () => import('@lobehub/icons-static-svg/icons/cursor.svg?raw'),
  windsurf: () => import('@lobehub/icons-static-svg/icons/windsurf.svg?raw'),
  geminicli: () => import('@lobehub/icons-static-svg/icons/geminicli-color.svg?raw'),
  cline: () => import('@lobehub/icons-static-svg/icons/cline.svg?raw'),
}

/** Pi provider id → logo. */
const PROVIDER_LOGO: Record<string, string> = {
  'amazon-bedrock': 'bedrock',
  'ant-ling': 'antgroup',
  anthropic: 'claude',
  azure: 'azure',
  baseten: 'baseten',
  cerebras: 'cerebras',
  cloudflare: 'cloudflare',
  'cloudflare-ai-gateway': 'cloudflare',
  'cloudflare-workers-ai': 'workersai',
  deepseek: 'deepseek',
  fireworks: 'fireworks',
  'github-copilot': 'githubcopilot',
  google: 'gemini',
  'google-vertex': 'vertexai',
  groq: 'groq',
  huggingface: 'huggingface',
  'kimi-coding': 'kimi',
  meta: 'meta',
  minimax: 'minimax',
  'minimax-cn': 'minimax',
  mistral: 'mistral',
  moonshotai: 'moonshot',
  'moonshotai-cn': 'moonshot',
  nvidia: 'nvidia',
  openai: 'openai',
  'openai-codex': 'codex',
  opencode: 'opencode',
  'opencode-go': 'opencode',
  openrouter: 'openrouter',
  'qwen-token-plan': 'qwen',
  'qwen-token-plan-cn': 'qwen',
  'qwen-token-plan-individual': 'qwen',
  together: 'together',
  'vercel-ai-gateway': 'vercel',
  xai: 'xai',
  xiaomi: 'xiaomimimo',
  'xiaomi-token-plan-ams': 'xiaomimimo',
  'xiaomi-token-plan-cn': 'xiaomimimo',
  'xiaomi-token-plan-sgp': 'xiaomimimo',
  zai: 'zai',
  'zai-coding-cn': 'zai',
}

const cache = new Map<string, string>()

/** Guess a logo for a self-hosted endpoint from its name or URL. */
function logoFor(provider: string, hint?: string): string | undefined {
  if (PROVIDER_LOGO[provider]) return PROVIDER_LOGO[provider]
  if (provider.startsWith('logo:') && LOGOS[provider.slice(5)]) return provider.slice(5)
  const text = `${provider} ${hint ?? ''}`.toLowerCase()
  if (text.includes('ollama') || text.includes(':11434')) return 'ollama'
  if (text.includes('vllm')) return 'vllm'
  if (text.includes('lm studio') || text.includes('lmstudio') || text.includes(':1234')) return 'lmstudio'
  return undefined
}

/** An AI tool's logo by its LobeHub name (Settings → AI agent). */
export function ToolIcon({ logo, className }: { logo: string; className?: string }) {
  return <ProviderIcon provider={`logo:${logo}`} className={className} />
}

/** A provider's logo, or a generic bot icon for providers without one. */
export function ProviderIcon({ provider, hint, className }: { provider: string; hint?: string; className?: string }) {
  const logo = logoFor(provider, hint)
  const [svg, setSvg] = useState(() => (logo ? cache.get(logo) : undefined))

  useEffect(() => {
    if (!logo) return setSvg(undefined)
    const known = cache.get(logo)
    if (known) return setSvg(known)
    let live = true
    void LOGOS[logo]!().then(m => {
      cache.set(logo, m.default)
      if (live) setSvg(m.default)
    })
    return () => {
      live = false
    }
  }, [logo])

  if (!logo) return <Bot className={cn('size-5 text-muted-foreground', className)} />
  return (
    <span
      className={cn('inline-flex size-5 shrink-0 [&>svg]:size-full', className)}
      aria-hidden
      // Trusted, bundled SVG files (not user content).
      dangerouslySetInnerHTML={svg ? { __html: svg } : undefined}
    />
  )
}
