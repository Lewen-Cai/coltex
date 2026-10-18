import { Fragment, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  BookOpen,
  ArrowLeft,
  ChevronsUpDown,
  LogOut,
  MoreHorizontal,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react'
import { Logo } from '@/components/brand'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { UserAvatar } from '@/components/user-avatar'
import { authClient, type SessionUser } from '@/lib/auth'
import { t, tk } from '@/lib/i18n'
import { useUnreadNotifications } from '@/lib/notifications'
import { navigate } from '@/lib/router'
import { PERSONAL, adminItems, isSettingsRoute, settingsItemActive, settingsTitle, type SettingsItem } from '@/pages/settings/nav'
import { helpSection, helpSections, helpTitle, isHelpRoute } from '@/pages/help/nav'
import { useTags } from '@/lib/tags'
import { inView, useProjects } from '@/pages/projects-data'
import { TagDialogHost, deleteTag, openTagDialog } from '@/components/tag-dialog'
import { ProjectDialogs } from './project-dialogs'
import { ROLE_NAME } from '@/lib/roles'

type NavItem = { title: string; href: string; match: (route: string) => boolean; unread?: boolean }

// The same navigation for everyone; settings (and administration, for admins) open from the user menu.
const WORKSPACE: NavItem[] = [
  // The workspace is the list of all projects (user's decision: one page, not two).
  { title: tk('Workspace'), href: '#/', match: r => r === '/' || r === '/projects' },
  { title: tk('Notifications'), href: '#/notifications', match: r => r === '/notifications', unread: true },
  { title: tk('Shared with me'), href: '#/shared', match: r => r === '/shared' },
  { title: tk('Archived'), href: '#/archived', match: r => r === '/archived' },
  { title: tk('Trash'), href: '#/trash', match: r => r === '/trash' },
]

/** Breadcrumb trail for a route. */
function crumbs(route: string, user: SessionUser): { label: string; href?: string }[] {
  if (isSettingsRoute(route, user)) {
    return [{ label: t('Settings'), href: '#/settings' }, { label: settingsTitle(route) }]
  }
  if (isHelpRoute(route)) return [{ label: t('Help documentation'), href: '#/help' }, { label: helpTitle(route, user) }]
  if (route.startsWith('/tag/')) return [{ label: t('Workspace'), href: '#/' }, { label: t('Tags') }]
  const item = WORKSPACE.find(i => i.match(route))
  if (!item || item.href === '#/') return [{ label: t('Workspace') }]
  return [{ label: t('Workspace'), href: '#/' }, { label: t(item.title) }]
}

async function signOut() {
  await authClient.signOut()
  // A full reload clears every page's state (and avoids pages refetching with a dead session).
  window.location.assign('/')
}

/** The user's tags, as filters of the project list (only they see them). */
function TagsGroup({ route }: { route: string }) {
  const tags = useTags()
  const { projects } = useProjects()
  // The same count as the tag's page shows (archived and trashed projects aren't in it).
  const count = (tagId: string) => projects?.filter(p => inView(p, { kind: 'tag', tagId })).length ?? 0
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{t('Tags')}</SidebarGroupLabel>
      <SidebarGroupAction title={t('New tag')} onClick={() => openTagDialog()}>
        <Plus /> <span className="sr-only">{t('New tag')}</span>
      </SidebarGroupAction>
      <SidebarMenu>
        {tags?.map(tag => (
          <SidebarMenuItem key={tag.id}>
            <SidebarMenuButton asChild isActive={route === `/tag/${tag.id}`}>
              <a href={`#/tag/${tag.id}`}>
                <span className="flex size-4 shrink-0 items-center justify-center">
                  <span className="size-2.5 rounded-full" style={{ background: tag.color }} />
                </span>
                <span>{tag.name}</span>
              </a>
            </SidebarMenuButton>
            {/* The actions button takes the count's place whenever it shows (hover,
                focus, its menu open, and always on narrow screens). */}
            <SidebarMenuBadge className="group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-0 group-has-[[aria-expanded=true]]/menu-item:opacity-0 max-md:hidden">{count(tag.id) || ''}</SidebarMenuBadge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuAction showOnHover aria-label={t('Tag actions')}>
                  <MoreHorizontal />
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="start">
                <DropdownMenuItem onSelect={() => openTagDialog({ tag })}>
                  <Pencil /> {t('Edit tag')}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => void deleteTag(tag)}>
                  <Trash2 /> {t('Delete tag')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

function SettingsGroup({ label, items, route }: { label: string; items: SettingsItem[]; route: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton asChild isActive={settingsItemActive(item, route)}>
              <a href={item.href}>
                <span>{t(item.title)}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}

/** The sidebar while settings are open: a way back, the personal pages, and (for admins) administration. */
function SettingsNav({ user, route }: { user: SessionUser; route: string }) {
  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground">
              <a href="#/">
                <ArrowLeft />
                <span>{t('Back to workspace')}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <SettingsGroup label={t('Personal')} items={PERSONAL} route={route} />
      {adminItems(user).length > 0 && <SettingsGroup label={t('Administration')} items={adminItems(user)} route={route} />}
    </>
  )
}

/** The sidebar while the help is open: a way back and the sections. */
function HelpNav({ user, route }: { user: SessionUser; route: string }) {
  const current = helpSection(route, user)
  return (
    <>
      <SidebarGroup>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="text-muted-foreground">
              <a href="#/">
                <ArrowLeft />
                <span>{t('Back to workspace')}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroup>
      <SidebarGroup>
        <SidebarGroupLabel>{t('Help documentation')}</SidebarGroupLabel>
        <SidebarMenu>
          {helpSections(user).map(section => (
            <SidebarMenuItem key={section.id}>
              <SidebarMenuButton asChild isActive={section.id === current.id}>
                <a href={`#/help/${section.id}`}>
                  <span>{t(section.title)}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroup>
    </>
  )
}

function AppSidebar({ user, route }: { user: SessionUser; route: string }) {
  const inSettings = isSettingsRoute(route, user)
  const inHelp = isHelpRoute(route)
  const unread = useUnreadNotifications()
  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#/">
                <Logo />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        {/* Settings take over the sidebar instead of opening a second column of navigation. */}
        <AnimatePresence mode="popLayout" initial={false}>
          {inSettings || inHelp ? (
            <motion.div
              key={inHelp ? 'help' : 'settings'}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {inHelp ? <HelpNav user={user} route={route} /> : <SettingsNav user={user} route={route} />}
            </motion.div>
          ) : (
            <motion.div
              key="workspace"
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              <SidebarGroup>
                <SidebarMenu>
                  {WORKSPACE.map(item => (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton asChild isActive={item.match(route)}>
                        <a href={item.href}>
                          <span>{t(item.title)}</span>
                        </a>
                      </SidebarMenuButton>
                      {item.unread && unread > 0 && (
                        <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-primary-foreground peer-hover/menu-button:text-primary-foreground peer-data-active/menu-button:text-primary-foreground">
                          {unread > 99 ? '99+' : unread}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroup>
              <TagsGroup route={route} />
            </motion.div>
          )}
        </AnimatePresence>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <UserAvatar id={user.id} name={user.name} className="rounded-lg" />
                  <span className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs text-muted-foreground">{user.email}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" align="start" className="w-(--radix-dropdown-menu-trigger-width) min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex items-center gap-2">
                    <UserAvatar id={user.id} name={user.name} className="rounded-lg" />
                    <div className="grid text-sm leading-tight">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{t(ROLE_NAME[user.role ?? 'user'] ?? 'Member')}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => navigate('/settings')}>
                  <Settings /> {t('Settings')}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => navigate('/help')}>
                  <BookOpen /> {t('Help documentation')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void signOut()}>
                  <LogOut /> {t('Sign out')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** The console layout: sidebar, top bar, and the animated page area. */
export function AppShell({ user, route, children }: { user: SessionUser; route: string; children: ReactNode }) {
  const trail = crumbs(route, user)
  const pageKey = route

  return (
    <SidebarProvider className="h-full min-h-0">
      <AppSidebar user={user} route={route} />
      <SidebarInset className="min-h-0 min-w-0 overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 data-vertical:self-center data-[orientation=vertical]:h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              {trail.map((c, i) => (
                <Fragment key={c.label}>
                  {i > 0 && <BreadcrumbSeparator />}
                  <BreadcrumbItem>
                    {c.href && i < trail.length - 1 ? <BreadcrumbLink href={c.href}>{c.label}</BreadcrumbLink> : <BreadcrumbPage>{c.label}</BreadcrumbPage>}
                  </BreadcrumbItem>
                </Fragment>
              ))}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {/* Enter-only transition: the next page mounts at once (no waiting on an exit animation). */}
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="w-full px-4 py-6 md:px-6"
          >
            {children}
          </motion.div>
        </div>
      </SidebarInset>
      <ProjectDialogs />
      <TagDialogHost />
    </SidebarProvider>
  )
}

/** Title row at the top of a console page. */
export function PageHeader({ title, description, actions }: { title: ReactNode; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
