/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    const origin = request.headers.get('Origin') || ''
    const allowListStr = env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || '*'
    const allowList = allowListStr === '*' ? '*' : allowListStr.split(',').map(s => s.trim()).filter(Boolean)
    const allowedOrigin = allowList === '*' ? (origin || '*') : (allowList.includes(origin) ? origin : allowList[0] || '')

    const cors = {
      'Access-Control-Allow-Origin': allowedOrigin || '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    }

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response('', { headers: cors })
    }

    // Cloudinary signing endpoint (POST)
    if (url.pathname === '/cloudinary/sign' && request.method === 'POST') {
      try {
        const body = await request.json()
        const timestamp = Number(body?.timestamp) || Math.floor(Date.now() / 1000)
        const folder = String(body?.folder || '')
        const public_id = body?.public_id ? String(body.public_id) : ''
        const overwrite = body?.overwrite === true ? 'true' : (body?.overwrite === false ? 'false' : '')

        const api_key = env.CLOUDINARY_API_KEY
        const api_secret = env.CLOUDINARY_API_SECRET
        const cloud_name = env.CLOUDINARY_CLOUD_NAME

        if (!api_key || !api_secret || !cloud_name) {
          return new Response(JSON.stringify({ error: 'Cloudinary env not configured' }), { status: 500, headers: { 'Content-Type': 'application/json', ...cors } })
        }

        const parts = []
        if (folder) parts.push(`folder=${folder}`)
        if (public_id) parts.push(`public_id=${public_id}`)
        if (overwrite) parts.push(`overwrite=${overwrite}`)
        parts.push(`timestamp=${timestamp}`)
        const stringToSign = parts.sort().join('&') + api_secret

        const enc = new TextEncoder()
        const buf = await crypto.subtle.digest('SHA-1', enc.encode(stringToSign))
        const signature = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')

        const resp = { signature, timestamp, api_key, cloud_name }
        return new Response(JSON.stringify(resp), { headers: { 'Content-Type': 'application/json', ...cors } })
      } catch (err) {
        return new Response(JSON.stringify({ error: 'Bad Request', details: err?.message || 'unknown' }), { status: 400, headers: { 'Content-Type': 'application/json', ...cors } })
      }
    }

    if (url.pathname !== '/config') {
      return new Response('Not Found', { status: 404, headers: cors })
    }

    const key = 'siteConfig'

    if (request.method === 'GET') {
      const val = await env.SITE_CONFIG.get(key)
      const body = val ?? '{}'
      return new Response(body, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...cors,
        },
      })
    }

    if (request.method === 'PUT') {
      const token = env.ADMIN_TOKEN // optional; if set, enforce
      if (token) {
        const auth = request.headers.get('Authorization')
        if (auth !== `Bearer ${token}`) {
          return new Response('Unauthorized', { status: 401, headers: cors })
        }
      } else {
        // Safe default: forbid writes if ADMIN_TOKEN not set
        return new Response('Forbidden: ADMIN_TOKEN not set', { status: 403, headers: cors })
      }

      const text = await request.text()
      // Basic JSON validation
      try {
        JSON.parse(text)
      } catch (e) {
        return new Response('Bad Request: invalid JSON', { status: 400, headers: cors })
      }
      await env.SITE_CONFIG.put(key, text)
      return new Response('ok', {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          ...cors,
        },
      })
    }

    return new Response('Method Not Allowed', { status: 405, headers: cors })
  },
}
