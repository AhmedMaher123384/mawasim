import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { loadConfig, saveConfig, hasRemote, saveConfigRemote } from './configLoader.js';

type BilingualText = { en?: string; ar?: string; [key: string]: string | undefined };

type MenuItem = { href?: string; label?: BilingualText; [key: string]: unknown };

type ContactLink = { label?: BilingualText; url?: string; [key: string]: unknown };

type ContactSection = {
  heading?: BilingualText | string;
  subheading?: BilingualText | string;
  address?: BilingualText | string;
  email?: string;
  phone?: string;
  hours?: BilingualText | string;
  links?: ContactLink[];
  [key: string]: unknown;
};

type CtaSection = { heading?: BilingualText | string; subheading?: BilingualText | string; [key: string]: unknown };

type ServiceIncludeItem = { title?: BilingualText | string; image?: string; [key: string]: unknown };
type ServiceGalleryItem = { url?: string; caption?: BilingualText | string; [key: string]: unknown };
type ServiceDetails = {
  heroImage?: string;
  longDescription?: BilingualText | string;
  includes?: ServiceIncludeItem[];
  gallery?: ServiceGalleryItem[];
  advantages?: Array<BilingualText | string>;
  [key: string]: unknown;
};

type ServiceItem = {
  title?: BilingualText | string;
  description?: BilingualText | string;
  image?: string;
  details?: ServiceDetails;
  [key: string]: unknown;
};
type ServicesSection = { items?: ServiceItem[]; [key: string]: unknown };

type HeroSection = {
  heading?: BilingualText | string;
  subheading?: BilingualText | string;
  cta?: { text?: BilingualText | string; link?: string; [key: string]: unknown };
  [key: string]: unknown;
};

type HighlightItem = { title?: BilingualText | string; description?: BilingualText | string; [key: string]: unknown };
type HighlightsSection = { items?: HighlightItem[]; [key: string]: unknown };

type AboutSection = { heading?: BilingualText | string; paragraphs?: Array<BilingualText | string>; image?: string; [key: string]: unknown };

type Sections = {
  contact?: ContactSection;
  cta?: CtaSection;
  services?: ServicesSection;
  hero?: HeroSection;
  highlights?: HighlightsSection;
  about?: AboutSection;
  [key: string]: unknown;
};

type Theme = {
  primary: string;
  secondary: string;
  background: string;
  text: string;
  typography?: { fontFamily?: string; headingFamily?: string; fontUrl?: string; [key: string]: unknown };
  [key: string]: unknown;
};

type Site = {
  lang?: string;
  title?: BilingualText | string;
  tabTitle?: BilingualText | string;
  favicon?: string;
  menu?: MenuItem[];
  [key: string]: unknown;
};

type SiteConfig = { site?: Site; sections?: Sections; theme?: Theme; [key: string]: unknown };

