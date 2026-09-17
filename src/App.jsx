import { useState } from 'react'
import { Flex, Space, Tabs, Typography } from 'antd'
import { AppstoreOutlined, QrcodeOutlined } from '@ant-design/icons'
import SingleGenerator from './components/SingleGenerator.jsx'
import BatchGenerator from './components/BatchGenerator.jsx'
import './App.css'

const { Title, Text } = Typography

export default function App() {
  const [tab, setTab] = useState('single')

  return (
    <div className="app">
      <header className="app-header">
        <Flex align="center" justify="space-between" wrap gap={16}>
          <Space size={12} align="center">
            <span className="app-logo">
              <QrcodeOutlined />
            </span>
            <div>
              <Title level={3} style={{ margin: 0 }}>
                二维码生成器
              </Title>
              <Text type="secondary">React 19 + Vite + Ant Design v6</Text>
            </div>
          </Space>
          <Text type="secondary">单个生成 · 批量链接导出</Text>
        </Flex>
      </header>

      <Tabs
        className="app-tabs"
        activeKey={tab}
        onChange={setTab}
        items={[
          {
            key: 'single',
            label: (
              <Space size={6}>
                <QrcodeOutlined />
                单个生成
              </Space>
            ),
            children: <SingleGenerator />,
          },
          {
            key: 'batch',
            label: (
              <Space size={6}>
                <AppstoreOutlined />
                批量生成
              </Space>
            ),
            children: <BatchGenerator />,
          },
        ]}
      />
    </div>
  )
}
