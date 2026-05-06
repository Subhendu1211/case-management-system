import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import type { User } from '../lib/types';
import { t, useLang } from '../i18n';

export type NavItem = { to: string; label: string; icon?: React.FC<React.SVGProps<SVGSVGElement>> };

function Icon({ path, className }: { path: string; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.7}
      stroke="currentColor"
      className={clsx('h-4 w-4 flex-shrink-0', className)}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  );
}

const ICONS: Record<string, string> = {
  dashboard:
    'M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25',
  cases:
    'M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z',
  complaints:
    'M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z',
  issue:
    'M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z',
  disability:
    'M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.355a14.995 14.995 0 01-4.5 0M12 3.75a.75.75 0 110-1.5.75.75 0 010 1.5zm4.5 3.947c0 2.486-2.015 4.5-4.5 4.5s-4.5-2.014-4.5-4.5a4.5 4.5 0 119 0z',
  users:
    'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z',
  audit:
    'M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z',
  notifications:
    'M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0',
  reports:
    'M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z',
  settings:
    'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  profile:
    'M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z',
  logout:
    'M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9',
  default:
    'M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25',
};

function getNavIcon(label: string, to: string): string {
  const path = to.toLowerCase();
  if (path.includes('/dashboard')) return ICONS.dashboard;
  if (path.includes('/complaint')) return ICONS.complaints;
  if (path.includes('/cases')) return ICONS.cases;
  if (path.includes('/issue-register')) return ICONS.issue;
  if (path.includes('/profile')) return ICONS.profile;

  const l = label.toLowerCase();
  if (l.includes('dashboard')) return ICONS.dashboard;
  if (l.includes('complaint')) return ICONS.complaints;
  if (l.includes('case')) return ICONS.cases;
  if (l.includes('issue')) return ICONS.issue;
  if (l.includes('disability')) return ICONS.disability;
  if (l.includes('user')) return ICONS.users;
  if (l.includes('audit') || l.includes('log')) return ICONS.audit;
  if (l.includes('notif')) return ICONS.notifications;
  if (l.includes('report')) return ICONS.reports;
  if (l.includes('setting')) return ICONS.settings;
  if (l.includes('profile')) return ICONS.profile;
  return ICONS.default;
}

function OdishaLogo() {
  return (
    <img
      src="/odisha-logo.png"
      alt="Government of Odisha Seal"
      className="h-9 w-9 object-contain"
    />
  );
}

function formatRole(role: string) {
  return role.split('_').map((w) => w[0] + w.slice(1).toLowerCase()).join(' ');
}

export function Sidebar(props: {
  title: string;
  items: NavItem[];
  onLogout?: () => void;
  user?: User;
  isLoadingUser?: boolean;
  userError?: Error | null;
}) {
  useLang();
  const location = useLocation();

  const { items, onLogout, user, isLoadingUser } = props;
  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()
    : 'U';

  function isNavItemActive(itemTo: string, routerIsActive: boolean) {
    let parsed: URL;
    try {
      parsed = new URL(itemTo, 'http://local');
    } catch {
      return routerIsActive;
    }

    const itemPath = parsed.pathname;
    const itemView = parsed.searchParams.get('view');
    const currentView = new URLSearchParams(location.search).get('view');
    const isProcessingHousePage =
      location.pathname === '/cases' && currentView === 'processing_house';

    if (itemPath === '/cases' && itemView === 'processing_house') {
      return isProcessingHousePage;
    }

    if (itemPath === '/cases' && !itemView) {
      return location.pathname.startsWith('/cases') && !isProcessingHousePage;
    }

    return routerIsActive;
  }

  return (
    <>
      {/* DESKTOP SIDEBAR */}
      <aside
        className="hidden w-60 flex-shrink-0 flex-col bg-gov-blue md:flex"
        style={{ minHeight: '100vh', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', alignSelf: 'flex-start' }}
        aria-label="Sidebar navigation"
      >
        {/* Brand */}
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-white/10 px-4 py-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white">
            <OdishaLogo />
          </div>
          <div className="min-w-0">
            <div
              className="truncate text-xs font-bold uppercase tracking-widest"
              style={{ color: 'rgb(var(--color-gov-gold-light))' }}
            >
              {t('appShell.sidebar.gov')}
            </div>
            <div className="truncate text-[10px] leading-tight text-white/60">
              {t('appShell.sidebar.office')}
            </div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto px-2 py-3" aria-label="Primary navigation">
          <ul className="space-y-0.5" role="list">
            {items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to.includes('dashboard') || item.to === '/profile'}
                  className={({ isActive }) => {
                    const active = isNavItemActive(item.to, isActive);
                    return clsx(
                      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-white',
                      active
                        ? 'bg-white/15 font-semibold text-white'
                        : 'text-white/60 hover:bg-white/10 hover:text-white'
                    );
                  }}
                  style={({ isActive }) => {
                    const active = isNavItemActive(item.to, isActive);
                    return active
                      ? { borderLeft: '2px solid rgb(var(--color-gov-gold-light))', paddingLeft: '10px' }
                      : {};
                  }}
                >
                  <Icon path={getNavIcon(item.label, item.to)} />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* User + Logout */}
        <div className="flex-shrink-0 border-t border-white/10 px-2 py-3">
          <div className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5">
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
              style={{ background: 'rgb(var(--color-gov-gold-light) / 0.2)', outline: '1px solid rgb(var(--color-gov-gold-light) / 0.4)' }}
            >
              {isLoadingUser ? t('appShell.user.loading') : initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {user?.name ?? (isLoadingUser ? t('appShell.user.loading') : t('appShell.user.fallback'))}
              </div>
              <div className="truncate text-xs text-white/50">
                {user?.role ? formatRole(user.role) : t('appShell.user.roleEmpty')}
              </div>
            </div>
          </div>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="mt-1.5 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
            >
              <Icon path={ICONS.logout} />
              {t('appShell.sidebar.signOut')}
            </button>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around border-t border-neutral-200 bg-white px-2 py-1 md:hidden"
        aria-label="Mobile navigation"
      >
        {items.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to.includes('dashboard') || item.to === '/profile'}
            className={({ isActive }) => {
              const active = isNavItemActive(item.to, isActive);
              return clsx(
                'flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors',
                active ? 'text-gov-blue' : 'text-neutral-400 hover:text-neutral-600'
              );
            }}
          >
            {({ isActive }) => {
              const active = isNavItemActive(item.to, isActive);
              return (
              <>
                <Icon path={getNavIcon(item.label, item.to)} className={clsx('h-5 w-5', active ? 'text-gov-blue' : 'text-neutral-400')} />
                <span className="max-w-[56px] truncate">{item.label}</span>
              </>
              );
            }}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
