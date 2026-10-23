import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react'
import { ConfirmHost } from '@/components/confirm'
import { ConvertDialogHost } from '@/components/ConvertDialog'
import { CopyProjectDialogHost } from '@/components/shell/project-dialogs'
import { PublishTemplateDialogHost } from '@/components/publish-template-dialog'
import { AppShell } from '@/components/shell/app-shell'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Spinner } from '@/components/ui/spinner'
import { NotificationsPage } from '@/pages/notifications'
import { ProjectsPage } from '@/pages/projects'
import { isSettingsRoute } from '@/pages/settings/nav'
import { AcceptInvitePage } from './components/auth/AcceptInvitePage.tsx'
import { LoginPage } from './components/auth/LoginPage.tsx'
import { SetupPage } from './components/auth/SetupPage.tsx'
import { UNAUTHORIZED_EVENT, api } from './lib/api.ts'
import { authClient, type SessionUser } from './lib/auth.ts'
import { useAiAvailable } from './lib/ai.ts'
import { hasSavedLocale, resolveLocale, setLocale, useLocale } from './lib/i18n.ts'
import { useNotificationStream } from './lib/notifications.ts'
import { navigate, useHashRoute } from './lib/router.ts'

// Heavy parts load on demand: the editor (CodeMirror, pdf.js) and the admin pages (charts).
const EditorPage = lazy(() => import('./components/EditorPage.tsx').then(m => ({ default: m.EditorPage })))
const HelpPage = lazy(() => import('./pages/help/help-page.tsx').then(m => ({ default: m.HelpPage })))
const PdfWindowPage = lazy(() => import('./components/PdfWindowPage.tsx').then(m => ({ default: m.PdfWindowPage })))
const AdminAiPage = lazy(() => import('@/pages/admin/ai').then(m => ({ default: m.AdminAiPage })))
const AdminInvitesPage = lazy(() => import('@/pages/admin/invites').then(m => ({ default: m.AdminInvitesPage })))
const AdminOverviewPage = lazy(() => import('@/pages/admin/overview').then(m => ({ default: m.AdminOverviewPage })))
const AdminAiUsagePage = lazy(() => import('@/pages/admin/ai-usage').then(m => ({ default: m.AdminAiUsagePage })))
const AdminNetworkPage = lazy(() => import('@/pages/admin/network').then(m => ({ default: m.AdminNetworkPage })))
const AdminBackupsPage = lazy(() => import('@/pages/admin/backups').then(m => ({ default: m.AdminBackupsPage })))
const AdminUsersPage = lazy(() => import('@/pages/admin/users').then(m => ({ default: m.AdminUsersPage })))
const AccountSettingsPage = lazy(() => import('@/pages/settings/account').then(m => ({ default: m.AccountSettingsPage })))
const AppearanceSettingsPage = lazy(() => import('@/pages/settings/appearance').then(m => ({ default: m.AppearanceSettingsPage })))
const SyncSettingsPage = lazy(() => import('@/pages/settings/sync').then(m => ({ default: m.SyncSettingsPage })))
const AiSettingsPage = lazy(() => import('@/pages/settings/ai').then(m => ({ default: m.AiSettingsPage })))
const SkillsSettingsPage = lazy(() => import('@/pages/settings/skills').then(m => ({ default: m.SkillsSettingsPage })))

function Loading() {
  return (
    <div className="flex h-full items-center justify-center text-muted-foreground">
      <Spinner className="size-6" />
    </div>
  )
}

/** Pages about the AI agent: for people who have it; everyone else lands on their account. */
function AiOnly({ user, children }: { user: SessionUser; children: ReactNode }) {
  const available = useAiAvailable(user.id)
  useEffect(() => {
    if (available === false) navigate('/settings')
  }, [available])
  return available ? children : <Loading />
}

