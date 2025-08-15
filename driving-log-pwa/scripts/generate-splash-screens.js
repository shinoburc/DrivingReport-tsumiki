const fs = require('fs');
const path = require('path');

// iOS デバイスサイズ定義
const iosDevices = [
    { name: 'iPhone SE (1st gen)', width: 320, height: 568, scale: 2 },
    { name: 'iPhone SE (2nd/3rd gen)', width: 375, height: 667, scale: 2 },
    { name: 'iPhone 12 mini', width: 375, height: 812, scale: 3 },
    { name: 'iPhone 12/13/14', width: 390, height: 844, scale: 3 },
    { name: 'iPhone 12/13/14 Pro Max', width: 428, height: 926, scale: 3 },
    { name: 'iPad (Portrait)', width: 768, height: 1024, scale: 2 },
    { name: 'iPad (Landscape)', width: 1024, height: 768, scale: 2 },
    { name: 'iPad Pro 11" (Portrait)', width: 834, height: 1194, scale: 2 },
    { name: 'iPad Pro 11" (Landscape)', width: 1194, height: 834, scale: 2 },
    { name: 'iPad Pro 12.9" (Portrait)', width: 1024, height: 1366, scale: 2 },
    { name: 'iPad Pro 12.9" (Landscape)', width: 1366, height: 1024, scale: 2 }
];

// SVGベースのスプラッシュスクリーン生成
const generateSplashSVG = (width, height, deviceName) => {
    const centerX = width / 2;
    const centerY = height / 2;
    const iconSize = Math.min(width, height) * 0.2;
    const titleFontSize = Math.max(20, width * 0.06);
    const subtitleFontSize = Math.max(14, width * 0.04);
    const loadingY = height - Math.max(80, height * 0.15);
    const dotSize = Math.max(4, width * 0.01);
    const dotSpacing = dotSize * 3;

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="#FFFFFF"/>
  
  <!-- App Icon Background -->
  <circle cx="${centerX}" cy="${centerY - iconSize * 0.5}" r="${iconSize * 0.5}" fill="#2196F3"/>
  
  <!-- Car Icon (simplified for SVG) -->
  <g transform="translate(${centerX - iconSize * 0.3}, ${centerY - iconSize * 0.8})">
    <rect x="0" y="16" width="${iconSize * 0.6}" height="${iconSize * 0.3}" rx="4" fill="#FFFFFF"/>
    <rect x="${iconSize * 0.1}" y="8" width="${iconSize * 0.4}" height="${iconSize * 0.2}" rx="3" fill="#FFFFFF"/>
    <!-- Wheels -->
    <circle cx="${iconSize * 0.15}" cy="${iconSize * 0.55}" r="${iconSize * 0.08}" fill="#FFFFFF"/>
    <circle cx="${iconSize * 0.45}" cy="${iconSize * 0.55}" r="${iconSize * 0.08}" fill="#FFFFFF"/>
  </g>
  
  <!-- Title -->
  <text x="${centerX}" y="${centerY + iconSize * 0.8}" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="${titleFontSize}" 
        font-weight="bold" 
        fill="#2196F3" 
        text-anchor="middle" 
        dominant-baseline="middle">運転日報PWA</text>
  
  <!-- Subtitle -->
  <text x="${centerX}" y="${centerY + iconSize * 1.2}" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="${subtitleFontSize}" 
        fill="#666666" 
        text-anchor="middle" 
        dominant-baseline="middle">運転記録を簡単管理</text>
  
  <!-- Loading Dots -->
  <g fill="#2196F3">
    <circle cx="${centerX - dotSpacing}" cy="${loadingY}" r="${dotSize}">
      <animate attributeName="r" values="${dotSize};${dotSize * 1.5};${dotSize}" dur="1.4s" repeatCount="indefinite" begin="0s"/>
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0s"/>
    </circle>
    <circle cx="${centerX}" cy="${loadingY}" r="${dotSize}">
      <animate attributeName="r" values="${dotSize};${dotSize * 1.5};${dotSize}" dur="1.4s" repeatCount="indefinite" begin="0.16s"/>
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.16s"/>
    </circle>
    <circle cx="${centerX + dotSpacing}" cy="${loadingY}" r="${dotSize}">
      <animate attributeName="r" values="${dotSize};${dotSize * 1.5};${dotSize}" dur="1.4s" repeatCount="indefinite" begin="0.32s"/>
      <animate attributeName="opacity" values="0.3;1;0.3" dur="1.4s" repeatCount="indefinite" begin="0.32s"/>
    </circle>
  </g>
  
  <!-- Loading Text -->
  <text x="${centerX}" y="${loadingY + dotSize * 4}" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
        font-size="${Math.max(12, width * 0.03)}" 
        fill="#999999" 
        text-anchor="middle" 
        dominant-baseline="middle">読み込み中...</text>
</svg>`;
};

// HTMLファイルのlinkタグを生成
const generateAppleTouchStartupLinks = (devices) => {
    const links = [];
    
    devices.forEach(device => {
        const { name, width, height, scale } = device;
        const actualWidth = width * scale;
        const actualHeight = height * scale;
        
        links.push(`    <!-- ${name} -->
    <link rel="apple-touch-startup-image" 
          href="/splash-screens/splash-${actualWidth}x${actualHeight}.png" 
          media="(device-width: ${width}px) and (device-height: ${height}px) and (-webkit-device-pixel-ratio: ${scale})">`);
    });
    
    return links.join('\n');
};

// ディレクトリ作成
const splashDir = path.join(__dirname, '..', 'public', 'splash-screens');
if (!fs.existsSync(splashDir)) {
    fs.mkdirSync(splashDir, { recursive: true });
}

console.log('🎨 スプラッシュスクリーンファイルを生成しています...');

// 各デバイスサイズのスプラッシュスクリーン生成
iosDevices.forEach(device => {
    const { name, width, height, scale } = device;
    const actualWidth = width * scale;
    const actualHeight = height * scale;
    
    // SVGファイル生成
    const svgContent = generateSplashSVG(actualWidth, actualHeight, name);
    const svgPath = path.join(splashDir, `splash-${actualWidth}x${actualHeight}.svg`);
    
    fs.writeFileSync(svgPath, svgContent);
    console.log(`✅ 生成完了: splash-${actualWidth}x${actualHeight}.svg (${name})`);
});

// HTMLのlinkタグを生成
const linkTags = generateAppleTouchStartupLinks(iosDevices);
const linkTagsPath = path.join(splashDir, 'apple-touch-startup-links.html');

const htmlContent = `<!-- iOS Splash Screens for 運転日報PWA -->
<!-- これらのlinkタグをindex.htmlの<head>セクションに追加してください -->

${linkTags}

<!-- Web App Manifest での splash_screens 設定例 -->
<!-- 
manifest.json に以下を追加することも可能です:

"splash_screens": [
${iosDevices.map(device => {
    const { name, width, height, scale } = device;
    const actualWidth = width * scale;
    const actualHeight = height * scale;
    return `  {
    "src": "/splash-screens/splash-${actualWidth}x${actualHeight}.png",
    "sizes": "${actualWidth}x${actualHeight}",
    "type": "image/png",
    "platform": "ios"
  }`;
}).join(',\n')}
]
-->`;

fs.writeFileSync(linkTagsPath, htmlContent);
console.log('✅ 生成完了: apple-touch-startup-links.html');

// CSS用スプラッシュスクリーンコンポーネント
const cssComponentPath = path.join(splashDir, 'splash-screen.css');
const cssContent = `/* PWA Splash Screen Component */
/* 運転日報PWA用カスタムスプラッシュスクリーン */

.splash-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #FFFFFF;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.splash-screen.hidden {
    display: none;
}

