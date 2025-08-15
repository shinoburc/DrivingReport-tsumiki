const fs = require('fs');
const path = require('path');

// ショートカットアイコンの定義
const shortcutIcons = [
    {
        name: 'new-log',
        description: '新規運転記録',
        emoji: '➕',
        color: '#4CAF50',
        backgroundColor: '#E8F5E8'
    },
    {
        name: 'history',
        description: '履歴表示',
        emoji: '📊',
        color: '#2196F3',
        backgroundColor: '#E3F2FD'
    },
    {
        name: 'settings',
        description: '設定',
        emoji: '⚙️',
        color: '#757575',
        backgroundColor: '#F5F5F5'
    },
    {
        name: 'export',
        description: 'エクスポート',
        emoji: '📤',
        color: '#FF9800',
        backgroundColor: '#FFF3E0'
    },
    {
        name: 'location',
        description: '現在地記録',
        emoji: '📍',
        color: '#F44336',
        backgroundColor: '#FFEBEE'
    },
    {
        name: 'sync',
        description: 'オフライン同期',
        emoji: '🔄',
        color: '#9C27B0',
        backgroundColor: '#F3E5F5'
    }
];

// ショートカットアイコンSVG生成
const generateShortcutIconSVG = (icon, size) => {
    const { name, emoji, color, backgroundColor } = icon;
    const center = size / 2;
    const emojiSize = size * 0.5;
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Circle -->
  <circle cx="${center}" cy="${center}" r="${size * 0.45}" fill="${backgroundColor}" stroke="${color}" stroke-width="${size * 0.02}"/>
  
  <!-- Emoji Icon -->
  <text x="${center}" y="${center}" 
        font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" 
        font-size="${emojiSize}" 
        text-anchor="middle" 
        dominant-baseline="central">${emoji}</text>
  
  <!-- Optional Border -->
  <circle cx="${center}" cy="${center}" r="${size * 0.45}" fill="none" stroke="${color}" stroke-width="${size * 0.01}" opacity="0.3"/>
</svg>`;
};

// より詳細なショートカットアイコンの生成（ベクター）
const generateDetailedShortcutIconSVG = (icon, size) => {
    const { name, color, backgroundColor } = icon;
    const center = size / 2;
    
    let iconPath = '';
    
    switch (name) {
        case 'new-log':
            iconPath = `
                <g transform="translate(${center - size * 0.15}, ${center - size * 0.15})">
                    <circle cx="${size * 0.15}" cy="${size * 0.15}" r="${size * 0.12}" fill="none" stroke="${color}" stroke-width="${size * 0.02}"/>
                    <line x1="${size * 0.15}" y1="${size * 0.08}" x2="${size * 0.15}" y2="${size * 0.22}" stroke="${color}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
                    <line x1="${size * 0.08}" y1="${size * 0.15}" x2="${size * 0.22}" y2="${size * 0.15}" stroke="${color}" stroke-width="${size * 0.02}" stroke-linecap="round"/>
                </g>`;
            break;
            
        case 'history':
            iconPath = `
                <g transform="translate(${center - size * 0.15}, ${center - size * 0.15})">
                    <rect x="${size * 0.05}" y="${size * 0.08}" width="${size * 0.2}" height="${size * 0.14}" rx="${size * 0.01}" fill="none" stroke="${color}" stroke-width="${size * 0.015}"/>
                    <line x1="${size * 0.08}" y1="${size * 0.12}" x2="${size * 0.22}" y2="${size * 0.12}" stroke="${color}" stroke-width="${size * 0.01}"/>
                    <line x1="${size * 0.08}" y1="${size * 0.15}" x2="${size * 0.18}" y2="${size * 0.15}" stroke="${color}" stroke-width="${size * 0.01}"/>
                    <line x1="${size * 0.08}" y1="${size * 0.18}" x2="${size * 0.2}" y2="${size * 0.18}" stroke="${color}" stroke-width="${size * 0.01}"/>
                </g>`;
            break;
            
        case 'settings':
            iconPath = `
                <g transform="translate(${center}, ${center})">
                    <circle r="${size * 0.06}" fill="none" stroke="${color}" stroke-width="${size * 0.015}"/>
                    <g stroke="${color}" stroke-width="${size * 0.01}" stroke-linecap="round">
                        <line x1="0" y1="${-size * 0.12}" x2="0" y2="${-size * 0.09}"/>
                        <line x1="0" y1="${size * 0.09}" x2="0" y2="${size * 0.12}"/>
                        <line x1="${size * 0.104}" y1="${-size * 0.06}" x2="${size * 0.078}" y2="${-size * 0.045}"/>
                        <line x1="${-size * 0.078}" y1="${size * 0.045}" x2="${-size * 0.104}" y2="${size * 0.06}"/>
                        <line x1="${size * 0.104}" y1="${size * 0.06}" x2="${size * 0.078}" y2="${size * 0.045}"/>
                        <line x1="${-size * 0.078}" y1="${-size * 0.045}" x2="${-size * 0.104}" y2="${-size * 0.06}"/>
                    </g>
                </g>`;
            break;
            
        case 'export':
            iconPath = `
                <g transform="translate(${center - size * 0.1}, ${center - size * 0.12})">
                    <rect x="0" y="${size * 0.04}" width="${size * 0.2}" height="${size * 0.16}" rx="${size * 0.01}" fill="none" stroke="${color}" stroke-width="${size * 0.015}"/>
                    <path d="M ${size * 0.1} ${size * 0.04} L ${size * 0.1} ${-size * 0.02} M ${size * 0.06} ${size * 0.02} L ${size * 0.1} ${-size * 0.02} L ${size * 0.14} ${size * 0.02}" 
                          fill="none" stroke="${color}" stroke-width="${size * 0.015}" stroke-linecap="round" stroke-linejoin="round"/>
                </g>`;
            break;
            
        case 'location':
            iconPath = `
                <g transform="translate(${center}, ${center - size * 0.05})">
                    <path d="M 0 ${-size * 0.08} C ${-size * 0.05} ${-size * 0.08} ${-size * 0.08} ${-size * 0.05} ${-size * 0.08} 0 
                             C ${-size * 0.08} ${size * 0.03} 0 ${size * 0.12} 0 ${size * 0.12} 
                             C 0 ${size * 0.12} ${size * 0.08} ${size * 0.03} ${size * 0.08} 0 
                             C ${size * 0.08} ${-size * 0.05} ${size * 0.05} ${-size * 0.08} 0 ${-size * 0.08} Z"
                          fill="none" stroke="${color}" stroke-width="${size * 0.015}"/>
                    <circle r="${size * 0.025}" fill="${color}"/>
                </g>`;
            break;
            
        case 'sync':
            iconPath = `
                <g transform="translate(${center}, ${center})">
                    <path d="M ${-size * 0.08} ${-size * 0.04} C ${-size * 0.08} ${-size * 0.08} ${-size * 0.04} ${-size * 0.12} 0 ${-size * 0.12}
                             C ${size * 0.04} ${-size * 0.12} ${size * 0.08} ${-size * 0.08} ${size * 0.08} ${-size * 0.04}"
                          fill="none" stroke="${color}" stroke-width="${size * 0.015}" stroke-linecap="round"/>
                    <path d="M ${size * 0.08} ${size * 0.04} C ${size * 0.08} ${size * 0.08} ${size * 0.04} ${size * 0.12} 0 ${size * 0.12}
                             C ${-size * 0.04} ${size * 0.12} ${-size * 0.08} ${size * 0.08} ${-size * 0.08} ${size * 0.04}"
                          fill="none" stroke="${color}" stroke-width="${size * 0.015}" stroke-linecap="round"/>
                    <path d="M ${size * 0.05} ${-size * 0.06} L ${size * 0.08} ${-size * 0.04} L ${size * 0.06} ${-size * 0.01}"
                          fill="none" stroke="${color}" stroke-width="${size * 0.01}" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M ${-size * 0.05} ${size * 0.06} L ${-size * 0.08} ${size * 0.04} L ${-size * 0.06} ${size * 0.01}"
                          fill="none" stroke="${color}" stroke-width="${size * 0.01}" stroke-linecap="round" stroke-linejoin="round"/>
                </g>`;
            break;
    }
    
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Circle -->
  <circle cx="${center}" cy="${center}" r="${size * 0.45}" fill="${backgroundColor}"/>
  
  <!-- Icon Path -->
  ${iconPath}
  
  <!-- Border -->
  <circle cx="${center}" cy="${center}" r="${size * 0.45}" fill="none" stroke="${color}" stroke-width="${size * 0.02}" opacity="0.6"/>
</svg>`;
};

