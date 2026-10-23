import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App.tsx'
import { initLocales } from './lib/i18n.ts'
import './index.css'

// Each language's messages are a chunk of their own, loaded when first used.
const dictionaries = import.meta.glob<Record<string, string>>('./locales/*/index.ts', { import: 'default' })

void initLocales(async locale => (await dictionaries[`./locales/${locale}/index.ts`]?.()) ?? {}).then(() =>
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  ),
)
