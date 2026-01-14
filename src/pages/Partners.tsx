import { useConfig } from '../config/ConfigContext';

type BilingualText = {
  en?: string;
  ar?: string;
};

type PartnerItem = {
  name?: BilingualText;
  description?: BilingualText | string;
  image?: string;
  logo?: string;
};

function Partners() {
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

  const page = (config?.pages?.page_partners || {}) as { title?: BilingualText; items?: PartnerItem[] };
  const titleValue = page?.title;
  const pageTitle = titleValue ? (t(titleValue) || pickText(titleValue) || 'شركاء النجاح') : 'شركاء النجاح';
  const itemsRaw: PartnerItem[] = Array.isArray(page?.items) ? page.items : [];
  const items = itemsRaw.length
    ? itemsRaw
    : [
        { name: { ar: 'شريك ١', en: 'Partner 1' }, description: { ar: 'وصف مختصر', en: 'Short description' }, image: '' },
        { name: { ar: 'شريك ٢', en: 'Partner 2' }, description: { ar: 'وصف مختصر', en: 'Short description' }, image: '' },
        { name: { ar: 'شريك ٣', en: 'Partner 3' }, description: { ar: 'وصف مختصر', en: 'Short description' }, image: '' },
      ];

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">{pageTitle}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((it, idx) => {
            const nameValue = it?.name;
            const name = nameValue ? (t(nameValue) || pickText(nameValue) || '') : '';
            const descValue = it?.description;
            const description =
              typeof descValue === 'string'
                ? descValue
                : (t(descValue) || pickText(descValue) || '');
            const logo = typeof it?.image === 'string' && it.image.trim()
              ? it.image
              : (typeof it?.logo === 'string' ? it.logo : '');

            const card = (
              <div className="bg-white rounded-lg shadow-md p-6 flex flex-col items-center">
                {logo ? (
                  <img src={logo} alt={name || `Partner ${idx + 1}`} className="w-32 h-32 object-contain rounded-full mb-4 bg-gray-50" loading="lazy" />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 rounded-full mb-4"></div>
                )}
                <h3 className="text-xl font-semibold text-gray-800 mb-2">{name || `شريك ${idx + 1}`}</h3>
                {description ? (
                  <p className="text-gray-600 text-sm text-center leading-relaxed">
                    {description}
                  </p>
                ) : null}
              </div>
            );

            return <div key={idx}>{card}</div>;
          })}
        </div>
      </div>
    </div>
  );
}

export default Partners;
