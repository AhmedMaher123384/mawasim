import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';
import { useConfig } from '../config/ConfigContext';

type BilingualText = { en?: string; ar?: string };
type FooterLinkConfig = { label?: BilingualText; href?: string };
type FooterColumnConfig = { title?: BilingualText; links?: FooterLinkConfig[] };
type FooterSectionConfig = {
  enabled?: boolean;
  colors?: { background?: string; text?: string; border?: string };
  includeContact?: boolean;
  main?: { columns?: FooterColumnConfig[] };
  bottom?: { text?: BilingualText | string };
};

function Footer() {
  const { config, t } = useConfig();
  const footer = config?.sections?.footer as FooterSectionConfig | undefined;
  if (footer?.enabled === false) return null;

  const colors = footer?.colors || {};
  const background = typeof colors.background === 'string' && colors.background.trim() ? colors.background.trim() : '';
  const text = typeof colors.text === 'string' && colors.text.trim() ? colors.text.trim() : '';
  const border = typeof colors.border === 'string' && colors.border.trim() ? colors.border.trim() : '';

  const siteTitle = t(config?.site?.title) || 'مواسم الخدمات';
  const logoSrc = typeof config?.site?.logoFooter === 'string' && config.site.logoFooter.trim() ? config.site.logoFooter : logo;
  const bottomText = t(footer?.bottom?.text) || t(config?.site?.footerText) || '';

  const columns = Array.isArray(footer?.main?.columns) ? footer?.main?.columns : [];

  const contact = config?.sections?.contact as Record<string, unknown> | undefined;
  const contactPhone = typeof contact?.phone === 'string' ? contact.phone : '';
  const contactEmail = typeof contact?.email === 'string' ? contact.email : '';
  const contactAddress = t(contact?.address) || '';
  const includeContact = footer?.includeContact !== false;

  const isExternal = (href: string) => /^(https?:\/\/|mailto:|tel:)/i.test(href);
  const normalizeTo = (href: string) => (href.startsWith('#') ? `/${href}` : href);

  const footerStyle: CSSProperties = {
    backgroundColor: background || undefined,
    color: text || undefined,
    borderColor: border || undefined,
  };

  return (
    <footer className="border-t" style={footerStyle} dir="rtl">
      <div className="container mx-auto px-4 py-12">
        <div className="flex items-center gap-4 mb-10">
          <img src={logoSrc} alt={siteTitle} className="h-12 w-auto object-contain" />
          <div className="font-bold text-lg">{siteTitle}</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {columns.map((col, colIdx) => {
            const title = t(col?.title) || '';
            const links = Array.isArray(col?.links) ? col.links : [];
            return (
              <div key={colIdx}>
                <div className="font-bold mb-4">{title}</div>
                <div className="space-y-3">
                  {links.map((lnk, linkIdx) => {
                    const href = typeof lnk?.href === 'string' ? lnk.href.trim() : '';
                    const label = t(lnk?.label) || '';
                    if (!href || !label) return null;
                    if (isExternal(href)) {
                      return (
                        <a
                          key={linkIdx}
                          href={href}
                          target={href.startsWith('http') ? '_blank' : undefined}
                          rel={href.startsWith('http') ? 'noreferrer' : undefined}
                          className="block opacity-90 hover:opacity-100 transition-opacity"
                          style={{ color: text || undefined }}
                        >
                          {label}
                        </a>
                      );
                    }
                    return (
                      <Link
                        key={linkIdx}
                        to={normalizeTo(href)}
                        className="block opacity-90 hover:opacity-100 transition-opacity"
                        style={{ color: text || undefined }}
                      >
                        {label}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {includeContact && (contactPhone || contactEmail || contactAddress) ? (
            <div>
              <div className="font-bold mb-4">{t({ ar: 'التواصل', en: 'Contact' })}</div>
              <div className="space-y-3">
                {contactPhone ? (
                  <a href={`tel:${contactPhone}`} className="block opacity-90 hover:opacity-100 transition-opacity" style={{ color: text || undefined }}>
                    {contactPhone}
                  </a>
                ) : null}
                {contactEmail ? (
                  <a href={`mailto:${contactEmail}`} className="block opacity-90 hover:opacity-100 transition-opacity" style={{ color: text || undefined }}>
                    {contactEmail}
                  </a>
                ) : null}
                {contactAddress ? <div className="opacity-90">{contactAddress}</div> : null}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {bottomText ? (
        <div className="border-t" style={{ borderColor: border || undefined }}>
          <div className="container mx-auto px-4 py-4 text-center text-sm opacity-80">
            {bottomText}
          </div>
        </div>
      ) : null}
    </footer>
  );
}

export default Footer;
