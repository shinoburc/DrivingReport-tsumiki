/**
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
        this.element.innerHTML = `
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
        `;

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

export default SplashScreen;