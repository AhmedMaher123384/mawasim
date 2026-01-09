import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadConfig, saveConfig, hasRemote, saveConfigRemote } from './configLoader.js'

const ConfigContext = createContext({
  config: null,
  setConfig: () => {},
  updateConfig: () => {},
  lang: 'en',
  setLang: () => {},
  t: (obj) => (typeof obj === 'string' ? obj : (obj?.en ?? obj?.ar ?? '')),
  saveToBrowser: () => {},
  publish: async () => ({ ok: false, error: 'No provider' }),
  lastSavedAt: null,
  unsaved: false,
  saveError: null,
})

export function ConfigProvider({ children }) {
  const [config, setConfig] = useState(null)
  const [lang, setLang] = useState('en')
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const [unsaved, setUnsaved] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const debounceRef = useRef(null)
  const loadedRef = useRef(false)

  useEffect(() => { (async () => {
    const cfg = await loadConfig()
    setConfig(cfg)
    setLang(cfg?.site?.lang || 'en')
    loadedRef.current = true
  })() }, [])

  useEffect(() => {
    if (!config) return
    const root = document.documentElement
    const theme = config.theme
    if (!theme) return
    root.style.setProperty('--color-primary', theme.primary)
    root.style.setProperty('--color-secondary', theme.secondary)
    root.style.setProperty('--color-bg', theme.background)
    root.style.setProperty('--color-text', theme.text)
    // Typography
    const typo = theme.typography || {}
    if (typo.fontFamily) {
      root.style.setProperty('--font-family', typo.fontFamily)
    } else {
      root.style.removeProperty('--font-family')
    }
    if (typo.headingFamily) {
      root.style.setProperty('--heading-font-family', typo.headingFamily)
    } else {
      root.style.removeProperty('--heading-font-family')
    }
    // Dynamic font CSS link injection
    try {
      const prev = document.getElementById('site-font-link')
      if (prev && prev.href !== (typo.fontUrl || '')) {
        prev.remove()
      }
      if (typo.fontUrl && !document.getElementById('site-font-link')) {
        const link = document.createElement('link')
        link.rel = 'stylesheet'
        link.id = 'site-font-link'
        link.href = typo.fontUrl
        document.head.appendChild(link)
      }
    } catch {}
    const metaTheme = document.querySelector('meta[name="theme-color"]')
    if (metaTheme) metaTheme.content = theme.primary
    // Update document title based on tabTitle or site.title
    try {
      const titleObj = (config.site?.tabTitle && (config.site.tabTitle.en || config.site.tabTitle.ar)) ? config.site.tabTitle : config.site?.title
      const titleStr = typeof titleObj === 'string' ? titleObj : (titleObj?.[lang] ?? '')
      if (titleStr) document.title = titleStr
    } catch {}
    // Update favicon link dynamically
    try {
      const href = config.site?.favicon || ''
      const prevIcon = document.getElementById('site-favicon')
      if (!href) {
        if (prevIcon) prevIcon.remove()
      } else {
        let link = prevIcon
        if (!link) {
          link = document.createElement('link')
          link.rel = 'icon'
          link.id = 'site-favicon'
          document.head.appendChild(link)
        }
        link.href = href
      }
    } catch {}
  }, [config, lang])

  // Auto-save with debounce (800ms), track unsaved state
  useEffect(() => {
    if (!loadedRef.current || !config) return
    setUnsaved(true)
    setSaveError(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        saveConfig(config)
        setLastSavedAt(Date.now())
        setUnsaved(false)
      } catch (err) {
        setSaveError(err?.message || 'Save failed')
      }
    }, 800)
    return () => debounceRef.current && clearTimeout(debounceRef.current)
  }, [config])

  // Immutable update helper: accepts path string "a.b.c" or array
  const updateConfig = (path, value) => {
    if (!config) return
    const next = structuredClone(config)
    const parts = Array.isArray(path) ? path : String(path).split('.')
    let obj = next
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i]
      if (obj[k] == null || typeof obj[k] !== 'object') obj[k] = {}
      obj = obj[k]
    }
    obj[parts[parts.length - 1]] = value
    setConfig(next)
  }

  const publish = async () => {
    if (!config) return { ok: false, error: 'No config' }
    if (!hasRemote) return { ok: false, error: 'Remote not configured' }
    try {
      await saveConfigRemote(config)
      return { ok: true }
    } catch (err) {
      return { ok: false, error: err?.message || 'Publish failed' }
    }
  }

  const value = useMemo(() => ({
    config,
    setConfig,
    updateConfig,
    lang,
    setLang,
    t: (obj) => typeof obj === 'string' ? obj : (obj?.[lang] ?? ''),
    saveToBrowser: () => config && saveConfig(config),
    publish,
    lastSavedAt,
    unsaved,
    saveError
  }), [config, lang, lastSavedAt, unsaved, saveError])

  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>
}

export function useConfig() {
  return useContext(ConfigContext)
}