.splash-icon {
    width: 120px;
    height: 120px;
    background: #2196F3;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 60px;
    margin-bottom: 30px;
    position: relative;
    overflow: hidden;
}

.splash-icon::before {
    content: '🚗';
    position: absolute;
    color: #FFFFFF;
}

.splash-title {
    font-size: 28px;
    font-weight: bold;
    color: #2196F3;
    margin-bottom: 10px;
    text-align: center;
}

.splash-subtitle {
    font-size: 16px;
    color: #666666;
    margin-bottom: 60px;
    text-align: center;
}

.splash-loading {
    display: flex;
    gap: 12px;
    margin-bottom: 15px;
}

.splash-dot {
    width: 8px;
    height: 8px;
    background: #2196F3;
    border-radius: 50%;
    animation: splash-bounce 1.4s ease-in-out infinite both;
}

.splash-dot:nth-child(1) { 
    animation-delay: -0.32s; 
}

.splash-dot:nth-child(2) { 
    animation-delay: -0.16s; 
}

.splash-dot:nth-child(3) { 
    animation-delay: 0s; 
}

@keyframes splash-bounce {
    0%, 80%, 100% {
        transform: scale(0);
        opacity: 0.3;
    }
    40% {
        transform: scale(1);
        opacity: 1;
    }
}

.splash-text {
    font-size: 14px;
    color: #999999;
    text-align: center;
}

/* モバイル対応 */
@media (max-width: 480px) {
    .splash-icon {
        width: 100px;
        height: 100px;
        font-size: 50px;
        margin-bottom: 20px;
    }
    
    .splash-title {
        font-size: 24px;
        margin-bottom: 8px;
    }
    
    .splash-subtitle {
        font-size: 14px;
        margin-bottom: 40px;
    }
}

/* ダークモード対応 */
@media (prefers-color-scheme: dark) {
    .splash-screen {
        background: #1a1a1a;
    }
    
    .splash-title {
        color: #64B5F6;
    }
    
    .splash-subtitle {
        color: #9E9E9E;
    }
    
    .splash-text {
        color: #757575;
    }
}`;

fs.writeFileSync(cssComponentPath, cssContent);
console.log('✅ 生成完了: splash-screen.css');

// JavaScript用スプラッシュスクリーン制御
const jsComponentPath = path.join(splashDir, 'splash-screen.js');
const jsContent = `/**
 * 運転日報PWA - スプラッシュスクリーン制御
 * カスタムスプラッシュスクリーンの表示・非表示制御
 */

