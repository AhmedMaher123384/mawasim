import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ContactFooter from '../components/ContactFooter';
import { useConfig } from '../config/ConfigContext';

// استيراد الصور الأساسية
import img5 from '../assets/5.png';
import img7 from '../assets/7.png';

// استيراد صور التفاصيل الخاصة بكل خدمة
import img1_1 from '../assets/1.1.png';
import img1_2 from '../assets/1.2.png';
import img1_3 from '../assets/1.3.png';
import img1_4 from '../assets/1.4.png';
import img1_5 from '../assets/1.5.png';
import img1_6 from '../assets/1.6.png';
import img1_7 from '../assets/1.7.png';
import img1_8 from '../assets/1.8.png';
import img1_9 from '../assets/1.9.png';
import img1_10 from '../assets/1.10.png';
import img1_11 from '../assets/1.11.png';
import img1_12 from '../assets/1.12.png';
import img1_13 from '../assets/1.13.png';

import img2_1 from '../assets/2.1.png';
import img2_2 from '../assets/2.2.png';
import img2_3 from '../assets/2.3.png';
import img2_4 from '../assets/2.4.png';
import img2_5 from '../assets/2.5.png';

import img3_1 from '../assets/3.1.png';
import img3_2 from '../assets/3.2.png';
import img3_3 from '../assets/3.3.png';

import img4_1 from '../assets/4.1.png';

import img6_1 from '../assets/6.1.png';
import img6_2 from '../assets/6.2.png';

import img8_1 from '../assets/8.1.png';
import img8_2 from '../assets/8.2.png';

