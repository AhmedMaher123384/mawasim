import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useConfig } from '../config/ConfigContext';
import { DndContext, closestCenter, useSensor, useSensors, MouseSensor, TouchSensor, KeyboardSensor } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { downloadConfig, saveConfigRemote, hasRemote } from '../config/configLoader.js';

// =============== مكونات مخصصة ===============
const ConfirmModal = ({ isOpen, onClose, onConfirm, message, confirmText = "تأكيد", cancelText = "إلغاء" }) => {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      const handleEsc = (e) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', handleEsc);
      dialogRef.current?.focus();
      return () => window.removeEventListener('keydown', handleEsc);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;
 
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} ref={dialogRef} tabIndex="-1">
        <div className="modal-header">
          <h3>تأكيد الحذف</h3>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <p>{message}</p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>{cancelText}</button>
          <button className="btn btn-danger" onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

const ColorInput = ({ label, value, onChange, required = false }) => {
  const [error, setError] = useState(false);
  const isValid = value && /^#[0-9A-F]{6}$/i.test(value);

  const handleChange = (v) => {
    const valid = /^#[0-9A-F]{6}$/i.test(v);
    setError(!valid && required);
    onChange(v);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="color-wrapper">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => handleChange(e.target.value)}
          className={error ? 'input-error' : ''}
        />
        <input
          type="text"
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="#000000"
          className={`color-text-input ${error ? 'input-error' : ''}`}
          dir="ltr"
        />
      </div>
      {error && <span className="error-hint">يجب أن يكون لونًا صالحًا (مثل #FF0000)</span>}
    </div>
  );
};

const URLInput = ({ label, value, onChange, placeholder = '', dir = 'ltr', required = false, accept = 'image/*' }) => {
  const [error, setError] = useState(false);
  // قبول أنواع متعددة من الروابط:
  // - http/https
  // - روابط داخلية تبدأ بـ #
  // - روابط صور مرفوعة بصيغة data:image/*
  // - روابط نسبية تبدأ بـ / أو ./
  // - mailto: و tel:
  const validate = (v) => {
    if (!required && !v) return true;
    if (!v) return false;
    if (v.startsWith('#')) return true;
    if (v.startsWith('data:image/')) return true;
    if (/^https?:\/\//.test(v)) return true;
    if (/^(mailto:|tel:)/.test(v)) return true;
    if (/^(\/|\.\/)/.test(v)) return true;
    // محاولة أخيرة: إن كان المتصفح يقبل إنشاء URL منه
    try {
      // سيقبل فقط الروابط المطلقة، لذا هذا للتأكد الإضافي
      new URL(v);
      return true;
    } catch (_) {
      return false;
    }
  };

  const handleChange = (v) => {
    const valid = validate(v);
    setError(!valid && required);
    onChange(v);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="url-input-wrapper">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
          dir={dir}
          className={error ? 'input-error' : ''}
        />
        <UploadImageButton onUpload={handleChange} accept={accept} />
      </div>
      {error && <span className="error-hint">رابط غير صالح</span>}
    </div>
  );
};

const UploadImageButton = ({ onUpload, accept = 'image/*' }) => {
  const fileInputRef = useRef(null);
  const { config } = useConfig();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const allowImage = accept.includes('image');
    const allowVideo = accept.includes('video');
    if ((!isImage && !isVideo) || (isImage && !allowImage) || (isVideo && !allowVideo)) {
      alert(allowVideo && !allowImage
        ? 'الملف ليس فيديو. يُرجى اختيار فيديو (MP4, WebM, MOV).'
        : allowImage && !allowVideo
        ? 'الملف ليس صورة. يُرجى اختيار صورة (JPEG, PNG, GIF).'
        : 'نوع الملف غير مدعوم.');
      return;
    }
    try {
      const cloudCfg = config?.site?.cloudinary || {}
      const cloudName = cloudCfg.cloud_name || import.meta.env?.VITE_CLOUDINARY_CLOUD_NAME
      const uploadPreset = cloudCfg.upload_preset || import.meta.env?.VITE_CLOUDINARY_UPLOAD_PRESET
      const apiKey = cloudCfg.api_key || import.meta.env?.VITE_CLOUDINARY_API_KEY
      const signUrl = cloudCfg.sign_url || import.meta.env?.VITE_CLOUDINARY_SIGN_URL
      const folder = cloudCfg.folder || import.meta.env?.VITE_CLOUDINARY_FOLDER || 'uploads'
      const maxImageBytes = (cloudCfg.max_image_bytes || (2 * 1024 * 1024)) // 2MB افتراضيًا
      const maxVideoBytes = (cloudCfg.max_video_bytes || (50 * 1024 * 1024)) // 50MB افتراضيًا

      // منع رفع ملفات أكبر من الحد الأقصى المحدد بحسب النوع
      if (isImage && file.size > maxImageBytes) {
        alert('حجم الصورة يتجاوز الحد الأقصى 2MB. يُرجى تقليل حجمها ثم إعادة المحاولة.')
        return
      }
      if (isVideo && file.size > maxVideoBytes) {
        const mb = Math.round(maxVideoBytes / (1024 * 1024))
        alert(`حجم الفيديو يتجاوز الحد الأقصى ${mb}MB. يُرجى تقليل حجمه ثم إعادة المحاولة.`)
        return
      }

      const uploadUnsigned = async () => {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('upload_preset', uploadPreset)
        if (folder) fd.append('folder', folder)
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, { method: 'POST', body: fd })
        if (!res.ok) {
          let detail = ''
          try {
            const errData = await res.json()
            detail = errData?.error?.message || JSON.stringify(errData)
          } catch (_) {
            try { detail = await res.text() } catch {}
          }
          throw new Error(`فشل الرفع غير الموقّع: ${detail || res.status}`)
        }
        const data = await res.json()
        return data.secure_url || data.url
      }

      const uploadSigned = async () => {
        const timestamp = Math.floor(Date.now() / 1000)
        const resSign = await fetch(signUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ timestamp, folder })
        })
        if (!resSign.ok) {
          let detail = ''
          try { detail = await resSign.text() } catch {}
          throw new Error(`فشل الحصول على التوقيع: ${detail || resSign.status}`)
        }
        const { signature, api_key: keyFromWorker, cloud_name: cloudFromWorker, timestamp: tsFromWorker } = await resSign.json()
        const fd = new FormData()
        fd.append('file', file)
        fd.append('timestamp', String(tsFromWorker || timestamp))
        fd.append('api_key', String(keyFromWorker || apiKey))
        if (folder) fd.append('folder', folder)
        fd.append('signature', signature)
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudFromWorker || cloudName}/auto/upload`, { method: 'POST', body: fd })
        if (!res.ok) {
          let detail = ''
          try {
            const errData = await res.json()
            detail = errData?.error?.message || JSON.stringify(errData)
          } catch (_) {
            try { detail = await res.text() } catch {}
          }
          throw new Error(`فشل الرفع الموقّع: ${detail || res.status}`)
        }
        const data = await res.json()
        return data.secure_url || data.url
      }

      let url = ''
      const canUnsigned = Boolean(cloudName && uploadPreset)
      const canSigned = Boolean(signUrl)
      if (canSigned) {
        url = await uploadSigned()
      } else if (canUnsigned) {
        url = await uploadUnsigned()
      } else {
        alert('الرفع إلى Cloudinary غير مُعد. يُرجى إعداد "cloud_name" و"upload_preset" أو توفير "sign_url". بديلًا، أدخل رابط صورة مباشر في الحقل.')
        return
      }
      onUpload(url)
    } catch (err) {
      alert(err?.message ? err.message : 'حدث خطأ أثناء رفع/قراءة الملف. يُرجى التحقق من الإعدادات أو استخدام رابط مباشر.')
    }
  };

  return (
    <>
      <button
        type="button"
        className="btn-upload"
        onClick={() => fileInputRef.current?.click()}
        title={accept.includes('video') && !accept.includes('image') ? 'رفع فيديو' : accept.includes('video') && accept.includes('image') ? 'رفع ملف' : 'رفع صورة'}
      >
        📤 رفع
      </button>
      <input
        type="file"
        accept={accept}
        ref={fileInputRef}
        onChange={handleUpload}
        style={{ display: 'none' }}
      />
    </>
  );
};

const TextInput = ({ label, value, onChange, dir, placeholder, required = false }) => {
  const [error, setError] = useState(false);

  const handleChange = (v) => {
    const valid = !required || v.trim() !== '';
    setError(!valid);
    onChange(v);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        dir={dir}
        placeholder={placeholder}
        className={error ? 'input-error' : ''}
      />
      {error && <span className="error-hint">هذا الحقل مطلوب</span>}
    </div>
  );
};

const TextArea = ({ label, value, onChange, dir, placeholder, required = false, rows = 3 }) => {
  const [error, setError] = useState(false);

  const handleChange = (v) => {
    const valid = !required || v.trim() !== '';
    setError(!valid);
    onChange(v);
  };

  return (
    <div className="form-group">
      <label>{label}</label>
      <textarea
        value={value || ''}
        onChange={(e) => handleChange(e.target.value)}
        dir={dir}
        placeholder={placeholder}
        rows={rows}
        className={error ? 'input-error' : ''}
        style={{ resize: 'vertical', whiteSpace: 'pre-wrap' }}
      />
      {error && <span className="error-hint">هذا الحقل مطلوب</span>}
    </div>
  );
};

// عنصر قابل للسحب لترتيب الأقسام
const SectionOrderItem = ({ id, label }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    padding: '10px 12px',
    border: '1px dashed color-mix(in srgb, var(--color-text) 25%, transparent)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: 'color-mix(in srgb, var(--color-text) 3%, transparent)'
  }
  return (
    <div ref={setNodeRef} style={style}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        {label}
      </span>
      <span className="badge">سحب لإعادة الترتيب</span>
    </div>
  )
}

// عنصر خدمة قابل للسحب لإعادة الترتيب
const ServiceRowSortable = ({ id, svc, i, editLang, dir, updateService, openServiceDetails, safeDelete, removeService }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr 1fr auto auto auto', gap: 10, alignItems: 'center' }}>
        <URLInput
          label={editLang === 'ar' ? 'الصورة' : 'Image'}
          value={svc.image || ''}
          onChange={(v) => updateService(i, 'image', v)}
          placeholder={editLang === 'ar' ? 'رابط الصورة أو رفع' : 'Image URL or upload'}
          accept="image/*"
          required={false}
        />
        <TextInput
          label="العنوان"
          value={svc.title[editLang] || ''}
          onChange={(v) => updateService(i, 'title', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'عنوان الخدمة' : 'Service title'}
          required
        />
        <TextArea
          label="الوصف"
          value={svc.description[editLang] || ''}
          onChange={(v) => updateService(i, 'description', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'وصف مختصر' : 'Short description'}
          rows={3}
        />
        <button type="button" className="btn btn-outline" onClick={() => openServiceDetails(i)}>تفاصيل</button>
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button
          className="btn btn-ghost"
          onClick={() => safeDelete(() => removeService(i), 'هل أنت متأكد من حذف هذه الخدمة؟')}
        >
          حذف
        </button>
      </div>
    </div>
  )
}

// عنصر رابط تواصل قابل للسحب لإعادة الترتيب
const LinkRowSortable = ({ id, link, i, editLang, dir, updateLinkLabel, updateLinkUrl, safeDelete, removeLink }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="الاسم"
          value={link.label[editLang] || ''}
          onChange={(v) => updateLinkLabel(i, v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'اسم الرابط' : 'Link label'}
          required
        />
        <URLInput
          label="الرابط"
          value={link.url || ''}
          onChange={(v) => updateLinkUrl(i, v)}
          placeholder="https://..."
          required
        />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeLink(i), 'هل أنت متأكد من حذف هذا الرابط؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر مؤشر (Metric) قابل للسحب
const MetricRowSortable = ({ id, m, i, editLang, dir, updateMetricLabel, updateMetricValue, safeDelete, removeMetric }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="العنوان"
          value={m.label?.[editLang] || ''}
          onChange={(v) => updateMetricLabel(i, v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'مثال: عملاء سعداء' : 'e.g., Happy Clients'}
          required
        />
        <TextInput
          label={editLang === 'ar' ? 'القيمة' : 'Value'}
          value={m.value || ''}
          onChange={(v) => updateMetricValue(i, v)}
          dir={dir}
          placeholder="720+"
          required
        />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeMetric(i), 'حذف هذا المؤشر؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر مجال عمل (Industry) قابل للسحب
const IndustryRowSortable = ({ id, item, i, editLang, dir, updateIndustry, safeDelete, removeIndustry }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="العنوان"
          value={item.title?.[editLang] || ''}
          onChange={(v) => updateIndustry(i, 'title', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'مثال: الأثاث' : 'e.g., Furniture'}
          required
        />
        <TextInput
          label="وسم"
          value={item.tagline?.[editLang] || ''}
          onChange={(v) => updateIndustry(i, 'tagline', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'مثال: تجارة' : 'e.g., Trading'}
        />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeIndustry(i), 'حذف هذا المجال؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر ميزة (Highlight) قابل للسحب
const HighlightRowSortable = ({ id, item, i, editLang, dir, updateHighlight, safeDelete, removeHighlight }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="العنوان"
          value={item.title?.[editLang] || ''}
          onChange={(v) => updateHighlight(i, 'title', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'عنوان قصير' : 'Short title'}
          required
        />
        <TextArea
          label="الوصف"
          value={item.description?.[editLang] || ''}
          onChange={(v) => updateHighlight(i, 'description', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'وصف موجز' : 'Brief description'}
          rows={3}
        />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeHighlight(i), 'حذف هذه الميزة؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر فلتر بورتفوليو قابل للسحب
const PortfolioFilterRowSortable = ({ id, f, i, editLang, dir, updateFilterLabel, updateFilterValue, safeDelete, removeFilter }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="الاسم"
          value={f.label?.[editLang] || ''}
          onChange={(v) => updateFilterLabel(i, v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'مثال: جميع المشاريع' : 'e.g., All'}
          required
        />
        <TextInput
          label="القيمة"
          value={f.value || ''}
          onChange={(v) => updateFilterValue(i, v)}
          dir="ltr"
          placeholder="all"
          required
        />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeFilter(i), 'حذف هذا الفلتر؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر عنصر بورتفوليو قابل للسحب
const PortfolioItemRowSortable = ({ id, item, i, editLang, dir, updateItemText, updateItemCategory, updateItemMetric, safeDelete, removeItem }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 140px auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="العنوان"
          value={item.title?.[editLang] || ''}
          onChange={(v) => updateItemText(i, 'title', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'عنوان المشروع' : 'Project title'}
          required
        />
        <TextArea
          label="الوصف"
          value={item.description?.[editLang] || ''}
          onChange={(v) => updateItemText(i, 'description', v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'وصف مختصر' : 'Short description'}
          rows={3}
        />
        <div className="form-group">
          <label>{editLang === 'ar' ? 'الفئة' : 'Category'}</label>
          <select value={item.category || 'all'} onChange={(e) => updateItemCategory(i, e.target.value)}>
            <option value="all">{editLang === 'ar' ? 'الكل' : 'All'}</option>
            <option value="furniture">{editLang === 'ar' ? 'الأثاث' : 'Furniture'}</option>
            <option value="building">{editLang === 'ar' ? 'مواد البناء' : 'Building Materials'}</option>
            <option value="cosmetics">{editLang === 'ar' ? 'مستحضرات التجميل' : 'Cosmetics'}</option>
          </select>
        </div>
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeItem(i), 'حذف هذا المشروع؟')}>حذف</button>
      </div>
      <div className="row-grid" style={{ marginTop: 10 }}>
        <TextInput label="العملاء" value={item.metrics?.clients || ''} onChange={(v) => updateItemMetric(i, 'clients', v)} dir={dir} placeholder="150+" />
        <TextInput label="الإيرادات" value={item.metrics?.revenue || ''} onChange={(v) => updateItemMetric(i, 'revenue', v)} dir={dir} placeholder="$2.5M" />
        <TextInput label="الرضا" value={item.metrics?.satisfaction || ''} onChange={(v) => updateItemMetric(i, 'satisfaction', v)} dir={dir} placeholder="98%" />
        <TextInput label="المدة" value={item.metrics?.duration || ''} onChange={(v) => updateItemMetric(i, 'duration', v)} dir={dir} placeholder="2018-2024" />
      </div>
    </div>
  )
}

// عنصر رأي عميل قابل للسحب
const TestimonialRowSortable = ({ id, tItem, i, editLang, dir, updateTestimonialText, updateTestimonialName, safeDelete, removeTestimonial }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto auto', gap: 10, alignItems: 'center' }}>
        <TextArea label="الاقتباس" value={tItem.quote?.[editLang] || ''} onChange={(v) => updateTestimonialText(i, 'quote', v)} dir={dir} placeholder={editLang === 'ar' ? 'نص الرأي' : 'Quote'} required rows={3} />
        <TextInput label="الاسم" value={tItem.name || ''} onChange={(v) => updateTestimonialName(i, v)} dir={dir} placeholder={editLang === 'ar' ? 'الاسم' : 'Name'} required />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeTestimonial(i), 'حذف هذا الرأي؟')}>حذف</button>
      </div>
      <div className="row-grid" style={{ marginTop: 10 }}>
        <TextInput label="الدور" value={tItem.role?.[editLang] || ''} onChange={(v) => updateTestimonialText(i, 'role', v)} dir={dir} placeholder={editLang === 'ar' ? 'مثال: مدير المشروع' : 'e.g., Project Manager'} />
        <TextInput label="الشركة" value={tItem.company?.[editLang] || ''} onChange={(v) => updateTestimonialText(i, 'company', v)} dir={dir} placeholder={editLang === 'ar' ? 'اسم الشركة' : 'Company'} />
        <TextInput label="الدولة" value={tItem.country?.[editLang] || ''} onChange={(v) => updateTestimonialText(i, 'country', v)} dir={dir} placeholder={editLang === 'ar' ? 'الدولة' : 'Country'} />
        <TextInput label="المشروع" value={tItem.project?.[editLang] || ''} onChange={(v) => updateTestimonialText(i, 'project', v)} dir={dir} placeholder={editLang === 'ar' ? 'اسم المشروع' : 'Project'} />
      </div>
    </div>
  )
}

// عنصر ملخص شهادة (Summary) قابل للسحب
const SummaryRowSortable = ({ id, s, i, editLang, dir, updateSummaryLabel, updateSummaryValue, safeDelete, removeSummary }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput label={editLang === 'ar' ? 'العنوان' : 'Label'} value={s.label?.[editLang] || ''} onChange={(v) => updateSummaryLabel(i, v)} dir={dir} placeholder={editLang === 'ar' ? 'مثال: رضا العملاء' : 'e.g., Satisfaction'} required />
        <TextInput label={editLang === 'ar' ? 'القيمة' : 'Value'} value={s.value || ''} onChange={(v) => updateSummaryValue(i, v)} dir={dir} placeholder="98%" required />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeSummary(i), 'حذف هذا السطر؟')}>حذف</button>
      </div>
    </div>
  )
}

// عنصر عضو فريق قابل للسحب
const TeamMemberRowSortable = ({ id, m, i, editLang, dir, updateMemberText, safeDelete, removeMember }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  return (
    <div ref={setNodeRef} style={style} className="row-cta">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', gap: 10, alignItems: 'center' }}>
        <TextInput label="الاسم" value={m.name?.[editLang] || ''} onChange={(v) => updateMemberText(i, 'name', v)} dir={dir} placeholder={editLang === 'ar' ? 'الاسم' : 'Name'} required />
        <TextInput label="الدور" value={m.role?.[editLang] || ''} onChange={(v) => updateMemberText(i, 'role', v)} dir={dir} placeholder={editLang === 'ar' ? 'الدور' : 'Role'} />
        <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
        <button className="btn btn-ghost" onClick={() => safeDelete(() => removeMember(i), 'حذف هذا العضو؟')}>حذف</button>
      </div>
      <div className="row-grid" style={{ marginTop: 10 }}>
        <TextArea label="نبذة" value={m.bio?.[editLang] || ''} onChange={(v) => updateMemberText(i, 'bio', v)} dir={dir} placeholder={editLang === 'ar' ? 'مختصر السيرة' : 'Short bio'} rows={4} />
      </div>
    </div>
  )
}

// عنصر عمود فوتر قابل للسحب لإعادة الترتيب
const FooterColumnSortable = ({ id, col, i, editLang, dir, updateFooterColumnTitle, addFooterLink, updateFooterLinkLabel, updateFooterLinkHref, removeFooterLink, removeFooterColumn, setConfig, cfg, safeDelete, sensors }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <div ref={setNodeRef} style={style} className="panel">
      <div className="panel-header">
        <div className="panel-title">عمود {i + 1}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
          <button className="btn btn-ghost" onClick={() => safeDelete(() => removeFooterColumn(i), 'هل أنت متأكد من حذف هذا العمود؟')}>حذف</button>
        </div>
      </div>

      <TextInput
        label="العنوان"
        value={col.title?.[editLang] || ''}
        onChange={(v) => updateFooterColumnTitle(i, v)}
        dir={dir}
        placeholder={editLang === 'ar' ? 'مثال: الشركة' : 'e.g., Company'}
        required
      />

      <div className="panel-header" style={{ marginTop: 16 }}>
        <div className="panel-title">
          روابط <span className="badge">{(col.links || []).length}</span>
        </div>
        <button className="btn btn-outline" onClick={() => addFooterLink(i)}>إضافة رابط</button>
      </div>

      <div className="row-grid" style={{ marginTop: 12 }}>
        {(() => {
          const links = (col.links || []).map((l, j) => ({ l, j }));
          const linkIds = links.map(({ j }) => `${i}-${j}`);
          return (
            <DndContext
              collisionDetection={closestCenter}
              sensors={sensors}
              onDragEnd={({ active, over }) => {
                if (!over || active.id === over.id) return;
                const oldIndex = Number(String(active.id).split('-')[1]);
                const newIndex = Number(String(over.id).split('-')[1]);
                const arr = cfg.sections.footer.main.columns[i].links || [];
                const newArr = arrayMove(arr, oldIndex, newIndex);
                cfg.sections.footer.main.columns[i].links = newArr;
                setConfig(cfg);
              }}
            >
              <SortableContext items={linkIds} strategy={verticalListSortingStrategy}>
                {links.map(({ l, j }) => (
                  <FooterLinkSortable
                    key={`${i}-${j}`}
                    id={`${i}-${j}`}
                    link={l}
                    i={i}
                    j={j}
                    editLang={editLang}
                    dir={dir}
                    updateFooterLinkLabel={updateFooterLinkLabel}
                    updateFooterLinkHref={updateFooterLinkHref}
                    removeFooterLink={removeFooterLink}
                    safeDelete={safeDelete}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )
        })()}
      </div>
    </div>
  )
}

// عنصر رابط داخل عمود الفوتر قابل للسحب
const FooterLinkSortable = ({ id, link, i, j, editLang, dir, updateFooterLinkLabel, updateFooterLinkHref, removeFooterLink, safeDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }
  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 10, alignItems: 'center' }}>
        <TextInput
          label="الاسم"
          value={link.label?.[editLang] || ''}
          onChange={(v) => updateFooterLinkLabel(i, j, v)}
          dir={dir}
          placeholder={editLang === 'ar' ? 'اسم الرابط' : 'Link label'}
          required
        />
        <URLInput
          label="الرابط"
          value={link.href || ''}
          onChange={(v) => updateFooterLinkHref(i, j, v)}
          placeholder="# أو https://..."
          required
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-outline" aria-label="اسحب لإعادة الترتيب" {...attributes} {...listeners}>↕️</button>
          <button className="btn btn-ghost" onClick={() => safeDelete(() => removeFooterLink(i, j), 'هل أنت متأكد من حذف هذا الرابط؟')}>حذف</button>
        </div>
      </div>
    </div>
  )
}

// =============== لوحة التحكم ===============
const DEFAULT_HOME_SECTIONS = ['hero', 'metrics', 'highlights', 'about', 'industries', 'services', 'portfolio', 'testimonials', 'team', 'cta', 'contact'];

export default function Dashboard(props) {
  const mergedProps = {
    allowedSections: ['hero', 'highlights', 'services', 'cta', 'contact'],
    showCustomBlocks: false,
    labelOverrides: {
      ar: {
        highlights: 'مميزاتنا',
        services: 'خدماتنا',
        cta: 'لماذا تختارنا',
        contact: 'وسائل التواصل',
      },
    },
    ...(props || {}),
  };

  const allowedSections = Array.isArray(mergedProps?.allowedSections) && mergedProps.allowedSections.length ? mergedProps.allowedSections : null;
  const showCustomBlocks = mergedProps?.showCustomBlocks !== false;
  const labelOverrides = mergedProps?.labelOverrides && typeof mergedProps.labelOverrides === 'object' ? mergedProps.labelOverrides : null;
  const { config, setConfig, updateConfig, t, lang, setLang, saveToBrowser, lastSavedAt, unsaved } = useConfig();
  const [editLang, setEditLang] = useState('ar');
  const [active, setActive] = useState('theme');
  const [activeGroup, setActiveGroup] = useState('appearance'); // appearance | main | pages | others
  const [appearanceSub, setAppearanceSub] = useState('colors'); // colors | fonts
  const [mainSub, setMainSub] = useState('navbar'); // navbar | hero | footer | layout
  const [pagesSub, setPagesSub] = useState('page_about'); // page_about | page_partners | page_media | page_contact
  const [livePreview, setLivePreview] = useState(false);
  const [showPreview, setShowPreview] = useState(window.innerWidth > 768); // default hidden on mobile
  const [svcFilter, setSvcFilter] = useState('');
  const [linkFilter, setLinkFilter] = useState('');
  const [blockFilter, setBlockFilter] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, onConfirm: null, message: '' });
  const [serviceDetailsModal, setServiceDetailsModal] = useState({ isOpen: false, index: -1 });

  const dir = editLang === 'ar' ? 'rtl' : 'ltr';
  const previewRef = useRef(null);

  const cfg = useMemo(() => (config ? JSON.parse(JSON.stringify(config)) : null), [config]);
  // حساسات السحب لتجنّب بدء السحب من حقول الإدخال
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const refreshPreview = useCallback(() => {
    if (!showPreview || !previewRef.current) return;
    try {
      previewRef.current.contentWindow?.location.reload();
    } catch {}
  }, [showPreview]);

  // ======== وظائف التحديث ========
  const setTheme = (key, v) => { cfg.theme[key] = v; setConfig(cfg); };
  const setSiteText = (key, v) => { cfg.site[key][editLang] = v; setConfig(cfg); };
  const ensureSection = (sec) => {
    cfg.sections[sec] = cfg.sections[sec] || { enabled: true, colors: {}, heading: { en: '', ar: '' } };
  };
  const setSectionEnabled = (sec, v) => { ensureSection(sec); cfg.sections[sec].enabled = v; setConfig(cfg); };
  const setSectionText = (sec, key, v) => {
    ensureSection(sec);
    const cur = cfg.sections[sec][key];
    const isBilingualObj = cur && typeof cur === 'object' && !Array.isArray(cur) && (('en' in cur) || ('ar' in cur));
    if (!isBilingualObj) {
      cfg.sections[sec][key] = { en: '', ar: '' };
    }
    cfg.sections[sec][key][editLang] = v;
    setConfig(cfg);
  };
  const setSectionColor = (sec, key, v) => {
    ensureSection(sec);
    cfg.sections[sec].colors = cfg.sections[sec].colors || {};
    cfg.sections[sec].colors[key] = v;
    setConfig(cfg);
  };
  const setNavbarColor = (key, v) => {
    cfg.sections.navbar = cfg.sections.navbar || { enabled: true, colors: {} };
    cfg.sections.navbar.colors[key] = v;
    setConfig(cfg);
  };
  const setFooterColor = (key, v) => {
    cfg.sections.footer = cfg.sections.footer || { enabled: true, colors: {} };
    cfg.sections.footer.colors[key] = v;
    setConfig(cfg);
  };

  const ensurePages = () => {
    cfg.pages = cfg.pages || {};
    return cfg.pages;
  };

  const ensurePage = (key) => {
    const pages = ensurePages();
    pages[key] = pages[key] || {};
    return pages[key];
  };

  const setPageText = (pageKey, field, v) => {
    const page = ensurePage(pageKey);
    const cur = page[field];
    const isBilingualObj = cur && typeof cur === 'object' && !Array.isArray(cur) && (('en' in cur) || ('ar' in cur));
    if (!isBilingualObj) page[field] = { en: '', ar: '' };
    page[field][editLang] = v;
    setConfig(cfg);
  };

  const setPageValue = (pageKey, field, v) => {
    const page = ensurePage(pageKey);
    page[field] = v;
    setConfig(cfg);
  };

  const HOME_SECTIONS = useMemo(() => {
    const base = allowedSections || DEFAULT_HOME_SECTIONS;
    return base.filter((k) => typeof k === 'string' && k.trim() && DEFAULT_HOME_SECTIONS.includes(k));
  }, [allowedSections]);

  const hasPageMenu = useMemo(() => {
    const menu = cfg?.site?.menu;
    if (!Array.isArray(menu) || !menu.length) return false;
    return menu.some((m) => String(m?.href || '').startsWith('/'));
  }, [cfg]);

  const showPagesTab = props?.showPagesTab ?? hasPageMenu;

  // تسميات عربية/إنجليزية للأقسام بدون أيقونات
  const LABELS = {
    ar: {
      general: 'الإعدادات العامة',
      branding: 'العلامة التجارية',
      navbar: 'النافبار',
      theme: 'المظهر',
      hero: 'الهيرو',
      about: 'من نحن',
      services: 'الخدمات',
      metrics: 'المؤشرات',
      highlights: 'أبرز النقاط',
      industries: 'مجالات العمل',
      portfolio: 'سابقة الأعمال',
      testimonials: 'آراء العملاء',
      team: 'الفريق',
      cta: 'دعوة للإجراء',
      contact: 'التواصل',
      footer: 'الفوتر',
      custom: 'مخصص',
      layout: 'ترتيب الأقسام',
      data: 'البيانات',
      page_about: 'من نحن',
      page_partners: 'شركاء النجاح',
      page_media: 'الوسائط',
      page_contact: 'وسائل التواصل',
    },
    en: {
      general: 'General Settings',
      branding: 'Branding',
      navbar: 'Navbar',
      theme: 'Appearance',
      hero: 'Hero',
      about: 'About',
      services: 'Services',
      metrics: 'Metrics',
      highlights: 'Highlights',
      industries: 'Industries',
      portfolio: 'Portfolio',
      testimonials: 'Testimonials',
      team: 'Team',
      cta: 'CTA',
      contact: 'Contact',
      footer: 'Footer',
      custom: 'Custom',
      layout: 'Sections Order',
      data: 'Data',
      page_about: 'About',
      page_partners: 'Partners',
      page_media: 'Media',
      page_contact: 'Contact',
    }
  };

  const labelsForLang = useMemo(() => {
    const base = LABELS?.[editLang] || {};
    const extra = labelOverrides?.[editLang] || {};
    return { ...base, ...extra };
  }, [editLang, labelOverrides]);
  const setHeroCTA = (key, v) => { cfg.sections.hero.cta[key][editLang] = v; setConfig(cfg); };
  const setAboutImage = (v) => { cfg.sections.about.image = v; setConfig(cfg); };

  // ======== وسائط الهيرو (صورة/كاروسيل/فيديو) ========
  const ensureHeroMedia = () => { cfg.sections.hero.media = cfg.sections.hero.media || { type: 'image' }; };
  const setHeroMediaType = (type) => { ensureHeroMedia(); cfg.sections.hero.media.type = type; setConfig(cfg); };
  const setHeroOverlayMode = (mode) => { cfg.sections.hero.overlayMode = mode; setConfig(cfg); };
  const setHeroImage = (v) => { ensureHeroMedia(); cfg.sections.hero.media.image = v; cfg.sections.hero.backgroundImage = v; setConfig(cfg); };
  const addHeroSlide = () => {
    ensureHeroMedia();
    const slides = cfg.sections.hero.media.slides || [];
    slides.push({ src: '', overlay: { text: { en: '', ar: '' }, button: { text: { en: '', ar: '' }, link: '' } } });
    cfg.sections.hero.media.slides = slides;
    setConfig(cfg);
  };
  const updateHeroSlideSrc = (i, v) => {
    ensureHeroMedia();
    const slides = cfg.sections.hero.media.slides || [];
    slides[i] = slides[i] || { src: '', overlay: { text: { en: '', ar: '' }, button: { text: { en: '', ar: '' }, link: '' } } };
    slides[i].src = v;
    cfg.sections.hero.media.slides = slides;
    setConfig(cfg);
  };
  const updateHeroSlideOverlayText = (i, v) => {
    ensureHeroMedia();
    const s = cfg.sections.hero.media.slides?.[i] || (cfg.sections.hero.media.slides[i] = { src: '', overlay: {} });
    s.overlay = s.overlay || {};
    s.overlay.text = s.overlay.text || { en: '', ar: '' };
    s.overlay.text[editLang] = v;
    setConfig(cfg);
  };
  const updateHeroSlideButtonText = (i, v) => {
    ensureHeroMedia();
    const s = cfg.sections.hero.media.slides?.[i] || (cfg.sections.hero.media.slides[i] = { src: '', overlay: {} });
    s.overlay = s.overlay || {};
    s.overlay.button = s.overlay.button || { text: { en: '', ar: '' }, link: '' };
    s.overlay.button.text[editLang] = v;
    setConfig(cfg);
  };
  const updateHeroSlideButtonLink = (i, v) => {
    ensureHeroMedia();
    const s = cfg.sections.hero.media.slides?.[i] || (cfg.sections.hero.media.slides[i] = { src: '', overlay: {} });
    s.overlay = s.overlay || {};
    s.overlay.button = s.overlay.button || { text: { en: '', ar: '' }, link: '' };
    s.overlay.button.link = v;
    setConfig(cfg);
  };
  const removeHeroSlide = (i) => {
    ensureHeroMedia();
    const slides = cfg.sections.hero.media.slides || [];
    slides.splice(i, 1);
    cfg.sections.hero.media.slides = slides;
    setConfig(cfg);
  };
  const moveHeroSlide = (i, dir) => {
    ensureHeroMedia();
    const slides = cfg.sections.hero.media.slides || [];
    const j = dir === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= slides.length) return;
    const [s] = slides.splice(i, 1);
    slides.splice(j, 0, s);
    cfg.sections.hero.media.slides = slides;
    setConfig(cfg);
  };
  const setHeroVideo = (key, v) => {
    ensureHeroMedia();
    cfg.sections.hero.media.video = cfg.sections.hero.media.video || { src: '', autoplay: false, loop: false, muted: true, poster: '' };
    cfg.sections.hero.media.video[key] = v;
    setConfig(cfg);
  };

  // ======== خيارات الخطوط الجاهزة ========
  const FONT_OPTIONS = useMemo(() => ([
    // النظام
    { id: 'system', label: 'النظام (System)', cssFamily: 'system-ui, sans-serif', googleName: null, category: 'latin' },
    // لاتيني (Sans-Serif)
    { id: 'inter', label: 'Inter', cssFamily: 'Inter, system-ui, sans-serif', googleName: 'Inter', category: 'latin' },
    { id: 'roboto', label: 'Roboto', cssFamily: 'Roboto, system-ui, sans-serif', googleName: 'Roboto', category: 'latin' },
    { id: 'open-sans', label: 'Open Sans', cssFamily: '"Open Sans", system-ui, sans-serif', googleName: 'Open+Sans', category: 'latin' },
    { id: 'montserrat', label: 'Montserrat', cssFamily: 'Montserrat, system-ui, sans-serif', googleName: 'Montserrat', category: 'latin' },
    { id: 'poppins', label: 'Poppins', cssFamily: 'Poppins, system-ui, sans-serif', googleName: 'Poppins', category: 'latin' },
    { id: 'lato', label: 'Lato', cssFamily: 'Lato, system-ui, sans-serif', googleName: 'Lato', category: 'latin' },
    { id: 'source-sans-3', label: 'Source Sans 3', cssFamily: '"Source Sans 3", system-ui, sans-serif', googleName: 'Source+Sans+3', category: 'latin' },
    // لاتيني (Serif)
    { id: 'merriweather', label: 'Merriweather', cssFamily: 'Merriweather, serif', googleName: 'Merriweather', category: 'latin' },
    { id: 'playfair-display', label: 'Playfair Display', cssFamily: '"Playfair Display", serif', googleName: 'Playfair+Display', category: 'latin' },
    // عربي
    { id: 'cairo', label: 'Cairo (عربي)', cssFamily: 'Cairo, system-ui, sans-serif', googleName: 'Cairo', category: 'arabic' },
    { id: 'tajawal', label: 'Tajawal (عربي)', cssFamily: 'Tajawal, system-ui, sans-serif', googleName: 'Tajawal', category: 'arabic' },
    { id: 'almarai', label: 'Almarai (عربي)', cssFamily: 'Almarai, system-ui, sans-serif', googleName: 'Almarai', category: 'arabic' },
    { id: 'ibm-plex-arabic', label: 'IBM Plex Sans Arabic', cssFamily: '"IBM Plex Sans Arabic", system-ui, sans-serif', googleName: 'IBM+Plex+Sans+Arabic', category: 'arabic' },
    { id: 'noto-kufi-arabic', label: 'Noto Kufi Arabic', cssFamily: '"Noto Kufi Arabic", system-ui, sans-serif', googleName: 'Noto+Kufi+Arabic', category: 'arabic' }
  ]), []);

  const findOptionByFamily = useCallback((family) => FONT_OPTIONS.find(o => o.cssFamily === (family || '')) || FONT_OPTIONS.find(o => o.id === 'system'), [FONT_OPTIONS]);
  const selectedTextId = useMemo(() => (FONT_OPTIONS.find(o => o.cssFamily === (cfg?.theme?.typography?.fontFamily || ''))?.id || 'system'), [cfg, FONT_OPTIONS]);
  const selectedHeadingId = useMemo(() => (FONT_OPTIONS.find(o => o.cssFamily === (cfg?.theme?.typography?.headingFamily || ''))?.id || 'system'), [cfg, FONT_OPTIONS]);

  const buildFontUrl = useCallback((ids) => {
    const names = ids
      .map(id => FONT_OPTIONS.find(o => o.id === id)?.googleName)
      .filter(Boolean);
    if (!names.length) return '';
    const families = names.map(n => `family=${n}:wght@400;500;700`).join('&');
    return `https://fonts.googleapis.com/css2?${families}&display=swap`;
  }, [FONT_OPTIONS]);

  const onSelectFont = useCallback((type, id) => {
    const opt = FONT_OPTIONS.find(o => o.id === id);
    if (!opt) return;
    // عيّن العائلة المختارة
    cfg.theme.typography = cfg.theme.typography || { fontFamily: '', headingFamily: '', fontUrl: '' };
    cfg.theme.typography[type] = opt.cssFamily;
    // كوّن رابط التحميل بناءً على النص + العناوين
    const otherType = type === 'fontFamily' ? 'headingFamily' : 'fontFamily';
    const otherOpt = findOptionByFamily(cfg.theme.typography[otherType]);
    const url = buildFontUrl([id, otherOpt.id]);
    cfg.theme.typography.fontUrl = url;
    setConfig(cfg);
  }, [cfg, FONT_OPTIONS, buildFontUrl, findOptionByFamily, setConfig]);

  // ======== مديريات المحتوى (مع تأكيد عبر Modal) ========
  const safeDelete = (callback, message) => {
    setConfirmModal({ isOpen: true, onConfirm: () => { callback(); setConfirmModal({ isOpen: false }); }, message });
  };

  const ensureServiceDetails = (svc) => {
    svc.details = svc.details || {};
    svc.details.heroImage = typeof svc.details.heroImage === 'string' ? svc.details.heroImage : '';
    {
      const ld = svc.details.longDescription;
      const validLd = ld && typeof ld === 'object' && !Array.isArray(ld) && (('en' in ld) || ('ar' in ld));
      if (typeof ld === 'string') {
        svc.details.longDescription = { en: ld, ar: ld };
      } else {
        svc.details.longDescription = validLd ? ld : { en: '', ar: '' };
      }
    }
    svc.details.includes = Array.isArray(svc.details.includes) ? svc.details.includes : [];
    svc.details.includes = svc.details.includes.map((it) => {
      const title = it?.title;
      const validTitle = title && typeof title === 'object' && !Array.isArray(title) && (('en' in title) || ('ar' in title));
      return {
        ...it,
        image: typeof it?.image === 'string' ? it.image : '',
        title: validTitle ? title : { en: '', ar: '' },
      };
    });
  };

  const openServiceDetails = (i) => {
    const svc = cfg?.sections?.services?.items?.[i];
    if (!svc) return;
    ensureServiceDetails(svc);
    setConfig(cfg);
    setServiceDetailsModal({ isOpen: true, index: i });
  };
  const closeServiceDetails = () => setServiceDetailsModal({ isOpen: false, index: -1 });

  const updateActiveServiceDetails = (mutate) => {
    const i = serviceDetailsModal.index;
    const svc = cfg?.sections?.services?.items?.[i];
    if (!svc) return;
    ensureServiceDetails(svc);
    mutate(svc);
    setConfig(cfg);
  };

  const updateServiceHeroImage = (v) => updateActiveServiceDetails((svc) => {
    svc.details.heroImage = v;
  });

  const updateServiceLongDescription = (v) => updateActiveServiceDetails((svc) => {
    svc.details.longDescription[editLang] = v;
  });

  const addServiceInclude = () => updateActiveServiceDetails((svc) => {
    svc.details.includes.push({ title: { en: '', ar: '' }, image: '' });
  });
  const updateServiceIncludeTitle = (j, v) => updateActiveServiceDetails((svc) => {
    svc.details.includes[j].title[editLang] = v;
  });
  const updateServiceIncludeImage = (j, v) => updateActiveServiceDetails((svc) => {
    svc.details.includes[j].image = v;
  });
  const removeServiceInclude = (j) => updateActiveServiceDetails((svc) => {
    svc.details.includes.splice(j, 1);
  });

  const addService = () => {
    const nextIndex = cfg.sections.services.items.length;
    cfg.sections.services.items.push({
      title: { en: '', ar: '' },
      description: { en: '', ar: '' },
      icon: '•',
      image: '',
      details: {
        heroImage: '',
        longDescription: { en: '', ar: '' },
        includes: [],
      }
    });
    setConfig(cfg);
    setServiceDetailsModal({ isOpen: true, index: nextIndex });
  };
  const updateService = (i, field, v) => {
    const item = cfg.sections.services.items[i]
    if (item && typeof item[field] === 'object' && item[field] !== null) {
      item[field][editLang] = v
    } else {
      item[field] = v
    }
    setConfig(cfg)
  };
  const updateServiceIcon = (i, v) => { cfg.sections.services.items[i].icon = v; setConfig(cfg); };
  const removeService = (i) => {
    cfg.sections.services.items.splice(i, 1);
    setConfig(cfg);
  };
  const moveService = (i, dirMove) => {
    const j = dirMove === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= cfg.sections.services.items.length) return;
    [cfg.sections.services.items[i], cfg.sections.services.items[j]] = [cfg.sections.services.items[j], cfg.sections.services.items[i]];
    setConfig(cfg);
  };

  const addLink = () => {
    cfg.sections.contact.links.push({ label: { en: '', ar: '' }, url: '' });
    setConfig(cfg);
  };
  const updateLinkLabel = (i, v) => { cfg.sections.contact.links[i].label[editLang] = v; setConfig(cfg); };
  const updateLinkUrl = (i, v) => { cfg.sections.contact.links[i].url = v; setConfig(cfg); };
  const removeLink = (i) => {
    cfg.sections.contact.links.splice(i, 1);
    setConfig(cfg);
  };
  const moveLink = (i, dirMove) => {
    const j = dirMove === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= cfg.sections.contact.links.length) return;
    [cfg.sections.contact.links[i], cfg.sections.contact.links[j]] = [cfg.sections.contact.links[j], cfg.sections.contact.links[i]];
    setConfig(cfg);
  };

  // ======== إدارة المؤشرات (Metrics) ========
  const addMetric = () => { (cfg.sections.metrics.items = cfg.sections.metrics.items || []).push({ label: { en: '', ar: '' }, value: '' }); setConfig(cfg); };
  const updateMetricLabel = (i, v) => { cfg.sections.metrics.items[i].label[editLang] = v; setConfig(cfg); };
  const updateMetricValue = (i, v) => { cfg.sections.metrics.items[i].value = v; setConfig(cfg); };
  const removeMetric = (i) => { cfg.sections.metrics.items.splice(i, 1); setConfig(cfg); };

  // ======== إدارة المميزات (Highlights) ========
  const ensureHighlights = () => {
    cfg.sections.highlights = cfg.sections.highlights || { enabled: false, heading: { en: 'Highlights', ar: 'أبرز النقاط' }, colors: {}, items: [] };
  };
  const addHighlight = () => {
    ensureHighlights();
    cfg.sections.highlights.items = cfg.sections.highlights.items || []
    cfg.sections.highlights.items.push({ title: { en: '', ar: '' }, description: { en: '', ar: '' } })
    setConfig(cfg)
  }
  const updateHighlight = (i, field, v) => { ensureHighlights(); cfg.sections.highlights.items[i][field][editLang] = v; setConfig(cfg); };
  const removeHighlight = (i) => { ensureHighlights(); cfg.sections.highlights.items.splice(i, 1); setConfig(cfg); };

  // ======== إدارة مجالات العمل (Industries) ========
  const addIndustry = () => { (cfg.sections.industries.items = cfg.sections.industries.items || []).push({ title: { en: '', ar: '' }, tagline: { en: '', ar: '' } }); setConfig(cfg); };
  const updateIndustry = (i, field, v) => { cfg.sections.industries.items[i][field][editLang] = v; setConfig(cfg); };
  const removeIndustry = (i) => { cfg.sections.industries.items.splice(i, 1); setConfig(cfg); };

  // ======== إدارة فلاتر البورتفوليو ========
  const addFilter = () => { (cfg.sections.portfolio.filters = cfg.sections.portfolio.filters || []).push({ label: { en: '', ar: '' }, value: '' }); setConfig(cfg); };
  const updateFilterLabel = (i, v) => { cfg.sections.portfolio.filters[i].label[editLang] = v; setConfig(cfg); };
  const updateFilterValue = (i, v) => { cfg.sections.portfolio.filters[i].value = v; setConfig(cfg); };
  const removeFilter = (i) => { cfg.sections.portfolio.filters.splice(i, 1); setConfig(cfg); };

  // ======== إدارة عناصر البورتفوليو ========
  const addPortfolioItem = () => {
    (cfg.sections.portfolio.items = cfg.sections.portfolio.items || []).push({
      category: 'all',
      title: { en: '', ar: '' },
      description: { en: '', ar: '' },
      metrics: { clients: '', revenue: '', satisfaction: '', duration: '' }
    });
    setConfig(cfg);
  };
  const updateItemText = (i, field, v) => { cfg.sections.portfolio.items[i][field][editLang] = v; setConfig(cfg); };
  const updateItemCategory = (i, v) => { cfg.sections.portfolio.items[i].category = v; setConfig(cfg); };
  const updateItemMetric = (i, key, v) => { (cfg.sections.portfolio.items[i].metrics = cfg.sections.portfolio.items[i].metrics || {})[key] = v; setConfig(cfg); };
  const removeItem = (i) => { cfg.sections.portfolio.items.splice(i, 1); setConfig(cfg); };

  // ======== إدارة ملخص الشهادات (Testimonials Summary) ========
  const addSummary = () => { (cfg.sections.testimonials.summary = cfg.sections.testimonials.summary || []).push({ label: { en: '', ar: '' }, value: '' }); setConfig(cfg); };
  const updateSummaryLabel = (i, v) => { cfg.sections.testimonials.summary[i].label[editLang] = v; setConfig(cfg); };
  const updateSummaryValue = (i, v) => { cfg.sections.testimonials.summary[i].value = v; setConfig(cfg); };
  const removeSummary = (i) => { cfg.sections.testimonials.summary.splice(i, 1); setConfig(cfg); };

  // ======== إدارة آراء العملاء (Testimonials Items) ========
  const addTestimonial = () => { (cfg.sections.testimonials.items = cfg.sections.testimonials.items || []).push({ quote: { en: '', ar: '' }, name: '', role: { en: '', ar: '' }, company: { en: '', ar: '' }, country: { en: '', ar: '' }, project: { en: '', ar: '' } }); setConfig(cfg); };
  const updateTestimonialText = (i, key, v) => { cfg.sections.testimonials.items[i][key][editLang] = v; setConfig(cfg); };
  const updateTestimonialName = (i, v) => { cfg.sections.testimonials.items[i].name = v; setConfig(cfg); };
  const removeTestimonial = (i) => { cfg.sections.testimonials.items.splice(i, 1); setConfig(cfg); };

  // ======== إدارة الفريق (Team) ========
  const addMember = () => { (cfg.sections.team.members = cfg.sections.team.members || []).push({ name: { en: '', ar: '' }, role: { en: '', ar: '' }, bio: { en: '', ar: '' } }); setConfig(cfg); };
  const updateMemberText = (i, key, v) => { cfg.sections.team.members[i][key][editLang] = v; setConfig(cfg); };
  const removeMember = (i) => { cfg.sections.team.members.splice(i, 1); setConfig(cfg); };

  // ======== إدارة دعوة للإجراء (CTA) ========
  const setCTAButtonText = (v) => { cfg.sections.cta.cta.text[editLang] = v; setConfig(cfg); };
  const setCTAButtonLink = (v) => { cfg.sections.cta.cta.link = v; setConfig(cfg); };

  const addNavLink = () => {
    cfg.site.menu = cfg.site.menu || [];
    cfg.site.menu.push({ label: { en: '', ar: '' }, href: '#' });
    setConfig(cfg);
  };
  const updateNavLabel = (i, v) => { cfg.site.menu[i].label[editLang] = v; setConfig(cfg); };
  const updateNavHref = (i, v) => { cfg.site.menu[i].href = v; setConfig(cfg); };
  const removeNav = (i) => {
    cfg.site.menu.splice(i, 1);
    setConfig(cfg);
  };
  const moveNav = (i, dirMove) => {
    const j = dirMove === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= (cfg.site.menu || []).length) return;
    [cfg.site.menu[i], cfg.site.menu[j]] = [cfg.site.menu[j], cfg.site.menu[i]];
    setConfig(cfg);
  };

  const ensureFooter = () => {
    cfg.sections.footer = cfg.sections.footer || {
      enabled: true,
      colors: {},
      main: { columns: [] },
      bottom: { text: { en: '', ar: '' } },
    };
  };

  const setFooterIncludeContact = (v) => { ensureFooter(); cfg.sections.footer.includeContact = v; setConfig(cfg); };
  const addFooterColumn = () => { ensureFooter(); cfg.sections.footer.main.columns.push({ title: { en: '', ar: '' }, links: [] }); setConfig(cfg); };
  const updateFooterColumnTitle = (i, v) => { ensureFooter(); cfg.sections.footer.main.columns[i].title[editLang] = v; setConfig(cfg); };
  const removeFooterColumn = (i) => { ensureFooter(); cfg.sections.footer.main.columns.splice(i, 1); setConfig(cfg); };
  const moveFooterColumn = (i, dirMove) => {
    ensureFooter();
    const j = dirMove === 'up' ? i - 1 : i + 1;
    const arr = cfg.sections.footer.main.columns;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setConfig(cfg);
  };
  const addFooterLink = (colIdx) => {
    ensureFooter();
    const col = cfg.sections.footer.main.columns[colIdx];
    (col.links = col.links || []).push({ label: { en: '', ar: '' }, href: '#' });
    setConfig(cfg);
  };
  const updateFooterLinkLabel = (colIdx, linkIdx, v) => {
    ensureFooter();
    cfg.sections.footer.main.columns[colIdx].links[linkIdx].label[editLang] = v;
    setConfig(cfg);
  };
  const updateFooterLinkHref = (colIdx, linkIdx, v) => {
    ensureFooter();
    cfg.sections.footer.main.columns[colIdx].links[linkIdx].href = v;
    setConfig(cfg);
  };
  const removeFooterLink = (colIdx, linkIdx) => {
    ensureFooter();
    cfg.sections.footer.main.columns[colIdx].links.splice(linkIdx, 1);
    setConfig(cfg);
  };
  const moveFooterLink = (colIdx, linkIdx, dirMove) => {
    ensureFooter();
    const arr = cfg.sections.footer.main.columns[colIdx].links;
    const j = dirMove === 'up' ? linkIdx - 1 : linkIdx + 1;
    if (j < 0 || j >= arr.length) return;
    [arr[linkIdx], arr[j]] = [arr[j], arr[linkIdx]];
    setConfig(cfg);
  };
  const updateFooterBottomText = (v) => {
    ensureFooter();
    cfg.sections.footer.bottom = cfg.sections.footer.bottom || { text: { en: '', ar: '' } };
    cfg.sections.footer.bottom.text[editLang] = v;
    setConfig(cfg);
  };

  // Typography (global)
  const setTypography = (key, v) => {
    cfg.theme.typography = cfg.theme.typography || { fontFamily: '', headingFamily: '', fontUrl: '' };
    cfg.theme.typography[key] = v;
    setConfig(cfg);
  };

  // ======== حفظ ========
  const handleSaveAndRefresh = async () => {
    try {
      if (hasRemote) await saveConfigRemote(config);
      saveToBrowser();
      alert(hasRemote
        ? 'تم حفظ الإعدادات عالميًا (سيرفر) وبالمتصفح.'
        : 'تم الحفظ في المتصفح فقط.'
      );
    } catch (e) {
      console.error(e);
      const msg = String(e?.message || e || '')
      const isQuota = msg.includes('QuotaExceeded') || msg.toLowerCase().includes('quota')
      if (isQuota) {
        alert('سعة تخزين المتصفح ممتلئة (QuotaExceeded). السبب غالبًا صور Base64 كبيرة. يُفضّل تفعيل Cloudinary أو تنزيل الإعدادات كملف الآن.')
        try { downloadConfig(config, 'config-backup.json') } catch {}
      } else {
        alert('تعذّر الحفظ. تحقق من إعدادات السيرفر أو جرّب التنزيل كملف.')
      }
    } finally {
      refreshPreview();
    }
  };

  const handleRemoteSave = async () => {
    try {
      await saveConfigRemote(config);
      alert('تم حفظ الإعدادات على السيرفر بنجاح.');
    } catch (e) {
      console.error(e);
      alert('تعذّر الحفظ على السيرفر. تأكد من إعداد VITE_CONFIG_ENDPOINT.');
    } finally {
      refreshPreview();
    }
  };

  // ======== Live Preview ========
  useEffect(() => {
    try {
      localStorage.setItem('siteConfigOverrideEnabled', '1');
    } catch {}
  }, []);

  useEffect(() => {
    if (livePreview && config) {
      try {
        localStorage.setItem('siteConfig', JSON.stringify(config));
      } catch {}
    }
  }, [config, livePreview]);

  if (!cfg) {
    return (
      <div className="dashboard-loading" dir={dir}>
        <div className="spinner"></div>
        <p>جاري تحميل الإعدادات...</p>
      </div>
    );
  }

  // حمايات افتراضية: تأمين وجود الحقول الأساسية لتفادي تعطل العرض إذا كانت الإعدادات البعيدة ناقصة
  // ملاحظة: نعدّل النسخة المحلية (clone) فقط لضمان القراءة الآمنة، ويتم الحفظ عند تفاعل المستخدم
  try {
    cfg.site = cfg.site || {};
    cfg.site.title = cfg.site.title || { en: '', ar: '' };
    cfg.site.footerText = cfg.site.footerText || { en: '', ar: '' };
    cfg.site.menu = Array.isArray(cfg.site.menu) ? cfg.site.menu : [];
    cfg.site.logoNavbar = cfg.site.logoNavbar || '';
    cfg.site.logoFooter = cfg.site.logoFooter || '';
    cfg.site.favicon = cfg.site.favicon || '';
    cfg.site.tabTitle = cfg.site.tabTitle || { en: '', ar: '' };
    cfg.site.sectionsOrder = Array.isArray(cfg.site.sectionsOrder) ? cfg.site.sectionsOrder : [];
    cfg.sections = cfg.sections || {};
    cfg.sections.services = cfg.sections.services || { enabled: true, heading: { en: 'Our Services', ar: 'خدماتنا' }, items: [], colors: {} };
    cfg.sections.services.items = Array.isArray(cfg.sections.services.items) ? cfg.sections.services.items : [];
    cfg.sections.services.items = cfg.sections.services.items.map((svc) => {
      const title = svc?.title;
      const desc = svc?.description;
      const isTitleObj = title && typeof title === 'object' && !Array.isArray(title) && (('en' in title) || ('ar' in title));
      const isDescObj = desc && typeof desc === 'object' && !Array.isArray(desc) && (('en' in desc) || ('ar' in desc));
      return {
        ...svc,
        title: isTitleObj ? title : { en: '', ar: '' },
        description: isDescObj ? desc : { en: '', ar: '' },
        image: typeof svc?.image === 'string' ? svc.image : '',
        icon: typeof svc?.icon === 'string' ? svc.icon : (svc?.icon ?? '•'),
      };
    });
    cfg.pages = cfg.pages || {};
    cfg.theme = cfg.theme || {};
    cfg.theme.primary = cfg.theme.primary || '';
    cfg.theme.secondary = cfg.theme.secondary || '';
    cfg.theme.background = cfg.theme.background || '';
    cfg.theme.text = cfg.theme.text || '';
  } catch {}

  const activeLabel = (() => {
    if (active === 'theme') {
      return appearanceSub === 'fonts'
        ? (editLang === 'ar' ? 'خطوط الثيم' : 'Theme Fonts')
        : (editLang === 'ar' ? 'ألوان الثيم' : 'Theme Colors');
    }
    const label = labelsForLang?.[active];
    return label || (editLang === 'ar' ? 'لوحة التحكم' : 'Dashboard');
  })();

  return (
    <>
      <style>{`
        :root {
          --burgundy: #6D0019;
          --burgundy-light: #8B0025;
          --burgundy-dark: #4A0011;
          --black: #111;
          --dark-gray: #2d2d2d;
          --gray: #444;
          --light-gray: #f5f5f7;
          --border: #e0e0e0;
          --success: #2e7d32;
          --warning: #f57c00;
          --danger: #c62828;
          --shadow-sm: 0 2px 6px rgba(0,0,0,0.05);
          --shadow: 0 4px 12px rgba(0,0,0,0.08);
          --shadow-lg: 0 8px 24px rgba(0,0,0,0.12);
          --radius: 12px;
          --radius-sm: 8px;
          --transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: ${dir === 'rtl' ? "'Cairo', system-ui" : "'Inter', system-ui"}, sans-serif;
          background-color: #fafafa;
          color: var(--black);
          line-height: 1.5;
        }

        .dashboard {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }

        /* Sidebar */
        .dashboard-sidebar {
          width: 260px;
          background: white;
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          transition: var(--transition);
          z-index: 100;
          flex-shrink: 0;
        }

        .sidebar-header {
          padding: 20px 16px;
          border-bottom: 1px solid var(--border);
        }

        .dashboard-logo {
          font-size: 1.4rem;
          font-weight: 700;
          color: var(--burgundy);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .dashboard-logo::before {
          content: "⚙️";
          font-size: 1.3em;
        }

        .dashboard-nav {
          flex: 1;
          padding: 12px 0;
          overflow-y: auto;
        }

        .nav-section {
          padding: 4px 16px 8px;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--gray);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .nav-item {
          width: 100%;
          text-align: ${dir === 'rtl' ? 'right' : 'left'};
          padding: 12px 20px;
          border: none;
          background: none;
          color: var(--gray);
          font-size: 0.95rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          transition: var(--transition);
        }

        .nav-item:hover,
        .nav-item.active {
          color: var(--burgundy);
          background: rgba(109, 0, 25, 0.04);
        }

        .nav-item.active {
          font-weight: 600;
          position: relative;
        }

        .nav-item.active::before {
          content: '';
          position: absolute;
          ${dir === 'rtl' ? 'right' : 'left'}: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: var(--burgundy);
          border-radius: 0 ${dir === 'rtl' ? '4px 0 0 4px' : '0 4px 4px 0'};
        }

        .sidebar-actions {
          padding: 16px;
          border-top: 1px solid var(--border);
          background: #fcfcfc;
        }

        /* Mobile Menu Toggle */
        .mobile-menu-toggle {
          display: none;
          background: var(--burgundy);
          color: white;
          border: none;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          font-size: 1.2rem;
          position: fixed;
          ${dir === 'rtl' ? 'right' : 'left'}: 16px;
          top: 16px;
          z-index: 200;
          box-shadow: var(--shadow);
        }

        /* Main Content */
        .dashboard-main {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow-y: auto;
          min-height: 0; /* يسمح بالتمرير داخل حاوية flex */
          background: #fafafa;
        }

        .dashboard-topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid var(--border);
          flex-wrap: wrap;
          gap: 12px;
        }

        .topbar-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .badge {
          background: var(--burgundy);
          color: white;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .topbar-right {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        /* Panels */
        .panel {
          background: white;
          border-radius: var(--radius);
          box-shadow: var(--shadow-sm);
          margin: 16px 24px;
          padding: 24px;
          transition: var(--transition);
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }

        .panel-title {
          font-size: 1.3rem;
          font-weight: 700;
          color: var(--black);
        }

        .panel-desc {
          font-size: 0.9rem;
          color: var(--gray);
        }

        /* Forms */
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .form-group label {
          font-weight: 600;
          color: var(--black);
          font-size: 0.95rem;
        }

        input, select, button {
          font-family: inherit;
          font-size: 0.95rem;
        }

        input[type="text"],
        input[type="url"],
        input[type="number"],
        select {
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          background: white;
          transition: var(--transition);
        }

        input:focus,
        select:focus {
          outline: none;
          border-color: var(--burgundy);
          box-shadow: 0 0 0 3px rgba(109, 0, 25, 0.15);
        }

        input.input-error {
          border-color: var(--danger) !important;
        }

        .error-hint {
          color: var(--danger);
          font-size: 0.8rem;
          margin-top: 4px;
        }

        /* Buttons */
        .btn {
          padding: 10px 18px;
          border-radius: var(--radius-sm);
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition);
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .btn-primary {
          background: var(--burgundy);
          color: white;
        }

        .btn-primary:hover {
          background: var(--burgundy-dark);
          transform: translateY(-1px);
        }

        .btn-outline {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--gray);
        }

        .btn-outline:hover {
          border-color: var(--burgundy);
          color: var(--burgundy);
        }

        .btn-ghost {
          background: transparent;
          color: var(--gray);
        }

        .btn-ghost:hover {
          color: var(--burgundy);
        }

        .btn-danger {
          background: var(--danger);
          color: white;
        }

        .btn-danger:hover {
          opacity: 0.9;
        }

        .btn-upload {
          background: #f0f0f0;
          border: 1px dashed var(--border);
          padding: 8px 12px;
          border-radius: var(--radius-sm);
          font-size: 0.85rem;
        }

        /* Rows & Grids */
        .row-grid {
          display: grid;
          gap: 16px;
        }

        .row-2 { grid-template-columns: repeat(2, 1fr); }
        .row-3 { grid-template-columns: repeat(3, 1fr); }
        .row-4 { grid-template-columns: repeat(4, 1fr); }

        .row-cta {
          background: #fcfcfc;
          padding: 16px;
          border-radius: var(--radius-sm);
          border: 1px solid var(--border);
        }

        /* Color Inputs */
        .color-wrapper {
          display: flex;
          gap: 10px;
          align-items: center;
        }

        .color-text-input {
          flex: 1;
          padding: 8px 12px;
          font-family: monospace;
        }

        /* URL Inputs */
        .url-input-wrapper {
          display: flex;
          gap: 10px;
        }

        /* Preview */
        .preview-frame {
          width: 100%;
          height: 600px;
          border: none;
          border-radius: var(--radius-sm);
          background: white;
          box-shadow: var(--shadow);
        }

        /* Modals */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          animation: fadeIn 0.2s;
        }

        .modal-content {
          background: white;
          border-radius: var(--radius);
          width: 90%;
          max-width: 500px;
          box-shadow: var(--shadow-lg);
          animation: scaleIn 0.25s;
        }

        .modal-content.modal-service-details {
          max-width: 980px;
          max-height: 86vh;
          overflow: hidden;
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }

        .modal-header h3 {
          font-size: 1.2rem;
          font-weight: 700;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: var(--gray);
        }

        .modal-body {
          padding: 24px;
        }

        .modal-body.modal-body-scroll {
          padding: 18px 24px 22px;
          overflow: auto;
          max-height: calc(86vh - 140px);
        }

        .svc-modal-subtitle {
          font-size: 0.95rem;
          color: var(--gray);
          margin-bottom: 14px;
        }

        .svc-modal-section {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          background: #fff;
          margin-bottom: 14px;
        }

        .svc-modal-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 12px;
        }

        .svc-modal-section-title {
          font-weight: 700;
          color: var(--black);
        }

        .svc-modal-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .svc-modal-empty {
          padding: 14px;
          background: #f8f8f8;
          border: 1px dashed var(--border);
          border-radius: 12px;
          color: var(--gray);
          text-align: center;
        }

        .svc-modal-list {
          display: grid;
          gap: 10px;
        }

        .svc-include-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px;
          background: #fafafa;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: start;
        }

        .svc-include-fields {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 12px;
          align-items: end;
        }

        .svc-include-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-top: 28px;
        }

        .modal-body p {
          font-size: 1rem;
          line-height: 1.6;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }

        /* Loading */
        .dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          gap: 20px;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 4px solid rgba(109, 0, 25, 0.2);
          border-top: 4px solid var(--burgundy);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        /* Chips & Badges */
        .chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #f8f8f8;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          color: var(--gray);
        }

        /* Responsive */
        @media (max-width: 768px) {
          .dashboard {
            flex-direction: column;
          }

          .dashboard-sidebar {
            position: fixed;
            top: 0;
            ${dir === 'rtl' ? 'right' : 'left'}: ${mobileMenuOpen ? '0' : '-100%'};
            height: 100vh;
            width: 85%;
            max-width: 300px;
            box-shadow: var(--shadow-lg);
          }

          .mobile-menu-toggle {
            display: block;
          }

          .dashboard-main {
            margin-top: 64px;
          }

          .dashboard-topbar {
            padding: 14px 16px;
          }

          .form-grid,
          .row-2,
          .row-3,
          .row-4 {
            grid-template-columns: 1fr;
          }

          .panel {
            margin: 12px 12px;
            padding: 18px;
          }

          .svc-modal-grid-2 {
            grid-template-columns: 1fr;
          }

          .svc-include-card {
            grid-template-columns: 1fr;
          }

          .svc-include-fields {
            grid-template-columns: 1fr;
          }

          .svc-include-actions {
            padding-top: 0;
            justify-content: flex-start;
          }

          .preview-frame {
            height: 400px;
          }
        }

        /* Animations */
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Modal التأكيد */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false })}
        onConfirm={confirmModal.onConfirm}
        message={confirmModal.message}
      />

      {serviceDetailsModal.isOpen && (() => {
        const svc = cfg?.sections?.services?.items?.[serviceDetailsModal.index];
        if (!svc) return null;
        ensureServiceDetails(svc);
        return (
          <div className="modal-backdrop" onClick={closeServiceDetails}>
            <div className="modal-content modal-service-details" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>تفاصيل صفحة الخدمة</h3>
                <button className="modal-close" onClick={closeServiceDetails}>&times;</button>
              </div>
              <div className="modal-body modal-body-scroll">
                <div className="svc-modal-subtitle">{svc.title?.[editLang] || 'خدمة جديدة'}</div>

                <div className="svc-modal-section">
                  <div className="svc-modal-section-title">الصور</div>
                  <div className="svc-modal-grid-2">
                    <URLInput
                      label="الصورة الرئيسية (الهيرو)"
                      value={svc.details.heroImage || ''}
                      onChange={updateServiceHeroImage}
                      placeholder="رابط صورة كبيرة تظهر أعلى صفحة الخدمة"
                      required={false}
                    />
                    <URLInput
                      label="صورة بطاقة الخدمة (الهوم)"
                      value={svc.image || ''}
                      onChange={(v) => updateService(serviceDetailsModal.index, 'image', v)}
                      placeholder="رابط الصورة التي تظهر في قائمة الخدمات"
                      required={false}
                    />
                  </div>
                </div>

                <div className="svc-modal-section">
                  <div className="svc-modal-section-title">نبذة عن الخدمة</div>
                  <TextArea
                    label={editLang === 'ar' ? 'النص' : 'Text'}
                    value={svc.details.longDescription?.[editLang] || ''}
                    onChange={updateServiceLongDescription}
                    dir={dir}
                    placeholder={editLang === 'ar' ? 'اكتب نبذة تفصيلية عن الخدمة...' : 'Write a detailed service overview...'}
                    rows={6}
                    required={false}
                  />
                </div>

                <div className="svc-modal-section">
                  <div className="svc-modal-section-head">
                    <div className="svc-modal-section-title">خدماتنا تشمل</div>
                    <button className="btn btn-outline" onClick={addServiceInclude}>إضافة عنصر</button>
                  </div>

                  {(svc.details.includes || []).length === 0 ? (
                    <div className="svc-modal-empty">
                      {editLang === 'ar' ? 'لا توجد عناصر بعد.' : 'No items yet.'}
                    </div>
                  ) : (
                    <div className="svc-modal-list">
                      {(svc.details.includes || []).map((it, j) => (
                        <div key={j} className="svc-include-card">
                          <div className="svc-include-fields">
                            <URLInput
                              label={editLang === 'ar' ? 'الصورة' : 'Image'}
                              value={it.image || ''}
                              onChange={(v) => updateServiceIncludeImage(j, v)}
                              placeholder={editLang === 'ar' ? 'رابط الصورة' : 'Image URL'}
                              required={false}
                            />
                            <TextInput
                              label="العنوان"
                              value={it.title?.[editLang] || ''}
                              onChange={(v) => updateServiceIncludeTitle(j, v)}
                              dir={dir}
                              placeholder={editLang === 'ar' ? 'مثال: تنظيف السجاد بالبخار' : 'e.g., Steam carpet cleaning'}
                              required={false}
                            />
                          </div>
                          <div className="svc-include-actions">
                            <button className="btn btn-ghost" onClick={() => removeServiceInclude(j)}>حذف</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-primary" onClick={closeServiceDetails}>تم</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* زر فتح القائمة على الموبايل */}
      <button
        className="mobile-menu-toggle"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="فتح القائمة"
      >
        ☰
      </button>

      <div className="dashboard" dir={dir}>
        {/* Sidebar */}
        <aside className="dashboard-sidebar" style={{ left: mobileMenuOpen ? '0' : '-100%' }}>
          <div className="sidebar-header">
            <div className="dashboard-logo">لوحة التحكم</div>
          </div>
          <nav className="dashboard-nav">
            <div className="nav-section">{editLang === 'ar' ? 'التبويبات' : 'Tabs'}</div>
            <div style={{ display: 'grid', gridTemplateColumns: showPagesTab ? '1fr 1fr 1fr 1fr' : '1fr 1fr 1fr', gap: 8 }}>
              <button
                className={`nav-item ${activeGroup === 'appearance' ? 'active' : ''}`}
                onClick={() => { setActiveGroup('appearance'); setMobileMenuOpen(false); setActive('theme'); }}
              >
                {editLang === 'ar' ? 'المظهر' : 'Appearance'}
              </button>
              <button
                className={`nav-item ${activeGroup === 'main' ? 'active' : ''}`}
                onClick={() => { setActiveGroup('main'); setMobileMenuOpen(false); setActive(mainSub); }}
              >
                {editLang === 'ar' ? 'الأقسام الرئيسية' : 'Main Sections'}
              </button>
              {showPagesTab && (
                <button
                  className={`nav-item ${activeGroup === 'pages' ? 'active' : ''}`}
                  onClick={() => { setActiveGroup('pages'); setMobileMenuOpen(false); setActive(pagesSub); }}
                >
                  {editLang === 'ar' ? 'الصفحات' : 'Pages'}
                </button>
              )}
              <button
                className={`nav-item ${activeGroup === 'others' ? 'active' : ''}`}
                onClick={() => { setActiveGroup('others'); setMobileMenuOpen(false); }}
              >
                {editLang === 'ar' ? 'باقي الأقسام' : 'Other Sections'}
              </button>
            </div>

            {activeGroup === 'appearance' && (
              <>
                <div className="nav-section">{editLang === 'ar' ? 'المظهر' : 'Appearance'}</div>
                <button
                  className={`nav-item ${appearanceSub === 'colors' ? 'active' : ''}`}
                  onClick={() => { setAppearanceSub('colors'); setActive('theme'); setMobileMenuOpen(false); }}
                >
                  {editLang === 'ar' ? 'ألوان الثيم' : 'Theme Colors'}
                </button>
                <button
                  className={`nav-item ${appearanceSub === 'fonts' ? 'active' : ''}`}
                  onClick={() => { setAppearanceSub('fonts'); setActive('theme'); setMobileMenuOpen(false); }}
                >
                  {editLang === 'ar' ? 'خطوط الثيم' : 'Theme Fonts'}
                </button>
              </>
            )}

            {activeGroup === 'main' && (
              <>
                <div className="nav-section">{editLang === 'ar' ? 'الأقسام الرئيسية' : 'Main Sections'}</div>
                <button className={`nav-item ${active === 'general' ? 'active' : ''}`} onClick={() => { setMainSub('general'); setActive('general'); setMobileMenuOpen(false); }}>{labelsForLang?.general}</button>
                <button className={`nav-item ${active === 'branding' ? 'active' : ''}`} onClick={() => { setMainSub('branding'); setActive('branding'); setMobileMenuOpen(false); }}>{labelsForLang?.branding}</button>
                <button className={`nav-item ${active === 'navbar' ? 'active' : ''}`} onClick={() => { setMainSub('navbar'); setActive('navbar'); setMobileMenuOpen(false); }}>{editLang === 'ar' ? 'النافبار' : 'Navbar'}</button>
                <button className={`nav-item ${active === 'hero' ? 'active' : ''}`} onClick={() => { setMainSub('hero'); setActive('hero'); setMobileMenuOpen(false); }}>{editLang === 'ar' ? 'الهيرو' : 'Hero'}</button>
                <button className={`nav-item ${active === 'footer' ? 'active' : ''}`} onClick={() => { setMainSub('footer'); setActive('footer'); setMobileMenuOpen(false); }}>{editLang === 'ar' ? 'الفوتر' : 'Footer'}</button>
                <button className={`nav-item ${active === 'layout' ? 'active' : ''}`} onClick={() => { setMainSub('layout'); setActive('layout'); setMobileMenuOpen(false); }}>{editLang === 'ar' ? 'ترتيب الأقسام' : 'Sections Order'}</button>
              </>
            )}

            {showPagesTab && activeGroup === 'pages' && (
              <>
                <div className="nav-section">{editLang === 'ar' ? 'الصفحات' : 'Pages'}</div>
                {(() => {
                  const menu = Array.isArray(cfg?.site?.menu) ? cfg.site.menu : [];
                  const hrefs = new Set(menu.map((m) => String(m?.href || '')));
                  const pages = [
                    { href: '/about', key: 'page_about' },
                    { href: '/partners', key: 'page_partners' },
                    { href: '/media', key: 'page_media' },
                    { href: '/contact', key: 'page_contact' },
                  ].filter((p) => hrefs.has(p.href));
                  return pages.map((p) => (
                    <button
                      key={p.key}
                      className={`nav-item ${active === p.key ? 'active' : ''}`}
                      onClick={() => { setPagesSub(p.key); setActive(p.key); setMobileMenuOpen(false); }}
                    >
                      {labelsForLang?.[p.key] || p.key}
                    </button>
                  ));
                })()}
              </>
            )}

            {activeGroup === 'others' && (
              <>
                <div className="nav-section">{editLang === 'ar' ? 'باقي الأقسام' : 'Other Sections'}</div>
                {HOME_SECTIONS.filter((k) => k !== 'hero').concat(showCustomBlocks ? ['custom'] : []).map((key) => (
                  <button
                    key={key}
                    className={`nav-item ${active === key ? 'active' : ''}`}
                    onClick={() => { setActive(key); setMobileMenuOpen(false); }}
                  >
                    {labelsForLang?.[key] || key}
                  </button>
                ))}
              </>
            )}

            <div className="nav-section">{editLang === 'ar' ? 'البيانات' : 'Data'}</div>
            <button
              className={`nav-item ${active === 'data' ? 'active' : ''}`}
              onClick={() => { setActive('data'); setMobileMenuOpen(false); }}
            >
              {editLang === 'ar' ? 'حفظ / تصدير' : 'Save / Export'}
            </button>
          </nav>

          <div className="sidebar-actions">
            <button className="btn btn-primary" onClick={handleSaveAndRefresh}>حفظ</button>
            <button className="btn btn-outline" onClick={() => downloadConfig(config)}>تنزيل JSON</button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main">
          <div className="dashboard-topbar">
            <div className="topbar-left">
              <span className="badge">القسم: {activeLabel}</span>
            </div>
            <div className="topbar-right">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span>تحرير بـ:</span>
                <select value={editLang} onChange={(e) => setEditLang(e.target.value)} className="btn-outline">
                  <option value="ar">العربية</option>
                  <option value="en">الإنجليزية</option>
                </select>
              </div>
              <button className="btn btn-outline" onClick={() => { window.location.hash = '#'; }}>
                عرض الموقع
              </button>
              <button className="btn btn-primary" onClick={handleSaveAndRefresh}>حفظ</button>
              <label className="chip">
                <input
                  type="checkbox"
                  checked={livePreview}
                  onChange={(e) => setLivePreview(e.target.checked)}
                />
                معاينة فورية
              </label>
              <button
                className="btn btn-ghost"
                onClick={() => setShowPreview(v => !v)}
              >
                {showPreview ? 'إخفاء المعاينة' : 'إظهار المعاينة'}
              </button>
            </div>
          </div>

          {/* General Settings Tab */}
          {active === 'general' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">الإعدادات العامة</div>
              </div>
              <div className="form-grid">
                <TextInput
                  label="عنوان الموقع"
                  value={cfg.site.title[editLang]}
                  onChange={(v) => setSiteText('title', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'مثال: شركة السمارت' : 'e.g., SmartCo'}
                  required
                />
                <TextArea
                  label="نص الفوتر"
                  value={cfg.site.footerText[editLang]}
                  onChange={(v) => setSiteText('footerText', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? '© جميع الحقوق محفوظة' : '© All rights reserved'}
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Branding Tab */}
          {active === 'branding' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">العلامة التجارية</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <URLInput
                  label="شعار النافبار"
                  value={cfg.site.logoNavbar || ''}
                  onChange={(v) => { cfg.site.logoNavbar = v; setConfig(cfg); }}
                  placeholder={editLang === 'ar' ? 'رابط صورة الشعار في الهيدر' : 'Navbar logo image URL'}
                />
                <URLInput
                  label="شعار الفوتر"
                  value={cfg.site.logoFooter || ''}
                  onChange={(v) => { cfg.site.logoFooter = v; setConfig(cfg); }}
                  placeholder={editLang === 'ar' ? 'رابط صورة الشعار في الفوتر' : 'Footer logo image URL'}
                />
                <URLInput
                  label="الصورة (فافيكون)"
                  value={cfg.site.favicon || ''}
                  onChange={(v) => { cfg.site.favicon = v; setConfig(cfg); }}
                  placeholder={editLang === 'ar' ? '/favicon.png أو رابط مباشر' : '/favicon.png or full URL'}
                />
                <TextInput
                  label="عنوان التاب"
                  value={(cfg.site.tabTitle?.[editLang] || '')}
                  onChange={(v) => setSiteText('tabTitle', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'نص يظهر بجوار الفافيكون' : 'Text shown beside favicon'}
                  required
                />
              </div>
            </div>
          )}

          {/* Navbar Tab */}
          {active === 'navbar' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">{editLang === 'ar' ? 'النافبار' : 'Navbar'} <span className="badge">{(cfg.site.menu || []).length}</span></div>
                <button className="btn btn-outline" onClick={addNavLink}>إضافة رابط</button>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(cfg.site.menu || []).map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                    <TextInput
                      label="الاسم"
                      value={l.label?.[editLang] || ''}
                      onChange={(v) => updateNavLabel(i, v)}
                      dir={dir}
                      placeholder={editLang === 'ar' ? 'اسم الرابط' : 'Link label'}
                    />
                    <URLInput
                      label="الرابط"
                      value={l.href || ''}
                      onChange={(v) => updateNavHref(i, v)}
                      placeholder="#about أو https://..."
                      required
                    />
                    <button className="btn btn-outline" onClick={() => moveNav(i, 'up')}>↑</button>
                    <button className="btn btn-outline" onClick={() => moveNav(i, 'down')}>↓</button>
                    <button
                      className="btn btn-ghost"
                      onClick={() => safeDelete(() => removeNav(i), 'هل أنت متأكد من حذف هذا الرابط؟')}
                    >
                      حذف
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theme Panel */}
          {active === 'theme' && (
            <>
              {appearanceSub === 'colors' && (
                <>
                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-title">{editLang === 'ar' ? 'ألوان الثيم' : 'Theme Colors'}</div>
                      <div className="panel-desc">{editLang === 'ar' ? 'ألوان عامة تؤثر على الموقع' : 'Global colors affecting the site'}</div>
                    </div>
                    <div className="row-grid row-2">
                      <ColorInput label={editLang === 'ar' ? 'الأساسي' : 'Primary'} value={cfg.theme.primary} onChange={(v) => setTheme('primary', v)} required />
                      <ColorInput label={editLang === 'ar' ? 'الثانوي' : 'Secondary'} value={cfg.theme.secondary} onChange={(v) => setTheme('secondary', v)} />
                      <ColorInput label={editLang === 'ar' ? 'الخلفية' : 'Background'} value={cfg.theme.background} onChange={(v) => setTheme('background', v)} />
                      <ColorInput label={editLang === 'ar' ? 'النص' : 'Text'} value={cfg.theme.text} onChange={(v) => setTheme('text', v)} required />
                    </div>
                  </div>

                  <div className="panel">
                    <div className="panel-header">
                      <div className="panel-title">{editLang === 'ar' ? 'ألوان الهيدر والفوتر' : 'Header & Footer Colors'}</div>
                      <div className="panel-desc">{editLang === 'ar' ? 'تحكم مستقل في ألوان النافبار والفوتر' : 'Independent control for navbar and footer colors'}</div>
                    </div>
                    <div className="row-grid row-2" style={{ marginTop: 16 }}>
                      <ColorInput label={editLang === 'ar' ? 'خلفية الهيدر' : 'Navbar Background'} value={(cfg.sections.navbar?.colors || {}).background || ''} onChange={(v) => setNavbarColor('background', v)} />
                      <ColorInput label={editLang === 'ar' ? 'نص الهيدر' : 'Navbar Text'} value={(cfg.sections.navbar?.colors || {}).text || ''} onChange={(v) => setNavbarColor('text', v)} required />
                      <ColorInput label={editLang === 'ar' ? 'خلفية الفوتر' : 'Footer Background'} value={(cfg.sections.footer?.colors || {}).background || ''} onChange={(v) => setFooterColor('background', v)} />
                      <ColorInput label={editLang === 'ar' ? 'نص الفوتر' : 'Footer Text'} value={(cfg.sections.footer?.colors || {}).text || ''} onChange={(v) => setFooterColor('text', v)} required />
                    </div>
                  </div>
                </>
              )}

              {appearanceSub === 'fonts' && (
                <div className="panel">
                  <div className="panel-header">
                    <div className="panel-title">{editLang === 'ar' ? 'خطوط الثيم' : 'Theme Fonts'}</div>
                    <div className="panel-desc">{editLang === 'ar' ? 'تحكم احترافي في نوع الخط للنص والعناوين، مع إمكانية تحميل خط خارجي' : 'Advanced control over text and heading fonts; optional external CSS font URL'}</div>
                  </div>
                  <div className="row-grid row-2" style={{ marginTop: 8 }}>
                    <div className="form-group">
                      <label>{editLang === 'ar' ? 'اختر خط النص' : 'Select text font'}</label>
                      <select className="input" value={selectedTextId} onChange={(e) => onSelectFont('fontFamily', e.target.value)}>
                        <optgroup label={editLang === 'ar' ? 'خطوط عربية' : 'Arabic fonts'}>
                          {FONT_OPTIONS.filter(o => o.category === 'arabic').map(o => (
                            <option key={`text-${o.id}`} value={o.id}>{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label={editLang === 'ar' ? 'خطوط لاتينية' : 'Latin fonts'}>
                          {FONT_OPTIONS.filter(o => o.category === 'latin').map(o => (
                            <option key={`text-${o.id}`} value={o.id}>{o.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>{editLang === 'ar' ? 'اختر خط العناوين' : 'Select heading font'}</label>
                      <select className="input" value={selectedHeadingId} onChange={(e) => onSelectFont('headingFamily', e.target.value)}>
                        <optgroup label={editLang === 'ar' ? 'خطوط عربية' : 'Arabic fonts'}>
                          {FONT_OPTIONS.filter(o => o.category === 'arabic').map(o => (
                            <option key={`heading-${o.id}`} value={o.id}>{o.label}</option>
                          ))}
                        </optgroup>
                        <optgroup label={editLang === 'ar' ? 'خطوط لاتينية' : 'Latin fonts'}>
                          {FONT_OPTIONS.filter(o => o.category === 'latin').map(o => (
                            <option key={`heading-${o.id}`} value={o.id}>{o.label}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>
                  </div>
                  <div className="form-grid">
                    <TextInput
                      label={editLang === 'ar' ? 'خط النص' : 'Text font family'}
                      value={(cfg.theme.typography?.fontFamily || '')}
                      onChange={(v) => setTypography('fontFamily', v)}
                      dir={dir}
                      placeholder={editLang === 'ar' ? 'مثال: Cairo, system-ui' : 'e.g., Inter, system-ui'}
                    />
                    <TextInput
                      label={editLang === 'ar' ? 'خط العناوين' : 'Heading font family'}
                      value={(cfg.theme.typography?.headingFamily || '')}
                      onChange={(v) => setTypography('headingFamily', v)}
                      dir={dir}
                      placeholder={editLang === 'ar' ? 'مثال: Cairo, serif' : 'e.g., Inter, serif'}
                    />
                    <URLInput
                      label={editLang === 'ar' ? 'رابط CSS للخط (اختياري)' : 'Font CSS URL (optional)'}
                      value={(cfg.theme.typography?.fontUrl || '')}
                      onChange={(v) => setTypography('fontUrl', v)}
                      placeholder={editLang === 'ar' ? 'https://fonts.googleapis.com/css2?...' : 'https://fonts.googleapis.com/css2?...'}
                      dir="ltr"
                    />
                  </div>
                  <div className="panel-desc" style={{ marginTop: 8 }}>
                    {editLang === 'ar'
                      ? 'اكتب أسماء العائلات مفصولة بفواصل. في حال إضافة رابط CSS سيتم تحميل الخط تلقائيًا.'
                      : 'Write font families comma-separated. If a CSS URL is provided, the font will be loaded automatically.'}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Hero Panel */}
          {active === 'hero' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">الهيرو</div>
                <div className="panel-desc">العناوين، الصورة الخلفية، وألوان CTA</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={cfg.sections.hero.enabled}
                  onChange={(e) => setSectionEnabled('hero', e.target.checked)}
                  id="hero-enabled"
                />
                <label htmlFor="hero-enabled" className="panel-desc">مفعّل</label>
              </div>

              <div className="form-grid">
                <TextInput
                  label="العنوان"
                  value={cfg.sections.hero.heading[editLang]}
                  onChange={(v) => setSectionText('hero', 'heading', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'مثال: نَبني حلول رقمية' : 'e.g., We build digital solutions'}
                  required
                />
                <TextArea
                  label="العنوان الفرعي"
                  value={cfg.sections.hero.subheading[editLang]}
                  onChange={(v) => setSectionText('hero', 'subheading', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'وصف مختصر جذاب' : 'Short catchy subheading'}
                  rows={2}
                />
                <TextInput
                  label="نص الزر"
                  value={cfg.sections.hero.cta.text[editLang]}
                  onChange={(v) => setHeroCTA('text', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'ابدأ الآن' : 'Get Started'}
                  required
                />
                <URLInput
                  label="رابط الزر"
                  value={cfg.sections.hero.cta.link}
                  onChange={(v) => { cfg.sections.hero.cta.link = v; setConfig(cfg); }}
                  placeholder={editLang === 'ar' ? 'https://...' : 'https://...'}
                  required
                />
                {(() => {
                  const mediaType = cfg.sections.hero.media?.type || (cfg.sections.hero.backgroundImage ? 'image' : 'image')
                  const slides = cfg.sections.hero.media?.slides || []
                  return (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div className="panel-header" style={{ marginTop: 8 }}>
                        <div className="panel-title">وسائط الهيرو</div>
                        <div className="panel-desc">اختر صورة واحدة، كاروسيل، أو فيديو</div>
                      </div>
                      <div className="form-grid" style={{ marginTop: 8 }}>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                          <label>نوع الوسائط</label>
                          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="radio" name="hero-media-type" checked={mediaType === 'image'} onChange={() => setHeroMediaType('image')} /> صورة واحدة
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="radio" name="hero-media-type" checked={mediaType === 'carousel'} onChange={() => setHeroMediaType('carousel')} /> كاروسيل صور
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="radio" name="hero-media-type" checked={mediaType === 'video'} onChange={() => setHeroMediaType('video')} /> فيديو
                            </label>
                          </div>
                        </div>

                        {mediaType === 'image' && (
                          <URLInput
                            label={editLang === 'ar' ? 'صورة الخلفية' : 'Background image'}
                            value={(cfg.sections.hero.media?.image || cfg.sections.hero.backgroundImage || '')}
                            onChange={(v) => setHeroImage(v)}
                            placeholder={editLang === 'ar' ? 'رابط الصورة أو ارفع ملفًا' : 'Background image URL or upload'}
                          />
                        )}

                        {mediaType === 'carousel' && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div className="form-grid">
                              <div className="form-group">
                                <label>وضع المحتوى</label>
                                <select
                                  value={cfg.sections.hero.overlayMode || 'global'}
                                  onChange={(e) => setHeroOverlayMode(e.target.value)}
                                  className="btn-outline"
                                >
                                  <option value="global">ثابت عالمي (من العنوان والزر أعلاه)</option>
                                  <option value="per-slide">مخصص لكل صورة</option>
                                </select>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button className="btn btn-outline" onClick={addHeroSlide}>إضافة صورة</button>
                              </div>
                            </div>

                            <div className="row-grid" style={{ marginTop: 12 }}>
                              {slides.map((s, i) => (
                                <div key={i} className="panel" style={{ padding: 12 }}>
                                  <div className="panel-header">
                                    <div className="panel-title">صورة {i + 1}</div>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                      <button className="btn btn-outline" onClick={() => moveHeroSlide(i, 'up')}>↑</button>
                                      <button className="btn btn-outline" onClick={() => moveHeroSlide(i, 'down')}>↓</button>
                                      <button className="btn btn-ghost" onClick={() => safeDelete(() => removeHeroSlide(i), 'هل أنت متأكد من حذف هذه الصورة؟')}>حذف</button>
                                    </div>
                                  </div>
                                  <div className="form-grid">
                                    <URLInput
                                      label={editLang === 'ar' ? 'رابط الصورة' : 'Image URL'}
                                      value={s.src || ''}
                                      onChange={(v) => updateHeroSlideSrc(i, v)}
                                      placeholder={editLang === 'ar' ? 'رابط أو رفع' : 'URL or upload'}
                                    />
                                    { (cfg.sections.hero.overlayMode || 'global') === 'per-slide' && (
                                      <>
                                        <TextInput
                                          label={editLang === 'ar' ? 'نص الصورة' : 'Slide text'}
                                          value={(s.overlay?.text?.[editLang] || '')}
                                          onChange={(v) => updateHeroSlideOverlayText(i, v)}
                                          dir={dir}
                                          placeholder={editLang === 'ar' ? 'نص مختصر للصورة' : 'Short text for this slide'}
                                        />
                                        <TextInput
                                          label={editLang === 'ar' ? 'نص الزر (اختياري)' : 'Button text (optional)'}
                                          value={(s.overlay?.button?.text?.[editLang] || '')}
                                          onChange={(v) => updateHeroSlideButtonText(i, v)}
                                          dir={dir}
                                          placeholder={editLang === 'ar' ? 'مثال: تعرّف أكثر' : 'e.g., Learn more'}
                                        />
                                        <URLInput
                                          label={editLang === 'ar' ? 'رابط الزر (اختياري)' : 'Button link (optional)'}
                                          value={(s.overlay?.button?.link || '')}
                                          onChange={(v) => updateHeroSlideButtonLink(i, v)}
                                          placeholder={editLang === 'ar' ? '# أو https://...' : '# or https://...'}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {mediaType === 'video' && (
                          <div style={{ gridColumn: '1 / -1' }}>
                            <div className="form-grid">
                              <URLInput
                                label={editLang === 'ar' ? 'رابط الفيديو' : 'Video URL'}
                                value={(cfg.sections.hero.media?.video?.src || '')}
                                onChange={(v) => setHeroVideo('src', v)}
                                placeholder="https://..."
                                accept="video/*"
                              />
                              <URLInput
                                label={editLang === 'ar' ? 'صورة الغلاف (Poster)' : 'Poster image'}
                                value={(cfg.sections.hero.media?.video?.poster || '')}
                                onChange={(v) => setHeroVideo('poster', v)}
                                placeholder={editLang === 'ar' ? 'اختياري' : 'Optional'}
                              />
                            </div>
                            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={!!(cfg.sections.hero.media?.video?.autoplay)} onChange={(e) => setHeroVideo('autoplay', e.target.checked)} /> تشغيل تلقائي
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={!!(cfg.sections.hero.media?.video?.loop)} onChange={(e) => setHeroVideo('loop', e.target.checked)} /> تكرار
                              </label>
                              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input type="checkbox" checked={!!(cfg.sections.hero.media?.video?.muted ?? true)} onChange={(e) => setHeroVideo('muted', e.target.checked)} /> صامت
                              </label>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-3" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.hero.colors.primary || ''} onChange={(v) => setSectionColor('hero', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.hero.colors.secondary || ''} onChange={(v) => setSectionColor('hero', 'secondary', v)} />
                <ColorInput label="خلفية النص" value={cfg.sections.hero.colors.background || ''} onChange={(v) => setSectionColor('hero', 'background', v)} />
                <ColorInput label="لون النص" value={cfg.sections.hero.colors.text || ''} onChange={(v) => setSectionColor('hero', 'text', v)} required />
                <ColorInput label="خلفية الزر" value={cfg.sections.hero.colors.ctaBg || ''} onChange={(v) => setSectionColor('hero', 'ctaBg', v)} required />
                <ColorInput label="نص الزر" value={cfg.sections.hero.colors.ctaText || ''} onChange={(v) => setSectionColor('hero', 'ctaText', v)} required />
              </div>
            </div>
          )}

          {/* About Panel */}
          {active === 'about' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">من نحن</div>
                <div className="panel-desc">العنوان، الفقرات، والصورة</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={cfg.sections.about.enabled}
                  onChange={(e) => setSectionEnabled('about', e.target.checked)}
                  id="about-enabled"
                />
                <label htmlFor="about-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput
                label="العنوان"
                value={cfg.sections.about.heading[editLang]}
                onChange={(v) => setSectionText('about', 'heading', v)}
                dir={dir}
                placeholder={editLang === 'ar' ? 'من نحن' : 'About Us'}
                required
              />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الفقرات</div>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(cfg.sections.about.paragraphs || []).map((p, i) => (
                  <TextArea
                    key={i}
                    label={`فقرة ${i + 1}`}
                    value={p[editLang] || ''}
                    onChange={(v) => { cfg.sections.about.paragraphs[i][editLang] = v; setConfig(cfg); }}
                    dir={dir}
                    placeholder={editLang === 'ar' ? 'نص الفقرة...' : 'Paragraph text...'}
                    required
                    rows={3}
                  />
                ))}
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الصورة</div>
              </div>
              <URLInput
                label="رابط الصورة"
                value={cfg.sections.about.image || ''}
                onChange={(v) => setAboutImage(v)}
                placeholder={editLang === 'ar' ? 'رابط صورة أو ارفع ملفًا' : 'Image URL or upload'}
              />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.about.colors.primary || ''} onChange={(v) => setSectionColor('about', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.about.colors.secondary || ''} onChange={(v) => setSectionColor('about', 'secondary', v)} />
                <ColorInput label="الخلفية" value={cfg.sections.about.colors.background || ''} onChange={(v) => setSectionColor('about', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.about.colors?.body || cfg.sections.about.colors?.text || '')} onChange={(v) => setSectionColor('about', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.about.colors?.heading || '')} onChange={(v) => setSectionColor('about', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Services Panel */}
          {active === 'services' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  الخدمات <span className="badge">{cfg.sections.services.items.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="text"
                    dir={dir}
                    placeholder={editLang === 'ar' ? 'بحث...' : 'Search...'}
                    value={svcFilter}
                    onChange={(e) => setSvcFilter(e.target.value)}
                    className="btn-outline"
                    style={{ padding: '8px 12px', width: '180px' }}
                  />
                  <button className="btn btn-outline" onClick={addService}>إضافة خدمة</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={cfg.sections.services.enabled}
                  onChange={(e) => setSectionEnabled('services', e.target.checked)}
                  id="services-enabled"
                />
                <label htmlFor="services-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput
                label="العنوان"
                value={cfg.sections.services.heading[editLang]}
                onChange={(v) => setSectionText('services', 'heading', v)}
                dir={dir}
                placeholder={editLang === 'ar' ? 'خدماتنا' : 'Our Services'}
                required
              />

              <div className="row-grid" style={{ marginTop: 20 }}>
                {(() => {
                  const filtered = cfg.sections.services.items
                    .map((svc, i) => ({ svc, i }))
                    .filter(({ svc }) => {
                      const q = svcFilter.trim().toLowerCase();
                      if (!q) return true;
                      return (
                        (svc.title[editLang] || '').toLowerCase().includes(q) ||
                        (svc.description[editLang] || '').toLowerCase().includes(q) ||
                        (svc.icon || '').toLowerCase().includes(q)
                      );
                    });
                  const itemsIds = filtered.map(({ i }) => i);
                  return (
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIndex = active.id;
                        const newIndex = over.id;
                        const newItems = arrayMove(cfg.sections.services.items, oldIndex, newIndex);
                        cfg.sections.services.items = newItems;
                        setConfig(cfg);
                      }}
                    >
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {filtered.map(({ svc, i }) => (
                          <ServiceRowSortable
                            key={i}
                            id={i}
                            svc={svc}
                            i={i}
                            editLang={editLang}
                            dir={dir}
                            updateService={updateService}
                            openServiceDetails={openServiceDetails}
                            safeDelete={safeDelete}
                            removeService={removeService}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.services.colors.primary || ''} onChange={(v) => setSectionColor('services', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.services.colors.secondary || ''} onChange={(v) => setSectionColor('services', 'secondary', v)} />
                <ColorInput label="الخلفية" value={cfg.sections.services.colors.background || ''} onChange={(v) => setSectionColor('services', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.services.colors?.body || cfg.sections.services.colors?.text || '')} onChange={(v) => setSectionColor('services', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.services.colors?.heading || '')} onChange={(v) => setSectionColor('services', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Metrics Panel */}
          {active === 'metrics' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  المؤشرات <span className="badge">{(cfg.sections.metrics.items || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={addMetric}>إضافة مؤشر</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.metrics.enabled} onChange={(e) => setSectionEnabled('metrics', e.target.checked)} id="metrics-enabled" />
                <label htmlFor="metrics-enabled" className="panel-desc">مفعّل</label>
              </div>

              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.metrics.items || []).map((m, i) => ({ m, i }));
                  const itemsIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.metrics.items, oldIndex, newIndex);
                      cfg.sections.metrics.items = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ m, i }) => (
                          <MetricRowSortable key={i} id={i} m={m} i={i} editLang={editLang} dir={dir} updateMetricLabel={updateMetricLabel} updateMetricValue={updateMetricValue} safeDelete={safeDelete} removeMetric={removeMetric} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.metrics.colors.primary || ''} onChange={(v) => setSectionColor('metrics', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.metrics.colors.secondary || ''} onChange={(v) => setSectionColor('metrics', 'secondary', v)} />
                <ColorInput label="الخلفية" value={cfg.sections.metrics.colors.background || ''} onChange={(v) => setSectionColor('metrics', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.metrics.colors?.body || cfg.sections.metrics.colors?.text || '')} onChange={(v) => setSectionColor('metrics', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.metrics.colors?.heading || '')} onChange={(v) => setSectionColor('metrics', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Highlights Panel */}
          {active === 'highlights' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  أبرز النقاط <span className="badge">{(cfg.sections.highlights?.items || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={addHighlight}>إضافة ميزة</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={!!(cfg.sections.highlights && cfg.sections.highlights.enabled)} onChange={(e) => setSectionEnabled('highlights', e.target.checked)} id="highlights-enabled" />
                <label htmlFor="highlights-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput
                label="العنوان"
                value={(cfg.sections.highlights?.heading?.[editLang]) || ''}
                onChange={(v) => setSectionText('highlights', 'heading', v)}
                dir={dir}
                placeholder={editLang === 'ar' ? 'أبرز النقاط' : 'Highlights'}
                required
              />

              <div className="row-grid" style={{ marginTop: 20 }}>
                {(() => {
                  const items = (cfg.sections.highlights?.items || [])
                  const itemsIds = items.map((_, i) => i)
                  return (
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIndex = active.id;
                        const newIndex = over.id;
                        const srcItems = (cfg.sections.highlights?.items || [])
                        const newItems = arrayMove(srcItems, oldIndex, newIndex);
                        ensureHighlights();
                        cfg.sections.highlights.items = newItems;
                        setConfig(cfg);
                      }}
                    >
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map((item, i) => (
                          <HighlightRowSortable
                            key={i}
                            id={i}
                            item={item}
                            i={i}
                            editLang={editLang}
                            dir={dir}
                            updateHighlight={updateHighlight}
                            safeDelete={safeDelete}
                            removeHighlight={removeHighlight}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.highlights?.colors?.primary || ''} onChange={(v) => setSectionColor('highlights', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.highlights?.colors?.secondary || ''} onChange={(v) => setSectionColor('highlights', 'secondary', v)} />
                <ColorInput label="الخلفية" value={cfg.sections.highlights?.colors?.background || ''} onChange={(v) => setSectionColor('highlights', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.highlights?.colors?.body || cfg.sections.highlights?.colors?.text || '')} onChange={(v) => setSectionColor('highlights', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.highlights?.colors?.heading || '')} onChange={(v) => setSectionColor('highlights', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Industries Panel */}
          {active === 'industries' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  مجالات العمل <span className="badge">{(cfg.sections.industries.items || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={addIndustry}>إضافة مجال</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.industries.enabled} onChange={(e) => setSectionEnabled('industries', e.target.checked)} id="industries-enabled" />
                <label htmlFor="industries-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput label="العنوان" value={cfg.sections.industries.heading[editLang]} onChange={(v) => setSectionText('industries', 'heading', v)} dir={dir} placeholder={editLang === 'ar' ? 'مجالات عملنا' : 'Our Work Areas'} required />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={(cfg.sections.industries.colors?.primary || '')} onChange={(v) => setSectionColor('industries', 'primary', v)} />
                <ColorInput label="الثانوي" value={(cfg.sections.industries.colors?.secondary || '')} onChange={(v) => setSectionColor('industries', 'secondary', v)} />
                <ColorInput label="الخلفية" value={(cfg.sections.industries.colors?.background || '')} onChange={(v) => setSectionColor('industries', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.industries.colors?.body || cfg.sections.industries.colors?.text || '')} onChange={(v) => setSectionColor('industries', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.industries.colors?.heading || '')} onChange={(v) => setSectionColor('industries', 'heading', v)} />
              </div>

              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.industries.items || []).map((item, i) => ({ item, i }));
                  const itemsIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.industries.items, oldIndex, newIndex);
                      cfg.sections.industries.items = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ item, i }) => (
                          <IndustryRowSortable key={i} id={i} item={item} i={i} editLang={editLang} dir={dir} updateIndustry={updateIndustry} safeDelete={safeDelete} removeIndustry={removeIndustry} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Portfolio Panel */}
          {active === 'portfolio' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  سابقة الأعمال <span className="badge">{(cfg.sections.portfolio.items || []).length}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.portfolio.enabled} onChange={(e) => setSectionEnabled('portfolio', e.target.checked)} id="portfolio-enabled" />
                <label htmlFor="portfolio-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput label="العنوان" value={cfg.sections.portfolio.heading[editLang]} onChange={(v) => setSectionText('portfolio', 'heading', v)} dir={dir} placeholder={editLang === 'ar' ? 'سابقة الأعمال' : 'Portfolio'} required />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={(cfg.sections.portfolio.colors?.primary || '')} onChange={(v) => setSectionColor('portfolio', 'primary', v)} />
                <ColorInput label="الثانوي" value={(cfg.sections.portfolio.colors?.secondary || '')} onChange={(v) => setSectionColor('portfolio', 'secondary', v)} />
                <ColorInput label="الخلفية" value={(cfg.sections.portfolio.colors?.background || '')} onChange={(v) => setSectionColor('portfolio', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.portfolio.colors?.body || cfg.sections.portfolio.colors?.text || '')} onChange={(v) => setSectionColor('portfolio', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.portfolio.colors?.heading || '')} onChange={(v) => setSectionColor('portfolio', 'heading', v)} />
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الفلاتر <span className="badge">{(cfg.sections.portfolio.filters || []).length}</span></div>
                <button className="btn btn-outline" onClick={addFilter}>إضافة فلتر</button>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const filters = (cfg.sections.portfolio.filters || []).map((f, i) => ({ f, i }));
                  const filterIds = filters.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.portfolio.filters, oldIndex, newIndex);
                      cfg.sections.portfolio.filters = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={filterIds} strategy={verticalListSortingStrategy}>
                        {filters.map(({ f, i }) => (
                          <PortfolioFilterRowSortable key={i} id={i} f={f} i={i} editLang={editLang} dir={dir} updateFilterLabel={updateFilterLabel} updateFilterValue={updateFilterValue} safeDelete={safeDelete} removeFilter={removeFilter} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">المشاريع <span className="badge">{(cfg.sections.portfolio.items || []).length}</span></div>
                <button className="btn btn-outline" onClick={addPortfolioItem}>إضافة مشروع</button>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.portfolio.items || []).map((item, i) => ({ item, i }));
                  const itemIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.portfolio.items, oldIndex, newIndex);
                      cfg.sections.portfolio.items = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ item, i }) => (
                          <PortfolioItemRowSortable key={i} id={i} item={item} i={i} editLang={editLang} dir={dir} updateItemText={updateItemText} updateItemCategory={updateItemCategory} updateItemMetric={updateItemMetric} safeDelete={safeDelete} removeItem={removeItem} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Testimonials Panel */}
          {active === 'testimonials' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  آراء العملاء <span className="badge">{(cfg.sections.testimonials.items || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={addTestimonial}>إضافة رأي</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.testimonials.enabled} onChange={(e) => setSectionEnabled('testimonials', e.target.checked)} id="testimonials-enabled" />
                <label htmlFor="testimonials-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput label="العنوان" value={cfg.sections.testimonials.heading[editLang]} onChange={(v) => setSectionText('testimonials', 'heading', v)} dir={dir} placeholder={editLang === 'ar' ? 'آراء العملاء' : 'Testimonials'} required />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={(cfg.sections.testimonials.colors?.primary || '')} onChange={(v) => setSectionColor('testimonials', 'primary', v)} />
                <ColorInput label="الثانوي" value={(cfg.sections.testimonials.colors?.secondary || '')} onChange={(v) => setSectionColor('testimonials', 'secondary', v)} />
                <ColorInput label="الخلفية" value={(cfg.sections.testimonials.colors?.background || '')} onChange={(v) => setSectionColor('testimonials', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.testimonials.colors?.body || cfg.sections.testimonials.colors?.text || '')} onChange={(v) => setSectionColor('testimonials', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.testimonials.colors?.heading || '')} onChange={(v) => setSectionColor('testimonials', 'heading', v)} />
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">ملخص القسم <span className="badge">{(cfg.sections.testimonials.summary || []).length}</span></div>
                <button className="btn btn-outline" onClick={addSummary}>إضافة سطر</button>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.testimonials.summary || []).map((s, i) => ({ s, i }));
                  const itemsIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.testimonials.summary, oldIndex, newIndex);
                      cfg.sections.testimonials.summary = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ s, i }) => (
                          <SummaryRowSortable key={i} id={i} s={s} i={i} editLang={editLang} dir={dir} updateSummaryLabel={updateSummaryLabel} updateSummaryValue={updateSummaryValue} safeDelete={safeDelete} removeSummary={removeSummary} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">التقييمات</div>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.testimonials.items || []).map((tItem, i) => ({ tItem, i }));
                  const itemsIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.testimonials.items, oldIndex, newIndex);
                      cfg.sections.testimonials.items = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ tItem, i }) => (
                          <TestimonialRowSortable key={i} id={i} tItem={tItem} i={i} editLang={editLang} dir={dir} updateTestimonialText={updateTestimonialText} updateTestimonialName={updateTestimonialName} safeDelete={safeDelete} removeTestimonial={removeTestimonial} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Team Panel */}
          {active === 'team' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  الفريق <span className="badge">{(cfg.sections.team.members || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <button className="btn btn-outline" onClick={addMember}>إضافة عضو</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.team.enabled} onChange={(e) => setSectionEnabled('team', e.target.checked)} id="team-enabled" />
                <label htmlFor="team-enabled" className="panel-desc">مفعّل</label>
              </div>

              <TextInput label="العنوان" value={cfg.sections.team.heading[editLang]} onChange={(v) => setSectionText('team', 'heading', v)} dir={dir} placeholder={editLang === 'ar' ? 'الفريق' : 'Our Team'} required />

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={(cfg.sections.team.colors?.primary || '')} onChange={(v) => setSectionColor('team', 'primary', v)} />
                <ColorInput label="الثانوي" value={(cfg.sections.team.colors?.secondary || '')} onChange={(v) => setSectionColor('team', 'secondary', v)} />
                <ColorInput label="الخلفية" value={(cfg.sections.team.colors?.background || '')} onChange={(v) => setSectionColor('team', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.team.colors?.body || cfg.sections.team.colors?.text || '')} onChange={(v) => setSectionColor('team', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.team.colors?.heading || '')} onChange={(v) => setSectionColor('team', 'heading', v)} />
              </div>

              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const items = (cfg.sections.team.members || []).map((m, i) => ({ m, i }));
                  const itemsIds = items.map(({ i }) => i);
                  return (
                    <DndContext collisionDetection={closestCenter} sensors={sensors} onDragEnd={({ active, over }) => {
                      if (!over || active.id === over.id) return;
                      const oldIndex = active.id; const newIndex = over.id;
                      const newItems = arrayMove(cfg.sections.team.members, oldIndex, newIndex);
                      cfg.sections.team.members = newItems; setConfig(cfg);
                    }}>
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {items.map(({ m, i }) => (
                          <TeamMemberRowSortable key={i} id={i} m={m} i={i} editLang={editLang} dir={dir} updateMemberText={updateMemberText} safeDelete={safeDelete} removeMember={removeMember} />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>
            </div>
          )}

          {/* CTA Panel */}
          {active === 'cta' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">دعوة للإجراء</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input type="checkbox" checked={cfg.sections.cta.enabled} onChange={(e) => setSectionEnabled('cta', e.target.checked)} id="cta-enabled" />
                <label htmlFor="cta-enabled" className="panel-desc">مفعّل</label>
              </div>
              <div className="form-grid">
                <TextInput label="العنوان" value={cfg.sections.cta.heading[editLang]} onChange={(v) => setSectionText('cta', 'heading', v)} dir={dir} placeholder={editLang === 'ar' ? 'جاهز للبدء؟' : 'Ready to start?'} required />
                <TextArea label="وصف موجز" value={cfg.sections.cta.subheading[editLang]} onChange={(v) => setSectionText('cta', 'subheading', v)} dir={dir} placeholder={editLang === 'ar' ? 'سطر تمهيدي' : 'Lead-in text'} rows={2} />
                <TextInput label="نص الزر" value={cfg.sections.cta.cta.text[editLang]} onChange={(v) => setCTAButtonText(v)} dir={dir} placeholder={editLang === 'ar' ? 'ابدأ اليوم' : 'Start Today'} required />
                <URLInput label="رابط الزر" value={cfg.sections.cta.cta.link || ''} onChange={(v) => setCTAButtonLink(v)} placeholder="#contact أو https://..." required />
              </div>

              <div className="panel-header" style={{ marginTop: 20 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={(cfg.sections.cta.colors?.primary || '')} onChange={(v) => setSectionColor('cta', 'primary', v)} />
                <ColorInput label="الثانوي" value={(cfg.sections.cta.colors?.secondary || '')} onChange={(v) => setSectionColor('cta', 'secondary', v)} />
                <ColorInput label="الخلفية" value={(cfg.sections.cta.colors?.background || '')} onChange={(v) => setSectionColor('cta', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.cta.colors?.body || cfg.sections.cta.colors?.text || '')} onChange={(v) => setSectionColor('cta', 'body', v)} />
                <ColorInput label="العنوان" value={(cfg.sections.cta.colors?.heading || '')} onChange={(v) => setSectionColor('cta', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Contact Panel */}
          {active === 'contact' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  التواصل <span className="badge">{cfg.sections.contact.links.length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="text"
                    dir={dir}
                    placeholder={editLang === 'ar' ? 'بحث...' : 'Search...'}
                    value={linkFilter}
                    onChange={(e) => setLinkFilter(e.target.value)}
                    className="btn-outline"
                    style={{ padding: '8px 12px', width: '180px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={cfg.sections.contact.enabled}
                  onChange={(e) => setSectionEnabled('contact', e.target.checked)}
                  id="contact-enabled"
                />
                <label htmlFor="contact-enabled" className="panel-desc">مفعّل</label>
              </div>

              <div className="form-grid">
                <TextInput
                  label="العنوان"
                  value={cfg.sections.contact.heading[editLang]}
                  onChange={(v) => setSectionText('contact', 'heading', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                  required
                />
                <TextArea
                  label="وصف موجز"
                  value={(cfg.sections.contact.subheading?.[editLang] || '')}
                  onChange={(v) => setSectionText('contact', 'subheading', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'سطر يوضح كيف نتواصل معك' : 'Short line about how we help'}
                  rows={2}
                />
                <TextInput
                  label="البريد"
                  value={cfg.sections.contact.email || ''}
                  onChange={(v) => { cfg.sections.contact.email = v; setConfig(cfg); }}
                  dir="ltr"
                  placeholder="email@example.com"
                  required
                />
                <TextInput
                  label="الهاتف"
                  value={cfg.sections.contact.phone || ''}
                  onChange={(v) => { cfg.sections.contact.phone = v; setConfig(cfg); }}
                  dir="ltr"
                  placeholder="+201234567890"
                />
                <TextInput
                  label="العنوان"
                  value={cfg.sections.contact.address[editLang] || ''}
                  onChange={(v) => { cfg.sections.contact.address[editLang] = v; setConfig(cfg); }}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'اكتب العنوان' : 'Write address'}
                />
                <TextInput
                  label="ساعات العمل"
                  value={(cfg.sections.contact.hours?.[editLang] || '')}
                  onChange={(v) => setSectionText('contact', 'hours', v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'الاثنين-الجمعة 9 ص إلى 6 م' : 'Mon–Fri 9am–6pm, Sat 9am–1pm'}
                />
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">روابط إضافية</div>
                <button className="btn btn-outline" onClick={addLink}>إضافة رابط</button>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const filtered = cfg.sections.contact.links
                    .map((l, i) => ({ l, i }))
                    .filter(({ l }) => {
                      const q = linkFilter.trim().toLowerCase();
                      if (!q) return true;
                      return (l.label[editLang] || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q);
                    });
                  const itemsIds = filtered.map(({ i }) => i);
                  return (
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIndex = active.id;
                        const newIndex = over.id;
                        const newItems = arrayMove(cfg.sections.contact.links, oldIndex, newIndex);
                        cfg.sections.contact.links = newItems;
                        setConfig(cfg);
                      }}
                    >
                      <SortableContext items={itemsIds} strategy={verticalListSortingStrategy}>
                        {filtered.map(({ l, i }) => (
                          <LinkRowSortable
                            key={i}
                            id={i}
                            link={l}
                            i={i}
                            editLang={editLang}
                            dir={dir}
                            updateLinkLabel={updateLinkLabel}
                            updateLinkUrl={updateLinkUrl}
                            safeDelete={safeDelete}
                            removeLink={removeLink}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
              </div>

              <div className="panel-header" style={{ marginTop: 24 }}>
                <div className="panel-title">الألوان</div>
              </div>
              <div className="row-grid row-2" style={{ marginTop: 12 }}>
                <ColorInput label="الأساسي" value={cfg.sections.contact.colors.primary || ''} onChange={(v) => setSectionColor('contact', 'primary', v)} />
                <ColorInput label="الثانوي" value={cfg.sections.contact.colors.secondary || ''} onChange={(v) => setSectionColor('contact', 'secondary', v)} />
                <ColorInput label="الخلفية" value={cfg.sections.contact.colors.background || ''} onChange={(v) => setSectionColor('contact', 'background', v)} />
                <ColorInput label="النص" value={(cfg.sections.contact.colors.body || cfg.sections.contact.colors.text || '')} onChange={(v) => setSectionColor('contact', 'body', v)} required />
                <ColorInput label="العنوان" value={(cfg.sections.contact.colors.heading || '')} onChange={(v) => setSectionColor('contact', 'heading', v)} />
              </div>
            </div>
          )}

          {/* Footer Panel */}
          {active === 'footer' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  الفوتر <span className="badge">{(cfg.sections.footer?.main?.columns || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label className="chip">
                    <input
                      type="checkbox"
                      checked={(cfg.sections.footer?.enabled ?? true)}
                      onChange={(e) => setSectionEnabled('footer', e.target.checked)}
                    />
                    مفعّل
                  </label>
                  <label className="chip">
                    <input
                      type="checkbox"
                      checked={(cfg.sections.footer?.includeContact ?? true)}
                      onChange={(e) => setFooterIncludeContact(e.target.checked)}
                    />
                    تضمين التواصل
                  </label>
                  <button className="btn btn-outline" onClick={addFooterColumn}>إضافة عمود</button>
                </div>
              </div>

              <div className="row-grid" style={{ marginTop: 16 }}>
                {(() => {
                  const cols = (cfg.sections.footer?.main?.columns || []).map((col, i) => ({ col, i }));
                  const colIds = cols.map(({ i }) => i);
                  return (
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={({ active, over }) => {
                        if (!over || active.id === over.id) return;
                        const oldIndex = active.id;
                        const newIndex = over.id;
                        const arr = cfg.sections.footer?.main?.columns || [];
                        const newArr = arrayMove(arr, oldIndex, newIndex);
                        cfg.sections.footer.main.columns = newArr;
                        setConfig(cfg);
                      }}
                    >
                      <SortableContext items={colIds} strategy={verticalListSortingStrategy}>
                        {cols.map(({ col, i }) => (
                          <FooterColumnSortable
                            key={i}
                            id={i}
                            col={col}
                            i={i}
                            editLang={editLang}
                            dir={dir}
                            updateFooterColumnTitle={updateFooterColumnTitle}
                            addFooterLink={addFooterLink}
                            updateFooterLinkLabel={updateFooterLinkLabel}
                            updateFooterLinkHref={updateFooterLinkHref}
                            removeFooterLink={removeFooterLink}
                            removeFooterColumn={removeFooterColumn}
                            safeDelete={safeDelete}
                            setConfig={setConfig}
                            cfg={cfg}
                            sensors={sensors}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )
                })()}
              </div>

              <div className="panel" style={{ marginTop: 20 }}>
                <div className="panel-header">
                  <div className="panel-title">الشريط السفلي</div>
                </div>
                <TextArea
                  label="النص"
                  value={(cfg.sections.footer?.bottom?.text?.[editLang] || '')}
                  onChange={(v) => updateFooterBottomText(v)}
                  dir={dir}
                  placeholder={editLang === 'ar' ? 'مثال: جميع الحقوق محفوظة' : 'e.g., All rights reserved'}
                  required
                  rows={2}
                />
              </div>
            </div>
          )}

          {/* Layout Panel: reorder sections between Hero and Footer */}
          {active === 'layout' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">ترتيب الأقسام</div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="chip">اسحب الأقسام لإعادة ترتيبها</span>
                </div>
              </div>
              <div className="row-grid" style={{ marginTop: 12 }}>
                {(() => {
                  const currentOrder = Array.isArray(cfg.site?.sectionsOrder) && cfg.site.sectionsOrder.length
                    ? cfg.site.sectionsOrder.filter((k) => HOME_SECTIONS.includes(k))
                    : HOME_SECTIONS;
                  return (
                    <DndContext
                      collisionDetection={closestCenter}
                      sensors={sensors}
                      onDragEnd={({ active: a, over }) => {
                        if (!over || a.id === over.id) return;
                        const oldIndex = currentOrder.indexOf(a.id);
                        const newIndex = currentOrder.indexOf(over.id);
                        const nextOrder = arrayMove(currentOrder, oldIndex, newIndex);
                        updateConfig('site.sectionsOrder', nextOrder);
                        refreshPreview();
                      }}
                    >
                      <SortableContext items={currentOrder} strategy={verticalListSortingStrategy}>
                        {currentOrder.map((key) => (
                          <SectionOrderItem
                            key={key}
                            id={key}
                            label={labelsForLang?.[key] || key}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  );
                })()}
                <div className="helper-text" style={{ marginTop: 8 }}>
                  الفوتر يبقى ثابتًا في الأسفل.
                </div>
              </div>
            </div>
          )}

          {/* Custom Blocks Panel */}
          {showCustomBlocks && active === 'custom' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">
                  المحتوى المخصص <span className="badge">{(cfg.customBlocks || []).length}</span>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <input
                    type="text"
                    dir={dir}
                    placeholder={editLang === 'ar' ? 'بحث...' : 'Search...'}
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                    className="btn-outline"
                    style={{ padding: '8px 12px', width: '180px' }}
                  />
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      const arr = cfg.customBlocks || (cfg.customBlocks = []);
                      arr.push({
                        enabled: true,
                        type: 'text',
                        position: 'afterHero',
                        props: { text: { en: '', ar: '' }, align: 'center' },
                      });
                      setConfig(cfg);
                    }}
                  >
                    إضافة بلوك
                  </button>
                </div>
              </div>

              <div className="row-grid" style={{ marginTop: 16 }}>
                {(cfg.customBlocks || [])
                  .map((b, i) => ({ b, i }))
                  .filter(({ b }) => {
                    const q = blockFilter.trim().toLowerCase();
                    if (!q) return true;
                    const txt = (b.props?.text?.[editLang] || '').toLowerCase();
                    return (
                      b.type.toLowerCase().includes(q) ||
                      (b.position || '').toLowerCase().includes(q) ||
                      txt.includes(q)
                    );
                  })
                  .map(({ b, i }) => (
                    <div key={i} className="row-cta" style={{ padding: '16px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'center' }}>
                        <select
                          value={b.type}
                          onChange={(e) => { b.type = e.target.value; setConfig(cfg); }}
                          className="btn-outline"
                        >
                          <option value="text">نص</option>
                          <option value="button">زر</option>
                          <option value="image">صورة</option>
                          <option value="spacer">مسافة</option>
                        </select>

                        <select
                          value={b.position}
                          onChange={(e) => { b.position = e.target.value; setConfig(cfg); }}
                          className="btn-outline"
                        >
                          <option value="beforeHero">قبل الهيرو</option>
                          <option value="afterHero">بعد الهيرو</option>
                          <option value="beforeAbout">قبل من نحن</option>
                          <option value="afterAbout">بعد من نحن</option>
                          <option value="beforeServices">قبل الخدمات</option>
                          <option value="afterServices">بعد الخدمات</option>
                          <option value="beforeContact">قبل التواصل</option>
                          <option value="afterContact">بعد التواصل</option>
                        </select>

                        <select
                          value={b.props?.align || 'center'}
                          onChange={(e) => { b.props = b.props || {}; b.props.align = e.target.value; setConfig(cfg); }}
                          className="btn-outline"
                        >
                          <option value="left">يسار</option>
                          <option value="center">منتصف</option>
                          <option value="right">يمين</option>
                        </select>

                        {/* حقول حسب النوع */}
                        {b.type === 'text' && (
                          <TextInput
                            label="النص"
                            value={b.props?.text?.[editLang] || ''}
                            onChange={(v) => {
                              b.props = b.props || {};
                              b.props.text = b.props.text || { en: '', ar: '' };
                              b.props.text[editLang] = v;
                              setConfig(cfg);
                            }}
                            dir={dir}
                            placeholder={editLang === 'ar' ? 'نص البلوك' : 'Block text'}
                            required
                          />
                        )}

                        {b.type === 'button' && (
                          <>
                            <TextInput
                              label="نص الزر"
                              value={b.props?.text?.[editLang] || ''}
                              onChange={(v) => {
                                b.props = b.props || {};
                                b.props.text = b.props.text || { en: '', ar: '' };
                                b.props.text[editLang] = v;
                                setConfig(cfg);
                              }}
                              dir={dir}
                              placeholder={editLang === 'ar' ? 'نص الزر' : 'Button text'}
                              required
                            />
                            <URLInput
                              label="الرابط"
                              value={b.props?.link || ''}
                              onChange={(v) => {
                                b.props = b.props || {};
                                b.props.link = v;
                                setConfig(cfg);
                              }}
                              placeholder="https://..."
                              required
                            />
                          </>
                        )}

                        {b.type === 'image' && (
                          <>
                            <URLInput
                              label="رابط الصورة"
                              value={b.props?.src || ''}
                              onChange={(v) => {
                                b.props = b.props || {};
                                b.props.src = v;
                                setConfig(cfg);
                              }}
                              placeholder={editLang === 'ar' ? 'رابط أو رفع' : 'URL or upload'}
                              required
                            />
                            <TextInput
                              label="نص بديل"
                              value={b.props?.alt?.[editLang] || ''}
                              onChange={(v) => {
                                b.props = b.props || {};
                                b.props.alt = b.props.alt || { en: '', ar: '' };
                                b.props.alt[editLang] = v;
                                setConfig(cfg);
                              }}
                              dir={dir}
                              placeholder={editLang === 'ar' ? 'للمكفوفين' : 'Alt text'}
                            />
                          </>
                        )}

                        {b.type === 'spacer' && (
                          <div className="form-group">
                            <label>الارتفاع (px)</label>
                            <input
                              type="number"
                              min="0"
                              value={b.props?.height || 24}
                              onChange={(e) => {
                                b.props = b.props || {};
                                b.props.height = Number(e.target.value) || 0;
                                setConfig(cfg);
                              }}
                              className="btn-outline"
                            />
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button className="btn btn-outline" onClick={() => {
                            const arr = cfg.customBlocks || [];
                            const j = i - 1;
                            if (j >= 0) { [arr[i], arr[j]] = [arr[j], arr[i]]; setConfig(cfg); }
                          }}>↑</button>
                          <button className="btn btn-outline" onClick={() => {
                            const arr = cfg.customBlocks || [];
                            const j = i + 1;
                            if (j < arr.length) { [arr[i], arr[j]] = [arr[j], arr[i]]; setConfig(cfg); }
                          }}>↓</button>
                          <button
                            className="btn btn-ghost"
                            onClick={() => safeDelete(() => {
                              const arr = cfg.customBlocks || [];
                              arr.splice(i, 1);
                              setConfig(cfg);
                            }, 'هل أنت متأكد من حذف هذا البلوك؟')}
                          >
                            حذف
                          </button>
                        </div>
                      </div>

                      {/* إعدادات متقدمة للصورة */}
                      {b.type === 'image' && (
                        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                          <div className="panel-header">
                            <div className="panel-title">إعدادات متقدمة</div>
                          </div>
                          <div className="form-grid" style={{ marginTop: 12 }}>
                            <div className="form-group">
                              <label>العرض</label>
                              <input
                                type="text"
                                value={b.props?.width ?? ''}
                                onChange={(e) => { b.props = b.props || {}; b.props.width = e.target.value; setConfig(cfg); }}
                                placeholder="100% أو 600px"
                                dir="ltr"
                              />
                            </div>
                            <div className="form-group">
                              <label>الطول</label>
                              <input
                                type="text"
                                value={b.props?.height ?? ''}
                                onChange={(e) => { b.props = b.props || {}; b.props.height = e.target.value; setConfig(cfg); }}
                                placeholder="auto أو 400px"
                                dir="ltr"
                              />
                            </div>
                            <div className="form-group">
                              <label>المقاس</label>
                              <select
                                value={b.props?.objectFit || 'contain'}
                                onChange={(e) => { b.props = b.props || {}; b.props.objectFit = e.target.value; setConfig(cfg); }}
                                className="btn-outline"
                              >
                                <option value="contain">contain</option>
                                <option value="cover">cover</option>
                                <option value="fill">fill</option>
                                <option value="scale-down">scale-down</option>
                                <option value="none">none</option>
                              </select>
                            </div>
                            <TextInput
                              label="نص فوق الصورة"
                              value={b.props?.overlayText?.[editLang] || ''}
                              onChange={(v) => {
                                b.props = b.props || {};
                                b.props.overlayText = b.props.overlayText || { en: '', ar: '' };
                                b.props.overlayText[editLang] = v;
                                setConfig(cfg);
                              }}
                              dir={dir}
                              placeholder={editLang === 'ar' ? 'اختياري' : 'Optional'}
                            />
                            <ColorInput
                              label="لون نص التغطية"
                              value={b.props?.overlayColor || '#ffffff'}
                              onChange={(v) => { b.props = b.props || {}; b.props.overlayColor = v; setConfig(cfg); }}
                            />
                            <ColorInput
                              label="خلفية التغطية"
                              value={b.props?.overlayBg ?? 'rgba(0,0,0,0.5)'}
                              onChange={(v) => { b.props = b.props || {}; b.props.overlayBg = v; setConfig(cfg); }}
                            />
                            <div className="form-group">
                              <label>Padding (px)</label>
                              <input
                                type="number"
                                min="0"
                                value={b.props?.overlayPadding ?? 8}
                                onChange={(e) => { b.props = b.props || {}; b.props.overlayPadding = Number(e.target.value) || 0; setConfig(cfg); }}
                                className="btn-outline"
                              />
                            </div>
                            <div className="form-group">
                              <label>زاوية الحواف (px)</label>
                              <input
                                type="number"
                                min="0"
                                value={b.props?.overlayRadius ?? 6}
                                onChange={(e) => { b.props = b.props || {}; b.props.overlayRadius = Number(e.target.value) || 0; setConfig(cfg); }}
                                className="btn-outline"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Data Panel */}
          {active === 'data' && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">حفظ وتصدير</div>
                <div className="panel-desc">إدارة النسخ الاحتياطية</div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={handleSaveAndRefresh}>حفظ في المتصفح</button>
                {hasRemote && (
                  <button className="btn btn-outline" onClick={handleRemoteSave}>حفظ على السيرفر</button>
                )}
                <button className="btn btn-outline" onClick={() => downloadConfig(config)}>تنزيل JSON</button>
                {/* إزالة زر إعادة التعيين بناءً على طلب المستخدم */}
              </div>
              <div className="panel" style={{ marginTop: 20 }}>
                <div className="panel-header">
                  <div className="panel-title">استيراد</div>
                </div>
                <label className="btn btn-outline" style={{ display: 'inline-flex', gap: 8, cursor: 'pointer' }}>
                  📤 تحميل ملف JSON
                  <input
                    type="file"
                    accept="application/json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const text = await file.text();
                      try {
                        const obj = JSON.parse(text);
                        setConfig(obj);
                        alert('تم تحميل JSON بنجاح.');
                      } catch {
                        alert('ملف JSON غير صالح');
                      }
                    }}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Live Preview */}
          {showPreview && (
            <div className="panel">
              <div className="panel-header">
                <div className="panel-title">معاينة حية</div>
                <div className="panel-desc">
                  {livePreview ? '✅ التحديث تلقائي' : 'اضغط "حفظ" لتحديث المعاينة'}
                </div>
              </div>
              <iframe
                className="preview-frame"
                src="/"
                ref={previewRef}
                title="معاينة الموقع"
              ></iframe>
            </div>
          )}
        </main>
      </div>
    </>
  );
}
