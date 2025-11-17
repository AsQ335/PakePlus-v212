/**
 * PakePlus + OneChat 统一注入脚本
 * 
 * 整合功能：
 * 0. Cloudflare 反检测：WebRTC 保护、浏览器指纹修改、Canvas/WebGL 保护
 * 1. PakePlus 原有功能：链接处理、window.open 重写
 * 2. OneChat 功能：域名替换、页面元素修改、防闪现
 * 
 * 版本：1.1.0
 * 创建日期：2025-11-17
 * 更新日期：2025-11-17
 * 
 * 更新说明 v1.1.0：
 * - 添加 Cloudflare 反检测模块
 * - 防止 WebRTC IP 泄露
 * - 修改浏览器指纹
 * - Canvas/WebGL 指纹保护
 */

// ==================== 0. Cloudflare 反检测模块（最优先执行） ====================
// 必须在所有代码之前执行，防止 Cloudflare 检测

(function() {
  'use strict';
  
  console.log('=== [AntiDetect] Cloudflare 反检测模块启动 ===');
  
  // 反检测配置
  const ANTI_DETECT_CONFIG = {
    enableWebRTCProtection: true,      // WebRTC IP 泄露保护
    enableFingerprintModification: true, // 浏览器指纹修改
    enableCanvasProtection: true,       // Canvas 指纹保护
    enableWebGLProtection: true,        // WebGL 指纹保护
    enableTimezoneModification: true,   // 时区修改
    enableMediaDevicesBlock: true,      // 禁用媒体设备
    verbose: true                       // 详细日志
  };
  
  function log(message, type = 'info') {
    if (!ANTI_DETECT_CONFIG.verbose) return;
    const prefix = '[AntiDetect]';
    const emoji = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
    console.log(`${prefix} ${emoji[type]} ${message}`);
  }
  
  // ==================== 1. WebRTC 保护（防止 IP 泄露）====================
  
  if (ANTI_DETECT_CONFIG.enableWebRTCProtection) {
    log('开始配置 WebRTC 保护...');
    
    // 保护 RTCPeerConnection
    if (window.RTCPeerConnection) {
      const OriginalRTCPeerConnection = window.RTCPeerConnection;
      
      window.RTCPeerConnection = function(configuration, constraints) {
        log('拦截 RTCPeerConnection 创建');
        
        // 强制配置：不使用 STUN/TURN，防止 IP 泄露
        if (!configuration) configuration = {};
        
        // 清空所有 ICE 服务器
        configuration.iceServers = [];
        
        // 强制使用 relay 模式（如果有 TURN 服务器）
        configuration.iceTransportPolicy = 'relay';
        
        // 禁用 IPv6
        configuration.iceCandidatePoolSize = 0;
        
        const pc = new OriginalRTCPeerConnection(configuration, constraints);
        
        // 拦截 createOffer
        const originalCreateOffer = pc.createOffer;
        pc.createOffer = function(options) {
          log('拦截 createOffer');
          options = options || {};
          options.offerToReceiveAudio = false;
          options.offerToReceiveVideo = false;
          return originalCreateOffer.call(this, options);
        };
        
        // 拦截 createAnswer
        const originalCreateAnswer = pc.createAnswer;
        pc.createAnswer = function(options) {
          log('拦截 createAnswer');
          options = options || {};
          return originalCreateAnswer.call(this, options);
        };
        
        // 拦截 onicecandidate，过滤本地 IP
        const originalOnIceCandidate = pc.onicecandidate;
        Object.defineProperty(pc, 'onicecandidate', {
          set: function(handler) {
            originalOnIceCandidate.call(pc, function(event) {
              if (event.candidate) {
                const candidate = event.candidate.candidate;
                
                // 过滤包含本地 IP 的 candidate
                if (candidate.includes('192.168.') || 
                    candidate.includes('10.') || 
                    candidate.includes('172.16.') ||
                    candidate.includes('172.17.') ||
                    candidate.includes('172.18.') ||
                    candidate.includes('172.19.') ||
                    candidate.includes('172.20.') ||
                    candidate.includes('172.21.') ||
                    candidate.includes('172.22.') ||
                    candidate.includes('172.23.') ||
                    candidate.includes('172.24.') ||
                    candidate.includes('172.25.') ||
                    candidate.includes('172.26.') ||
                    candidate.includes('172.27.') ||
                    candidate.includes('172.28.') ||
                    candidate.includes('172.29.') ||
                    candidate.includes('172.30.') ||
                    candidate.includes('172.31.') ||
                    candidate.includes('127.0.0.1') ||
                    candidate.includes('0.0.0.0') ||
                    candidate.includes('::1') ||
                    candidate.includes('fe80:') ||
                    candidate.includes('fc00:') ||
                    candidate.includes('fd00:')) {
                  log('过滤本地 IP candidate: ' + candidate, 'warning');
                  return; // 不触发回调
                }
              }
              
              if (handler) {
                return handler.call(this, event);
              }
            });
          },
          get: function() {
            return originalOnIceCandidate;
          }
        });
        
        return pc;
      };
      
      // 复制原型和静态属性
      window.RTCPeerConnection.prototype = OriginalRTCPeerConnection.prototype;
      Object.setPrototypeOf(window.RTCPeerConnection, OriginalRTCPeerConnection);
      
      log('RTCPeerConnection 保护已启用', 'success');
    }
    
    // 保护 webkitRTCPeerConnection（兼容性）
    if (window.webkitRTCPeerConnection) {
      window.webkitRTCPeerConnection = window.RTCPeerConnection;
      log('webkitRTCPeerConnection 保护已启用', 'success');
    }
    
    // 保护 mozRTCPeerConnection（兼容性）
    if (window.mozRTCPeerConnection) {
      window.mozRTCPeerConnection = window.RTCPeerConnection;
      log('mozRTCPeerConnection 保护已启用', 'success');
    }
  }
  
  // ==================== 2. 禁用媒体设备（防止设备指纹）====================
  
  if (ANTI_DETECT_CONFIG.enableMediaDevicesBlock) {
    log('开始禁用媒体设备...');
    
    // 禁用 getUserMedia
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia = function() {
        log('拦截 getUserMedia 调用', 'warning');
        return Promise.reject(new DOMException('Permission denied', 'NotAllowedError'));
      };
      log('getUserMedia 已禁用', 'success');
    }
    
    // 禁用 enumerateDevices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices = function() {
        log('拦截 enumerateDevices 调用', 'warning');
        return Promise.resolve([]);
      };
      log('enumerateDevices 已禁用', 'success');
    }
    
    // 禁用旧版 getUserMedia
    if (navigator.getUserMedia) {
      navigator.getUserMedia = function(constraints, success, error) {
        log('拦截旧版 getUserMedia 调用', 'warning');
        if (error) error(new DOMException('Permission denied', 'NotAllowedError'));
      };
    }
  }
  
  // ==================== 3. 浏览器指纹修改 ====================
  
  if (ANTI_DETECT_CONFIG.enableFingerprintModification) {
    log('开始修改浏览器指纹...');
    
    // 定义目标指纹（模拟真实 Chrome 浏览器）
    const targetFingerprint = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      appVersion: '5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      platform: 'Win32',
      vendor: 'Google Inc.',
      language: 'zh-CN',
      languages: ['zh-CN', 'zh', 'en-US', 'en'],
      hardwareConcurrency: 8,
      deviceMemory: 8,
      maxTouchPoints: 0,
      productSub: '20030107',
      vendorSub: ''
    };
    
    // 修改 navigator 属性
    for (const [key, value] of Object.entries(targetFingerprint)) {
      try {
        Object.defineProperty(navigator, key, {
          get: function() { return value; },
          configurable: true,
          enumerable: true
        });
      } catch (e) {
        log(`无法修改 navigator.${key}: ${e.message}`, 'warning');
      }
    }
    
    // 隐藏 webdriver 标志
    try {
      Object.defineProperty(navigator, 'webdriver', {
        get: function() { return undefined; },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      log('无法隐藏 webdriver 标志', 'warning');
    }
    
    // 修改 plugins（模拟真实浏览器插件）
    try {
      Object.defineProperty(navigator, 'plugins', {
        get: function() {
          return [
            {
              0: { type: "application/pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: null },
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Plugin"
            },
            {
              0: { type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format", enabledPlugin: null },
              description: "Portable Document Format",
              filename: "internal-pdf-viewer",
              length: 1,
              name: "Chrome PDF Viewer"
            },
            {
              0: { type: "application/x-nacl", suffixes: "", description: "Native Client Executable", enabledPlugin: null },
              1: { type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable", enabledPlugin: null },
              description: "",
              filename: "internal-nacl-plugin",
              length: 2,
              name: "Native Client"
            }
          ];
        },
        configurable: true,
        enumerable: true
      });
    } catch (e) {
      log('无法修改 plugins', 'warning');
    }
    
    // 添加 chrome 对象（模拟 Chrome 浏览器）
    if (!window.chrome) {
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };
      log('chrome 对象已添加', 'success');
    }
    
    // 修改 permissions API
    if (navigator.permissions && navigator.permissions.query) {
      const originalQuery = navigator.permissions.query;
      navigator.permissions.query = function(parameters) {
        if (parameters.name === 'notifications') {
          return Promise.resolve({ state: 'prompt', onchange: null });
        }
        return originalQuery.apply(this, arguments);
      };
    }
    
    log('浏览器指纹修改完成', 'success');
  }
  
  // ==================== 4. Canvas 指纹保护 ====================
  
  if (ANTI_DETECT_CONFIG.enableCanvasProtection) {
    log('开始配置 Canvas 指纹保护...');
    
    // 生成一致的随机噪声（基于域名，确保同一网站噪声一致）
    function getConsistentNoise() {
      const domain = window.location.hostname || 'default';
      let hash = 0;
      for (let i = 0; i < domain.length; i++) {
        hash = ((hash << 5) - hash) + domain.charCodeAt(i);
        hash = hash & hash;
      }
      return (Math.abs(hash) % 10) * 0.01; // 0.00 - 0.09
    }
    
    const noise = getConsistentNoise();
    
    // 重写 toDataURL
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const context = this.getContext('2d');
      
      if (context && this.width > 0 && this.height > 0) {
        try {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          
          // 添加微小噪声（不影响视觉效果）
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
            imageData.data[i + 1] = Math.min(255, Math.max(0, imageData.data[i + 1] + noise));
            imageData.data[i + 2] = Math.min(255, Math.max(0, imageData.data[i + 2] + noise));
          }
          
          context.putImageData(imageData, 0, 0);
        } catch (e) {
          // 忽略跨域错误
        }
      }
      
      return originalToDataURL.apply(this, arguments);
    };
    
    // 重写 toBlob
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(callback, type, quality) {
      const context = this.getContext('2d');
      
      if (context && this.width > 0 && this.height > 0) {
        try {
          const imageData = context.getImageData(0, 0, this.width, this.height);
          
          for (let i = 0; i < imageData.data.length; i += 4) {
            imageData.data[i] = Math.min(255, Math.max(0, imageData.data[i] + noise));
          }
          
          context.putImageData(imageData, 0, 0);
        } catch (e) {
          // 忽略错误
        }
      }
      
      return originalToBlob.apply(this, arguments);
    };
    
    log('Canvas 指纹保护已启用', 'success');
  }
  
  // ==================== 5. WebGL 指纹保护 ====================
  
  if (ANTI_DETECT_CONFIG.enableWebGLProtection) {
    log('开始配置 WebGL 指纹保护...');
    
    if (window.WebGLRenderingContext) {
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        // 修改 VENDOR 和 RENDERER（模拟常见显卡）
        if (parameter === 37445) { // UNMASKED_VENDOR_WEBGL
          return 'Intel Inc.';
        }
        if (parameter === 37446) { // UNMASKED_RENDERER_WEBGL
          return 'Intel(R) UHD Graphics 630';
        }
        
        return getParameter.apply(this, arguments);
      };
      
      log('WebGL 指纹保护已启用', 'success');
    }
    
    // WebGL2 保护
    if (window.WebGL2RenderingContext) {
      const getParameter2 = WebGL2RenderingContext.prototype.getParameter;
      
      WebGL2RenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) return 'Intel Inc.';
        if (parameter === 37446) return 'Intel(R) UHD Graphics 630';
        return getParameter2.apply(this, arguments);
      };
    }
  }
  
  // ==================== 6. 时区修改 ====================
  
  if (ANTI_DETECT_CONFIG.enableTimezoneModification) {
    log('开始配置时区修改...');
    
    // 修改 getTimezoneOffset（UTC+8 中国时区）
    const originalGetTimezoneOffset = Date.prototype.getTimezoneOffset;
    Date.prototype.getTimezoneOffset = function() {
      return -480; // UTC+8
    };
    
    // 修改 Intl.DateTimeFormat
    if (window.Intl && window.Intl.DateTimeFormat) {
      const OriginalDateTimeFormat = Intl.DateTimeFormat;
      
      Intl.DateTimeFormat = function() {
        const dtf = new OriginalDateTimeFormat(...arguments);
        const originalResolvedOptions = dtf.resolvedOptions;
        
        dtf.resolvedOptions = function() {
          const options = originalResolvedOptions.call(this);
          options.timeZone = 'Asia/Shanghai';
          return options;
        };
        
        return dtf;
      };
      
      Intl.DateTimeFormat.prototype = OriginalDateTimeFormat.prototype;
    }
    
    log('时区修改完成（UTC+8）', 'success');
  }
  
  // ==================== 7. 其他反检测措施 ====================
  
  // 隐藏自动化标志
  delete navigator.__proto__.webdriver;
  
  // 修改 connection 属性（模拟真实网络）
  if (navigator.connection) {
    try {
      Object.defineProperty(navigator.connection, 'rtt', {
        get: function() { return 50; },
        configurable: true
      });
    } catch (e) {}
  }
  
  // 修改 battery API（防止电池指纹）
  if (navigator.getBattery) {
    const originalGetBattery = navigator.getBattery;
    navigator.getBattery = function() {
      return originalGetBattery.call(this).then(battery => {
        Object.defineProperty(battery, 'charging', {
          get: function() { return true; }
        });
        Object.defineProperty(battery, 'level', {
          get: function() { return 1.0; }
        });
        return battery;
      });
    };
  }
  
  console.log('=== [AntiDetect] Cloudflare 反检测模块启动完成 ===');
  
})();