function consolePage(route: string, user: SessionUser): ReactNode {
  // Keyed by route, so search, filters and selection start fresh in each view.
  if (route === '/shared') return <ProjectsPage key={route} view={{ kind: 'shared' }} />
  if (route === '/archived') return <ProjectsPage key={route} view={{ kind: 'archived' }} />
  if (route === '/trash') return <ProjectsPage key={route} view={{ kind: 'trash' }} />
  if (route === '/notifications') return <NotificationsPage />
  const tag = route.match(/^\/tag\/([\w-]+)$/)
  if (tag) return <ProjectsPage key={route} view={{ kind: 'tag', tagId: tag[1]! }} />
  // Settings: personal pages for everyone; the administration pages live here too, for admins.
  // Their navigation replaces the sidebar's (see AppShell).
  if (isSettingsRoute(route, user)) return settingsPage(route, user)
  if (route === '/help' || route.startsWith('/help/')) return <HelpPage route={route} user={user} />
  // The dashboard: every project (`#/projects` too, for old links).
  return <ProjectsPage key="all" view={{ kind: 'all' }} />
}

function settingsPage(route: string, user: SessionUser): ReactNode {
  if (route === '/settings/appearance') return <AppearanceSettingsPage />
  if (route === '/settings/sync') return <SyncSettingsPage />
  if (route === '/settings/ai') return <AiSettingsPage />
  if (route === '/settings/skills') return <AiOnly user={user}><SkillsSettingsPage /></AiOnly>
  if (user.role === 'admin' || user.role === 'manager') {
    if (route === '/admin/invites') return <AdminInvitesPage user={user} />
    if (route === '/admin/users') return <AdminUsersPage user={user} />
  }
  if (user.role === 'admin') {
    if (route === '/admin') return <AdminOverviewPage />
    if (route === '/admin/ai') return <AdminAiPage />
    if (route === '/admin/ai/usage') return <AdminAiUsagePage />
    if (route === '/admin/backups') return <AdminBackupsPage />
    if (route === '/admin/network') return <AdminNetworkPage />
  }
  return <AccountSettingsPage user={user} />
}

function Routes() {
  const route = useHashRoute()
  const session = authClient.useSession()
  const [needsSetup, setNeedsSetup] = useState<boolean>()
  useNotificationStream(session.data?.user.id)

  useEffect(() => {
    api.setupStatus().then(
      s => {
        // Setting up a new instance: the language it was installed in, unless this browser chose one.
        if (s.needsSetup && s.language && !hasSavedLocale()) void setLocale(resolveLocale(s.language))
        setNeedsSetup(s.needsSetup)
      },
      () => setNeedsSetup(false),
    )
  }, [])

  // An API call came back 401 (expired or revoked session): re-check the session.
  useEffect(() => {
    const onUnauthorized = () => void session.refetch()
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized)
  }, [session])

  const signedIn = () => {
    navigate('/')
    void session.refetch()
  }

  if (needsSetup === undefined || session.isPending) return null

  if (needsSetup) {
    return (
      <SetupPage
        onDone={() => {
          setNeedsSetup(false)
          signedIn()
        }}
      />
    )
  }

  const invite = route.match(/^\/invite\/([\w-]+)/)
  const user = session.data?.user
  if (invite && !user) return <AcceptInvitePage token={invite[1]!} onDone={signedIn} />
  if (!user) return <LoginPage onSignedIn={signedIn} />

  const pdfWindow = route.match(/^\/project\/([\w-]+)\/pdf$/)
  if (pdfWindow) {
    return (
      <Suspense fallback={<Loading />}>
        <PdfWindowPage key={pdfWindow[1]} projectId={pdfWindow[1]!} />
      </Suspense>
    )
  }
  const project = route.match(/^\/project\/([\w-]+)/)
  if (project) {
    return (
      <Suspense fallback={<Loading />}>
        <EditorPage key={project[1]} projectId={project[1]!} user={user} />
      </Suspense>
    )
  }
  return (
    <AppShell user={user} route={route}>
      <Suspense fallback={<Loading />}>{consolePage(route, user)}</Suspense>
    </AppShell>
  )
}

export function App() {
  // Switching the language remounts the app, so every label is rendered again.
  const locale = useLocale()
  return (
    <TooltipProvider delayDuration={300} key={locale}>
      <Routes />
      <Toaster position="bottom-right" richColors closeButton />
      <ConfirmHost />
      <ConvertDialogHost />
      <CopyProjectDialogHost />
      <PublishTemplateDialogHost />
    </TooltipProvider>
  )
}