// ディレクトリ作成
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 ショートカットアイコンを生成しています...');

// 各ショートカットのアイコンを生成
shortcutIcons.forEach(icon => {
    // 96x96 サイズ（emoji版）
    const emoji96 = generateShortcutIconSVG(icon, 96);
    const emojiPath96 = path.join(iconsDir, `shortcut-${icon.name}.svg`);
    fs.writeFileSync(emojiPath96, emoji96);
    console.log(`✅ 生成完了: shortcut-${icon.name}.svg (96x96 emoji)`);
    
    // 192x192 サイズ（emoji版）
    const emoji192 = generateShortcutIconSVG(icon, 192);
    const emojiPath192 = path.join(iconsDir, `shortcut-${icon.name}-192.svg`);
    fs.writeFileSync(emojiPath192, emoji192);
    console.log(`✅ 生成完了: shortcut-${icon.name}-192.svg (192x192 emoji)`);
    
    // 96x96 サイズ（ベクター版）
    const vector96 = generateDetailedShortcutIconSVG(icon, 96);
    const vectorPath96 = path.join(iconsDir, `shortcut-${icon.name}-vector.svg`);
    fs.writeFileSync(vectorPath96, vector96);
    console.log(`✅ 生成完了: shortcut-${icon.name}-vector.svg (96x96 vector)`);
    
    // 192x192 サイズ（ベクター版）
    const vector192 = generateDetailedShortcutIconSVG(icon, 192);
    const vectorPath192 = path.join(iconsDir, `shortcut-${icon.name}-vector-192.svg`);
    fs.writeFileSync(vectorPath192, vector192);
    console.log(`✅ 生成完了: shortcut-${icon.name}-vector-192.svg (192x192 vector)`);
});

