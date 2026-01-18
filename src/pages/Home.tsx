import React, { useCallback, useRef, useEffect, useState, lazy, Suspense, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star, Phone, Clock, Shield, Award, ThumbsUp , Sparkles } from 'lucide-react';
import { useConfig } from '../config/ConfigContext';

// Lazy load components that aren't immediately visible
const ContactFooter = lazy(() => import('../components/ContactFooter'));
const ImageSlider = lazy(() => import('../components/ImageSlider'));

// استيراد صور الخدمات - use a more efficient approach
const serviceImages = {
  img1: () => import('../assets/1.png').then(module => module.default),
  img2: () => import('../assets/2.png').then(module => module.default),
  img3: () => import('../assets/3.png').then(module => module.default),
  img4: () => import('../assets/4.png').then(module => module.default),
  img5: () => import('../assets/5.png').then(module => module.default),
  img6: () => import('../assets/6.png').then(module => module.default),
  img7: () => import('../assets/7.png').then(module => module.default),
  img8: () => import('../assets/8.png').then(module => module.default),
};

// استيراد صور الهيرو - preload and optimize
import b1 from '../assets/b2.png';
import b2 from '../assets/b1.png';
import b3 from '../assets/b3.png';
import b4 from '../assets/b4.png';

const heroImages = [b1, b2, b3, b4];

// Define service interface for type safety
interface Service {
  id: number;
  title: string;
  image: string | null;
  description: string;
  icon: JSX.Element;
}

// Define services with placeholder images initially
const DEFAULT_SERVICES: Service[] = [
  {
    id: 1,
    title: 'نظافة الفلل والقصور',
    image: null, // Will be loaded dynamically
    description: 'خدمة نظافة شاملة للفلل والقصور بأعلى معايير الجودة والاحترافية',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 2,
    title: 'جلي وتلميع الرخام بالآلماس',
    image: null,
    description: 'تقنية متطورة لجلي وتلميع الرخام تعيد الألق والبريق لأرضيات منزلك',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 3,
    title: 'نظافة وتطهير المجالس والكنب بالبخار',
    image: null,
    description: 'تنظيف عميق وتطهير للمجالس والكنب بتقنية البخار الاحترافية',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 4,
    title: 'نظافة المكيفات المركزية وفتحات التهوية',
    image: null,
    description: 'صيانة وتنظيف شامل للمكيفات المركزية وأنظمة التهوية لضمان جودة الهواء',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 5,
    title: 'نظافة وتعقيم الخزانات',
    image: null,
    description: 'تعقيم وتطهير خزانات المياه بمواد آمنة وفعالة مع شهادة ضمان',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 6,
    title: 'غسيل وتنظيف الموكيت والسجاد بالبخار',
    image: null,
    description: 'تنظيف عميق للسجاد والموكيت باستخدام أحدث تقنيات البخار',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 7,
    title: 'نظافة الواجهات الزجاجية',
    image: null,
    description: 'تنظيف احترافي للواجهات الزجاجية بتقنيات متطورة تضمن النظافة واللمعان',
    icon: <Star className="w-5 h-5" />
  },
  {
    id: 8,
    title: 'نظافة وتلميع النجف والثريات',
    image: null,
    description: 'خدمة متخصصة لتنظيف وتلميع النجف والثريات الفاخرة مع ضمان السلامة',
    icon: <Star className="w-5 h-5" />
  }
];

interface Feature {
  icon: JSX.Element;
  title: string;
  description: string;
}

type BilingualText = { en?: string; ar?: string };
type HighlightItem = { title?: BilingualText; description?: BilingualText };
type ServiceConfigItem = { title?: unknown; description?: unknown; image?: unknown; icon?: unknown };
type WhyChooseConfigItem = { title?: unknown; description?: unknown; icon?: unknown };
type CtaSectionConfig = { heading?: unknown; subheading?: unknown; items?: unknown[] };

