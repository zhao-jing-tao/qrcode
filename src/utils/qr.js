import QRCode from 'qrcode'

/** 判断是否像一条链接（用于批量校验） */
export function isUrlLike(value) {
  if (/^(https?|ftp):\/\//i.test(value)) return true
  return /^[\w-]+(\.[\w-]+)+(\/|$|\?|#)/.test(value)
}

/** 一行拆成 { value, name }，支持 "链接,备注" 或 "链接\t备注"，适配 Excel 粘贴 */
function splitRow(raw) {
  const sep = raw.includes('\t') ? '\t' : ','
  const idx = raw.indexOf(sep)
  if (idx <= 0) return { value: raw, name: '' }
  const value = raw.slice(0, idx).trim()
  const name = raw.slice(idx + 1).trim()
  if (!value || !name) return { value: raw, name: '' }
  // 链接自带查询参数时，逗号可能属于参数本身（?a=1,b=2），此时不拆
  if (sep === ',' && value.includes('?') && name.includes('=')) {
    return { value: raw, name: '' }
  }
  return { value, name }
}

/** 解析批量输入，按内容去重，保留原始顺序 */
export function parseLinks(text) {
  const items = []
  const seen = new Map()

  for (const line of String(text).split(/\r?\n/)) {
    const raw = line.trim()
    if (!raw) continue

    const { value, name } = splitRow(raw)
    if (!value) continue

    if (seen.has(value)) {
      seen.get(value).duplicated = true
      continue
    }

    const item = {
      value,
      name,
      isUrl: isUrlLike(value),
      duplicated: false,
    }
    seen.set(value, item)
    items.push(item)
  }

  return items
}

/** 把备注或链接转成安全的文件名片段 */
export function sanitizeName(input) {
  return String(input)
    .replace(/^https?:\/\//i, '')
    .replace(/[\\/*?"<>|#?&=+%,;]+/g, '-')
    .replace(/\s+/g, '_')
    .replace(/-{2,}/g, '-')
    .replace(/^[-_.]+|[-_.]+$/g, '')
    .slice(0, 60)
}

/** 根据序号、备注、前缀拼出文件名（不含唯一性处理） */
export function buildFileName(item, index, options, ext) {
  const parts = []
  if (options.prefix) parts.push(sanitizeName(options.prefix))
  if (options.useIndex) parts.push(String(index + 1).padStart(3, '0'))
  parts.push(item.name ? sanitizeName(item.name) : sanitizeName(item.value))
  const base = parts.filter(Boolean).join('_') || `qrcode_${index + 1}`
  return `${base}.${ext}`
}

/** 保证同批文件名不重复 */
export function makeUniqueNamer() {
  const used = new Map()
  return (name) => {
    if (!used.has(name)) {
      used.set(name, 1)
      return name
    }
    const count = used.get(name) + 1
    used.set(name, count)
    const dot = name.lastIndexOf('.')
    return dot > 0
      ? `${name.slice(0, dot)}-${count}${name.slice(dot)}`
      : `${name}-${count}`
  }
}

/** antd 与 qrcode 共用的渲染参数 */
export function toQrOptions(options) {
  return {
    errorCorrectionLevel: options.errorLevel,
    margin: options.margin ?? 1,
    width: options.size,
    color: { dark: options.color, light: options.bgColor },
  }
}

/** 生成 PNG dataURL */
export function renderPng(value, options) {
  return QRCode.toDataURL(value, toQrOptions(options))
}

/** 生成 SVG 源码字符串 */
export function renderSvg(value, options) {
  return QRCode.toString(value, { ...toQrOptions(options), type: 'svg' })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片加载失败'))
    img.src = src
  })
}

function truncate(text, max) {
  const s = String(text)
  return s.length > max ? `${s.slice(0, max - 1)}…` : s
}

/**
 * 把所有二维码拼成一张带编号的图，方便打印或整版分发。
 * 返回 canvas，由调用方决定导出格式。
 */
export async function buildContactSheet(items, options, layout = {}) {
  const scale = layout.scale ?? 2
  const qrSize = options.size
  const gap = 24
  const labelHeight = 28
  const padding = 36

  const cols = Math.max(
    1,
    layout.cols || Math.min(8, Math.ceil(Math.sqrt(items.length))),
  )
  const rows = Math.ceil(items.length / cols)

  const cellW = qrSize + gap
  const cellH = qrSize + labelHeight + gap
  const width = padding * 2 + cols * cellW - gap
  const height = padding * 2 + rows * cellH - gap

  const canvas = document.createElement('canvas')
  canvas.width = Math.round(width * scale)
  canvas.height = Math.round(height * scale)

  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  const images = await Promise.all(
    items.map((item) => loadImage(item.dataUrl)),
  )

  images.forEach((img, i) => {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = padding + col * cellW
    const y = padding + row * cellH

    ctx.drawImage(img, x, y, qrSize, qrSize)

    ctx.fillStyle = '#333333'
    ctx.font =
      '13px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    const label = `${i + 1}. ${truncate(items[i].name || items[i].value, 24)}`
    ctx.fillText(label, x + qrSize / 2, y + qrSize + 6)
  })

  return canvas
}