// بيانات الخدمات مع إضافة خاصية المميزات (advantages)
const services = [
  {
    id: 1,
    title: 'نظافة الفلل والقصور',
    image: img1_13,
    description: 'نظافة دقيقة للفلل والقصور في الرياض',
    longDescription:
      'مواسم تقدم خدمات نظافة شاملة للفلل والقصور، تتضمن تنظيف الأرضيات، الجدران، النوافذ، الأسقف الجبسية، الخشب والباركيه، زجاج الشبابيك والواجهات الزجاجية، السجاد والستائر، التكييف المركزي وفتحات التهوية، والأثاث؛ مع التركيز على التفاصيل الدقيقة والأماكن صعبة الوصول إليها.',
    subTitles: [
      { title: 'نظافة دقيقة للفلل والقصور في الرياض', image: img1_1 },
      { title: 'تنظيف التحف في الرياض', image: img1_2 },
      { title: 'تنظيف النجف الكريستال في الرياض', image: img1_3 },
      { title: 'تنظيف السجاد بالبخار في الرياض', image: img1_4 },
      { title: 'تنظيف الستائر بالبخار في الرياض', image: img1_5 },
      { title: 'تنظيف مجالس في الرياض', image: img1_6 },
      { title: 'تنظيف وتلميع زجاج في الرياض', image: img1_7 },
      { title: 'تنظيف فلل وقصور في الرياض', image: img1_8 },
      { title: 'تنظيف عميق للأماكن صعبة الوصول إليها', image: img1_9 },
      { title: 'تنظيف مطابخ في الرياض', image: img1_10 },
      { title: 'نظافة منازل في الرياض', image: img1_11 },
      { title: 'تنظيف واجهات المنازل في الرياض', image: img1_12 },
      { title: 'جلي وتلميع الرخام في الرياض', image: img1_13 },
    ],
    detailImages: [
      { url: img1_1, caption: 'نظافة الفلل والقصور' },
      { url: img1_2, caption: 'تنظيف التحف والمقتنيات الثمينة' },
      { url: img1_3, caption: 'تنظيف النجف الكريستال' },
      { url: img1_4, caption: 'تنظيف السجاد بالبخار' },
      { url: img1_5, caption: 'تنظيف الستائر بالبخار' },
      { url: img1_6, caption: 'تنظيف المجالس' },
      { url: img1_7, caption: 'تنظيف وتلميع الزجاج' },
      { url: img1_8, caption: 'تنظيف الفلل والقصور' },
      { url: img1_9, caption: 'تنظيف الأماكن صعبة الوصول' },
      { url: img1_10, caption: 'تنظيف المطابخ' },
      { url: img1_11, caption: 'نظافة المنازل' },
      { url: img1_12, caption: 'تنظيف واجهات المنازل' },
      { url: img1_13, caption: 'جلي وتلميع الرخام' },
    ],
    advantages: [
      'استخدام مواد تنظيف عالية الجودة وآمنة',
      'فريق عمل متخصص ومحترف بأحدث المعدات',
      'سرعة في الإنجاز مع الحفاظ على دقة العمل',
    ],
  },
  {
    id: 2,
    title: 'جلي وتلميع الرخام بالآلماس',
    image: img2_5,
    description: 'جلي وتلميع أرضيات الرخام في الرياض',
    longDescription:
      'نقدم خدمة جلي وتلميع الرخام باستخدام تقنية الألماس المتطورة لإزالة الخدوش والبقع واستعادة بريق الرخام الطبيعي. بالإضافة إلى ذلك، نتميز بمعالجة الكسور والفراغات باستخدام مادة الجولي الإيطالي عالية الجودة التي تُطابق ألوان الرخام بدقة، مما يضمن الحفاظ على التشطيبات الفاخرة وإبراز جمال الرخام بطريقة احترافية.',
    subTitles: [
      { title: 'جلي الرخام في الرياض', image: img2_1 },
      { title: 'تلميع الرخام في الرياض', image: img2_2 },
      { title: 'جلي وتلميع أرضيات الرخام في الرياض', image: img2_3 },
      { title: 'جلي وتلميع الدرج في الرياض', image: img2_4 },
      { title: 'تلميع رخام الدرج في الرياض', image: img2_5 },
    ],
    detailImages: [
      { url: img2_1, caption: 'جلي الرخام' },
      { url: img2_2, caption: 'تلميع الرخام' },
      { url: img2_3, caption: 'جلي أرضيات الرخام' },
      { url: img2_4, caption: 'تلميع الدرج' },
      { url: img2_5, caption: 'معالجة الكسور بالجولي الإيطالي' },
    ],
    advantages: [
      'استخدام أحدث التقنيات المتطورة',
      'استخدام أحدث المعدات المتخصصة في جلي وتلميع الرخام',
      'معالجة الرخام من الكسور والفراغات باستخدام أحدث الطرق',
      'عمالة محترفة ومتخصصة في عمليات جلي ومعالجة وتلميع الرخام',
    ],
  },
  {
    id: 3,
    title: 'نظافة وتطهير المجالس والكنب بالبخار',
    image: img3_1,
    description: 'تنظيف مجالس بالبخار في الرياض',
    longDescription:
      'تقدم مواسم خدمات تنظيف وتطهير الكنب والمجالس باستخدام أحدث تقنيات البخار لإزالة البقع العميقة والبكتيريا بفعالية عالية. حرصاً على الحفاظ على جودة الأقمشة الفاخرة، يتم تنفيذ الخدمة بواسطة فريق مختص ومدرب باحترافية عالية وباستخدام أدوات متخصصة تضمن أفضل النتائج.',
    subTitles: [
      { title: 'تنظيف مجالس بالبخار في الرياض', image: img3_1 },
      { title: 'تنظيف كنب بالبخار في الرياض', image: img3_2 },
      { title: 'تنظيف المجالس والكنب في الرياض', image: img3_3 },
    ],
    detailImages: [
      { url: img3_1, caption: 'تنظيف المجالس بالبخار' },
      { url: img3_2, caption: 'تنظيف الكنب بالبخار' },
      { url: img3_3, caption: 'إزالة البقع العميقة' },
    ],
    advantages: [
      'استخدام تقنيات البخار الحديثة للتنظيف العميق',
      'فريق عمل مدرب خصيصاً للحفاظ على جودة الأقمشة',
      'ضمان إزالة البكتيريا والبقع بفعالية',
    ],
  },
  {
    id: 4,
    title: 'نظافة المكيفات المركزية وفتحات التهوية',
    image: img4_1,
    description: 'تنظيف التكييف المركزي وفتحات التهوية في الرياض',
    longDescription:
      'توفر مواسم خدمات شاملة لتنظيف المكيفات المركزية وفتحات التهوية، لضمان أداء مثالي وجودة هواء نقية داخل الفلل والقصور. تشمل الخدمة إزالة الأتربة والبكتيريا من الفلاتر والمكونات الداخلية، وتنظيف وتعقيم فتحات التهوية باستخدام مواد آمنة ومعتمدة، مع الحفاظ على كفاءة نظام التبريد وحماية التشطيبات والأثاث المحيط أثناء عملية التنظيف.',
    subTitles: [{ title: 'تنظيف التكييف المركزي وفتحات التهوية في الرياض', image: img4_1 }],
    detailImages: [{ url: img4_1, caption: 'تنظيف المكيفات المركزية' }],
    advantages: [
      'إزالة الأتربة والبكتيريا بشكل شامل',
      'تنظيف الفلاتر والمكونات الداخلية بدقة',
      'استخدام مواد آمنة تحافظ على كفاءة التبريد',
    ],
  },
  {
    id: 5,
    title: 'نظافة وتعقيم الخزانات',
    image: img5,
    description: 'تنظيف وتعقيم خزانات المياه',
    longDescription:
      'مواسم تقدم خدمة تنظيف وتعقيم خزانات المياه الأرضية لضمان مياه نقية وصحية. تشمل الخدمة إزالة الرواسب والشوائب باستخدام معدات متطورة ومواد تعقيم آمنة ومعتمدة، كما يحرص فريقنا المتخصص على إزالة أي ملوثات أو بكتيريا قد تؤثر على جودة المياه، مع تنفيذ العملية وفقًا لأعلى معايير الجودة.',
    subTitles: [{ title: 'تنظيف وتعقيم خزانات المياه في الرياض', image: img5 }],
    detailImages: [],
    advantages: [
      'استخدام معدات متطورة ومواد تعقيم معتمدة',
      'ضمان مياه نقية وصحية بعد عملية التنظيف',
      'فريق عمل مختص لضمان جودة الخدمة',
    ],
  },
  {
    id: 6,
    title: 'غسيل وتنظيف الموكيت والسجاد بالبخار',
    image: img6_1,
    description: 'تنظيف السجاد والموكيت في الرياض',
    longDescription:
      'نقدم خدمة غسيل وتنظيف الموكيت والسجاد بالبخار باستخدام أحدث الأجهزة والتقنيات. يتم تنظيف وغسيل الموكيت والسجاد مع تعطييرهما وإزالة البقع بفعالية؛ إذ يصل البخار إلى أنسجة الأقمشة لتذويب وإزالة البقع المستعصية دون التأثير على جودة الأنسجة.',
    subTitles: [
      { title: 'تنظيف الستائر بالبخار في الرياض', image: img6_1 },
      { title: 'تنظيف السجاد والموكيت في الرياض', image: img6_2 },
    ],
    detailImages: [
      { url: img6_1, caption: 'تنظيف السجاد بالبخار' },
      { url: img6_2, caption: 'غسيل الموكيت' },
    ],
    advantages: [
      'أجهزة حديثة ومطورة لإزالة الأوساخ والبقع',
      'مواد تنظيف عالية الجودة لإزالة البقع',
      'نتائج فعالة دون التأثير على جودة الموكيت والسجاد',
      'تعطير وتعقيم السجاد باستخدام أفضل الأدوات',
    ],
  },
  {
    id: 7,
    title: 'نظافة الواجهات الزجاجية',
    image: img7,
    description: 'تنظيف الواجهات الزجاجية للمباني',
    longDescription:
      'تنظيف الواجهات الزجاجية للمباني والشركات لا يمكن أن يتم دون الاستعانة بمتخصصين؛ نظرًا لوجود العديد من المخاطر والحاجة لعمالة مدربة للعمل في الارتفاعات باستخدام رافعات مخصصة. لذا، نقدم خدمة تنظيف الواجهات الزجاجية بمنتهى الدقة والجودة.',
    subTitles: [{ title: 'تنظيف الواجهات الزجاجية في الرياض', image: img7 }],
    detailImages: [],
    advantages: [
      'استخدام معدات ذات جودة عالية',
      'عمالة مدربة ومحترفة',
      'أدوات ومواد تنظيف فعالة',
      'تنظيف الواجهات الزجاجية لتصبح أكثر لمعاناً',
    ],
  },
  {
    id: 8,
    title: 'نظافة وتلميع النجف والثريات',
    image: img8_1,
    description: 'تنظيف النجف الفاخر في الرياض',
    longDescription:
      'تقدم مواسم خدمات تنظيف وتلميع النجف والثريات بحرفية فائقة، معتمدة على فريق متخصص ذو خبرة عالية. نستخدم مواد آمنة وتقنيات متطورة لضمان إزالة الأتربة والبقع بدقة دون التسبب في أي ضرر، سواء كان النجف مصنوعًا من الكريستال أو المعادن الفاخرة، ليعود ببريقه الأصلي ويضفي لمسة من الفخامة على المكان.',
    subTitles: [
      { title: 'تنظيف النجف الفاخر في الرياض', image: img8_1 },
      { title: 'تنظيف التحف الثمينة في الرياض', image: img8_2 },
    ],
    detailImages: [
      { url: img8_1, caption: 'تنظيف النجف الكريستال' },
      { url: img8_2, caption: 'تلميع الثريات' },
    ],
    advantages: [
      'فريق عمل متخصص في تنظيف النجف والثريات',
      'استخدام مواد آمنة وتقنيات حديثة للحفاظ على بريق النجف',
      'ضمان إزالة الأتربة والبقع دون التأثير على المواد الثمينة',
    ],
  },
];

