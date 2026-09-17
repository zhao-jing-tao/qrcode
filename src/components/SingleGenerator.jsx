import { useMemo, useRef, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Empty,
  Flex,
  Input,
  QRCode,
  Radio,
  Segmented,
  Switch,
  Tooltip,
  Typography,
} from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import QrAppearanceFields from './QrAppearanceFields.jsx'
import { CHECK_ICON, PRESETS, SINGLE_DEFAULTS } from '../constants'
import { copyText, downloadDataUrl } from '../utils/download'

const { TextArea } = Input
const { Text, Paragraph, Link } = Typography

export default function SingleGenerator() {
  const { message } = AntdApp.useApp()
  const [options, setOptions] = useState(SINGLE_DEFAULTS)
  const [status, setStatus] = useState('active')

  const { value, size, color, bgColor, errorLevel, type, bordered, icon } =
    options

  const canRender = value.trim().length > 0
  const byteLength = useMemo(
    () => new TextEncoder().encode(value).length,
    [value],
  )

  const patch = (partial) => setOptions((prev) => ({ ...prev, ...partial }))

  const handleCopy = async () => {
    if (!canRender) return
    try {
      await copyText(value)
      message.success('内容已复制到剪贴板')
    } catch {
      message.error('复制失败，请手动选择文本复制')
    }
  }

  // 直接从 antd QRCode 渲染出的节点里取 canvas / svg，避免重复生成
  const handleDownload = (root) => {
    const canvas = root ? root.querySelector('canvas') : null
    if (canvas) {
      downloadDataUrl(canvas.toDataURL('image/png'), `qrcode-${Date.now()}.png`)
      message.success('二维码已下载（PNG）')
      return
    }

    const svg = root ? root.querySelector('svg') : null
    if (svg) {
      const source = new XMLSerializer().serializeToString(svg)
      downloadDataUrl(
        `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`,
        `qrcode-${Date.now()}.svg`,
      )
      message.success('二维码已下载（SVG）')
      return
    }

    message.warning('暂无可下载的二维码')
  }

  const previewRef = useRef(null)

  return (
    <div className="app-main">
      <Card
        className="panel"
        variant="outlined"
        title="内容与参数"
        extra={<Text type="secondary">{byteLength} 字节</Text>}
      >
        <Flex vertical gap={8}>
          <Text strong>二维码内容</Text>
          <TextArea
            value={value}
            onChange={(e) => patch({ value: e.target.value })}
            placeholder="输入网址、文本、Wi-Fi 配置或短信内容…"
            autoSize={{ minRows: 4, maxRows: 8 }}
            showCount
            maxLength={1000}
            status={canRender ? undefined : 'error'}
            allowClear
          />
          {!canRender && (
            <Text type="danger">内容不能为空，请输入后再生成二维码</Text>
          )}
          <Radio.Group
            size="small"
            optionType="button"
            buttonStyle="solid"
            value={PRESETS.some((p) => p.value === value) ? value : null}
            onChange={(e) => patch({ value: e.target.value })}
            options={PRESETS.map((p) => ({
              label: p.label,
              value: p.value,
            }))}
          />
        </Flex>

        <QrAppearanceFields
          value={options}
          onChange={setOptions}
          extraFields={
            <>
              <Flex vertical gap={4}>
                <Text strong>渲染方式</Text>
                <Segmented
                  block
                  value={type}
                  onChange={(v) => patch({ type: v })}
                  options={[
                    { label: 'Canvas 位图', value: 'canvas' },
                    { label: 'SVG 矢量', value: 'svg' },
                  ]}
                />
              </Flex>
              <Flex vertical gap={10}>
                <Switch
                  checked={bordered}
                  onChange={(v) => patch({ bordered: v })}
                  checkedChildren="显示边框"
                  unCheckedChildren="无边框"
                />
                <Switch
                  checked={icon}
                  onChange={(v) => patch({ icon: v })}
                  checkedChildren="带中心图标"
                  unCheckedChildren="无中心图标"
                />
              </Flex>
            </>
          }
        />
      </Card>

      <Card className="panel preview" variant="outlined" title="预览">
        <div className="preview-stage" ref={previewRef}>
          {canRender ? (
            <QRCode
              value={value}
              size={size}
              type={type}
              color={color}
              bgColor={bgColor}
              errorLevel={errorLevel}
              bordered={bordered}
              icon={icon ? CHECK_ICON : undefined}
              iconSize={size / 4.5}
              status={status}
              onRefresh={() => setStatus('active')}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="请输入二维码内容"
            />
          )}
        </div>

        <Flex gap={12} wrap justify="center" className="preview-actions">
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(previewRef.current)}
            disabled={!canRender}
          >
            下载二维码
          </Button>
          <Tooltip title="复制当前内容">
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopy}
              disabled={!canRender}
            >
              复制内容
            </Button>
          </Tooltip>
          <Button
            icon={<ReloadOutlined />}
            onClick={() =>
              setStatus(status === 'active' ? 'expired' : 'active')
            }
            disabled={!canRender}
          >
            切换过期状态
          </Button>
        </Flex>

        <Paragraph type="secondary" className="preview-tip">
          预览使用 antd 的 <Text code>QRCode</Text> 组件渲染，右侧参数实时生效。
          更多用法见{' '}
          <Link
            href="https://ant.design/components/qr-code-cn"
            target="_blank"
            rel="noreferrer"
          >
            官方文档
          </Link>
          。
        </Paragraph>
      </Card>
    </div>
  )
}