// ショートカット管理JSファイル
const shortcutManagerPath = path.join(__dirname, '..', 'public', 'shortcuts', 'shortcuts-manager.js');
const shortcutManagerContent = `/**
 * 運転日報PWA - ショートカット管理
 * 動的ショートカットと コンテキストベースショートカットの管理
 */

class ShortcutsManager {
    constructor() {
        this.config = null;
        this.dynamicShortcuts = [];
        this.contextualShortcuts = [];
        this.analytics = {
            usage: new Map(),
            sources: new Map()
        };
        
        this.init();
    }

    /**
     * 初期化
     */
    async init() {
        try {
            // 設定ファイルを読み込み
            const response = await fetch('/shortcuts/shortcuts-config.json');
            this.config = await response.json();
            
            // 動的ショートカットを評価・更新
            this.updateDynamicShortcuts();
            
            // コンテキストショートカットを評価・更新
            this.updateContextualShortcuts();
            
            // 使用状況の追跡を開始
            if (this.config.settings.analytics.track_usage) {
                this.initAnalytics();
            }
            
            console.log('ショートカット管理が初期化されました');
        } catch (error) {
            console.error('ショートカット初期化エラー:', error);
        }
    }

    /**
     * 動的ショートカットの更新
     */
    updateDynamicShortcuts() {
        if (!this.config?.dynamic_shortcuts) return;

        this.dynamicShortcuts = this.config.dynamic_shortcuts.filter(shortcut => {
            return this.evaluateCondition(shortcut.condition, shortcut);
        });

        console.log('動的ショートカット更新:', this.dynamicShortcuts.length);
    }

    /**
     * コンテキストショートカットの更新
     */
    updateContextualShortcuts() {
        if (!this.config?.contextual_shortcuts) return;

        this.contextualShortcuts = this.config.contextual_shortcuts.filter(shortcut => {
            return this.evaluateCondition(shortcut.condition, shortcut);
        });

        console.log('コンテキストショートカット更新:', this.contextualShortcuts.length);
    }

    /**
     * 条件の評価
     * @param {string} condition - 評価する条件
     * @param {object} shortcut - ショートカットオブジェクト
     * @returns {boolean} 条件を満たすかどうか
     */
    evaluateCondition(condition, shortcut) {
        switch (condition) {
            case 'has_recent_logs':
                return this.hasRecentLogs(shortcut.max_age_days || 7);
            
            case 'has_incomplete_logs':
                return this.hasIncompleteLogs();
            
            case 'not_driving':
                return !this.isDriving();
            
            case 'is_driving':
                return this.isDriving();
            
            default:
                return false;
        }
    }

    /**
     * 最近のログがあるかチェック
     * @param {number} maxAgeDays - 最大日数
     * @returns {boolean}
     */
    hasRecentLogs(maxAgeDays) {
        // StorageService またはローカルストレージからデータを取得
        try {
            const logs = JSON.parse(localStorage.getItem('driving-logs') || '[]');
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);
            
            return logs.some(log => new Date(log.createdAt) > cutoffDate);
        } catch (error) {
            console.error('最近のログチェックエラー:', error);
            return false;
        }
    }

    /**
     * 未完了のログがあるかチェック
     * @returns {boolean}
     */
    hasIncompleteLogs() {
        try {
            const logs = JSON.parse(localStorage.getItem('driving-logs') || '[]');
            return logs.some(log => log.status === 'in_progress');
        } catch (error) {
            console.error('未完了ログチェックエラー:', error);
            return false;
        }
    }

    /**
     * 現在運転中かチェック
     * @returns {boolean}
     */
    isDriving() {
        try {
            const currentSession = localStorage.getItem('current-driving-session');
            return currentSession !== null;
        } catch (error) {
            console.error('運転状態チェックエラー:', error);
            return false;
        }
    }

    /**
     * 全ショートカットを取得
     * @returns {array} ショートカット配列
     */
    getAllShortcuts() {
        const shortcuts = [...(this.config?.shortcuts || [])];
        
        if (this.config?.settings?.show_dynamic) {
            shortcuts.push(...this.dynamicShortcuts);
        }
        
        if (this.config?.settings?.show_contextual) {
            shortcuts.push(...this.contextualShortcuts);
        }
        
        // 最大数制限
        const maxShortcuts = this.config?.settings?.max_shortcuts || 4;
        return shortcuts.slice(0, maxShortcuts);
    }

    /**
     * ショートカット使用の記録
     * @param {string} shortcutName - ショートカット名
     * @param {string} source - 呼び出し元
     */
    recordUsage(shortcutName, source = 'unknown') {
        if (!this.config?.settings?.analytics?.track_usage) return;

        // 使用回数を記録
        const currentCount = this.analytics.usage.get(shortcutName) || 0;
        this.analytics.usage.set(shortcutName, currentCount + 1);

        // ソースを記録
        if (this.config.settings.analytics.track_source) {
            const sourceCount = this.analytics.sources.get(source) || 0;
            this.analytics.sources.set(source, sourceCount + 1);
        }

        // ローカルストレージに保存
        this.saveAnalytics();

        console.log(\`ショートカット使用記録: \${shortcutName} (from: \${source})\`);
    }

    /**
     * アナリティクスの初期化
     */
    initAnalytics() {
        try {
            const savedAnalytics = localStorage.getItem('shortcuts-analytics');
            if (savedAnalytics) {
                const data = JSON.parse(savedAnalytics);
                this.analytics.usage = new Map(data.usage || []);
                this.analytics.sources = new Map(data.sources || []);
            }
        } catch (error) {
            console.error('アナリティクス初期化エラー:', error);
        }
    }

    /**
     * アナリティクスの保存
     */
    saveAnalytics() {
        try {
            const data = {
                usage: Array.from(this.analytics.usage.entries()),
                sources: Array.from(this.analytics.sources.entries()),
                lastUpdated: Date.now()
            };
            localStorage.setItem('shortcuts-analytics', JSON.stringify(data));
        } catch (error) {
            console.error('アナリティクス保存エラー:', error);
        }
    }

    /**
     * ショートカット統計を取得
     * @returns {object} 統計データ
     */
    getStatistics() {
        return {
            totalShortcuts: this.config?.shortcuts?.length || 0,
            dynamicShortcuts: this.dynamicShortcuts.length,
            contextualShortcuts: this.contextualShortcuts.length,
            usage: Object.fromEntries(this.analytics.usage),
            sources: Object.fromEntries(this.analytics.sources),
            mostUsed: this.getMostUsedShortcut(),
            leastUsed: this.getLeastUsedShortcut()
        };
    }

    /**
     * 最も使用されたショートカットを取得
     * @returns {object|null}
     */
    getMostUsedShortcut() {
        if (this.analytics.usage.size === 0) return null;
        
        const entries = Array.from(this.analytics.usage.entries());
        entries.sort((a, b) => b[1] - a[1]);
        
        return {
            name: entries[0][0],
            count: entries[0][1]
        };
    }

    /**
     * 最も使用されていないショートカットを取得
     * @returns {object|null}
     */
    getLeastUsedShortcut() {
        if (this.analytics.usage.size === 0) return null;
        
        const entries = Array.from(this.analytics.usage.entries());
        entries.sort((a, b) => a[1] - b[1]);
        
        return {
            name: entries[0][0],
            count: entries[0][1]
        };
    }

    /**
     * 自動更新の開始
     */
    startAutoUpdate() {
        if (!this.config?.settings?.auto_update) return;

        // 30秒ごとに動的ショートカットを更新
        setInterval(() => {
            this.updateDynamicShortcuts();
            this.updateContextualShortcuts();
        }, 30000);

        console.log('ショートカット自動更新を開始');
    }

    /**
     * ショートカットUIを更新
     */
    updateUI() {
        const shortcuts = this.getAllShortcuts();
        const event = new CustomEvent('shortcuts-updated', {
            detail: { shortcuts }
        });
        
        window.dispatchEvent(event);
    }
}

// グローバルインスタンス
window.shortcutsManager = new ShortcutsManager();

// URL パラメータからショートカット使用を検出
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('source');
    
    if (source && source.includes('shortcut')) {
        const shortcutName = window.location.pathname.split('/')[1] || 'unknown';
        window.shortcutsManager.recordUsage(shortcutName, source);
    }
});

export default ShortcutsManager;`;

