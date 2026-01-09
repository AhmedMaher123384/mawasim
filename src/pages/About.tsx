import { useState } from 'react';
import aboutImage from '../assets/about.png';
import managerImage from '../assets/manger.png';
import { useConfig } from '../config/ConfigContext';

// 1) واجهة نوع السؤال والجواب
interface FAQItem {
  question: string;
  answer: string;
}

// 2) مكون الأسئلة الشائعة المحسن للغة العربية
function FAQ({ questions }: { questions: FAQItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const toggleQuestion = (index: number): void => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {questions.map((item: FAQItem, index: number) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md overflow-hidden border-r-4 border-green-600"
          data-aos="fade-up"
          data-aos-duration="800"
        >
          <button
            className="w-full p-5 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors"
            onClick={() => toggleQuestion(index)}
            aria-expanded={activeIndex === index}
            aria-controls={`faq-answer-${index}`}
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-50 border border-green-200">
              <svg 
                className={`w-4 h-4 text-green-600 transition-transform duration-300 ${
                  activeIndex === index ? 'transform rotate-180' : ''
                }`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24" 
                xmlns="http://www.w3.org/2000/svg"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M19 9l-7 7-7-7" 
                />
              </svg>
            </div>
            <span className="text-lg font-medium text-gray-800 text-right">{item.question}</span>
          </button>
          <div
            id={`faq-answer-${index}`}
            className={`p-5 bg-gray-50 transition-all duration-300 border-t border-gray-100 ${
              activeIndex === index ? 'block' : 'hidden'
            }`}
          >
            <p className="text-gray-700 whitespace-pre-line text-right pr-8">{item.answer}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function About() {
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
  const about = config?.sections?.about || null;
  const aboutHeadingValue = about?.heading;
  const aboutHeading = aboutHeadingValue ? (t(aboutHeadingValue) || pickText(aboutHeadingValue) || 'من نحن') : 'من نحن';
  const firstParagraph = about?.paragraphs?.[0];
  const aboutText = firstParagraph ? (t(firstParagraph) || pickText(firstParagraph) || '') : '';
  const titleValue = config?.site?.title;
  const title = titleValue ? (t(titleValue) || pickText(titleValue) || 'شركة مواسم الخدمات') : 'شركة مواسم الخدمات';
  const aboutImg = about?.image || aboutImage;

  return (
    <main id="app">
      {/* القسم الأول: من نحن */}
      <section className="relative py-16 bg-white">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
          {/* الصورة على اليسار */}
          <div className="md:w-1/2 flex justify-center mb-8 md:mb-0" data-aos="fade-up-left">
            <img
              src={aboutImg}
              alt="صورة توضيحية"
              className="rounded-lg shadow-lg w-full max-w-lg"
            />
          </div>

          {/* النص على اليمين */}
          <div className="md:w-1/2 text-right md:pl-8" data-aos="fade-up-right">
            <h4 className="text-green-600 font-bold mb-2">{aboutHeading}</h4>
            <h2 className="text-3xl font-bold mb-4">{title}</h2>
            <p className="text-gray-700 mb-6 leading-relaxed">
              {aboutText || (
                <>
                  مواسم الخدمات هي شركة وطنية متخصصة في تقديم خدمات النظافة الشاملة للفلل والقصور، وتأجير وايتات الصرف الصحي.
                  وتقدم لكم هذه الخدمات بمعايير عالية وعن طريق عمالة متخصصة في هذا المجال
                  لها خبرة واسعة خولتها لإظهار الإحترافية والدقة في نتائجها دائماً
                  نحن في مواسم نسعى لأن نكون بين نخبة الشركات التي تهتم وتعتني بعملائها
                  لربط رضاهم بنجاحنا الدائم
                </>
              )}
            </p>

            <ul className="space-y-4">
              <li>
                <span className="text-green-600 font-bold block mb-1"> : رؤيتنا</span>
                <h5 className="text-gray-800">
                  أن نكون المؤسسة الرائدة رقم واحد في مجال النظافة وخدمة الحاويات ودعم عملائنا طوال فترة عملنا معهم
                </h5>
              </li>
              <li>
                <span className="text-green-600 font-bold block mb-1"> : رسالتنا</span>
                <h5 className="text-gray-800">
                  أن تقوم ببيع منتج لعميل أمر سهل يحتاج بعض الجهد ولكن أن تحافظ على رضى ذلك العميل هو الأمر الأكثر صعوبة
                </h5>
              </li>
              <li>
                <span className="text-green-600 font-bold block mb-1"> : قيمنا</span>
                <h5 className="text-gray-800">المرونة - التعاون - التفاني</h5>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* القسم الثاني: كلمة المدير العام */}
      <section className="relative py-16 bg-gray-50 overflow-hidden">
        {/* شكل مموّج (Wave) في الخلفية */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <svg
            className="w-full h-full text-white fill-current"
            viewBox="0 0 1440 320"
            preserveAspectRatio="none"
          >
            <path d="M0,64L48,85.3C96,107,192,149,288,186.7C384,224,480,256,576,250.7C672,245,768,203,864,170.7C960,139,1056,117,1152,138.7C1248,160,1344,224,1392,256L1440,288L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z" />
          </svg>
        </div>

        <div className="container mx-auto px-4">
          <div
            className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-6 text-center"
            data-aos="fade-up-left"
            data-aos-duration="1000"
          >
            <div className="flex flex-col items-center">
              <img
                src={managerImage}
                alt="صورة المدير"
                className="w-32 h-32 rounded-full object-cover mb-4"
              />
              <h4 className="text-green-600 font-bold mb-2">من نحن</h4>
              <h2 className="text-3xl font-bold mb-4">كلمة الرئيس التنفيذي</h2>
              <p className="text-gray-700 mb-6 leading-relaxed">
                مواسم الخدمات هي شركة وطنية متخصصة في تقديم خدمات النظافة الشاملة للفلل والقصور، وتأجير وايتات الصرف الصحي.
                وتقدم لكم هذه الخدمات بمعايير عالية وعن طريق عمالة متخصصة في هذا المجال
                لها خبرة واسعة خولتها لإظهار الإحترافية والدقة في نتائجها دائماً
                نحن في مواسم نسعى لأن نكون بين نخبة الشركات التي تهتم وتعتني بعملائها
                لربط رضاهم بنجاحنا الدائم
                <br />
                خدماتنا لا تقتصر على تنفيذ العمل فقط، بل نمتلك فريق متخصص للرد على استفساراتكم
                ومتابعة ملاحظاتكم قبل وأثناء وبعد انتهاء العمل للحصول على أعلى درجات الرضا
              </p>
              <h5 className="text-xl font-bold text-gray-800">محمد عبد الله السلوم</h5>
              <span className="text-green-600"> الرئيس التنفيذي</span>
            </div>
          </div>
        </div>
      </section>

      {/* القسم الثالث: الأسئلة الشائعة */}
      <section className="questions_abouts py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h4 className="text-green-600 font-bold mb-2">الأسئلة الشائعة</h4>
            <h2 className="text-3xl font-bold">أسئلة وأجوبة</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <FAQ
              questions={[
                {
                  question: 'ما هي أسعار الخدمات؟',
                  answer: 'على حسب نوع الخدمة ومدتها'
                },
                {
                  question: 'هل يوجد خصومات على أسعار الخدمات وما هي؟',
                  answer: 'في حالة التعاقد السنوي'
                },
              
                {
                  question: 'ما هي ساعات العمل؟',
                  answer: 'تلقي الطلبات من 7 صباحاً حتى 3 مساءً'
                }
              ]}
            />
          </div>
        </div>
      </section>
    </main>
  );
}

export default About;
