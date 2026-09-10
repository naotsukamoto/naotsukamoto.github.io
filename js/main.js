// テーマ切り替え（ライト / ダーク）
        function toggleTheme() {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            const nextTheme = isDark ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', nextTheme);
            document.getElementById('themeLabel').textContent = nextTheme === 'dark' ? 'LIGHT' : 'DARK';
            try {
                localStorage.setItem('user_pref_theme', nextTheme);
            } catch (e) { }
        }

        // 差し色の変更
        function setColor(hex, buttonEl) {
            document.documentElement.style.setProperty('--accent-color', hex);
            document.querySelectorAll('.color-swatch').forEach(btn => btn.classList.remove('active'));
            if (buttonEl) buttonEl.classList.add('active');
            try {
                localStorage.setItem('user_pref_color', hex);
            } catch (e) { }
        }

        // 読み込み時に保存された好みを復元
        window.addEventListener('DOMContentLoaded', () => {
            try {
                const savedColor = localStorage.getItem('user_pref_color');
                if (savedColor) {
                    const matchedBtn = Array.from(document.querySelectorAll('.color-swatch'))
                        .find(btn => btn.getAttribute('style')?.includes(savedColor));
                    setColor(savedColor, matchedBtn);
                }

                const savedTheme = localStorage.getItem('user_pref_theme');
                if (savedTheme === 'dark') {
                    document.documentElement.setAttribute('data-theme', 'dark');
                    document.getElementById('themeLabel').textContent = 'LIGHT';
                }
            } catch (e) { }
        });