const DEFAULT_FEATURES: Feature[] = [
  {
    icon: <Star className="text-green-600 w-8 h-8" />,
    title: 'خدمة عالية الجودة',
    description: 'نقدم أعلى معايير الجودة العالمية في جميع خدماتنا بدون أي تنازل'
  },
  {
    icon: <Clock className="text-green-600 w-8 h-8" />,
    title: 'سرعة في التنفيذ',
    description: 'نلتزم بالمواعيد المحددة ونقدم خدماتنا بسرعة وكفاءة عالية'
  },
  {
    icon: <Phone className="text-green-600 w-8 h-8" />,
    title: 'دعم على مدار الساعة',
    description: 'فريق خدمة العملاء جاهز للرد على استفساراتكم في أي وقت طوال اليوم'
  }
  ,{
    icon: <Sparkles className="text-green-600 w-8 h-8" />,
    title: 'حلول النظافة الراقية',
    description: 'خدمات نظافة متقدمة تجمع بين الجودة، الاحترافية، وأحدث التقنيات لضمان بيئة نظيفة وصحية بأعلى المعايير'
  }
   ,
    {
      icon: (
        <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 5.5L4.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16.5 5.5L19.5 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: 'نهتم بالتفاصيل',
      description: 'تعكس التزامنا التام بالجودة والدقة في كل جانب من خدماتنا. نحرص على تقديم تجربة استثنائية من خلال التركيز على التفاصيل الصغيرة التي تصنع الفرق، لضمان أعلى مستوى من الاحترافية والتميز في كل ما نقدمه'
    }
  ,
    {
      icon: <Shield className="text-green-600 w-8 h-8" />,
      title: 'مواد آمنة',
      description: 'نستخدم منتجات تنظيف عالية الجودة وآمنة مع فعالية قصوى تناسب جميع المنشآت'
    }
];

interface WhyChooseUsItem {
  icon: JSX.Element;
  title: string;
  description: string;
}

const whyChooseUs: WhyChooseUsItem[] = [
  {
    icon: <Award className="w-12 h-12 mb-4 text-white" />,
    title: 'فريق محترف',
    description: 'يضم فريقنا نخبة من المتخصصين ذوي الخبرة والكفاءة العالية في مجالات التنظيف والصيانة المختلفة'
  },
  {
    icon: <Shield className="w-12 h-12 mb-4 text-white" />,
    title: 'معدات متطورة',
    description: 'نستثمر في أحدث المعدات والتقنيات العالمية في عمليات التنظيف والصيانة لضمان نتائج مبهرة'
  },
  {
    icon: <ThumbsUp className="w-12 h-12 mb-4 text-white" />,
    title: 'أسعار تنافسية',
    description: 'نقدم أسعاراً تنافسية مدروسة مع ضمان أعلى مستويات الجودة والاحترافية في تقديم الخدمة'
  }
];

interface SectionRefs {
  services: React.RefObject<HTMLDivElement>;
  features: React.RefObject<HTMLDivElement>;
  whyChooseUs: React.RefObject<HTMLDivElement>;
}

function Home() {
  const { config, t } = useConfig();
  const pickText = useCallback((value: unknown): string => {
    if (typeof value === 'string') return value;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return '';
    const rec = value as Record<string, unknown>;
    const ar = rec.ar;
    const en = rec.en;
    if (typeof ar === 'string') return ar;
    if (typeof en === 'string') return en;
    return '';
  }, []);
  const heroHeading = config?.sections?.hero?.heading ? (t(config.sections.hero.heading) || 'شركة مواسم الخدمات') : 'شركة مواسم الخدمات';
  const heroSubheading = config?.sections?.hero?.subheading ? (t(config.sections.hero.subheading) || 'شركة مواسم تقدم حلول راقية لنظافه الفلل و القصور و الفنادق و المولات') : 'شركة مواسم تقدم حلول راقية لنظافه الفلل و القصور و الفنادق و المولات';
  const heroCtaText = config?.sections?.hero?.cta?.text ? (t(config.sections.hero.cta.text) || 'خدماتنا') : 'خدماتنا';
  const heroCtaLink = config?.sections?.hero?.cta?.link || '#services';

  const highlights = config?.sections?.highlights?.items as HighlightItem[] | undefined;
  const features: Feature[] = Array.isArray(highlights) && highlights.length
    ? highlights.map((it: HighlightItem, index: number) => ({
        icon: DEFAULT_FEATURES[index]?.icon || <Star className="text-green-600 w-8 h-8" />,
        title: t(it?.title) || pickText(it?.title) || '',
        description: t(it?.description) || pickText(it?.description) || '',
      }))
    : DEFAULT_FEATURES;

  const configServicesUnknown = config?.sections?.services?.items as unknown;
  const isRemoteImage = useCallback((src: unknown): src is string => {
    if (typeof src !== 'string') return false;
    const s = src.trim();
    return Boolean(s) && (/^(https?:|data:|\/)/.test(s));
  }, []);
  const services: Service[] = useMemo(() => {
    if (Array.isArray(configServicesUnknown) && configServicesUnknown.length) {
      return (configServicesUnknown as ServiceConfigItem[]).map((it, idx) => ({
        id: idx + 1,
        title: it?.title ? (t(it.title) || pickText(it?.title) || DEFAULT_SERVICES[idx]?.title || '') : (DEFAULT_SERVICES[idx]?.title || ''),
        description: it?.description ? (t(it.description) || pickText(it?.description) || DEFAULT_SERVICES[idx]?.description || '') : (DEFAULT_SERVICES[idx]?.description || ''),
        image: isRemoteImage(it?.image) ? String(it.image).trim() : null,
        icon: DEFAULT_SERVICES[idx]?.icon || <Star className="w-5 h-5" />,
      }));
    }
    return DEFAULT_SERVICES;
  }, [configServicesUnknown, isRemoteImage, pickText, t]);

  const ctaSection = config?.sections?.cta as CtaSectionConfig | undefined;
  const whyChooseUsHeading = ctaSection?.heading ? (t(ctaSection.heading) || pickText(ctaSection.heading) || 'لماذا تختارنا؟') : 'لماذا تختارنا؟';
  const whyChooseUsSubheading = ctaSection?.subheading
    ? (t(ctaSection.subheading) || pickText(ctaSection.subheading) || 'نسعى دائماً لتقديم أفضل خدمات التنظيف والصيانة بأعلى المعايير العالمية وبأسعار تنافسية')
    : 'نسعى دائماً لتقديم أفضل خدمات التنظيف والصيانة بأعلى المعايير العالمية وبأسعار تنافسية';
  const whyChooseUsData: WhyChooseUsItem[] = Array.isArray(ctaSection?.items) && ctaSection.items.length
    ? (ctaSection.items as WhyChooseConfigItem[]).map((it) => ({
        icon: <span className="text-4xl mb-4 text-white">{typeof it?.icon === 'string' && it.icon.trim() ? it.icon : '⭐'}</span>,
        title: t(it?.title) || pickText(it?.title) || '',
        description: t(it?.description) || pickText(it?.description) || '',
      }))
    : whyChooseUs;

  // Use a single state object for all visible sections
  const [visibleSections, setVisibleSections] = useState({
    services: false,
    features: false,
    whyChooseUs: false
  });
  
  const [heroLoaded, setHeroLoaded] = useState(false);
  const [servicesWithImages, setServicesWithImages] = useState<Service[]>(services);

  useEffect(() => {
    setServicesWithImages((prev) => {
      if (!Array.isArray(prev) || prev.length === 0) return services;
      const prevById = new Map(prev.map((s) => [s.id, s]));
      return services.map((s) => ({
        ...s,
        image: s.image || prevById.get(s.id)?.image || null,
      }));
    });
  }, [services]);
  
  // References to sections - using a more efficient approach
  const servicesRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const whyChooseUsRef = useRef<HTMLDivElement>(null);
  const sectionsRef: SectionRefs = useMemo(() => ({
    services: servicesRef,
    features: featuresRef,
    whyChooseUs: whyChooseUsRef
  }), []);

  const scrollToServices = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (sectionsRef.services.current) {
      sectionsRef.services.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Load service images progressively
  useEffect(() => {
    // Load images only for visible services
    if (visibleSections.services) {
      const loadImages = async () => {
        const updatedServices = [...services];
        
        // Load images in batches to prevent rendering block
        for (let i = 0; i < services.length; i += 2) {
          const batch = services.slice(i, i + 2);
          await Promise.all(
            batch.map(async (service, idx) => {
              const serviceIndex = i + idx;
              const imageKey = `img${serviceIndex + 1}` as keyof typeof serviceImages;
              if (serviceImages[imageKey]) {
                try {
                  if (!updatedServices[serviceIndex].image) {
                    const img = await serviceImages[imageKey]();
                    updatedServices[serviceIndex].image = img;
                  }
                } catch (err) {
                  console.error(`Failed to load image for service ${service.id}`, err);
                }
              }
            })
          );
          
          // Update state after each batch to prevent UI freeze
          setServicesWithImages([...updatedServices]);
        }
      };
      
      loadImages();
    }
  }, [visibleSections.services, services]);

  // Hero animation with optimized timing
  useEffect(() => {
    const timer = setTimeout(() => {
      setHeroLoaded(true);
    }, 100); // Reduced from 300ms for faster initial load
    
    return () => clearTimeout(timer);
  }, [sectionsRef]);

  // Single IntersectionObserver for better performance
  useEffect(() => {
    // Create a single observer for all sections
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.target instanceof HTMLElement) {
            // Get the section id from the data attribute
            const sectionId = entry.target.dataset.section;
            if (sectionId && (sectionId === 'services' || sectionId === 'features' || sectionId === 'whyChooseUs')) {
              setVisibleSections(prev => ({
                ...prev,
                [sectionId]: true
              }));
              // Unobserve after visibility is set to true to reduce overhead
              sectionObserver.unobserve(entry.target);
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' } // Lower threshold and adjusted margins
    );
    
    // Observe all sections with a single observer
    Object.entries(sectionsRef).forEach(([key, ref]) => {
      if (ref.current) {
        // Add data attribute to identify the section
        if (ref.current instanceof HTMLElement) {
          ref.current.dataset.section = key;
          sectionObserver.observe(ref.current);
        }
      }
    });
    
    return () => {
      sectionObserver.disconnect();
    };
  }, [sectionsRef]);
  
  // Render with performance optimizations
  return (
    <div className="rtl bg-gray-50">
      {/* Hero section - with simplified animations */}
      <div className="w-full h-[400px] md:h-[600px] relative overflow-hidden">
        <Suspense fallback={<div className="w-full h-full bg-gray-200"></div>}>
          <ImageSlider images={heroImages} />
        </Suspense>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/20 flex flex-col items-center justify-center text-white px-4">
          <h1 
            className={`text-6xl font-bold mb-6 text-center transition-all duration-300 ${
              heroLoaded ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-10'
            }`}
          >
            {heroHeading}
          </h1>
          <p 
            className={`text-2xl max-w-2xl text-center mb-8 transition-all duration-300 delay-150 ${
              heroLoaded ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-10'
            }`}
          >
            {heroSubheading}
          </p>
          <div 
            className={`flex flex-wrap justify-center gap-4 transition-all duration-300 delay-200 ${
              heroLoaded ? 'opacity-100 transform-none' : 'opacity-0 translate-y-10'
            }`}
          >
            <a 
              href={heroCtaLink} 
              onClick={heroCtaLink === '#services' ? scrollToServices : undefined} 
              className="bg-gradient-to-r from-green-600 to-green-800 text-white py-4 px-10 rounded-lg font-bold text-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 relative overflow-hidden group"
            >
              <span className="relative z-10">{heroCtaText}</span>
              <span className="absolute inset-0 bg-green-700/50 transform -translate-x-full group-hover:translate-x-0 transition-transform duration-500"></span>
            </a>
          </div>
        </div>
      </div>

      {/* Features section - with optimized animations */}
      <div className="bg-white py-16" ref={sectionsRef.features}>
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 
              className={`text-4xl font-bold mb-4 text-gray-800 transition-all duration-500 ${
                visibleSections.features ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-10'
              }`}
            >
              مميزاتنا
              <span className={`block h-1 w-24 bg-green-600 mx-auto mt-4 transition-all duration-500 delay-200 ${
                visibleSections.features ? 'opacity-100 transform-none scale-100' : 'opacity-0 scale-0'
              }`}></span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`flex flex-col items-center text-center p-8 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 hover:scale-105 bg-white border border-gray-100 ${
                  visibleSections.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                }`}
                style={{ transitionDelay: `${Math.min(index * 100, 300)}ms` }}
              >
                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4 transform transition-transform duration-300 hover:rotate-12">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
 
      {/* Services section - with optimized animations and image loading */}
      <div id="services" ref={sectionsRef.services} className="container mx-auto px-6 py-24">
        <div className={`text-center mb-16 transition-all duration-500 ${
          visibleSections.services ? 'opacity-100 transform-none' : 'opacity-0 translate-y-10'
        }`}>
          <h2 className="text-6xl font-bold mb-4 text-gray-800 inline-block relative">
            خدماتنا
            <span className={`block h-1 w-24 bg-green-600 mx-auto mt-4 transition-all duration-500 delay-200 ${
              visibleSections.services ? 'w-24' : 'w-0'
            }`}></span>
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mt-4">
            نقدم مجموعة متكاملة من خدمات التنظيف والصيانة عالية الجودة للمنازل والمباني في الرياض
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-8">
          {servicesWithImages.map((service, index) => (
            <Link
              key={service.id}
              to={`/service/${service.id}`}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden group relative transition-all duration-300 hover:shadow-xl border border-gray-100 hover:border-green-200 aspect-square md:aspect-[4/5] lg:aspect-[3/4] ${
                visibleSections.services ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
              }`}
              style={{ transitionDelay: `${Math.min(index * 50, 300)}ms` }}
            >
              {/* شريط تدرج علوي */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-green-600 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500 ease-in-out"></div>
              
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.title}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  width="300"
                  height="300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
                  <Star className="w-8 h-8 text-gray-400" />
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-br from-emerald-700/20 to-teal-900/35 transition-opacity duration-300 ease-out" />

              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 text-right">
                <h3 className="text-sm sm:text-base md:text-lg font-extrabold text-white leading-snug">
                  {service.title}
                </h3>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] sm:text-xs font-bold text-white shadow-sm backdrop-blur-sm transition-colors duration-300 group-hover:bg-emerald-500">
                    <span>استكشف الآن</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Why Choose Us section - with optimized animations */}
      <div className="bg-gradient-to-br from-green-600 to-green-700 text-white py-24 relative overflow-hidden" ref={sectionsRef.whyChooseUs}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute left-0 top-0 w-96 h-96 rounded-full bg-white/10 -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute right-0 bottom-0 w-96 h-96 rounded-full bg-white/10 translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className={`text-center mb-16 transition-all duration-500 ${
            visibleSections.whyChooseUs ? 'opacity-100 transform-none' : 'opacity-0 -translate-y-10'
          }`}>
            <h2 className="text-4xl font-bold mb-4">{whyChooseUsHeading}</h2>
            <div className={`h-1 w-20 bg-white mx-auto mb-6 transition-all duration-500 delay-200 ${
              visibleSections.whyChooseUs ? 'w-20' : 'w-0'
            }`}></div>
            <p className="text-xl max-w-2xl mx-auto">
              {whyChooseUsSubheading}
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {whyChooseUsData.map((item, index) => (
              <div 
                key={index} 
                className={`group bg-white/10 p-8 rounded-xl transition-all duration-300 hover:bg-white/20 flex flex-col items-center text-center transform hover:-translate-y-2 hover:shadow-xl md:backdrop-blur-sm ${
                  visibleSections.whyChooseUs ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-20'
                }`}
                style={{ transitionDelay: `${Math.min(index * 100, 300)}ms` }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-full scale-0 group-hover:scale-150 opacity-0 group-hover:opacity-30 transition-all duration-500"></div>
                  {item.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4 mt-2">{item.title}</h3>
                <p className="transform group-hover:translate-y-1 transition-transform duration-300">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Lazy load footer */}
      <Suspense fallback={<div className="h-64 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">جاري تحميل معلومات التواصل...</p>
      </div>}>
        <ContactFooter />
      </Suspense>
    </div>
  );
}

export default Home;
