/**
 * PakePlus + OneChat 统一注入脚本
 * 
 * 整合功能：
 * 1. PakePlus 原有功能：链接处理、window.open 重写
 * 2. OneChat 功能：域名替换、页面元素修改、防闪现
 * 
 * 版本：1.0.0
 * 创建日期：2025-11-17
 */

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