export const SHARED_DEFAULTS = {
  size: 220,
  errorLevel: 'M',
  color: '#000000',
  bgColor: '#ffffff',
}

export const SINGLE_DEFAULTS = {
  ...SHARED_DEFAULTS,
  value: 'https://ant.design',
  type: 'canvas',
  bordered: true,
  icon: false,
}

export const BATCH_DEFAULTS = {
  ...SHARED_DEFAULTS,
  size: 200,
  format: 'png',
  margin: 1,
  prefix: '',
  filterInvalid: true,
  useIndex: true,
}

export const PRESETS = [
  { label: '网址', value: 'https://ant.design' },
  { label: '文本', value: '你好，Ant Design！' },
  { label: 'Wi-Fi', value: 'WIFI:T:WPA;S:MyWiFi;P:12345678;;' },
  { label: '短信', value: 'smsto:13800000000:你好' },
]

export const ERROR_LEVELS = [
  { label: 'L — 约 7% 容错', value: 'L' },
  { label: 'M — 约 15% 容错', value: 'M' },
  { label: 'Q — 约 25% 容错', value: 'Q' },
  { label: 'H — 约 30% 容错', value: 'H' },
]

export const BATCH_SAMPLE = [
  'https://ant.design,AntDesign官网',
  'https://react.dev,React文档',
  'https://vite.dev,Vite文档',
  'https://github.com/ant-design/ant-design,AntD仓库',
].join('\n')

export const CHECK_ICON =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40">' +
      '<rect width="40" height="40" rx="9" fill="#ffffff"/>' +
      '<circle cx="20" cy="20" r="16" fill="#1677ff"/>' +
      '<path d="M12.5 20.5l5 5 10-11" fill="none" stroke="#fff" stroke-width="3.5" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>',
  )
