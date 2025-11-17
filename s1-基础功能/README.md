# OneChat 注入脚本集成指南

## 概述

本文档说明如何将 OneChat 的 preload 脚本集成到 PakePlus 项目中。

## 集成方式

PakePlus 使用 Tauri 的 `initialization_script` 功能在页面加载前注入 JavaScript 代码。

### 核心机制

在 `src-tauri/src/utils/init.rs` 文件中：

```rust
let window = tauri::WebviewWindowBuilder::from_config(app_handle, &config)
    .unwrap()
    .initialization_script(include_str!("../../data/custom.js"))
    .build()
    .unwrap();
```

这行代码会在 WebView 创建时立即加载 `src-tauri/data/custom.js` 文件中的脚本。

## 集成步骤

### 方式一：替换 custom.js（推荐用于 OneChat 专用版本）

1. 备份原始的 `custom.js`：
   ```bash
   copy src-tauri\data\custom.js src-tauri\data\custom.js.backup
   ```

2. 将 `onechat-custom.js` 复制到 `src-tauri/data/custom.js`：
   ```bash
   copy s1-基础功能\onechat-custom.js src-tauri\data\custom.js
   ```

3. 重新编译项目：
   ```bash
   pnpm run tauri:build
   ```

### 方式二：合并脚本（推荐用于保留原有功能）

1. 打开 `src-tauri/data/custom.js`

2. 在文件末尾添加 OneChat 脚本内容（参考 `onechat-custom.js`）

3. 确保原有的 `hookClick` 和 `window.open` 功能保持不变

4. 重新编译项目

## 文件说明

### onechat-custom.js

这是完整的注入脚本，包含：

1. **原 PakePlus 功能**：
   - `hookClick`：处理链接点击，防止打开新窗口
   - `window.open` 重写：将新窗口打开转为当前窗口跳转

2. **OneChat 功能**：
   - 域名文本替换（lmarena.ai → onechat.ai）
   - 页面元素修改（Logo 替换、横幅隐藏等）
   - 防闪现机制
   - MutationObserver 持续监听
   - 定期检查机制

### 配置说明

在 `onechat-custom.js` 中可以通过 `GLOBAL_CONFIG` 对象配置功能：

```javascript
const GLOBAL_CONFIG = {
  verbose: true,                    // 是否启用详细日志
  enableDomainReplacement: true,    // 域名替换
  enablePageModifications: true,    // 页面修改
  enableAntiFlash: true,            // 防闪现
  antiFlashDelay: 200,              // 防闪现延迟（ms）
  enableMutationObserver: true,     // 持久化监听
  enablePeriodicCheck: true,        // 定期检查
  periodicCheckInterval: 100,       // 检查间隔（ms）
};
```

## 测试

### 本地开发测试

```bash
pnpm run tauri:dev
```

在开发模式下，右键点击页面可以打开开发者工具查看日志。

### 构建测试

```bash
pnpm run tauri:build
```

构建完成后，在 `src-tauri/target/release` 目录下找到可执行文件进行测试。

## 调试

### 查看日志

在浏览器控制台中可以看到以下日志：

- `[OneChat-Manager]`：执行管理器日志
- `[OneChat-DomainReplace]`：域名替换日志
- `[OneChat-PageMod]`：页面修改日志
- `[OneChat-AntiFlash]`：防闪现日志

### 手动触发

在控制台中可以使用以下命令：

```javascript
// 手动应用所有修改
window.OneChat.applyAll()

// 显示页面
window.OneChat.showPage()

// 隐藏页面
window.OneChat.hidePage()

// 查看配置
window.OneChat.config
```

## 注意事项

1. **脚本执行时机**：脚本会在页面加载的最早期执行，甚至在 DOM 构建之前
2. **兼容性**：确保不要删除原有的 `hookClick` 和 `window.open` 功能
3. **性能**：定期检查和 MutationObserver 会持续运行，注意性能影响
4. **调试模式**：开发时建议设置 `verbose: true` 查看详细日志

## 常见问题

### Q: 修改后没有生效？

A: 确保重新编译了项目，并且清除了浏览器缓存。

### Q: 如何禁用某个功能？

A: 在 `GLOBAL_CONFIG` 中将对应的开关设置为 `false`。

### Q: 如何添加新的域名替换？

A: 在 `DomainReplacementModule.domainMapping` 中添加新的映射关系。

### Q: 页面出现闪现怎么办？

A: 调整 `antiFlashDelay` 参数，增加延迟时间。

## 版本信息

- OneChat 脚本版本：1.1.0
- PakePlus 版本：1.0.2
- 集成日期：2025-11-17