class SplashScreen {
    constructor() {
        this.element = null;
        this.isVisible = false;
        this.minimumDisplayTime = 1500; // 最小表示時間（ミリ秒）
        this.startTime = Date.now();
    }

    /**
     * スプラッシュスクリーンを作成・表示
     */
    show() {
        if (this.element) {
            this.element.remove();
        }

        this.element = document.createElement('div');
        this.element.className = 'splash-screen';
        this.element.innerHTML = \`
            <div class="splash-icon">
                <!-- アイコンはCSS ::beforeで表示 -->
            </div>
            <h1 class="splash-title">運転日報PWA</h1>
            <p class="splash-subtitle">運転記録を簡単管理</p>
            <div class="splash-loading">
                <div class="splash-dot"></div>
                <div class="splash-dot"></div>
                <div class="splash-dot"></div>
            </div>
            <p class="splash-text">読み込み中...</p>
        \`;

        document.body.appendChild(this.element);
        this.isVisible = true;
        this.startTime = Date.now();

        // アクセシビリティ設定
        this.element.setAttribute('role', 'progressbar');
        this.element.setAttribute('aria-label', 'アプリケーションを読み込み中');
        this.element.setAttribute('aria-live', 'polite');

        return this;
    }

    /**
     * スプラッシュスクリーンを非表示
     * @param {boolean} force - 強制的に非表示にするか
     */
    async hide(force = false) {
        if (!this.isVisible || !this.element) {
            return;
        }

        const elapsedTime = Date.now() - this.startTime;
        
        if (!force && elapsedTime < this.minimumDisplayTime) {
            // 最小表示時間に達していない場合は待機
            const remainingTime = this.minimumDisplayTime - elapsedTime;
            await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

        // フェードアウトアニメーション
        this.element.style.transition = 'opacity 0.3s ease-out';
        this.element.style.opacity = '0';

        await new Promise(resolve => setTimeout(resolve, 300));

        if (this.element) {
            this.element.remove();
            this.element = null;
        }

        this.isVisible = false;
    }

    /**
     * ローディングテキストを更新
     * @param {string} text - 新しいテキスト
     */
    updateText(text) {
        if (!this.element) return;

        const textElement = this.element.querySelector('.splash-text');
        if (textElement) {
            textElement.textContent = text;
        }
    }

    /**
     * エラー状態を表示
     * @param {string} errorMessage - エラーメッセージ
     */
    showError(errorMessage) {
        if (!this.element) return;

        const loadingElement = this.element.querySelector('.splash-loading');
        const textElement = this.element.querySelector('.splash-text');

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }

        if (textElement) {
            textElement.textContent = errorMessage;
            textElement.style.color = '#f44336';
        }

        // エラーアイコンに変更
        const iconElement = this.element.querySelector('.splash-icon');
        if (iconElement) {
            iconElement.style.background = '#f44336';
            iconElement.innerHTML = '<span style="color: white; font-size: 60px;">⚠️</span>';
        }
    }
}

// グローバルインスタンス
window.splashScreen = new SplashScreen();

// 自動初期化（DOMContentLoaded後）
document.addEventListener('DOMContentLoaded', () => {
    // PWAかどうかを判定
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  window.navigator.standalone ||
                  document.referrer.includes('android-app://');

    // PWAまたは初回訪問時のみスプラッシュスクリーンを表示
    if (isPWA || !localStorage.getItem('hasVisited')) {
        window.splashScreen.show();
        localStorage.setItem('hasVisited', 'true');
    }
});

// アプリ読み込み完了時の自動非表示
window.addEventListener('load', () => {
    // 少し遅延してから非表示
    setTimeout(() => {
        if (window.splashScreen.isVisible) {
            window.splashScreen.hide();
        }
    }, 500);
});

export default SplashScreen;`;

fs.writeFileSync(jsComponentPath, jsContent);
console.log('✅ 生成完了: splash-screen.js');

console.log('\n🎉 すべてのスプラッシュスクリーンファイルが生成されました！');

console.log('\n📁 生成されたファイル:');
fs.readdirSync(splashDir).forEach(file => {
    const filePath = path.join(splashDir, file);
    const stats = fs.statSync(filePath);
    console.log(`   ${file} (${stats.size} bytes)`);
});

console.log('\n📝 次のステップ:');
console.log('1. apple-touch-startup-links.html の内容をindex.htmlの<head>に追加');
console.log('2. splash-screen.css をメインCSSファイルにインポート');
console.log('3. splash-screen.js をアプリに組み込み');
console.log('4. SVG→PNG変換（本番環境用）');
console.log('5. 各デバイスでの表示確認');

module.exports = {
    generateSplashSVG,
    generateAppleTouchStartupLinks,
    iosDevices
};