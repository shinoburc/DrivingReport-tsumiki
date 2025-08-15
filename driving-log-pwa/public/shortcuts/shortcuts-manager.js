/**
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

        console.log(`ショートカット使用記録: ${shortcutName} (from: ${source})`);
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

export default ShortcutsManager;