const shortcutsDir = path.join(__dirname, '..', 'public', 'shortcuts');
if (!fs.existsSync(shortcutsDir)) {
    fs.mkdirSync(shortcutsDir, { recursive: true });
}

fs.writeFileSync(shortcutManagerPath, shortcutManagerContent);
console.log('✅ 生成完了: shortcuts-manager.js');

console.log('\n🎉 すべてのショートカットファイルが生成されました！');

console.log('\n📁 生成されたアイコンファイル:');
shortcutIcons.forEach(icon => {
    console.log(`   shortcut-${icon.name}.svg (96x96 emoji)`);
    console.log(`   shortcut-${icon.name}-192.svg (192x192 emoji)`);
    console.log(`   shortcut-${icon.name}-vector.svg (96x96 vector)`);
    console.log(`   shortcut-${icon.name}-vector-192.svg (192x192 vector)`);
});

console.log('\n📝 実装内容:');
console.log('- 基本ショートカット (6種類)');
console.log('- 動的ショートカット (条件に基づく表示)');
console.log('- コンテキストショートカット (状況に応じた表示)');
console.log('- ショートカット使用状況分析');
console.log('- 自動更新機能');

module.exports = {
    generateShortcutIconSVG,
    generateDetailedShortcutIconSVG,
    shortcutIcons
};