/**
 * Cloudflare 反检测测试脚本
 * 
 * 使用方法：
 * 1. 打开应用的开发者工具（右键 → 检查）
 * 2. 复制本文件的全部内容
 * 3. 粘贴到控制台并回车
 * 4. 查看测试结果
 */

(async function() {
  'use strict';
  
  console.log('\n'.repeat(3));
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   Cloudflare 反检测功能测试');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const results = {
    webrtc: false,
    fingerprint: false,
    canvas: false,
    webgl: false,
    timezone: false,
    mediaDevices: false
  };
  
  // ==================== 测试 1: WebRTC IP 泄露保护 ====================
  
  console.log('【测试 1】WebRTC IP 泄露保护');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    pc.createDataChannel('test');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    let hasLocalIP = false;
    let candidateCount = 0;
    
    await new Promise((resolve) => {
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          candidateCount++;
          const c = event.candidate.candidate;
          console.log(`  Candidate ${candidateCount}: ${c.substring(0, 50)}...`);
          
          if (c.includes('192.168.') || c.includes('10.') || 
              c.includes('172.') || c.includes('127.0.0.1')) {
            hasLocalIP = true;
            console.log('  ❌ 检测到本地 IP 泄露！');
          }
        } else {
          resolve();
        }
      };
      
      setTimeout(resolve, 3000);
    });
    
    pc.close();
    
    if (candidateCount === 0) {
      console.log('  ✅ 完美：没有收集到任何 candidate');
      results.webrtc = true;
    } else if (!hasLocalIP) {
      console.log(`  ✅ 良好：收集到 ${candidateCount} 个 candidates，但没有本地 IP`);
      results.webrtc = true;
    } else {
      console.log('  ❌ 失败：检测到本地 IP 泄露');
    }
  } catch (error) {
    console.log('  ⚠️  WebRTC 测试出错:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试 2: 浏览器指纹修改 ====================
  
  console.log('【测试 2】浏览器指纹修改');
  console.log('─────────────────────────────────────────────────────────');
  
  const checks = {
    userAgent: navigator.userAgent.includes('Chrome/120'),
    platform: navigator.platform === 'Win32',
    vendor: navigator.vendor === 'Google Inc.',
    webdriver: navigator.webdriver === undefined,
    languages: Array.isArray(navigator.languages) && navigator.languages.length > 0,
    chrome: !!window.chrome
  };
  
  console.log('  User-Agent:', navigator.userAgent.substring(0, 60) + '...');
  console.log('  Platform:', navigator.platform, checks.platform ? '✅' : '❌');
  console.log('  Vendor:', navigator.vendor, checks.vendor ? '✅' : '❌');
  console.log('  Webdriver:', navigator.webdriver, checks.webdriver ? '✅' : '❌');
  console.log('  Languages:', navigator.languages.join(', '), checks.languages ? '✅' : '❌');
  console.log('  Chrome 对象:', window.chrome ? '存在 ✅' : '不存在 ❌');
  console.log('  Hardware Concurrency:', navigator.hardwareConcurrency);
  console.log('  Device Memory:', navigator.deviceMemory);
  
  const fingerprintScore = Object.values(checks).filter(Boolean).length;
  results.fingerprint = fingerprintScore >= 5;
  
  console.log(`  总分: ${fingerprintScore}/6`, results.fingerprint ? '✅' : '❌');
  console.log('');
  
  // ==================== 测试 3: Canvas 指纹保护 ====================
  
  console.log('【测试 3】Canvas 指纹保护');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(125, 1, 62, 20);
    ctx.fillStyle = '#069';
    ctx.fillText('Test', 2, 15);
    
    const dataURL1 = canvas.toDataURL();
    const dataURL2 = canvas.toDataURL();
    
    console.log('  第一次 toDataURL 长度:', dataURL1.length);
    console.log('  第二次 toDataURL 长度:', dataURL2.length);
    console.log('  两次结果相同:', dataURL1 === dataURL2 ? '✅' : '❌');
    
    results.canvas = dataURL1.length > 0 && dataURL1 === dataURL2;
    console.log('  Canvas 保护:', results.canvas ? '✅ 正常' : '❌ 异常');
  } catch (error) {
    console.log('  ⚠️  Canvas 测试出错:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试 4: WebGL 指纹保护 ====================
  
  console.log('【测试 4】WebGL 指纹保护');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        
        console.log('  Vendor:', vendor);
        console.log('  Renderer:', renderer);
        
        results.webgl = vendor === 'Intel Inc.';
        console.log('  WebGL 保护:', results.webgl ? '✅ 已修改' : '⚠️  未修改');
      } else {
        console.log('  ⚠️  无法获取 WebGL debug info');
      }
    } else {
      console.log('  ⚠️  WebGL 不可用');
    }
  } catch (error) {
    console.log('  ⚠️  WebGL 测试出错:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试 5: 时区修改 ====================
  
  console.log('【测试 5】时区修改');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const offset = new Date().getTimezoneOffset();
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    console.log('  Timezone Offset:', offset, '(预期: -480)');
    console.log('  Timezone:', timezone, '(预期: Asia/Shanghai)');
    
    results.timezone = offset === -480;
    console.log('  时区修改:', results.timezone ? '✅ 成功' : '❌ 失败');
  } catch (error) {
    console.log('  ⚠️  时区测试出错:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试 6: 媒体设备禁用 ====================
  
  console.log('【测试 6】媒体设备禁用');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    // 测试 getUserMedia
    let getUserMediaBlocked = false;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('  ❌ getUserMedia 未被禁用');
    } catch (error) {
      getUserMediaBlocked = true;
      console.log('  ✅ getUserMedia 已禁用');
    }
    
    // 测试 enumerateDevices
    const devices = await navigator.mediaDevices.enumerateDevices();
    const enumerateDevicesBlocked = devices.length === 0;
    
    console.log('  设备数量:', devices.length);
    console.log('  enumerateDevices:', enumerateDevicesBlocked ? '✅ 已禁用' : '❌ 未禁用');
    
    results.mediaDevices = getUserMediaBlocked && enumerateDevicesBlocked;
  } catch (error) {
    console.log('  ⚠️  媒体设备测试出错:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试 7: 当前 IP 检查 ====================
  
  console.log('【测试 7】当前 IP 检查');
  console.log('─────────────────────────────────────────────────────────');
  
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    console.log('  当前 IP:', data.ip);
    console.log('  提示: 确认这是你的代理服务器 IP，而不是本地 IP');
  } catch (error) {
    console.log('  ⚠️  无法获取 IP:', error.message);
  }
  
  console.log('');
  
  // ==================== 测试总结 ====================
  
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   测试总结');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const score = (passedTests / totalTests * 100).toFixed(0);
  
  console.log('  WebRTC 保护:', results.webrtc ? '✅ 通过' : '❌ 失败');
  console.log('  浏览器指纹:', results.fingerprint ? '✅ 通过' : '❌ 失败');
  console.log('  Canvas 保护:', results.canvas ? '✅ 通过' : '❌ 失败');
  console.log('  WebGL 保护:', results.webgl ? '✅ 通过' : '⚠️  未通过');
  console.log('  时区修改:', results.timezone ? '✅ 通过' : '❌ 失败');
  console.log('  媒体设备:', results.mediaDevices ? '✅ 通过' : '❌ 失败');
  
  console.log('');
  console.log(`  总分: ${passedTests}/${totalTests} (${score}%)`);
  
  if (score >= 80) {
    console.log('  评级: ⭐⭐⭐ 优秀');
    console.log('  建议: 可以尝试访问 lmarena.ai 测试');
  } else if (score >= 60) {
    console.log('  评级: ⭐⭐ 良好');
    console.log('  建议: 部分功能可能需要调整');
  } else {
    console.log('  评级: ⭐ 需要改进');
    console.log('  建议: 检查反检测模块是否正确加载');
  }
  
  console.log('');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // 返回结果供进一步使用
  return {
    results,
    score: passedTests,
    total: totalTests,
    percentage: score
  };
  
})().then(result => {
  console.log('测试完成！结果已保存到返回值中。');
  console.log('你可以通过变量访问详细结果。');
}).catch(error => {
  console.error('测试过程中出现错误:', error);
});
