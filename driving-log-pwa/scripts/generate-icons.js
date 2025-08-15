const fs = require('fs');
const path = require('path');

// SVGアイコンの定義（シンプルな運転日報アイコン）
const generateSVGIcon = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景円 -->
  <circle cx="${size/2}" cy="${size/2}" r="${size*0.45}" fill="#2196F3"/>
  
  <!-- 車のシルエット -->
  <g transform="translate(${size*0.3},${size*0.35})">
    <rect x="0" y="8" width="32" height="12" rx="2" fill="#FFFFFF"/>
    <rect x="4" y="4" width="24" height="8" rx="2" fill="#FFFFFF"/>
    <!-- タイヤ -->
    <circle cx="8" cy="22" r="3" fill="#FFFFFF"/>
    <circle cx="24" cy="22" r="3" fill="#FFFFFF"/>
  </g>
  
  <!-- 日報のライン -->
  <g stroke="#FFFFFF" stroke-width="${Math.max(1, size*0.02)}" stroke-linecap="round">
    <line x1="${size*0.35}" y1="${size*0.25}" x2="${size*0.65}" y2="${size*0.25}"/>
    <line x1="${size*0.4}" y1="${size*0.75}" x2="${size*0.6}" y2="${size*0.75}"/>
  </g>
</svg>
`;

// マスク対応アイコンのSVG
const generateMaskableSVG = (size) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- 全面背景（マスク対応） -->
  <rect width="${size}" height="${size}" fill="#2196F3"/>
  
  <!-- 安全領域内のコンテンツ -->
  <g transform="translate(${size*0.1},${size*0.1})">
    <!-- 車のシルエット（より大きく） -->
    <g transform="translate(${size*0.25},${size*0.25})">
      <rect x="0" y="16" width="64" height="24" rx="4" fill="#FFFFFF"/>
      <rect x="8" y="8" width="48" height="16" rx="4" fill="#FFFFFF"/>
      <!-- タイヤ -->
      <circle cx="16" cy="44" r="6" fill="#FFFFFF"/>
      <circle cx="48" cy="44" r="6" fill="#FFFFFF"/>
    </g>
    
    <!-- 装飾的な要素 -->
    <circle cx="${size*0.4}" cy="${size*0.4}" r="${size*0.3}" stroke="#FFFFFF" stroke-width="${size*0.01}" fill="none"/>
    
    <!-- 日報ラインズ -->
    <g stroke="#FFFFFF" stroke-width="${size*0.008}" stroke-linecap="round">
      <line x1="${size*0.2}" y1="${size*0.15}" x2="${size*0.6}" y2="${size*0.15}"/>
      <line x1="${size*0.25}" y1="${size*0.65}" x2="${size*0.55}" y2="${size*0.65}"/>
      <line x1="${size*0.25}" y1="${size*0.7}" x2="${size*0.55}" y2="${size*0.7}"/>
    </g>
  </g>
</svg>
`;

// アイコンサイズとファイル名の定義
const iconConfigs = [
  { size: 16, name: 'icon-16x16.png' },
  { size: 32, name: 'icon-32x32.png' },
  { size: 48, name: 'icon-48x48.png' },
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 120, name: 'icon-120x120.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 167, name: 'icon-167x167.png' },
  { size: 180, name: 'icon-180x180.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 512, name: 'icon-512x512.png' }
];

// プレースホルダーPNGデータ（Base64）
const generatePlaceholderPNG = (size) => {
  // 実際の実装では、Canvas APIまたは他の画像生成ライブラリを使用
  // ここではSVGを文字列として保存（実際のプロジェクトではPNG変換が必要）
  return generateSVGIcon(size);
};

// ディレクトリ作成
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// アイコンファイル生成
console.log('🎨 アイコンファイルを生成しています...');

iconConfigs.forEach(({ size, name }) => {
  const svgContent = generateSVGIcon(size);
  const svgPath = path.join(iconsDir, name.replace('.png', '.svg'));
  
  // SVGファイルとして保存（実際のプロジェクトではPNG変換が必要）
  fs.writeFileSync(svgPath, svgContent);
  console.log(`✅ 生成完了: ${name.replace('.png', '.svg')} (${size}x${size})`);
});

// マスク対応アイコンの生成
const maskableSVG = generateMaskableSVG(512);
const maskablePath = path.join(iconsDir, 'maskable-icon-512x512.svg');
fs.writeFileSync(maskablePath, maskableSVG);
console.log('✅ 生成完了: maskable-icon-512x512.svg');

// apple-touch-iconのコピー（180x180と同じ）
const appleTouchIconPath = path.join(iconsDir, 'apple-touch-icon.svg');
fs.copyFileSync(path.join(iconsDir, 'icon-180x180.svg'), appleTouchIconPath);
console.log('✅ 生成完了: apple-touch-icon.svg');

// favicon.icoの簡易実装（32x32を使用）
const faviconPath = path.join(iconsDir, 'favicon.svg');
fs.copyFileSync(path.join(iconsDir, 'icon-32x32.svg'), faviconPath);
console.log('✅ 生成完了: favicon.svg');

console.log('\n🎉 すべてのアイコンファイルが生成されました！');
console.log('\n📝 注意: SVGファイルとして生成されています。');
console.log('本番環境では、以下の作業が必要です：');
console.log('1. SVGからPNGへの変換');
console.log('2. favicon.icoの作成');
console.log('3. 各デバイスでの表示確認');

console.log('\n🛠️  推奨ツール:');
console.log('- SVG→PNG変換: Inkscape, GIMP, または online-convert.com');
console.log('- favicon.ico作成: favicon.io, realfavicongenerator.net');
console.log('- アイコン確認: PWA Builder, Lighthouse');

// 生成されたファイル一覧の出力
console.log('\n📁 生成されたファイル:');
fs.readdirSync(iconsDir).forEach(file => {
  const filePath = path.join(iconsDir, file);
  const stats = fs.statSync(filePath);
  console.log(`   ${file} (${stats.size} bytes)`);
});

module.exports = {
  generateSVGIcon,
  generateMaskableSVG,
  iconConfigs
};