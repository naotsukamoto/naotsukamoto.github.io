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

            loadActivitySignal();
        });

        function formatDistance(value, maximumFractionDigits = 1) {
            const number = Number(value);
            if (!Number.isFinite(number)) return '—';
            return new Intl.NumberFormat('ja-JP', { maximumFractionDigits }).format(number);
        }

        function setText(id, value) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        }

        function renderActivitySignal(data) {
            const running = data?.running;

            if (running) {
                setText('runWeek', formatDistance(running.weekKm));
                setText('runMonth', formatDistance(running.monthKm, 0));
                setText('runYear', formatDistance(running.yearKm, 0));
                setText('runCount', `${running.monthRunCount ?? '—'} runs this month`);
                setText('runningUpdated', running.updatedLabel || 'Updated today');
                setText('runComparison', running.comparisonLabel || '');

                const target = Number(running.weekTargetKm);
                const current = Number(running.weekKm);
                const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
                const progressBar = document.getElementById('runWeekProgress');
                if (progressBar) progressBar.style.width = `${progress}%`;
            }
        }

        async function loadActivitySignal() {
            const sources = [
                'https://raw.githubusercontent.com/naotsukamoto/naotsukamoto.github.io/coros-data/data/activity.json',
                'data/activity.json'
            ];
            for (const source of sources) {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000);
                try {
                    const response = await fetch(source, {
                        cache: 'no-cache',
                        signal: controller.signal
                    });
                    if (!response.ok) throw new Error(`Activity data: ${response.status}`);
                    const data = await response.json();
                    if (!data?.running || !['weekKm', 'monthKm', 'yearKm', 'monthRunCount']
                        .every(key => typeof data.running[key] === 'number' && Number.isFinite(data.running[key]))) {
                        throw new Error('Invalid activity data');
                    }
                    renderActivitySignal(data);
                    if (source === 'data/activity.json') {
                        setText('runningUpdated', '保存済みの記録');
                    }
                    return;
                } catch (error) {
                    console.warn('Activity Signal source could not be loaded.', error);
                } finally {
                    clearTimeout(timeout);
                }
            }
            setText('runningUpdated', 'Sync unavailable');
        }
