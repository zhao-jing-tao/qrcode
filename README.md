# 二维码生成器

基于 **React 19 + Vite + Ant Design v6** 的二维码生成器示例项目。

## 技术栈

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| React | 19 | UI 框架 |
| Vite | 8 | 构建工具（rolldown 内核） |
| Ant Design | 6 | 组件库 |
| @ant-design/icons | 6 | 图标库 |
| qrcode | 1.5 | 批量模式的二维码生成 |
| jszip | 3.10 | 批量打包导出 |
| oxlint | 1 | 代码检查 |

## 快速开始

```bash
npm install      # 安装依赖
npm run dev      # 启动开发服务器（自动打开浏览器）
npm run build    # 生产构建，输出到 dist/
npm run preview  # 本地预览构建产物
npm run lint     # 代码检查
```

## 目录结构

```
二维码生成/
├── index.html          # HTML 入口
├── vite.config.js      # Vite 配置（含 @ -> src 别名）
├── public/
│   └── favicon.svg
└── src/
    ├── main.jsx              # 入口：ConfigProvider + 中文语言包 + 主题
    ├── App.jsx               # 页面骨架 + 单个/批量两个标签页
    ├── App.css               # 页面样式
    ├── index.css             # 全局基础样式
    ├── constants.js          # 默认参数、预设、容错级别
    ├── components/
    │   ├── SingleGenerator.jsx    # 单个生成
    │   ├── BatchGenerator.jsx     # 批量链接生成与导出
    │   └── QrAppearanceFields.jsx # 两种模式共用的外观参数表单
    └── utils/
        ├── qr.js             # 链接解析、文件命名、二维码渲染、拼版图
        └── download.js       # 下载与导出工具
```

> 单个模式用 antd 的 `QRCode` 组件渲染，批量模式用 `qrcode` 库
> 直接生成图片数据，因此批量导出不依赖 DOM，也不受预览条数限制。

## Ant Design 接入说明

`src/main.jsx` 中完成了全局配置：

- `ConfigProvider` 注入中文语言包 `antd/locale/zh_CN`
- 通过 `theme.token` 定制主色 `#1677ff`、圆角等设计变量
- `<AntdApp>` 包裹应用，使 `message` / `notification` / `modal` 支持
  `App.useApp()` 的上下文调用
- 引入 `antd/dist/reset.css` 重置基础样式

## 功能

### 单个生成

- 文本 / 网址 / Wi-Fi / 短信快捷预设
- 实时预览，可调尺寸（100–400px）、前景色、背景色
- 容错级别 L / M / Q / H
- Canvas 位图与 SVG 矢量两种渲染方式，分别导出 `.png` / `.svg`
- 边框开关、中心图标开关、过期状态演示
- 一键复制内容、重置配置

### 批量链接导出

- 每行一个链接，支持 `链接,备注` 或从 Excel 直接粘贴（逗号/制表符分隔）
- 自动去重，并区分「有效链接 / 无效内容 / 重复项」并给出统计
- 支持导入 `.txt` / `.csv` 文件，可单条移除
- 三种导出方式：
  - **打包下载 ZIP**：每个二维码单独成文件，附带 `manifest.csv` 对照表
  - **导出拼版图 PNG**：全部二维码连同编号排在一张图上，每行个数可调，适合打印
  - **导出对照表 CSV**：序号 / 内容 / 备注 / 是否链接
- 文件名规则：`前缀_序号_备注.扩展名`，重名自动加 `-2`、`-3` 后缀
- 批量生成时显示进度条，导出的是全部条目（预览只渲染前 24 条以保证流畅）

### 批量输入格式

```
https://a.com,站点A        ← 逗号分隔备注
https://b.com	站点B        ← 制表符（Excel 粘贴）
https://c.com              ← 只有链接
```

链接自带查询参数时不会误拆，例如 `https://c.com/?x=1,y=2` 会整体作为一条。

## 别名

`@` 已指向 `src` 目录：

```js
import Foo from '@/components/Foo.jsx'
```
