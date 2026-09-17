import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App as AntdApp,
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Image,
  Input,
  Progress,
  Segmented,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import {
  ClearOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FileZipOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import JSZip from 'jszip'
import QrAppearanceFields from './QrAppearanceFields.jsx'
import { BATCH_DEFAULTS, BATCH_SAMPLE } from '../constants'
import {
  buildContactSheet,
  buildFileName,
  makeUniqueNamer,
  parseLinks,
  renderPng,
  renderSvg,
} from '../utils/qr'
import {
  canvasToBlob,
  downloadBlob,
  downloadText,
  nextTick,
} from '../utils/download'

const { TextArea } = Input
const { Text, Paragraph } = Typography

const PREVIEW_LIMIT = 24
const THUMB_SIZE = 140

const stamp = () =>
  new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')

const csvCell = (v) => {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export default function BatchGenerator() {
  const { message } = AntdApp.useApp()

  const [rawInput, setRawInput] = useState(BATCH_SAMPLE)
  const [options, setOptions] = useState(BATCH_DEFAULTS)
  const [sheetCols, setSheetCols] = useState('auto')
  const [showAll, setShowAll] = useState(false)
  const [progress, setProgress] = useState(null)
  // 预览结果连同它对应的参数签名一起存放，渲染时比对签名。
  // 参数一变签名就对不上，预览自动"失效"，避免在 effect 里同步 setState
  const [previewData, setPreviewData] = useState({ key: null, list: [] })

  const { filterInvalid, format, margin, size, useIndex, prefix } = options
  const { color, bgColor, errorLevel } = options

  const parsed = useMemo(() => parseLinks(rawInput), [rawInput])
  const items = useMemo(
    () => (filterInvalid ? parsed.filter((i) => i.isUrl) : parsed),
    [parsed, filterInvalid],
  )

  const stats = useMemo(
    () => ({
      total: parsed.length,
      valid: parsed.filter((i) => i.isUrl).length,
      invalid: parsed.filter((i) => !i.isUrl).length,
      duplicated: parsed.filter((i) => i.duplicated).length,
    }),
    [parsed],
  )
  const invalidSamples = parsed.filter((i) => !i.isUrl).slice(0, 3)

  const patch = (partial) => setOptions((prev) => ({ ...prev, ...partial }))
  const busy = Boolean(progress && progress.running)

  const previewKey = useMemo(
    () =>
      [rawInput, filterInvalid, showAll, size, color, bgColor, errorLevel, margin].join('|'),
    [rawInput, filterInvalid, showAll, size, color, bgColor, errorLevel, margin],
  )
  const preview = previewData.key === previewKey ? previewData.list : []
  const previewLoading = items.length > 0 && previewData.key !== previewKey

  // 生成预览缩略图（防抖，缩略图按较小尺寸生成以省性能）
  useEffect(() => {
    let cancelled = false
    const visible = showAll ? items : items.slice(0, PREVIEW_LIMIT)

    if (!visible.length) return undefined

    const timer = setTimeout(async () => {
      try {
        const limit = Math.min(size, THUMB_SIZE)
        const out = []
        for (const item of visible) {
          const dataUrl = await renderPng(item.value, {
            color,
            bgColor,
            errorLevel,
            margin,
            size: limit,
          })
          if (cancelled) return
          out.push({ value: item.value, name: item.name, dataUrl })
        }
        if (!cancelled) setPreviewData({ key: previewKey, list: out })
      } catch {
        if (!cancelled) message.error('预览生成失败，请检查参数')
      }
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [previewKey, items, showAll, size, color, bgColor, errorLevel, margin, message])

  const removeItem = (value) => {
    const rest = parsed.filter((i) => i.value !== value)
    setRawInput(
      rest
        .map((i) => (i.name ? `${i.value},${i.name}` : i.value))
        .join('\n'),
    )
  }

  const importFile = (file) => {
    const reader = new FileReader()
    reader.onload = () => {
      setRawInput(String(reader.result).replace(/^\ufeff/, '').trim())
      message.success(`已导入 ${file.name}`)
    }
    reader.onerror = () => message.error('文件读取失败')
    reader.readAsText(file, 'utf-8')
    return false
  }

  const downloadZip = async () => {
    if (!items.length) return
    setProgress({ running: true, percent: 0, stage: '准备中' })
    try {
      const ext = format === 'svg' ? 'svg' : 'png'
      const zip = new JSZip()
      const namer = makeUniqueNamer()
      const manifest = ['序号,文件名,内容,备注']

      for (let i = 0; i < items.length; i += 1) {
        const item = items[i]
        const name = namer(buildFileName(item, i, options, ext))

        if (ext === 'svg') {
          zip.file(name, await renderSvg(item.value, options))
        } else {
          const dataUrl = await renderPng(item.value, options)
          zip.file(name, dataUrl.split(',')[1], { base64: true })
        }

        manifest.push(
          [i + 1, name, item.value, item.name].map(csvCell).join(','),
        )

        if (i % 4 === 0 || i === items.length - 1) {
          setProgress({
            running: true,
            percent: Math.round(((i + 1) / items.length) * 85),
            stage: `生成二维码 ${i + 1}/${items.length}`,
          })
          await nextTick()
        }
      }

      zip.file('manifest.csv', `\ufeff${manifest.join('\n')}`)
      setProgress({ running: true, percent: 90, stage: '打包中' })

      const blob = await zip.generateAsync({ type: 'blob' }, (meta) => {
        setProgress({
          running: true,
          percent: 90 + Math.round(meta.percent * 0.1),
          stage: '打包中',
        })
      })

      downloadBlob(blob, `qrcodes-${stamp()}.zip`)
      message.success(`已导出 ${items.length} 个二维码`)
    } catch {
      message.error('导出失败，请减少数量后重试')
    } finally {
      setProgress(null)
    }
  }

  const downloadSheet = async () => {
    if (!items.length) return
    setProgress({ running: true, percent: 0, stage: '准备中' })
    try {
      const sheetItems = []
      for (let i = 0; i < items.length; i += 1) {
        sheetItems.push({
          value: items[i].value,
          name: items[i].name,
          dataUrl: await renderPng(items[i].value, options),
        })
        if (i % 4 === 0 || i === items.length - 1) {
          setProgress({
            running: true,
            percent: Math.round(((i + 1) / items.length) * 90),
            stage: `生成二维码 ${i + 1}/${items.length}`,
          })
          await nextTick()
        }
      }

      setProgress({ running: true, percent: 95, stage: '拼版中' })
      const canvas = await buildContactSheet(sheetItems, options, {
        cols: sheetCols === 'auto' ? undefined : Number(sheetCols),
      })
      downloadBlob(await canvasToBlob(canvas), `qrcodes-sheet-${stamp()}.png`)
      message.success('拼版图已导出')
    } catch {
      message.error('拼版导出失败，请减少数量后重试')
    } finally {
      setProgress(null)
    }
  }

  const downloadCsv = () => {
    if (!items.length) return
    const rows = ['序号,内容,备注,是否链接']
    items.forEach((item, i) => {
      rows.push(
        [i + 1, item.value, item.name, item.isUrl ? '是' : '否']
          .map(csvCell)
          .join(','),
      )
    })
    downloadText(rows.join('\n'), `qrcodes-links-${stamp()}.csv`)
    message.success('对照表已导出')
  }

  const resetAll = () => {
    setRawInput(BATCH_SAMPLE)
    setOptions(BATCH_DEFAULTS)
    setSheetCols('auto')
    setShowAll(false)
    message.info('已恢复默认配置')
  }

  const thumbnailCount = showAll ? items.length : Math.min(items.length, PREVIEW_LIMIT)

  return (
    <div className="app-main">
      <div className="app-col">
        <Card
          className="panel"
          variant="outlined"
          title="批量链接"
          extra={<Text type="secondary">{stats.total} 行</Text>}
        >
          <Flex vertical gap={12}>
            <TextArea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder={
                '每行一个链接，支持 "链接,备注" 或从 Excel 直接粘贴：\n' +
                'https://example.com,示例站点\n' +
                'https://ant.design'
              }
              autoSize={{ minRows: 8, maxRows: 16 }}
              allowClear
            />

            <Flex gap={8} wrap align="center">
              <Upload
                accept=".txt,.csv,text/plain,text/csv"
                showUploadList={false}
                beforeUpload={importFile}
              >
                <Button icon={<UploadOutlined />}>导入 txt / csv</Button>
              </Upload>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => setRawInput(BATCH_SAMPLE)}
              >
                填入示例
              </Button>
              <Button
                icon={<ClearOutlined />}
                onClick={() => setRawInput('')}
                disabled={!rawInput}
              >
                清空
              </Button>
            </Flex>

            <Space size={[8, 8]} wrap>
              <Tag color="blue">有效 {stats.valid}</Tag>
              <Tag color={stats.invalid ? 'orange' : 'default'}>
                无效 {stats.invalid}
              </Tag>
              <Tag color={stats.duplicated ? 'purple' : 'default'}>
                重复已忽略 {stats.duplicated}
              </Tag>
              <Tag color="green">待生成 {items.length}</Tag>
            </Space>

            {stats.invalid > 0 && (
              <Alert
                type="warning"
                showIcon
                message={`有 ${stats.invalid} 条内容不像链接`}
                description={
                  <span>
                    {invalidSamples.map((i) => i.value).join('、')}
                    {stats.invalid > 3 ? ' 等' : ''}
                    {filterInvalid
                      ? '，已按当前设置过滤。'
                      : '，当前设置为保留全部内容。'}
                  </span>
                }
              />
            )}
          </Flex>
        </Card>

        <Card className="panel" variant="outlined" title="批量参数">
          <QrAppearanceFields
            value={options}
            onChange={setOptions}
            showMargin
            sizeRange={[100, 500]}
            extraFields={
              <Flex vertical gap={20}>
                <Flex vertical gap={4}>
                  <Text strong>导出格式</Text>
                  <Segmented
                    block
                    value={format}
                    onChange={(v) => patch({ format: v })}
                    options={[
                      { label: 'PNG 位图', value: 'png' },
                      { label: 'SVG 矢量', value: 'svg' },
                    ]}
                  />
                </Flex>

                <Flex vertical gap={4}>
                  <Text strong>文件名前缀</Text>
                  <Input
                    value={prefix}
                    onChange={(e) => patch({ prefix: e.target.value })}
                    placeholder="可留空，例如：活动A"
                    allowClear
                  />
                </Flex>

                <Flex vertical gap={4}>
                  <Text strong>拼版每行个数</Text>
                  <Select
                    value={sheetCols}
                    onChange={setSheetCols}
                    options={[
                      { label: '自动', value: 'auto' },
                      { label: '2 个', value: '2' },
                      { label: '3 个', value: '3' },
                      { label: '4 个', value: '4' },
                      { label: '5 个', value: '5' },
                      { label: '6 个', value: '6' },
                    ]}
                  />
                </Flex>

                <Flex vertical gap={10}>
                  <Switch
                    checked={useIndex}
                    onChange={(v) => patch({ useIndex: v })}
                    checkedChildren="文件名含序号"
                    unCheckedChildren="文件名不含序号"
                  />
                  <Switch
                    checked={filterInvalid}
                    onChange={(v) => patch({ filterInvalid: v })}
                    checkedChildren="过滤非链接内容"
                    unCheckedChildren="保留全部内容"
                  />
                </Flex>
              </Flex>
            }
          />
        </Card>
      </div>

      <div className="app-col">
        <Card
          className="panel preview"
          variant="outlined"
          title="预览与导出"
          extra={
            <Text type="secondary">
              共 {items.length} 个，预览 {thumbnailCount} 个
            </Text>
          }
        >
          {progress && (
            <Progress
              percent={progress.percent}
              status={progress.running ? 'active' : 'success'}
              format={(p) => `${progress.stage} ${p}%`}
              style={{ marginBottom: 16 }}
            />
          )}

          <div className="batch-stage">
            {items.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="暂无待生成的链接"
              />
            ) : (
              <div className="batch-grid">
                {preview.map((item, i) => (
                  <div className="batch-cell" key={item.value}>
                    <Image
                      src={item.dataUrl}
                      width={THUMB_SIZE}
                      height={THUMB_SIZE}
                      className="batch-thumb"
                      alt={item.value}
                    />
                    <Flex
                      justify="space-between"
                      align="center"
                      gap={4}
                      className="batch-cell-bar"
                    >
                      <Text
                        className="batch-cell-text"
                        ellipsis={{ tooltip: item.value }}
                      >
                        {i + 1}. {item.name || item.value}
                      </Text>
                      <Tooltip title="从列表中移除">
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => removeItem(item.value)}
                        />
                      </Tooltip>
                    </Flex>
                  </div>
                ))}
              </div>
            )}

            {previewLoading && (
              <Text type="secondary" className="batch-loading">
                正在生成预览…
              </Text>
            )}
          </div>

          {items.length > PREVIEW_LIMIT && (
            <Flex
              justify="space-between"
              align="center"
              gap={12}
              wrap
              className="batch-more"
            >
              <Text type="secondary" style={{ fontSize: 13 }}>
                预览只渲染前 {PREVIEW_LIMIT} 个以保证流畅，导出仍包含全部。
              </Text>
              <Switch
                checked={showAll}
                onChange={setShowAll}
                checkedChildren="预览全部"
                unCheckedChildren={`仅预览 ${PREVIEW_LIMIT} 个`}
              />
            </Flex>
          )}

          <Divider titlePlacement="left" plain>
            导出
          </Divider>

          <Space size={[12, 12]} wrap>
            <Button
              type="primary"
              icon={<FileZipOutlined />}
              onClick={downloadZip}
              disabled={!items.length || busy}
            >
              打包下载 ZIP
            </Button>
            <Button
              icon={<FileImageOutlined />}
              onClick={downloadSheet}
              disabled={!items.length || busy}
            >
              导出拼版图 PNG
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={downloadCsv}
              disabled={!items.length || busy}
            >
              导出对照表 CSV
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={resetAll}
              disabled={busy}
            >
              重置
            </Button>
          </Space>

          <Paragraph type="secondary" className="preview-tip">
            ZIP 内每个二维码单独成文件，并附带 <Text code>manifest.csv</Text>{' '}
            对照表；拼版图把全部二维码连同编号排在一张图上，适合打印或整版分发。
            批量模式由 <Text code>qrcode</Text> 库直接生成，因此不支持中心图标。
          </Paragraph>
        </Card>
      </div>
    </div>
  )
}