// ==================== PakePlus 原有功能 ====================

(function() {
  'use strict';

  // ==================== PakePlus 原有功能 ====================
  
  /**
   * 处理链接点击，防止打开新窗口
   */
  const hookClick = (e) => {
    const origin = e.target.closest('a')
    const isBaseTargetBlank = document.querySelector(
      'head base[target="_blank"]'
    )
    console.log('origin', origin, isBaseTargetBlank)
    if (
      (origin && origin.href && origin.target === '_blank') ||
      (origin && origin.href && isBaseTargetBlank)
    ) {
      e.preventDefault()
      console.log('handle origin', origin)
      location.href = origin.href
    } else {
      console.log('not handle origin', origin)
    }
  }

  /**
   * 重写 window.open，将新窗口打开转为当前窗口跳转
   */
  window.open = function (url, target, features) {
    console.log('open', url, target, features)
    location.href = url
  }

  document.addEventListener('click', hookClick, { capture: true })

  // ==================== OneChat 功能开始 ====================
  
  console.log('[OneChat] 统一注入脚本开始执行');
  console.log('[OneChat] readyState:', document.readyState);
  console.log('[OneChat] URL:', window.location.href);

  // ==================== 全局配置 ====================
  
  const GLOBAL_CONFIG = {
    // 是否启用详细日志
    verbose: true,
    
    // 功能开关
    enableDomainReplacement: true,  // 域名替换
    enablePageModifications: true,  // 页面修改
    
    // 防闪现配置
    enableAntiFlash: true,
    antiFlashDelay: 200, // ms
    
    // 持久化监听配置
    enableMutationObserver: true,
    enablePeriodicCheck: true,
    periodicCheckInterval: 100, // ms
  };

  // ==================== 工具函数 ====================
  
  /**
   * 统一日志输出
   */
  function log(module, message, type = 'info') {
    if (!GLOBAL_CONFIG.verbose && type === 'info') return;
    
    const prefix = `[OneChat-${module}]`;
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };
    
    const logFn = type === 'error' ? console.error : 
                  type === 'warning' ? console.warn : 
                  console.log;
    
    logFn(`${prefix} ${emoji[type]} ${message}`);
  }

  /**
   * 安全执行函数
   */
  function safeExecute(module, name, fn) {
    try {
      const result = fn();
      if (result) {
        log(module, `${name} - 成功`, 'success');
        return true;
      } else {
        log(module, `${name} - 未找到元素`, 'warning');
        return false;
      }
    } catch (error) {
      log(module, `${name} - 错误: ${error.message}`, 'error');
      return false;
    }
  }

  // ==================== 模块 1：防闪现机制 ====================
  
  const AntiFlashModule = {
    initialHideStyle: null,
    pageHidden: false,
    
    /**
     * 临时隐藏页面，防止原始内容闪现
     */
    hide() {
      if (this.pageHidden || !GLOBAL_CONFIG.enableAntiFlash) return;
      
      if (document.documentElement) {
        this.initialHideStyle = document.createElement('style');
        this.initialHideStyle.id = 'oc-initial-hide';
        this.initialHideStyle.textContent = `
          body { opacity: 0 !important; transition: none !important; }
        `;
        
        const target = document.head || document.documentElement;
        target.appendChild(this.initialHideStyle);
        this.pageHidden = true;
        log('AntiFlash', '已临时隐藏页面（opacity: 0），防止闪现');
      } else {
        // documentElement 还不存在，使用 MutationObserver 监听
        const observer = new MutationObserver(() => {
          if (document.documentElement) {
            observer.disconnect();
            this.hide();
          }
        });
        observer.observe(document, { childList: true, subtree: true });
      }
    },
    
    /**
     * 显示页面
     */
    show() {
      if (!this.pageHidden) return;
      
      if (this.initialHideStyle && this.initialHideStyle.parentNode) {
        this.initialHideStyle.parentNode.removeChild(this.initialHideStyle);
        this.initialHideStyle = null;
        this.pageHidden = false;
        log('AntiFlash', '已显示页面内容');
      }
    }
  };

  // ==================== 立即执行：防闪现 ====================
  
  // 立即隐藏页面（在任何内容渲染之前）
  AntiFlashModule.hide();

  // ==================== 模块 2：域名文本替换 ====================
  
  const DomainReplacementModule = {
    // 域名映射配置
    domainMapping: {
      'lmarena.ai': 'onechat.ai',
      '2captcha.com': 'onechat.ai'
    },
    
    // 已处理的节点集合
    processedNodes: new WeakSet(),
    
    // 编译的正则表达式
    patterns: [],
    
    /**
     * 初始化
     */
    init() {
      if (!GLOBAL_CONFIG.enableDomainReplacement) {
        log('DomainReplace', '域名替换功能已禁用');
        return;
      }
      
      // 创建正则表达式
      this.patterns = Object.keys(this.domainMapping).map(domain => ({
        pattern: new RegExp(domain.replace(/\./g, '\\.'), 'gi'),
        replacement: this.domainMapping[domain],
        originalDomain: domain
      }));
      
      log('DomainReplace', '初始化完成');
    },
    
    /**
     * 替换文本节点的内容
     */
    replaceTextContent(textNode) {
      if (!textNode || !textNode.nodeValue || this.processedNodes.has(textNode)) {
        return false;
      }

      let originalText = textNode.nodeValue;
      let modified = false;

      this.patterns.forEach(({ pattern, replacement, originalDomain }) => {
        if (pattern.test(originalText)) {
          originalText = originalText.replace(pattern, replacement);
          modified = true;
          log('DomainReplace', `${originalDomain} -> ${replacement}`);
        }
      });

      if (modified) {
        textNode.nodeValue = originalText;
        this.processedNodes.add(textNode);
        return true;
      }

      return false;
    },
    
    /**
     * 遍历并替换所有文本节点
     */
    replaceAllText(root = document.body) {
      if (!root) return 0;

      let replacedCount = 0;

      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            // 跳过 script 和 style 标签
            const parent = node.parentElement;
            if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) {
              return NodeFilter.FILTER_REJECT;
            }
            
            // 检查是否包含需要替换的域名
            if (node.nodeValue) {
              for (const { pattern } of this.patterns) {
                if (pattern.test(node.nodeValue)) {
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            }
            
            return NodeFilter.FILTER_REJECT;
          }
        }
      );

      const textNodes = [];
      let node;
      while (node = walker.nextNode()) {
        textNodes.push(node);
      }

      textNodes.forEach(textNode => {
        if (this.replaceTextContent(textNode)) {
          replacedCount++;
        }
      });

      if (replacedCount > 0) {
        log('DomainReplace', `替换了 ${replacedCount} 个文本节点`);
      }

      return replacedCount;
    },
    
    /**
     * 处理新添加的节点
     */
    processNewNodes(nodes) {
      let replacedCount = 0;

      nodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          if (this.replaceTextContent(node)) {
            replacedCount++;
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          replacedCount += this.replaceAllText(node);
        }
      });

      return replacedCount;
    }
  };

  // ==================== 模块 3：品牌样式配置 ====================
  
  const BrandStylesModule = {
    // OneChat Logo（大尺寸）
    oneChatLogoLarge: `
      <span style="font-size: 32px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: inline-block;">
        OneChat
      </span>
    `,
    
    // OneChat Logo（中等尺寸）
    oneChatLogoMedium: `
      <span style="font-size: 20px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: inline-block;">
        OneChat
      </span>
    `,
    
    // OneChat Logo（小尺寸）
    oneChatLogoSmall: `
      <span style="font-size: 14px; font-weight: 700; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; display: inline-block;">
        OneChat
      </span>
    `,
    
    // 品牌颜色
    colors: {
      gradientStart: '#667eea',
      gradientEnd: '#764ba2',
      primary: '#667eea',
      primaryDark: '#764ba2'
    }
  };

  // ==================== 模块 4：页面元素修改 ====================
  
  const PageModificationsModule = {
    /**
     * 初始化
     */
    init() {
      if (!GLOBAL_CONFIG.enablePageModifications) {
        log('PageMod', '页面修改功能已禁用');
        return;
      }
      
      log('PageMod', '初始化完成');
    },
    
    /**
     * 功能 1：关闭顶部横幅
     */
    hideBanner() {
      return safeExecute('PageMod', '关闭顶部横幅', () => {
        // 方法 1：通过 role 属性查找
        const banner = document.querySelector('[role="region"]');
        if (banner && banner.textContent.includes('Stay updated')) {
          banner.style.display = 'none';
          return true;
        }

        // 方法 2：通过文本内容查找
        const allDivs = document.querySelectorAll('div');
        for (let div of allDivs) {
          if (div.textContent.includes('Stay updated on frontier AI capabilities')) {
            const rect = div.getBoundingClientRect();
            if (rect.top < 100) {
              div.style.display = 'none';
              return true;
            }
          }
        }

        return false;
      });
    },
    
    /**
     * 功能 2：替换主标题为 OneChat Logo
     */
    replaceMainTitle() {
      return safeExecute('PageMod', '替换主标题 Logo', () => {
        const h1 = document.querySelector('h1');
        if (h1 && h1.textContent.includes('Find the best AI')) {
          h1.innerHTML = BrandStylesModule.oneChatLogoLarge;
          h1.style.display = 'flex';
          h1.style.justifyContent = 'center';
          h1.style.alignItems = 'center';
          return true;
        }

        return false;
      });
    },
    
    /**
     * 功能 3：删除副标题
     */
    removeSubtitle() {
      return safeExecute('PageMod', '删除副标题', () => {
        const h1 = document.querySelector('h1');
        if (!h1) return false;

        const subtitle = h1.nextElementSibling;
        if (subtitle && 
            subtitle.tagName === 'P' && 
            subtitle.textContent.includes('Compare answers')) {
          subtitle.remove();
          return true;
        }

        return false;
      });
    },
    
    /**
     * 功能 4：删除输入框爱心按钮
     */
    removeLoveButton() {
      return safeExecute('PageMod', '删除爱心按钮', () => {
        const textbox = document.querySelector('textarea[placeholder*="Ask"]');
        if (!textbox) return false;

        const container = textbox.closest('div').parentElement;
        if (!container) return false;

        const buttons = container.querySelectorAll('button');
        
        for (let btn of buttons) {
          const svg = btn.querySelector('svg');
          if (!svg) continue;

          const paths = svg.querySelectorAll('path');
          for (let path of paths) {
            const d = path.getAttribute('d');
            if (d && d.includes('M19.5 8.5')) {
              btn.remove();
              return true;
            }
          }
        }

        return false;
      });
    },
    
    /**
     * 应用所有页面修改
     */
    applyAll() {
      log('PageMod', '开始应用页面修改');

      const results = {
        banner: this.hideBanner(),
        mainTitle: this.replaceMainTitle(),
        subtitle: this.removeSubtitle(),
        loveButton: this.removeLoveButton()
      };

      const successCount = Object.values(results).filter(Boolean).length;
      const totalCount = Object.keys(results).length;

      log('PageMod', `完成 ${successCount}/${totalCount} 个修改`);
      
      return results;
    },
    
    /**
     * 检查是否需要重新应用修改
     */
    needsReapply() {
      // 检查横幅
      const banner = document.querySelector('[role="region"]');
      if (banner && banner.style.display !== 'none' && 
          banner.textContent.includes('Stay updated')) {
        return true;
      }

      // 检查主标题
      const h1 = document.querySelector('h1');
      if (h1 && h1.textContent.includes('Find the best AI')) {
        return true;
      }

      // 检查副标题
      if (h1) {
        const subtitle = h1.nextElementSibling;
        if (subtitle && subtitle.tagName === 'P' && 
            subtitle.textContent.includes('Compare answers')) {
          return true;
        }
      }

      // 检查爱心按钮
      const textbox = document.querySelector('textarea[placeholder*="Ask"]');
      if (textbox) {
        const container = textbox.closest('div')?.parentElement;
        if (container) {
          const buttons = container.querySelectorAll('button');
          for (let btn of buttons) {
            const path = btn.querySelector('svg path[d*="M19.5 8.5"]');
            if (path) return true;
          }
        }
      }

      return false;
    }
  };

  // ==================== 模块 5：统一执行管理 ====================
  
  const ExecutionManager = {
    /**
     * 执行所有修改
     */
    applyAllModifications() {
      log('Manager', '=== 开始执行所有修改 ===');
      
      // 1. 域名替换
      if (GLOBAL_CONFIG.enableDomainReplacement) {
        DomainReplacementModule.replaceAllText();
      }
      
      // 2. 页面元素修改
      if (GLOBAL_CONFIG.enablePageModifications) {
        PageModificationsModule.applyAll();
      }
      
      log('Manager', '=== 所有修改执行完成 ===');
    },
    
    /**
     * 设置 MutationObserver 监听
     */
    setupMutationObserver() {
      if (!GLOBAL_CONFIG.enableMutationObserver) return;
      
      const observer = new MutationObserver((mutations) => {
        let hasNewContent = false;
        const newNodes = [];

        for (const mutation of mutations) {
          // 处理新添加的节点
          if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(node => {
              newNodes.push(node);
              hasNewContent = true;
              
              // 立即处理域名替换
              if (GLOBAL_CONFIG.enableDomainReplacement) {
                if (node.nodeType === Node.TEXT_NODE) {
                  DomainReplacementModule.replaceTextContent(node);
                } else if (node.nodeType === Node.ELEMENT_NODE) {
                  DomainReplacementModule.replaceAllText(node);
                }
              }
            });
          }

          // 处理文本内容变化
          if (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE) {
            if (GLOBAL_CONFIG.enableDomainReplacement) {
              DomainReplacementModule.replaceTextContent(mutation.target);
            }
            hasNewContent = true;
          }
        }

        // 检查是否需要重新应用页面修改
        if (GLOBAL_CONFIG.enablePageModifications && PageModificationsModule.needsReapply()) {
          log('Manager', '检测到页面变化，重新应用修改');
          PageModificationsModule.applyAll();
        }
      });

      if (document.documentElement) {
        try {
          observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            characterData: true,
            characterDataOldValue: false
          });
          log('Manager', 'MutationObserver 已启动');
        } catch (error) {
          log('Manager', `设置监听器失败: ${error.message}`, 'error');
        }
      } else {
        setTimeout(() => this.setupMutationObserver(), 10);
      }
    },
    
    /**
     * 设置定期检查
     */
    setupPeriodicCheck() {
      if (!GLOBAL_CONFIG.enablePeriodicCheck) return;
      
      setInterval(() => {
        // 域名替换检查
        if (GLOBAL_CONFIG.enableDomainReplacement) {
          const count = DomainReplacementModule.replaceAllText();
          if (count > 0) {
            log('Manager', `定期检查发现新内容，替换了 ${count} 个节点`);
          }
        }
        
        // 页面修改检查
        if (GLOBAL_CONFIG.enablePageModifications && PageModificationsModule.needsReapply()) {
          log('Manager', '定期检查发现需要重新应用');
          PageModificationsModule.applyAll();
        }
      }, GLOBAL_CONFIG.periodicCheckInterval);
      
      log('Manager', `定期检查已启动 (${GLOBAL_CONFIG.periodicCheckInterval}ms)`);
    },
    
    /**
     * 设置页面事件监听
     */
    setupEventListeners() {
      // DOMContentLoaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          log('Manager', 'DOMContentLoaded 触发');
          this.applyAllModifications();
          
          // 延迟后显示页面
          setTimeout(() => {
            AntiFlashModule.show();
          }, GLOBAL_CONFIG.antiFlashDelay);
        });
      } else {
        // 如果已经加载完成，延迟后显示
        setTimeout(() => {
          AntiFlashModule.show();
        }, GLOBAL_CONFIG.antiFlashDelay);
      }
      
      // 页面完全加载
      window.addEventListener('load', () => {
        log('Manager', '页面完全加载');
        this.applyAllModifications();
        AntiFlashModule.show();
      });
      
      // 页面导航
      const originalPushState = history.pushState;
      const originalReplaceState = history.replaceState;

      history.pushState = function(...args) {
        originalPushState.apply(this, args);
        log('Manager', '检测到 pushState');
        ExecutionManager.applyAllModifications();
      };

      history.replaceState = function(...args) {
        originalReplaceState.apply(this, args);
        log('Manager', '检测到 replaceState');
        ExecutionManager.applyAllModifications();
      };

      window.addEventListener('popstate', () => {
        log('Manager', '检测到 popstate');
        ExecutionManager.applyAllModifications();
      });
      
      // 页面可见性变化
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          log('Manager', '页面变为可见');
          this.applyAllModifications();
        }
      });
      
      // 页面即将卸载
      window.addEventListener('beforeunload', () => {
        log('Manager', '页面即将卸载，隐藏内容');
        AntiFlashModule.hide();
      });
      
      // 监听 XMLHttpRequest（检测 challenge 请求）
      const originalOpen = XMLHttpRequest.prototype.open;
      XMLHttpRequest.prototype.open = function(...args) {
        if (args[1] && typeof args[1] === 'string' && args[1].includes('challenge')) {
          log('Manager', '检测到 challenge 请求，预先隐藏页面');
          AntiFlashModule.hide();
          setTimeout(() => {
            ExecutionManager.applyAllModifications();
            AntiFlashModule.show();
          }, GLOBAL_CONFIG.antiFlashDelay);
        }
        return originalOpen.apply(this, args);
      };
    },
    
    /**
     * 初始化所有模块
     */
    init() {
      log('Manager', '=== OneChat 统一注入脚本初始化 ===');
      
      // 初始化各模块
      DomainReplacementModule.init();
      PageModificationsModule.init();
      
      // ==================== 关键：立即执行（不等待 body） ====================
      // 即使在 document.readyState === 'loading' 时也立即执行
      log('Manager', `当前状态: ${document.readyState}，立即执行修改`);
      
      // 1. 立即尝试替换（即使 body 不存在）
      if (document.documentElement) {
        if (GLOBAL_CONFIG.enableDomainReplacement) {
          DomainReplacementModule.replaceAllText(document.documentElement);
        }
        if (GLOBAL_CONFIG.enablePageModifications) {
          PageModificationsModule.applyAll();
        }
      }
      
      // 2. 如果 body 已存在，再执行一次
      if (document.body) {
        log('Manager', 'body 已存在，再次执行修改');
        this.applyAllModifications();
      }
      
      // 设置监听
      this.setupMutationObserver();
      this.setupPeriodicCheck();
      this.setupEventListeners();
      
      log('Manager', '=== 初始化完成 ===');
    }
  };

  // ==================== 启动 ====================
  
  // ==================== 关键：立即初始化（同步执行） ====================
  // 不使用任何异步机制，确保在页面渲染前执行
  ExecutionManager.init();
  
  // ==================== 额外的早期执行点 ====================
  // 在脚本加载的瞬间就尝试执行一次
  if (document.documentElement) {
    log('Startup', '脚本加载瞬间，立即执行一次替换');
    if (GLOBAL_CONFIG.enableDomainReplacement) {
      DomainReplacementModule.replaceAllText(document.documentElement);
    }
    if (GLOBAL_CONFIG.enablePageModifications) {
      PageModificationsModule.applyAll();
    }
  }

  // ==================== 导出接口 ====================
  
  // 挂载到 window 供调试使用
  if (typeof window !== 'undefined') {
    window.OneChat = {
      // 配置
      config: GLOBAL_CONFIG,
      
      // 模块
      antiFlash: AntiFlashModule,
      domainReplace: DomainReplacementModule,
      brandStyles: BrandStylesModule,
      pageMod: PageModificationsModule,
      manager: ExecutionManager,
      
      // 快捷方法
      applyAll: () => ExecutionManager.applyAllModifications(),
      showPage: () => AntiFlashModule.show(),
      hidePage: () => AntiFlashModule.hide()
    };
    
    log('Manager', '已挂载到 window.OneChat');
  }

  console.log('[OneChat] 统一注入脚本加载完成');

})();