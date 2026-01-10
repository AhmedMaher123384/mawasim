import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronLeft, Home, Users, Briefcase, PhoneCall } from 'lucide-react';
import logo from '../assets/logo.png';
import { useConfig } from '../config/ConfigContext';

type IconComponent = typeof Home;
type BilingualText = { en?: string; ar?: string };
type MenuConfigItem = { href?: string; label?: BilingualText };
type NavItem =
  | { kind: 'router'; to: string; label: string; icon: IconComponent; isActive: boolean }
  | { kind: 'external'; href: string; label: string; icon: IconComponent };
type NavbarColors = { background?: string; text?: string; border?: string; accent?: string };
type NavbarSectionConfig = { enabled?: boolean; colors?: NavbarColors };

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { config, t } = useConfig();
  const navbarSection = config?.sections?.navbar as NavbarSectionConfig | undefined;
  const navbarDisabled = navbarSection?.enabled === false;

  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.trim().replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    if (!/^[0-9a-f]{6}$/i.test(full)) return '';
    const r = Number.parseInt(full.slice(0, 2), 16);
    const g = Number.parseInt(full.slice(2, 4), 16);
    const b = Number.parseInt(full.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  useEffect(() => {
    if (navbarDisabled) return;
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [navbarDisabled]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname, location.hash]);

  if (navbarDisabled) return null;

  const navbarColors = navbarSection?.colors;
  const navbarBackground = typeof navbarColors?.background === 'string' && navbarColors.background.trim() ? navbarColors.background.trim() : '';
  const navbarText = typeof navbarColors?.text === 'string' && navbarColors.text.trim() ? navbarColors.text.trim() : '';
  const navbarBorder = typeof navbarColors?.border === 'string' && navbarColors.border.trim() ? navbarColors.border.trim() : '';
  const navbarAccentRaw = typeof navbarColors?.accent === 'string' && navbarColors.accent.trim() ? navbarColors.accent.trim() : '';
  const themePrimary = typeof config?.theme?.primary === 'string' ? config.theme.primary : '';
  const navbarAccent = navbarAccentRaw || (themePrimary && themePrimary.trim() ? themePrimary.trim() : '#16a34a');

  const defaultNavItems: MenuConfigItem[] = [
    { href: '/', label: { en: 'Home', ar: 'الرئيسية' } },
    { href: '/about', label: { en: 'About', ar: 'من نحن' } },
    { href: '/partners', label: { en: 'Partners', ar: 'شركاء النجاح' } },
    { href: '/contact', label: { en: 'Contact', ar: 'وسائل التواصل' } },
  ];

  const iconByPath: Record<string, IconComponent> = {
    '/': Home,
    '/about': Users,
    '/partners': Briefcase,
    '/contact': PhoneCall,
  };

  const rawMenu: MenuConfigItem[] = Array.isArray(config?.site?.menu) && config.site.menu.length
    ? (config.site.menu as MenuConfigItem[])
    : [];

  const normalizeHref = (raw: string) => {
    const href = raw.trim();
    if (!href) return { kind: 'router' as const, to: '/' };
    if (/^(https?:\/\/|mailto:|tel:)/i.test(href)) return { kind: 'external' as const, href };
    if (href.startsWith('#')) return { kind: 'router' as const, to: `/${href}` };
    return { kind: 'router' as const, to: href };
  };

  const computeActive = (to: string) => {
    const [pathname, hashPart] = to.split('#');
    const hash = hashPart ? `#${hashPart}` : '';
    if (hash) return location.pathname === (pathname || '/') && location.hash === hash;
    return location.pathname === (pathname || '/');
  };

  const sourceMenu: MenuConfigItem[] = rawMenu.length ? rawMenu : defaultNavItems;

  const navItems: NavItem[] = sourceMenu.map((m) => {
    const label = m?.label ? (t(m.label) || m.label.ar || m.label.en || '') : '';
    const hrefRaw = String(m?.href || '/');
    const normalized = normalizeHref(hrefRaw);
    const pathnameOnly = normalized.kind === 'router' ? normalized.to.split('#')[0] || '/' : '/';
    const icon = iconByPath[pathnameOnly] || Home;
    if (normalized.kind === 'external') return { kind: 'external', href: normalized.href, label, icon };
    return { kind: 'router', to: normalized.to, label, icon, isActive: computeActive(normalized.to) };
  });

  const animationStyles = `
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
    
    @keyframes shimmerSlow {
      0% { transform: translateX(-100%); }
      50% { transform: translateX(100%); }
      100% { transform: translateX(-100%); }
    }
    
    @keyframes spinSlow {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @keyframes pulse {
      0% { opacity: 0.6; }
      50% { opacity: 1; }
      100% { opacity: 0.6; }
    }
    
    @keyframes subtleGlow {
      0% { box-shadow: 0 0 3px rgba(0, 0, 0, 0.1), 0 0 5px rgba(0, 0, 0, 0); }
      50% { box-shadow: 0 0 5px rgba(0, 0, 0, 0.15), 0 0 10px rgba(0, 0, 0, 0.1); }
      100% { box-shadow: 0 0 3px rgba(0, 0, 0, 0.1), 0 0 5px rgba(0, 0, 0, 0); }
    }
  `;

  const siteTitle = t(config?.site?.title) || 'مواسم';
  const computedBorder = navbarBorder || 'rgba(15, 23, 42, 0.08)';
  const computedText = navbarText || '#0f172a';
  const computedBg = navbarBackground || (scrolled ? 'rgba(255, 255, 255, 0.92)' : 'rgba(255, 255, 255, 0.78)');
  const accentSoft = hexToRgba(navbarAccent, 0.12) || 'rgba(22, 163, 74, 0.12)';
  const accentSoft2 = hexToRgba(navbarAccent, 0.18) || 'rgba(22, 163, 74, 0.18)';
  const logoSrc =
    typeof config?.site?.logoNavbar === 'string' && config.site.logoNavbar.trim() ? config.site.logoNavbar : logo;

  const navStyle: CSSProperties = {
    backgroundColor: computedBg,
    borderBottom: `1px solid ${computedBorder}`,
    color: computedText,
    backdropFilter: navbarBackground || isMenuOpen ? undefined : 'blur(10px)',
    WebkitBackdropFilter: navbarBackground || isMenuOpen ? undefined : 'blur(10px)',
  };

  const itemBase =
    'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 focus:outline-none focus-visible:ring-2';

  return (
    <nav dir="rtl" className="fixed top-0 right-0 w-full z-50" style={navStyle}>
      <style>{animationStyles}</style>

      <div
        className="h-1 w-full"
        style={{
          backgroundImage: `linear-gradient(90deg, ${navbarAccent}, ${hexToRgba(navbarAccent, 0.35) || 'rgba(22, 163, 74, 0.35)'}, transparent)`,
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/" className="flex items-center gap-3 min-w-0">
              <div
                className="p-2 rounded-2xl transition-transform duration-300"
                style={{
                  background: scrolled ? accentSoft : 'transparent',
                  border: `1px solid ${scrolled ? accentSoft2 : 'transparent'}`,
                }}
              >
                <img
                  src={logoSrc}
                  alt={siteTitle}
                  className="h-10 w-auto object-contain"
                />
              </div>
              <div className="hidden lg:block min-w-0">
                <div className="font-extrabold text-base truncate">{siteTitle}</div>
                <div className="text-xs opacity-70 truncate">{t(config?.site?.tabTitle) || ''}</div>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.kind === 'external') {
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                    className={itemBase}
                    style={{
                      color: computedText,
                      border: `1px solid ${hexToRgba(navbarAccent, 0.18) || 'rgba(15, 23, 42, 0.12)'}`,
                      background: 'transparent',
                    }}
                  >
                    <Icon size={16} style={{ color: computedText }} />
                    <span>{item.label}</span>
                  </a>
                );
              }

              const active = item.isActive;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={itemBase}
                  style={{
                    color: computedText,
                    background: active ? accentSoft2 : 'transparent',
                    border: `1px solid ${active ? (hexToRgba(navbarAccent, 0.35) || 'rgba(22, 163, 74, 0.35)') : (hexToRgba(navbarAccent, 0.18) || 'rgba(15, 23, 42, 0.12)')}`,
                    boxShadow: active ? `0 10px 25px ${hexToRgba(navbarAccent, 0.14) || 'rgba(22, 163, 74, 0.14)'}` : undefined,
                  }}
                >
                  <Icon size={16} style={{ color: computedText }} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-300"
            aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            style={{
              color: computedText,
              background: scrolled ? accentSoft : 'transparent',
              border: `1px solid ${scrolled ? accentSoft2 : (hexToRgba(navbarAccent, 0.18) || 'rgba(15, 23, 42, 0.12)')}`,
            }}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {isMenuOpen ? (
        <>
          <div
            className="fixed inset-0"
            onClick={() => setIsMenuOpen(false)}
            style={{
              background: 'rgba(2, 6, 23, 0.42)',
              zIndex: 50,
            }}
          />
          <div
            className="fixed top-0 right-0 h-[100dvh] w-[88vw] max-w-[360px] overflow-y-auto"
            style={{
              zIndex: 60,
              backgroundColor: navbarBackground || '#ffffff',
              color: computedText,
              borderLeft: `1px solid ${computedBorder}`,
              boxShadow: `0 30px 90px ${hexToRgba(navbarAccent, 0.22) || 'rgba(2, 6, 23, 0.22)'}`,
            }}
          >
            <div
              className="h-1 w-full"
              style={{
                backgroundImage: `linear-gradient(90deg, ${navbarAccent}, ${hexToRgba(navbarAccent, 0.35) || 'rgba(22, 163, 74, 0.35)'}, transparent)`,
              }}
            />

            <div className="p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-2xl" style={{ background: accentSoft, border: `1px solid ${accentSoft2}` }}>
                  <img src={logoSrc} alt={siteTitle} className="h-10 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-base truncate">{siteTitle}</div>
                  <div className="text-xs opacity-70 truncate">{t(config?.site?.tabTitle) || ''}</div>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200"
                aria-label="إغلاق القائمة"
                style={{
                  color: computedText,
                  background: accentSoft,
                  border: `1px solid ${accentSoft2}`,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="px-4 pb-6">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.kind === 'router' ? item.isActive : false;
                const commonClass = 'w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-200';
                const inner = (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{
                          background: active ? accentSoft2 : (hexToRgba(navbarAccent, 0.08) || 'rgba(15, 23, 42, 0.06)'),
                          border: `1px solid ${active ? (hexToRgba(navbarAccent, 0.35) || 'rgba(22, 163, 74, 0.35)') : (hexToRgba(navbarAccent, 0.14) || 'rgba(15, 23, 42, 0.10)')}`,
                        }}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="font-bold truncate">{item.label}</div>
                    </div>
                    <ChevronLeft size={16} style={{ opacity: active ? 1 : 0.6 }} />
                  </>
                );

                const style: CSSProperties = {
                  color: computedText,
                  background: active ? accentSoft2 : 'transparent',
                  border: `1px solid ${active ? (hexToRgba(navbarAccent, 0.35) || 'rgba(22, 163, 74, 0.35)') : (hexToRgba(navbarAccent, 0.12) || 'rgba(15, 23, 42, 0.10)')}`,
                  boxShadow: active ? `0 14px 35px ${hexToRgba(navbarAccent, 0.14) || 'rgba(22, 163, 74, 0.14)'}` : undefined,
                };

                if (item.kind === 'external') {
                  return (
                    <a
                      key={item.href}
                      href={item.href}
                      target={item.href.startsWith('http') ? '_blank' : undefined}
                      rel={item.href.startsWith('http') ? 'noreferrer' : undefined}
                      className={commonClass}
                      style={style}
                      onClick={() => setIsMenuOpen(false)}
                    >
                      {inner}
                    </a>
                  );
                }
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={commonClass}
                    style={style}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {inner}
                  </Link>
                );
              })}
            </div>

            <div className="px-6 pb-8 text-center text-xs opacity-70">
              {t(config?.site?.footerText) || 'مواسم الخدمات'}
            </div>
          </div>
        </>
      ) : null}
    </nav>
  );
}

export default Navbar;
