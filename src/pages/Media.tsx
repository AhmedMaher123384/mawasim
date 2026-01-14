import { useConfig } from '../config/ConfigContext';

type BilingualText = {
  en?: string;
  ar?: string;
};

type MediaItem = {
  type?: string;
  url?: string;
  title?: BilingualText | string;
};

function Media() {
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

  const page = (config?.pages?.page_media || {}) as { title?: BilingualText | string; items?: MediaItem[] };
  const titleValue = page?.title;
  const pageTitle = titleValue ? (t(titleValue) || pickText(titleValue) || 'مكتبة الصور والفيديوهات') : 'مكتبة الصور والفيديوهات';

  const fallbackItems: MediaItem[] = [
    { type: 'image', url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab', title: { ar: 'مشروع ١', en: 'Project 1' } },
    { type: 'image', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c', title: { ar: 'مشروع ٢', en: 'Project 2' } },
    { type: 'image', url: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72', title: { ar: 'مشروع ٣', en: 'Project 3' } },
  ];

  const mediaItems: MediaItem[] = Array.isArray(page?.items) && page.items.length ? page.items : fallbackItems;

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8 text-gray-800">{pageTitle}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {mediaItems.map((item, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              {String(item?.type || 'image') === 'video' ? (
                <video
                  src={String(item?.url || '')}
                  className="w-full h-48 object-cover bg-black"
                  controls
                />
              ) : (
                <img
                  src={String(item?.url || '')}
                  alt={typeof item?.title === 'string' ? item.title : (t(item?.title) || pickText(item?.title) || '')}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
              )}
              <div className="p-4">
                <h3 className="text-xl font-semibold text-gray-800 text-right">
                  {typeof item?.title === 'string' ? item.title : (t(item?.title) || pickText(item?.title) || '')}
                </h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Media;
