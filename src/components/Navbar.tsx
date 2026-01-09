import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronLeft, Home, Users, Briefcase, PhoneCall } from 'lucide-react';
import logo from '../assets/logo.png';
import { useConfig } from '../config/ConfigContext';

type IconComponent = typeof Home;
type BilingualText = { en?: string; ar?: string };
type MenuConfigItem = { href?: string; label?: BilingualText };
type NavItem = { path: string; label: string; icon: IconComponent };
type NavbarColors = { background?: string; text?: string; border?: string; accent?: string };
type NavbarSectionConfig = { colors?: NavbarColors };

function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { config, t } = useConfig();
  const navbarSection = config?.sections?.navbar as NavbarSectionConfig | undefined;
  const navbarColors = navbarSection?.colors;
  const navbarBackground = typeof navbarColors?.background === 'string' && navbarColors.background.trim() ? navbarColors.background.trim() : '';
  const navbarText = typeof navbarColors?.text === 'string' && navbarColors.text.trim() ? navbarColors.text.trim() : '';
  const navbarBorder = typeof navbarColors?.border === 'string' && navbarColors.border.trim() ? navbarColors.border.trim() : '';

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const defaultNavItems: NavItem[] = [
    { path: '/', label: 'الرئيسية', icon: Home },
    { path: '/about', label: 'من نحن', icon: Users },
    { path: '/partners', label: 'شركاء النجاح', icon: Briefcase },
    { path: '/contact', label: 'وسائل التواصل', icon: PhoneCall },
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

  const navItems: NavItem[] = rawMenu.length
    ? rawMenu.map((m) => {
        const path = String(m?.href || '/');
        return {
          path,
          label: m?.label ? (t(m.label) || m?.label?.ar || m?.label?.en || '') : '',
          icon: iconByPath[path] || Home,
        };
      })
    : defaultNavItems;

  const isActive = (path: string) => location.pathname === path;

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

  return (
    <nav
      dir="rtl"
      className={`fixed top-0 right-0 w-full z-50 transition-all duration-300 ${scrolled ? 'shadow-md' : 'shadow-sm'}`}
      style={{
        backgroundColor: navbarBackground || undefined,
        borderColor: navbarBorder || undefined,
      }}
    >
      <style>{animationStyles}</style>
      
      {/* شريط زخرفي علوي بسيط */}
      <div className="relative h-1 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gray-200" style={{ backgroundColor: navbarBorder || undefined }}></div>
      </div>
      
      <div className="flex items-center justify-between h-24 px-6 relative">
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`focus:outline-none p-2 relative overflow-hidden rounded-full ${navbarText ? '' : 'text-gray-800 hover:text-gray-600'}`}
          aria-label="فتح القائمة"
          style={{ color: navbarText || undefined }}
        >
          <span className="absolute inset-0 bg-gray-300 opacity-0 hover:opacity-100 rounded-full transition-opacity duration-300"></span>
          {isMenuOpen ? <X size={28} className="relative z-10" /> : <Menu size={28} className="relative z-10" />}
        </button>
        
        <div className="absolute right-0 top-0 h-full w-16 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute h-32 w-32 rounded-full bg-gray-100 blur-xl opacity-20 transform -translate-y-16 translate-x-8"></div>
        </div>
        
        <div className="absolute left-0 top-0 h-full w-16 pointer-events-none overflow-hidden opacity-30">
          <div className="absolute h-32 w-32 rounded-full bg-gray-100 blur-xl opacity-20 transform -translate-y-16 -translate-x-8"></div>
        </div>
        
        <Link to="/" className="flex-shrink-0 transform -translate-y-1 relative group">
          <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 rounded-full blur-xl transition-all duration-500 scale-110"></div>
          <div className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-5 rounded-full blur-xl transition-all duration-500 scale-125"></div>
          <img
            src={typeof config?.site?.logoNavbar === 'string' ? config.site.logoNavbar : logo}
            alt="Mawasim Logo"
            className="h-16 w-auto object-contain transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-20" style={{ animation: 'spinSlow 15s linear infinite' }}>
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className="absolute top-1/2 left-1/2 w-1 h-10 bg-gray-400"
                style={{ transform: `rotate(${i * 45}deg) translateY(-28px)`, transformOrigin: 'bottom center' }}
              ></div>
            ))}
          </div>
        </Link>
      </div>
      
      {/* شريط زخرفي سفلي بسيط */}
      <div className="relative h-1 w-full overflow-hidden">
        <div className="absolute inset-0 bg-gray-200" style={{ backgroundColor: navbarBorder || undefined }}></div>
      </div>

      {/* القائمة الجانبية */}
      <div
        className={`fixed top-0 right-0 w-80 h-full bg-white shadow-xl transition-all duration-500 ease-in-out ${isMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ zIndex: 60 }}
      >
        <div className="relative h-1 w-full overflow-hidden">
          <div className="absolute inset-0 bg-gray-200" style={{ backgroundColor: navbarBorder || undefined }}></div>
        </div>
        
        <button
          onClick={() => setIsMenuOpen(false)}
          className={`absolute top-4 left-4 focus:outline-none p-2 rounded-full bg-gray-200 transition-all duration-300 ${navbarText ? '' : 'text-gray-800 hover:text-gray-600'}`}
          aria-label="إغلاق القائمة"
          style={{ color: navbarText || undefined }}
        >
          <X size={20} />
        </button>
        
        <div className="flex items-center justify-between h-20 px-6 relative">
          <div className="absolute inset-0 bg-gray-100 opacity-5 blur-xl rounded-full"></div>
          <img
            src={logo}
            alt="Mawasim Logo"
            className="h-32 w-auto object-contain"
          />
        </div>
        
        <div className="flex items-center justify-center px-8 py-2">
          <div className="relative h-px bg-gray-200 w-full"></div>
        </div>
        
        <div className="p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`text-xl font-medium block transition-all duration-300 py-4 px-6 rounded-lg my-2 relative overflow-hidden group ${isActive(item.path) ? 'bg-gray-100 shadow-md' : 'hover:bg-gray-50'} ${navbarText ? 'text-inherit' : 'text-gray-900'}`}
                onClick={() => setIsMenuOpen(false)}
                style={{ color: navbarText || undefined }}
              >
                <span className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon size={18} className="ml-2 opacity-80" />
                    <span>{item.label}</span>
                  </div>
                  {isActive(item.path) && <ChevronLeft size={16} className="mr-2" />}
                </span>
                <span className="absolute right-0 w-2 h-full bg-gray-300 opacity-0 group-hover:opacity-50 transition-all duration-500 transform -skew-x-12 translate-x-20 group-hover:translate-x-0"></span>
                <span className="absolute inset-0 bg-gray-100 opacity-0 group-hover:opacity-20 transition-all duration-500"></span>
              </Link>
            );
          })}
        </div>
        
        <div className="absolute bottom-24 w-full px-8">
          <div className="relative h-px bg-gray-200 w-full"></div>
        </div>
        
        <div className="absolute bottom-8 w-full px-8 text-center">
          <p className="text-gray-500 text-sm" style={{ color: navbarText || undefined }}>{t(config?.site?.footerText) || 'مواسم الخدمات © 2025'}</p>
        </div>
        
        <div className="absolute bottom-0 w-full">
          <div className="h-16 w-full bg-gray-200"></div>
          <div className="relative h-1 w-full overflow-hidden">
            <div className="absolute inset-0 bg-gray-200"></div>
          </div>
        </div>
      </div>

      {isMenuOpen && (
        <div
          className="fixed inset-0 backdrop-blur-sm transition-all duration-300"
          onClick={() => setIsMenuOpen(false)}
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            zIndex: 40
          }}
        />
      )}
    </nav>
  );
}

export default Navbar;
