import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Icons } from '../ui/Icons';
import { cn } from '@/src/lib/utils';
import { useAuth } from '@/src/hooks/useAuth';
import { DATA_UPDATED_EVENT } from '@/src/lib/dataService';
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/src/lib/notificationService';
import { AppNotification } from '@/src/types';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncNotifs = () => {
      if (user) {
        setNotifications(getNotificationsForUser(user.uid, user.email));
      } else {
        setNotifications([]);
      }
    };
    syncNotifs();
    window.addEventListener(DATA_UPDATED_EVENT, syncNotifs);
    return () => window.removeEventListener(DATA_UPDATED_EVENT, syncNotifs);
  }, [user?.uid, user?.email]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
    setMobileNavOpen(false);
  }, [location.pathname, location.search]);

  const solidHeader = isScrolled || !isHome;

  const handleAboutClick = () => {
    if (isHome) {
      const el = document.getElementById('valores');
      el?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/#valores');
    }
  };

  const navItems = [
    { label: 'Comprar', to: '/listings?intent=sale' },
    { label: 'Arrendar', to: '/listings?intent=rent' },
    { label: 'Agentes', to: '/agents' },
    { label: 'Planos', to: '/#pricing' },
  ];

  const initials = (user?.displayName || user?.email || 'U').trim().substring(0, 2).toUpperCase();

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-200 px-6 md:px-10',
        solidHeader ? 'bg-white border-b border-gray-200 h-20 shadow-sm' : 'bg-transparent h-20'
      )}
    >
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between gap-8">
        {/* Zone 1: Brand Title */}
        <Link
          to="/"
          className={cn(
            'text-2xl font-bold tracking-tight transition-colors whitespace-nowrap shrink-0',
            solidHeader ? 'text-brand-primary' : 'text-white'
          )}
        >
          Ki-Imóveis
        </Link>

        {/* Zone 2: Clean Single-Line Nav Links */}
        <nav className="hidden md:flex items-center gap-7 font-medium">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className={cn(
                'text-sm transition-colors hover:text-brand-primary pb-0.5 relative group whitespace-nowrap shrink-0',
                solidHeader ? 'text-gray-700' : 'text-white/90'
              )}
            >
              {item.label}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
            </Link>
          ))}
          <button
            type="button"
            onClick={handleAboutClick}
            className={cn(
              'text-sm transition-colors hover:text-brand-primary pb-0.5 relative group whitespace-nowrap shrink-0 cursor-pointer',
              solidHeader ? 'text-gray-700' : 'text-white/90'
            )}
          >
            Sobre Nós
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-brand-primary transition-all group-hover:w-full" />
          </button>
        </nav>

        {/* Zone 3: Primary Action & Account Menu */}
        <div className="flex items-center gap-3 shrink-0">
          {user?.role === 'admin' ? (
            <Link
              to="/dashboard?tab=admin"
              className={cn(
                'hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0',
                solidHeader
                  ? 'bg-gray-900 text-white hover:bg-gray-800'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              )}
            >
              <Icons.KeyRound size={15} />
              <span>Admin · Gestão</span>
            </Link>
          ) : (
            <Link
              to={user ? '/request-submission' : '/auth'}
              className={cn(
                'hidden sm:inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0',
                solidHeader
                  ? 'bg-brand-primary text-white hover:bg-rose-600'
                  : 'bg-white text-gray-900 hover:bg-gray-100'
              )}
            >
              Publicar Imóvel
            </Link>
          )}

          {user && (
            <div ref={notifRef} className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Abrir notificações"
                className={cn(
                  'relative flex items-center justify-center w-10 h-10 rounded-full border transition-all cursor-pointer',
                  solidHeader
                    ? 'bg-white border-gray-300 text-gray-700 hover:shadow-sm'
                    : 'bg-white/15 backdrop-blur-sm border-white/30 text-white'
                )}
              >
                <Icons.Bell size={17} />
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {notifications.filter((n) => !n.read).length > 9
                      ? '9+'
                      : notifications.filter((n) => !n.read).length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-[60]">
                  <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-gray-900">Notificações & E-mails</span>
                    {notifications.some((n) => !n.read) && (
                      <button
                        type="button"
                        onClick={() => markAllNotificationsRead(user.uid, user.email)}
                        className="text-[11px] font-semibold text-brand-primary hover:underline cursor-pointer"
                      >
                        Marcar lidas
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
                    {notifications.length > 0 ? (
                      notifications.slice(0, 6).map((n) => (
                        <button
                          key={n.id}
                          type="button"
                          onClick={() => {
                            markNotificationRead(n.id);
                            setNotifOpen(false);
                            navigate(n.link || '/dashboard?tab=notifications');
                          }}
                          className={cn(
                            'w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer flex items-start gap-2.5',
                            !n.read && 'bg-rose-50/40'
                          )}
                        >
                          <span
                            className={cn(
                              'w-2 h-2 rounded-full mt-1.5 shrink-0',
                              !n.read ? 'bg-brand-primary' : 'bg-gray-300'
                            )}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 truncate">{n.title}</p>
                            <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">{n.message}</p>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                                <Icons.Mail size={10} />
                                {n.emailSent ? 'E-mail enviado' : 'Alerta registado'}
                              </span>
                              <span>·</span>
                              <span>{new Date(n.createdAt).toLocaleDateString('pt-AO')}</span>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-8 text-center text-xs text-gray-500">
                        Sem notificações recentes.
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 px-4 py-2 text-center">
                    <Link
                      to="/dashboard?tab=notifications"
                      className="text-xs font-semibold text-gray-800 hover:text-brand-primary"
                    >
                      Gerir alertas por e-mail →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Abrir menu da conta"
              className={cn(
                'flex items-center gap-2 p-1.5 pl-3 border rounded-full transition-all h-10 cursor-pointer',
                solidHeader
                  ? 'bg-white border-gray-300 hover:shadow-sm'
                  : 'bg-white/15 backdrop-blur-sm border-white/30 text-white'
              )}
            >
              <Icons.Menu size={17} className={solidHeader ? 'text-gray-700' : 'text-white'} />
              <span className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-white text-[11px] font-bold overflow-hidden">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : user ? (
                  initials
                ) : (
                  <Icons.User size={14} />
                )}
              </span>
            </button>

            {menuOpen && (
              <div className="absolute top-12 right-0 w-60 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-[60]">
                {user ? (
                  <>
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="text-sm font-bold text-gray-900 truncate">{user.displayName}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    {user.role === 'admin' ? (
                      <>
                        <Link
                          to="/dashboard?tab=admin"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-brand-primary hover:bg-rose-50"
                        >
                          <Icons.KeyRound size={16} /> Validar Licenças
                        </Link>
                        <Link
                          to="/dashboard?tab=admin&section=agents"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Icons.Award size={16} /> Avaliar Agentes
                        </Link>
                        <Link
                          to="/dashboard?tab=admin&section=packages"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Icons.Gem size={16} /> Pacotes & Preços
                        </Link>
                        <Link
                          to="/dashboard?tab=listings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Icons.Home size={16} /> Moderar Catálogo
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Icons.Home size={16} /> Painel
                        </Link>
                        <Link
                          to="/request-submission"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 sm:hidden"
                        >
                          <Icons.Plus size={16} /> Publicar Imóvel
                        </Link>
                      </>
                    )}
                    <Link
                      to="/dashboard?tab=settings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Icons.Settings size={16} /> Definições & Foto
                    </Link>
                    <div className="border-t border-gray-100 my-1.5" />
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        signOut();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 w-full text-left cursor-pointer"
                    >
                      <Icons.LogOut size={16} /> Terminar Sessão
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-gray-50"
                    >
                      <Icons.User size={16} /> Entrar / Cadastrar
                    </Link>
                    <Link
                      to="/listings"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Icons.Search size={16} /> Explorar Imóveis
                    </Link>
                    <Link
                      to="/agents"
                      className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Icons.Users size={16} /> Agentes
                    </Link>
                  </>
                )}

                <div className="md:hidden border-t border-gray-100 mt-1.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileNavOpen((prev) => !prev)}
                    className="flex items-center justify-between w-full px-4 py-2 text-xs font-semibold text-gray-500 cursor-pointer"
                  >
                    <span>Navegação</span>
                    <Icons.ChevronDown size={14} />
                  </button>
                  {mobileNavOpen &&
                    navItems.map((item) => (
                      <Link
                        key={item.label}
                        to={item.to}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