type ServiceIncludeConfigItem = { title?: unknown; image?: unknown };
type ServiceDetailsConfig = {
  heroImage?: unknown;
  longDescription?: unknown;
  includes?: unknown;
};
type ServiceItemConfig = {
  title?: unknown;
  description?: unknown;
  image?: unknown;
  details?: ServiceDetailsConfig;
};

function ServiceDetail() {
  const { id } = useParams();
  const idNum = Number.parseInt(id || '0', 10);
  const fallbackService = services.find((s) => s.id === idNum);
  const [openImage, setOpenImage] = useState<string | null>(null);
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

  const takeString = (v: unknown): string => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const normalizeUrl = (v: unknown): string => {
    const s = takeString(v);
    if (!s) return '';
    if (/^(https?:|data:|\/)/.test(s)) return s;
    if (s.startsWith('./')) return `/${s.slice(2)}`;
    return `/${s}`;
  };
  const cfgItemsUnknown = config?.sections?.services?.items as unknown;
  const cfgItems: ServiceItemConfig[] = Array.isArray(cfgItemsUnknown) ? (cfgItemsUnknown as ServiceItemConfig[]) : [];
  const cfgItem = idNum > 0 ? cfgItems[idNum - 1] : undefined;
  const details = cfgItem?.details;

  const title = cfgItem?.title ? (t(cfgItem.title) || pickText(cfgItem.title) || fallbackService?.title || '') : (fallbackService?.title || '');
  const description = cfgItem?.description ? (t(cfgItem.description) || pickText(cfgItem.description) || fallbackService?.description || '') : (fallbackService?.description || '');
  const longDescription = details?.longDescription
    ? (t(details.longDescription) || pickText(details.longDescription) || fallbackService?.longDescription || '')
    : (fallbackService?.longDescription || '');

  const heroFromDetails = normalizeUrl(details?.heroImage);
  const heroFromCard = normalizeUrl(cfgItem?.image);
  const heroBackground = heroFromDetails || heroFromCard || (fallbackService?.image ? String(fallbackService.image) : '');

  const includesRaw = Array.isArray(details?.includes) ? (details?.includes as ServiceIncludeConfigItem[]) : [];
  const includes = includesRaw
    .map((it) => ({
      title: it?.title ? (t(it.title) || pickText(it.title) || '') : '',
      image: normalizeUrl(it?.image),
    }))
    .filter((it) => it.title || it.image);
  const fallbackIncludes = (fallbackService?.subTitles || []).map((it) => ({ title: it.title, image: String(it.image) }));
  const includesList = includes.length ? includes : fallbackIncludes;

  // عند تحميل الصفحة، يتم التمرير إلى محتوى الخدمة
  useEffect(() => {
    const serviceContent = document.getElementById('service-content');
    if (serviceContent) {
      serviceContent.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  if (!cfgItem && !fallbackService) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-4xl font-bold mb-4">الخدمة غير موجودة</h1>
        <Link to="/" className="text-green-600 hover:underline">
          العودة إلى الصفحة الرئيسية
        </Link>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          .text-shadow-green {
            text-shadow: 0 0 8px rgba(16, 185, 129, 0.5);
          }
          .hero-overlay {
            background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7));
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-fade-in {
            animation: fadeIn 0.6s ease forwards;
          }
          @keyframes modalAppear {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-modal {
            animation: modalAppear 0.5s ease-out forwards;
          }
          @keyframes modalZoom {
            0% {
              opacity: 0;
              transform: scale(0.85);
            }
            100% {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-modal {
            animation: modalZoom 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards;
          }
          /* تنسيق خلفية الـ Hero مع تأثير Parallax على الشاشات الكبيرة */
          .hero-bg {
            background-size: cover;
            background-position: center;
            background-attachment: fixed;
          }
          /* تغيير الخاصية على الموبايل لضمان ظهور الصورة بجودتها */
          @media (max-width: 768px) {
            .hero-bg {
              background-attachment: scroll !important;
            }
          }
        `}
      </style>

      <div className="min-h-screen bg-gray-50 rtl">
        {/* Hero Header */}
        <div className="w-full relative overflow-hidden" style={{ height: '70vh', maxHeight: '700px' }}>
          <div
            className="absolute inset-0 hero-bg"
            style={heroBackground ? { backgroundImage: `url(${heroBackground})` } : { backgroundImage: 'linear-gradient(135deg, #16a34a, #0f766e)' }}
          ></div>
          <div className="absolute inset-0 hero-overlay"></div>
          <div className="absolute inset-0 flex flex-col items-center justify-center px-4">
            <div className="text-center max-w-4xl">
              <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 text-shadow-green">
                {title}
              </h1>
              <div className="w-32 h-1 bg-white mx-auto rounded-full mb-6"></div>
              <p className="text-white text-xl md:text-2xl mt-4 max-w-3xl mx-auto font-light text-shadow-green">
                {description}
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 100" fill="#f9fafb">
              <path d="M0,0 C240,95 480,95 720,95 C960,95 1200,95 1440,0 L1440,100 L0,100 Z"></path>
            </svg>
          </div>
        </div>

        {/* محتوى الخدمة */}
        <div id="service-content" className="container mx-auto px-4 lg:px-8 py-16 -mt-20">
          <div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-2xl p-8 md:p-12 border-t-4 border-green-600">
            {longDescription ? (
              <div className="mb-14 animate-fade-in" style={{ animationDelay: '0.15s' }} dir="rtl">
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 via-white to-white overflow-hidden">
                  <div className="px-5 py-4 sm:px-7 sm:py-5 border-b border-green-100">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center font-bold">
                          ن
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm text-green-700 font-semibold">معلومات الخدمة</div>
                          <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 truncate">نبذة عن الخدمة</h3>
                        </div>
                      </div>
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          مواسم
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 sm:p-7">
                    <div className="rounded-xl bg-white border border-green-100 shadow-sm">
                      <div className="p-4 sm:p-6">
                        <p className="text-gray-800 leading-8 text-base sm:text-lg text-right whitespace-pre-line">
                          {longDescription}
                        </p>
                      </div>
                      <div className="h-1 w-full bg-gradient-to-l from-green-600 via-green-500 to-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {/* قسم "خدماتنا تشمل" */}
            {includesList.length > 0 && (
              <div className="mb-14 animate-fade-in" style={{ animationDelay: '0.2s' }} dir="rtl">
                <div className="flex items-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800">
                    <span className="border-b-3 border-green-500 pb-1">خدماتنا تشمل</span>
                  </h3>
                  <div className="flex-grow border-b border-gray-200 mr-4"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" dir="rtl">
                  {includesList.map((subService, index) => (
                    <div
                      key={index}
                      className="group bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 flex flex-col h-full"
                    >
                      <div className="relative overflow-hidden aspect-[4/3] md:aspect-auto">
                        {subService.image ? (
                          <img
                            src={subService.image}
                            alt={subService.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 cursor-pointer"
                            loading="lazy"
                            onClick={() => setOpenImage(subService.image)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200"></div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none"></div>
                      </div>
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <h4 className="text-lg font-bold text-gray-800 group-hover:text-green-600 transition-colors duration-300 text-right">
                          {subService.title}
                        </h4>
                        <div className="mt-2 w-16 h-0.5 bg-green-500 transform origin-right transition-all duration-300 group-hover:w-full"></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* قسم "هل تريد الاستفادة من خدماتنا؟" */}
            <div className="mt-10 text-center">
              <div className="bg-gradient-to-r from-green-50 to-gray-50 p-8 rounded-2xl border border-green-100 shadow-inner">
                <h3 className="text-2xl font-bold text-gray-800 mb-4">هل تريد الاستفادة من خدماتنا؟</h3>
                <p className="text-gray-600 mb-6">تواصل معنا اليوم للحصول على أفضل خدمة</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    to="/contact"
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-all duration-300 inline-block shadow-md hover:shadow-lg font-medium w-full sm:w-auto transform hover:-translate-y-1 hover:scale-105"
                  >
                    تواصل معنا
                  </Link>
                  <Link
                    to="/"
                    className="bg-white text-green-600 border-2 border-green-600 px-8 py-3 rounded-lg hover:bg-green-50 transition-all duration-300 inline-block shadow-sm hover:shadow-md font-medium w-full sm:w-auto"
                  >
                    العودة للرئيسية
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <ContactFooter />

        {/* مودال عرض الصورة المكبرة */}
        {openImage && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 transition-opacity duration-700 md:backdrop-blur-lg"
            onClick={() => setOpenImage(null)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl transform transition-transform duration-700 animate-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={openImage}
                alt="صورة مكبرة"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default ServiceDetail;
