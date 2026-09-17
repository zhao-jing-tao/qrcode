import {
  ColorPicker,
  Divider,
  Flex,
  Select,
  Slider,
  Typography,
} from 'antd'
import { ERROR_LEVELS } from '../constants'

const { Text } = Typography

/**
 * 单个 / 批量两种模式共用的外观参数表单。
 * 模式专属字段通过 extraFields 传入，渲染在颜色选择器之后。
 */
export default function QrAppearanceFields({
  value,
  onChange,
  showMargin = false,
  sizeRange = [100, 400],
  extraFields = null,
}) {
  const [minSize, maxSize] = sizeRange
  const patch = (partial) => onChange({ ...value, ...partial })

  return (
    <>
      <Divider titlePlacement="left" plain>
        外观
      </Divider>

      <Flex vertical gap={20}>
        <Flex vertical gap={4}>
          <Flex justify="space-between" align="center">
            <Text strong>尺寸</Text>
            <Text type="secondary">{value.size} px</Text>
          </Flex>
          <Slider
            min={minSize}
            max={maxSize}
            step={10}
            value={value.size}
            onChange={(size) => patch({ size })}
            marks={{ [minSize]: `${minSize}`, [maxSize]: `${maxSize}` }}
          />
        </Flex>

        <Flex gap={16} wrap>
          <Flex vertical gap={4} flex={1} style={{ minWidth: 150 }}>
            <Text strong>前景色</Text>
            <ColorPicker
              value={value.color}
              showText
              disabledAlpha
              onChangeComplete={(c) => patch({ color: c.toHexString() })}
            />
          </Flex>
          <Flex vertical gap={4} flex={1} style={{ minWidth: 150 }}>
            <Text strong>背景色</Text>
            <ColorPicker
              value={value.bgColor}
              showText
              disabledAlpha
              onChangeComplete={(c) => patch({ bgColor: c.toHexString() })}
            />
          </Flex>
        </Flex>

        {extraFields}

        {showMargin && (
          <Flex vertical gap={4}>
            <Flex justify="space-between" align="center">
              <Text strong>白边</Text>
              <Text type="secondary">{value.margin} 模块</Text>
            </Flex>
            <Slider
              min={0}
              max={4}
              step={1}
              value={value.margin}
              onChange={(margin) => patch({ margin })}
              marks={{ 0: '0', 1: '1', 4: '4' }}
            />
          </Flex>
        )}
      </Flex>

      <Divider titlePlacement="left" plain>
        高级
      </Divider>

      <Flex vertical gap={4}>
        <Text strong>容错级别</Text>
        <Select
          value={value.errorLevel}
          onChange={(errorLevel) => patch({ errorLevel })}
          options={ERROR_LEVELS}
        />
        <Text type="secondary" style={{ fontSize: 12 }}>
          容错级别越高，二维码越密集，被遮挡后也越容易识别。
        </Text>
      </Flex>
    </>
  )
}