type ConfigContextValue = {
  config: SiteConfig | null;
  setConfig: (next: SiteConfig | null) => void;
  updateConfig: (path: string | string[], value: unknown) => void;
  lang: string;
  setLang: (lang: string) => void;
  t: (obj: unknown) => string;
  saveToBrowser: () => void;
  publish: () => Promise<{ ok: boolean; error?: string }>;
  lastSavedAt: number | null;
  unsaved: boolean;
  saveError: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

const ConfigContext = createContext<ConfigContextValue>({
  config: null,
  setConfig: () => {},
  updateConfig: () => {},
  lang: 'en',
  setLang: () => {},
  t: (obj: unknown) => {
    if (typeof obj === 'string') return obj;
    if (!isRecord(obj)) return '';
    const v = obj.en ?? obj.ar;
    return typeof v === 'string' ? v : '';
  },
  saveToBrowser: () => {},
  publish: async () => ({ ok: false, error: 'No provider' }),
  lastSavedAt: null,
  unsaved: false,
  saveError: null,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const [lang, setLang] = useState('en');
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const raw = await loadConfig();
      const cfg = (isRecord(raw) ? (raw as SiteConfig) : {}) as SiteConfig;
      setConfig(cfg);
      setLang(cfg?.site?.lang || 'en');
      loadedRef.current = true;
    })();
  }, []);

  useEffect(() => {
    if (!config) return;
    const root = document.documentElement;
    const theme = config.theme;
    if (!theme) return;
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-secondary', theme.secondary);
    root.style.setProperty('--color-bg', theme.background);
    root.style.setProperty('--color-text', theme.text);

    const typo = theme.typography || {};
    if (typo.fontFamily) {
      root.style.setProperty('--font-family', typo.fontFamily);
    } else {
      root.style.removeProperty('--font-family');
    }
    if (typo.headingFamily) {
      root.style.setProperty('--heading-font-family', typo.headingFamily);
    } else {
      root.style.removeProperty('--heading-font-family');
    }

    try {
      const prev = document.getElementById('site-font-link') as HTMLLinkElement | null;
      if (prev && prev.href !== (typo.fontUrl || '')) {
        prev.remove();
      }
      if (typo.fontUrl && !document.getElementById('site-font-link')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.id = 'site-font-link';
        link.href = typo.fontUrl;
        document.head.appendChild(link);
      }
    } catch (err) {
      void err;
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
    if (metaTheme) metaTheme.content = theme.primary;

    try {
      const tabTitle = config.site?.tabTitle;
      const hasTabTitle =
        typeof tabTitle === 'string'
          ? Boolean(tabTitle)
          : Boolean(tabTitle && (tabTitle.en || tabTitle.ar));
      const titleObj = hasTabTitle ? tabTitle : config.site?.title;
      const titleStr = typeof titleObj === 'string' ? titleObj : (titleObj?.[lang] ?? '');
      if (titleStr) document.title = titleStr;
    } catch (err) {
      void err;
    }

    try {
      const href = config.site?.favicon || '';
      const prevIcon = document.getElementById('site-favicon') as HTMLLinkElement | null;
      if (!href) {
        if (prevIcon) prevIcon.remove();
      } else {
        let link = prevIcon;
        if (!link) {
          link = document.createElement('link');
          link.rel = 'icon';
          link.id = 'site-favicon';
          document.head.appendChild(link);
        }
        link.href = href;
      }
    } catch (err) {
      void err;
    }
  }, [config, lang]);

  useEffect(() => {
    if (!loadedRef.current || !config) return;
    setUnsaved(true);
    setSaveError(null);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      try {
        saveConfig(config);
        setLastSavedAt(Date.now());
        setUnsaved(false);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Save failed';
        setSaveError(message);
      }
    }, 800);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [config]);

  const updateConfig = useCallback((path: string | string[], value: unknown) => {
    if (!config) return;
    const next = structuredClone(config);
    const parts = Array.isArray(path) ? path : String(path).split('.');
    let obj: Record<string, unknown> = next as unknown as Record<string, unknown>;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      const cur = obj[k];
      if (!isRecord(cur)) obj[k] = {};
      obj = obj[k] as Record<string, unknown>;
    }
    obj[parts[parts.length - 1]] = value;
    setConfig(next);
  }, [config]);

  const publish = useCallback(async () => {
    if (!config) return { ok: false, error: 'No config' };
    if (!hasRemote) return { ok: false, error: 'Remote not configured' };
    try {
      await saveConfigRemote(config);
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Publish failed';
      return { ok: false, error: message };
    }
  }, [config]);

  const value = useMemo<ConfigContextValue>(
    () => ({
      config,
      setConfig,
      updateConfig,
      lang,
      setLang,
      t: (obj: unknown) => {
        if (typeof obj === 'string') return obj;
        if (!isRecord(obj)) return '';
        const v = obj[lang];
        return typeof v === 'string' ? v : '';
      },
      saveToBrowser: () => {
        if (config) saveConfig(config);
      },
      publish,
      lastSavedAt,
      unsaved,
      saveError,
    }),
    [config, lang, lastSavedAt, publish, saveError, unsaved, updateConfig],
  );

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig() {
  return useContext(ConfigContext);
}
