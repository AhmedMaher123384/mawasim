import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';
import { useConfig } from '../config/ConfigContext';

type BilingualText = { en?: string; ar?: string };
type MenuConfigItem = { href?: string; label?: BilingualText };
type NavItem =
  | { kind: 'router'; to: string; label: string; isActive: boolean }
  | { kind: 'external'; href: string; label: string };
type NavbarColors = { background?: string; text?: string; border?: string; accent?: string };
type NavbarSectionConfig = { enabled?: boolean; colors?: NavbarColors };

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMenuMounted, setIsMenuMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { config, t } = useConfig();
  const navbarSection = config?.sections?.navbar as NavbarSectionConfig | undefined;
  const navbarDisabled = navbarSection?.enabled === false;
  const menuUnmountTimeoutRef = useRef<number | null>(null);

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
    if (menuUnmountTimeoutRef.current) {
      window.clearTimeout(menuUnmountTimeoutRef.current);
      menuUnmountTimeoutRef.current = null;
    }
    if (isMenuOpen) {
      setIsMenuMounted(true);
      return;
    }
    if (isMenuMounted) {
      menuUnmountTimeoutRef.current = window.setTimeout(() => {
        setIsMenuMounted(false);
        menuUnmountTimeoutRef.current = null;
      }, 260);
    }
    return () => {
      if (menuUnmountTimeoutRef.current) {
        window.clearTimeout(menuUnmountTimeoutRef.current);
        menuUnmountTimeoutRef.current = null;
      }
    };
  }, [isMenuOpen, isMenuMounted]);

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
    if (normalized.kind === 'external') return { kind: 'external', href: normalized.href, label };
    return { kind: 'router', to: normalized.to, label, isActive: computeActive(normalized.to) };
  });

  const siteTitle = t(config?.site?.title) || 'مواسم';
  const computedBorder = navbarBorder || 'rgba(15, 23, 42, 0.08)';
  const computedText = navbarText || '#0f172a';
  const computedBg = navbarBackground || '#ffffff';
  const accentSoft = hexToRgba(navbarAccent, 0.12) || 'rgba(22, 163, 74, 0.12)';
  const logoSrc =
    typeof config?.site?.logoNavbar === 'string' && config.site.logoNavbar.trim() ? config.site.logoNavbar : logo;

  const navStyle: CSSProperties = {
    color: computedText,
  };

  return (
    <nav dir="rtl" className="fixed top-0 right-0 w-full z-50 relative" style={navStyle}>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundColor: computedBg,
          borderBottom: `1px solid ${computedBorder}`,
          boxShadow: scrolled ? '0 8px 24px rgba(15, 23, 42, 0.06)' : 'none',
        }}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="h-16 flex items-center justify-between gap-4">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="inline-flex items-center justify-center w-11 h-11 rounded-2xl transition-all duration-200"
            aria-label={isMenuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={isMenuOpen ? 'true' : 'false'}
            style={{
              color: computedText,
              background: accentSoft,
              border: `1px solid ${hexToRgba(navbarAccent, 0.18) || 'rgba(22, 163, 74, 0.18)'}`,
            }}
          >
            {isMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <div className="flex items-center min-w-0">
            <Link to="/" className="flex items-center min-w-0">
              <img
                src={logoSrc}
                alt={siteTitle}
                className="h-9 w-auto object-contain"
              />
            </Link>
          </div>
        </div>
      </div>

      {isMenuMounted ? (
        <div
          className={`fixed inset-0 z-[80] ${isMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}
          dir="rtl"
        >
          <div
            className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${isMenuOpen ? 'opacity-100' : 'opacity-0'}`}
            onClick={() => setIsMenuOpen(false)}
          />

          <aside
            role="dialog"
            aria-modal="true"
            className={`absolute top-0 right-0 h-[100dvh] w-[88vw] max-w-[420px] overflow-y-auto bg-white transition-transform duration-300 ease-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
            style={{
              color: computedText,
              boxShadow: '0 28px 90px rgba(2, 6, 23, 0.22)',
            }}
          >
          <div
            className="absolute top-0 right-0 h-full w-2"
            style={{
              backgroundImage: `linear-gradient(to bottom, ${navbarAccent}, ${hexToRgba(navbarAccent, 0.55) || 'rgba(22, 163, 74, 0.55)'})`,
            }}
          />

          <div className="px-5 pt-5 pb-4 border-b" style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="p-2 rounded-xl"
                  style={{
                    background: accentSoft,
                    border: `1px solid ${hexToRgba(navbarAccent, 0.18) || 'rgba(22, 163, 74, 0.18)'}`,
                  }}
                >
                  <img src={logoSrc} alt={siteTitle} className="h-10 w-auto object-contain" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold" style={{ color: navbarAccent }}>
                    {t({ ar: 'القائمة', en: 'Menu' })}
                  </div>
                  <div className="font-extrabold text-base truncate">{t(config?.site?.tabTitle) || siteTitle}</div>
                </div>
              </div>

              <button
                onClick={() => setIsMenuOpen(false)}
                className="inline-flex items-center justify-center w-11 h-11 rounded-2xl transition-colors duration-150"
                aria-label="إغلاق القائمة"
                style={{
                  color: computedText,
                  background: accentSoft,
                  border: `1px solid ${hexToRgba(navbarAccent, 0.18) || 'rgba(22, 163, 74, 0.18)'}`,
                }}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="p-4">
            <div className="rounded-2xl border bg-gradient-to-br from-white via-white to-green-50/60 overflow-hidden" style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}>
              <div className="p-2">
                {navItems.map((item) => {
                  const active = item.kind === 'router' ? item.isActive : false;
                  const commonClass =
                    'w-full flex items-center justify-between gap-3 px-4 py-4 rounded-xl transition-all duration-150';

                  const style: CSSProperties = {
                    color: active ? '#065f46' : computedText,
                    background: active ? (hexToRgba(navbarAccent, 0.10) || 'rgba(22, 163, 74, 0.10)') : 'transparent',
                    border: `1px solid ${active ? (hexToRgba(navbarAccent, 0.22) || 'rgba(22, 163, 74, 0.22)') : 'transparent'}`,
                  };

                  const rightMark = (
                    <span
                      className="shrink-0 w-2.5 h-2.5 rounded-full"
                      style={{ background: active ? navbarAccent : 'rgba(15, 23, 42, 0.12)' }}
                    />
                  );

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
                        <div className="font-semibold truncate">{item.label}</div>
                        {rightMark}
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
                      <div className="font-semibold truncate">{item.label}</div>
                      {rightMark}
                    </Link>
                  );
                })}
              </div>

              <div className="px-5 py-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'rgba(15, 23, 42, 0.08)' }}>
                <div className="text-xs opacity-70 truncate">{t(config?.site?.footerText) || 'مواسم الخدمات'}</div>
                <div className="h-1 w-16 rounded-full" style={{ background: navbarAccent }} />
              </div>
            </div>
          </div>
          </aside>
        </div>
      ) : null}
    </nav>
  );
}

export default Navbar;
