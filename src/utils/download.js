/**
 * 触发浏览器下载。
 * 注意两点，缺一都会导致下载被静默取消：
 * 1. <a> 必须挂到 document 上，脱离 DOM 的节点可能被提前回收；
 * 2. blob URL 不能马上 revoke，下载是异步的，revoke 早了会中断传输。
 */
function triggerDownload(href, filename) {
  const link = document.createElement('a')
  link.href = href
  link.download = filename
  link.rel = 'noopener'
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  triggerDownload(url, filename)
  // 留足时间让下载真正完成后再释放，避免大文件被中断
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadDataUrl(dataUrl, filename) {
  triggerDownload(dataUrl, filename)
}

export function downloadText(text, filename, mime = 'text/csv;charset=utf-8') {
  downloadBlob(new Blob(['\ufeff', text], { type: mime }), filename)
}

export function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('导出图片失败'))
    }, type)
  })
}

/** 让出主线程，避免大批量生成时页面卡死 */
export function nextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

export async function copyText(text) {
  await navigator.clipboard.writeText(text)
}
