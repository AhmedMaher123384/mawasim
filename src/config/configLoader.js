const REMOTE_URL = import.meta.env?.VITE_CONFIG_ENDPOINT
const REMOTE_TOKEN = import.meta.env?.VITE_CONFIG_TOKEN

export const hasRemote = Boolean(REMOTE_URL)

function isObject(x) { return x && typeof x === 'object' && !Array.isArray(x) }

function deepMerge(base, override) {
  if (!isObject(base)) return override
  if (!isObject(override)) return base
  const out = { ...base }
  for (const k of Object.keys(override)) {
    const bv = base[k]
    const ov = override[k]
    if (isObject(bv) && isObject(ov)) {
      out[k] = deepMerge(bv, ov)
    } else {
      out[k] = ov
    }
  }
  return out
}

// Normalize legacy shapes to the latest schema
function migrateConfig(cfg) {
  try {
    const sections = cfg.sections || {}
    const contact = sections.contact || null
    if (contact) {
      // Convert hours: array -> bilingual text object
      if (Array.isArray(contact.hours)) {
        const en = contact.hours.map(x => (typeof x === 'string' ? x : (x?.en || ''))).filter(Boolean).join(', ')
        const ar = contact.hours.map(x => (typeof x === 'string' ? x : (x?.ar || ''))).filter(Boolean).join('، ')
        contact.hours = { en, ar }
      } else if (typeof contact.hours === 'string') {
        contact.hours = { en: contact.hours, ar: contact.hours }
      }
      // Ensure subheading exists and is bilingual
      if (!contact.subheading || typeof contact.subheading !== 'object' || Array.isArray(contact.subheading)) {
        const v = typeof contact.subheading === 'string' ? contact.subheading : ''
        contact.subheading = { en: v, ar: v }
      }
      sections.contact = contact
      cfg.sections = sections
    }
  } catch {}
  return cfg
}

export async function loadConfig() {
  // اقرأ القيم الافتراضية دومًا لضمان إدراج الحقول الجديدة (مثل cloudinary)
  let base = {}
  try {
    const resBase = await fetch('/config.json?v=' + Date.now(), { cache: 'no-cache' })
    base = await resBase.json()
  } catch {}

  // أولوية جديدة: نسخة بعيدة ← الافتراضية ← (نسخة المتصفح فقط داخل لوحة الإدارة)
  let merged = base

  if (hasRemote) {
    try {
      const url = REMOTE_URL + (REMOTE_URL.includes('?') ? '&' : '?') + 'v=' + Date.now()
      const res = await fetch(url, { cache: 'no-cache' })
      if (res.ok) {
        const remoteCfg = await res.json()
        // استخدم الإعدادات البعيدة كمصدر وحيد لمنع تضمين حقول قديمة من الافتراضي
        merged = remoteCfg
      }
    } catch {}
  }

  // لا تُطبّق نسخة المتصفح إلا في وضع الإدارة (#admin)
  try {
    const isAdmin = typeof window !== 'undefined' && window.location && window.location.hash === '#admin'
    if (isAdmin) {
      const overrideStr = localStorage.getItem('siteConfig')
      if (overrideStr) {
        const override = JSON.parse(overrideStr)
        merged = deepMerge(merged, override)
      }
    }
  } catch {}

  // Apply migrations so admin always sees the latest shapes
  return migrateConfig(merged)
}

export function saveConfig(cfg) {
  localStorage.setItem('siteConfig', JSON.stringify(cfg))
}

export async function saveConfigRemote(cfg) {
  if (!hasRemote) throw new Error('REMOTE endpoint not configured')
  const res = await fetch(REMOTE_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(REMOTE_TOKEN ? { Authorization: `Bearer ${REMOTE_TOKEN}` } : {}),
    },
    body: JSON.stringify(cfg)
  })
  if (!res.ok) throw new Error(`Remote save failed: ${res.status}`)
  return true
}

export function downloadConfig(cfg, filename = 'config.json') {
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}