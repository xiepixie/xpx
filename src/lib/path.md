# 路径处理工具

本文档介绍了 `path.js` 中提供的路径处理工具，这些工具用于处理项目中的路径，确保它们能够根据环境变量正确工作。

## 环境变量

路径处理工具使用以下环境变量：

- `PUBLIC_USE_BASE_PATH`: 是否使用基础路径前缀 (true/false)
- `PUBLIC_BASE_PATH`: 基础路径 (不包含前导斜杠和尾部斜杠)
- `SITE_URL`: 站点 URL (用于生成站点地图和绝对 URL)

这些环境变量可以在 `.env` 文件中设置，例如：

```
PUBLIC_USE_BASE_PATH=true
PUBLIC_BASE_PATH=xpx
SITE_URL=https://xiepixie.github.io
```

## 函数

### getPath(path)

将相对路径转换为包含基础路径前缀的路径。

```javascript
import { getPath } from '../lib/path'

// 如果 PUBLIC_USE_BASE_PATH=true 且 PUBLIC_BASE_PATH=xpx
getPath('about') // 返回 "/xpx/about"
getPath('/about') // 返回 "/xpx/about"
getPath('blog/post-1') // 返回 "/xpx/blog/post-1"
getPath('https://example.com') // 返回 "https://example.com"（外部链接不变）
```

### getFullUrl(path, baseUrl)

将相对路径转换为完整的 URL。

```javascript
import { getFullUrl } from '../lib/path'

// 如果 SITE_URL=https://xiepixie.github.io
getFullUrl('about') // 返回 "https://xiepixie.github.io/xpx/about"
getFullUrl('/about') // 返回 "https://xiepixie.github.io/xpx/about"
getFullUrl('https://example.com') // 返回 "https://example.com"（外部链接不变）
getFullUrl('about', 'https://custom-domain.com') // 返回 "https://custom-domain.com/xpx/about"
```

### isExternalLink(path)

检查路径是否为外部链接。

```javascript
import { isExternalLink } from '../lib/path'

isExternalLink('about') // 返回 false
isExternalLink('/about') // 返回 false
isExternalLink('https://example.com') // 返回 true
isExternalLink('http://example.com') // 返回 true
isExternalLink('//example.com') // 返回 true
```

### getRelativePath(path)

将路径转换为相对路径，移除基础路径前缀。

```javascript
import { getRelativePath } from '../lib/path'

// 如果 PUBLIC_USE_BASE_PATH=true 且 PUBLIC_BASE_PATH=xpx
getRelativePath('about') // 返回 "/about"
getRelativePath('/about') // 返回 "/about"
getRelativePath('/xpx/about') // 返回 "/about"
getRelativePath('https://example.com') // 返回 "https://example.com"（外部链接不变）
```

### getBasePath()

获取基础路径前缀。

```javascript
import { getBasePath } from '../lib/path'

// 如果 PUBLIC_USE_BASE_PATH=true 且 PUBLIC_BASE_PATH=xpx
getBasePath() // 返回 "/xpx/"

// 如果 PUBLIC_USE_BASE_PATH=false 或 PUBLIC_BASE_PATH=""
getBasePath() // 返回 "/"
```

## 使用示例

### 在 Astro 组件中使用

```astro
---
import { getPath } from '../lib/path'
---

<a href={getPath('about')}>关于我们</a>
<img src={getPath('/images/logo.png')} alt="Logo" />
```

### 在 JavaScript 中使用

```javascript
import { getPath, getFullUrl } from '../lib/path'

// 导航到某个页面
window.location.href = getPath('blog/post-1')

// 获取图片的完整 URL
const imageUrl = getFullUrl('images/logo.png')
```

### 在 HeaderLink 组件中使用

```astro
---
import { getPath, getRelativePath } from '../lib/path'

const { href } = Astro.props
const pathname = getRelativePath(Astro.url.pathname)
const processedHref = typeof href === 'string' ? getPath(href) : href
---

<a href={processedHref}>链接文本</a>
```
