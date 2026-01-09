import { Phone, Mail, MapPin, Clock, ExternalLink } from 'lucide-react';
import { useConfig } from '../config/ConfigContext';

type BilingualText = {
  en?: string;
  ar?: string;
};

type ContactLink = {
  label?: BilingualText;
  url?: string;
};

type PhoneItem = {
  labelText: string;
  phoneNumber: string;
  href: string;
};

function Contact() {
  const { config, t } = useConfig();
  const pickText = (value: unknown): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const rec = value as Record<string, unknown>;
    const ar = rec.ar;
    const en = rec.en;
    if (typeof ar === 'string') return ar;
    if (typeof en === 'string') return en;
    return '';
  };
  const contact = config?.sections?.contact || {};
  const cta = config?.sections?.cta || {};

  const pageTitle = contact?.heading ? (t(contact.heading) || pickText(contact.heading) || 'وسائل التواصل') : 'وسائل التواصل';
  const hoursTitle = t({ en: 'Business hours', ar: 'ساعات الدوام الرسمي' }) || 'ساعات الدوام الرسمي';
  const hoursText = contact?.hours ? (t(contact.hours) || pickText(contact.hours) || '') : '';

  const links: ContactLink[] = Array.isArray(contact?.links) ? (contact.links as ContactLink[]) : [];
  const mapsUrl =
    links.find((l) => String(l?.url || '').includes('google.com/maps'))?.url ||
    links.find((l) => String(l?.url || '').includes('maps'))?.url ||
    "https://www.google.com/maps/place/24%C2%B045'04.5%22N+46%C2%B043'12.1%22E/@24.7512609,46.7200274,17z";

  const addressText =
    contact?.address
      ? (t(contact.address) || pickText(contact.address) || '')
      : '';

  const email = String(contact?.email || 'info@mawasims.com.sa');

  const telLinks = links.filter((l) => String(l?.url || '').startsWith('tel:'));
  const telItems: PhoneItem[] = telLinks.map((l) => {
    const labelText = l?.label ? (t(l.label) || l?.label?.ar || l?.label?.en || '') : '';
    const phoneNumber = String(l?.url || '').replace(/^tel:/, '');
    return { labelText, phoneNumber, href: `tel:${phoneNumber}` };
  });
  const fallbackPhone = String(contact?.phone || '').replace(/^tel:/, '').trim();
  const allPhoneItems: PhoneItem[] = telItems.length
    ? telItems
    : (fallbackPhone ? [{ labelText: '', phoneNumber: fallbackPhone, href: `tel:${fallbackPhone}` }] : []);

  const isManagerLabel = (label: string) => /مدير|إدارة|مشاريع|manager|project/i.test(label || '');
  const managerPhoneItems = allPhoneItems.filter((p: PhoneItem) => isManagerLabel(p.labelText));
  const customerPhoneItems = (allPhoneItems.filter((p: PhoneItem) => !isManagerLabel(p.labelText)) || []);
  const effectiveCustomerItems = customerPhoneItems.length ? customerPhoneItems : allPhoneItems;

  const ctaHeading = cta?.heading ? (t(cta.heading) || pickText(cta.heading) || 'نحن في انتظار تواصلكم') : 'نحن في انتظار تواصلكم';
  const ctaSubheading = cta?.subheading ? (t(cta.subheading) || pickText(cta.subheading) || '') : '';

  return (
    <div className="container mx-auto px-4 py-16 bg-gray-50">
      {/* Header Section */}
      <div className="max-w-4xl mx-auto mb-16 bg-white rounded-2xl shadow-lg p-8 border-t-4 border-green-600">
        <h1 className="text-5xl font-bold text-center mb-6 text-gray-800">
          {pageTitle}
        </h1>
        
        {/* Business Hours Section */}
        <div className="flex flex-col items-center mb-8 p-6 bg-gray-50 rounded-xl">
          <div className="flex items-center mb-4">
            <Clock className="text-green-600 w-8 h-8 mr-2" />
            <p className="text-green-600 text-2xl font-bold mr-2">
              {hoursTitle}
            </p>
          </div>
          {hoursText ? (
            <p className="text-center text-3xl font-bold text-gray-800">
              {hoursText}
            </p>
          ) : null}
        </div>
      </div>

      {/* Contact Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl mx-auto mb-16">
        {/* Location Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <div className="flex justify-center">
            <div className="bg-green-50 p-4 rounded-full mb-6">
              <MapPin className="text-green-600 w-12 h-12" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">
            الموقع الحالي
          </h3>
          <div className="text-center">
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-green-600 text-lg font-medium hover:text-green-700 group"
            >
              <span>{addressText || (t({ en: 'Open location', ar: 'افتح الموقع' }) || 'افتح الموقع')}</span>
              <ExternalLink className="w-5 h-5 ml-2 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>

        {/* Email Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1">
          <div className="flex justify-center">
            <div className="bg-green-50 p-4 rounded-full mb-6">
              <Mail className="text-green-600 w-12 h-12" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-center text-gray-800 mb-4">
            البريد الإلكتروني
          </h3>
          <div className="space-y-2 flex flex-col items-center">
            <a href={`mailto:${email}`} className="text-gray-700 text-lg hover:text-green-600 transition-colors duration-200">
              {email}
            </a>
      
          </div>
        </div>
      </div>

      {/* Phone Numbers Section */}
      <div className="max-w-4xl mx-auto mb-16 bg-white rounded-2xl shadow-lg p-8 border-b-4 border-green-600">
        <h2 className="text-4xl font-bold text-center mb-12 text-green-700">
          اتصل بنا الآن
        </h2>
        
        {/* خدمة العملاء */}
        {effectiveCustomerItems.length ? (
          <div className="mb-12">
            <h3 className="text-2xl font-medium text-green-600 text-center mb-6">
              {t({ en: 'Customer service', ar: 'خدمة العملاء' }) || 'خدمة العملاء'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {effectiveCustomerItems.map((p, idx) => (
                <a
                  key={`${p.phoneNumber}-${idx}`}
                  href={p.href}
                  className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl text-green-600 text-2xl font-medium hover:bg-green-100 transition-colors"
                >
                  <Phone className="w-10 h-10 mb-2" />
                  <div className="text-center">
                    {p.labelText ? <div className="text-sm text-green-700 mb-1">{p.labelText}</div> : null}
                    <div>{p.phoneNumber}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}

        {/* أرقام الإدارة */}
        {managerPhoneItems.length ? (
          <div>
            <h3 className="text-2xl font-medium text-green-600 text-center mb-6">
              {t({ en: 'Management', ar: 'أرقام الإدارة' }) || 'أرقام الإدارة'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {managerPhoneItems.map((p, idx) => (
                <a
                  key={`${p.phoneNumber}-${idx}`}
                  href={p.href}
                  className="flex flex-col items-center justify-center p-6 bg-green-50 rounded-xl text-green-600 text-2xl font-medium hover:bg-green-100 transition-colors"
                >
                  <Phone className="w-10 h-10 mb-2" />
                  <div className="text-center">
                    {p.labelText ? <div className="text-sm text-green-700 mb-1">{p.labelText}</div> : null}
                    <div>{p.phoneNumber}</div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Final CTA Section */}
      <div className="max-w-4xl mx-auto bg-gradient-to-r from-green-600 to-green-700 rounded-2xl shadow-xl p-10 text-center">
        <h3 className="text-3xl font-bold text-white mb-6">
          {ctaHeading}
        </h3>
        {ctaSubheading ? (
          <p className="text-white text-xl">
            {ctaSubheading}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default Contact;
