// common.js – универсальный движок для карточек

// ---- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ----
function extractMainAndNote(str) {
    const match = str.match(/^([^\s(]+)\s*\(([^)]*)\)$/);
    if (match) {
        return { main: match[1], note: `(${match[2]})` };
    } else {
        return { main: str, note: '' };
    }
}

function extractMainAndNoteWithExplanation(str) {
    const parts = str.split('|').map(s => s.trim());
    const mainPart = parts[0];
    const explanation = parts[1] || '';
    const match = mainPart.match(/^([^\s(]+)\s*\(([^)]*)\)$/);
    if (match) {
        return { main: match[1], note: `(${match[2]})`, explanation: explanation };
    } else {
        return { main: mainPart, note: '', explanation: explanation };
    }
}

function parsePairs(wordsRaw, patternsRaw) {
    if (!wordsRaw.trim() || !patternsRaw.trim()) return [];
    const wordLines = wordsRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const patternLines = patternsRaw.split('\n').map(s => s.trim()).filter(s => s.length > 0);
    const minLen = Math.min(wordLines.length, patternLines.length);
    const pairs = [];
    for (let i = 0; i < minLen; i++) {
        const p = extractMainAndNote(patternLines[i]);
        const w = extractMainAndNoteWithExplanation(wordLines[i]);
        pairs.push({
            patternMain: p.main,
            patternNote: p.note,
            wordMain: w.main,
            wordNote: w.note,
            explanation: w.explanation || ''
        });
    }
    return pairs;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// ---- ЗАГРУЗКА ДАННЫХ ИЗ ФАЙЛОВ ----
function loadData(files) {
    const promises = {};
    for (const [key, path] of Object.entries(files)) {
        promises[key] = fetch(path).then(res => {
            if (!res.ok) throw new Error(`Не удалось загрузить ${path}`);
            return res.text();
        });
    }
    return Promise.all(Object.values(promises)).then(results => {
        const data = {};
        let i = 0;
        for (const key of Object.keys(files)) {
            data[key] = results[i++];
        }
        return data;
    });
}

// ---- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ----
let cards = [];
let currentIndex = 0;
let isAnimating = false;
let flipTimer = null;
let isThemeSelected = false;

// DOM-элементы (заполняются в initApp)
let cardEl, patternDisplay, noteFrontDisplay, answerDisplay, noteBackDisplay, explanationDisplay, counterEl, prevBtn, nextBtn, shuffleBtn, backBtn, cardWrapper, themeSelector, themeButtons, subtitle, messageEl, nav;

// ---- ФУНКЦИИ ОБНОВЛЕНИЯ КАРТОЧЕК ----
function updateCardData(index, updateBack = true) {
    const item = cards[index];
    if (!item) return;

    patternDisplay.textContent = item.patternMain;
    if (item.patternNote) {
        noteFrontDisplay.textContent = item.patternNote;
        noteFrontDisplay.style.display = 'block';
    } else {
        noteFrontDisplay.style.display = 'none';
    }

    if (updateBack) {
        answerDisplay.textContent = item.wordMain;
        if (item.wordNote) {
            noteBackDisplay.textContent = item.wordNote;
            noteBackDisplay.style.display = 'block';
        } else {
            noteBackDisplay.style.display = 'none';
        }
    }
    if (explanationDisplay) {
        if (item.explanation) {
            explanationDisplay.textContent = item.explanation;
            explanationDisplay.style.display = 'block';
        } else {
            explanationDisplay.style.display = 'none';
        }
    }
    counterEl.textContent = `${index + 1} / ${cards.length}`;
    prevBtn.disabled = (index === 0);
    nextBtn.disabled = (index === cards.length - 1);
}

function changeCard(newIndex) {
    if (isAnimating) return;
    if (newIndex < 0 || newIndex >= cards.length) return;
    if (newIndex === currentIndex) return;

    const isFlipped = cardEl.classList.contains('flipped');

    if (isFlipped) {
        isAnimating = true;
        cardEl.classList.remove('flipped');

        const nextItem = cards[newIndex];
        patternDisplay.textContent = nextItem.patternMain;
        if (nextItem.patternNote) {
            noteFrontDisplay.textContent = nextItem.patternNote;
            noteFrontDisplay.style.display = 'block';
        } else {
            noteFrontDisplay.style.display = 'none';
        }

        if (flipTimer) clearTimeout(flipTimer);
        flipTimer = setTimeout(() => {
            answerDisplay.textContent = '';
            if (noteBackDisplay) noteBackDisplay.textContent = '';
            if (noteBackDisplay) noteBackDisplay.style.display = 'none';
            answerDisplay.textContent = nextItem.wordMain;
            if (nextItem.wordNote) {
                noteBackDisplay.textContent = nextItem.wordNote;
                noteBackDisplay.style.display = 'block';
            } else {
                noteBackDisplay.style.display = 'none';
            }
            currentIndex = newIndex;
            counterEl.textContent = `${currentIndex + 1} / ${cards.length}`;
            prevBtn.disabled = (currentIndex === 0);
            nextBtn.disabled = (currentIndex === cards.length - 1);
            isAnimating = false;
            flipTimer = null;
        }, 299);
    } else {
        currentIndex = newIndex;
        updateCardData(currentIndex, true);
    }
}

function showNext() {
    if (currentIndex < cards.length - 1) {
        changeCard(currentIndex + 1);
    }
}

function showPrev() {
    if (currentIndex > 0) {
        changeCard(currentIndex - 1);
    }
}

function shuffleCards() {
    if (isAnimating) return;
    if (flipTimer) {
        clearTimeout(flipTimer);
        flipTimer = null;
    }
    shuffleArray(cards);

    const isFlipped = cardEl.classList.contains('flipped');
    if (isFlipped) {
        isAnimating = true;
        cardEl.classList.remove('flipped');

        answerDisplay.textContent = '';
        if (noteBackDisplay) noteBackDisplay.textContent = '';
        if (noteBackDisplay) noteBackDisplay.style.display = 'none';

        const firstItem = cards[0];
        patternDisplay.textContent = firstItem.patternMain;
        if (firstItem.patternNote) {
            noteFrontDisplay.textContent = firstItem.patternNote;
            noteFrontDisplay.style.display = 'block';
        } else {
            noteFrontDisplay.style.display = 'none';
        }

        if (flipTimer) clearTimeout(flipTimer);
        flipTimer = setTimeout(() => {
            answerDisplay.textContent = firstItem.wordMain;
            if (firstItem.wordNote) {
                noteBackDisplay.textContent = firstItem.wordNote;
                noteBackDisplay.style.display = 'block';
            } else {
                noteBackDisplay.style.display = 'none';
            }
            currentIndex = 0;
            counterEl.textContent = `${currentIndex + 1} / ${cards.length}`;
            prevBtn.disabled = (currentIndex === 0);
            nextBtn.disabled = (currentIndex === cards.length - 1);
            isAnimating = false;
            flipTimer = null;
        }, 299);
    } else {
        currentIndex = 0;
        updateCardData(0, true);
    }
}

function toggleFlip() {
    if (isAnimating) return;
    cardEl.classList.toggle('flipped');
}

function handleTap() {
    if (isAnimating) return;

    if (cardEl.classList.contains('flipped')) {
        if (currentIndex < cards.length - 1) {
            changeCard(currentIndex + 1);
        } else {
            toggleFlip();
        }
    } else {
        toggleFlip();
    }
}

// ---- ЗАГРУЗКА ТЕМЫ (универсальная) ----
function loadTheme(themeKey, themeData) {
    const selected = themeData[themeKey];
    if (!selected || selected.pairs.length === 0) {
        if (messageEl) {
            messageEl.textContent = `⚠️ Список слов для темы «${selected ? selected.name : 'выбранной'}» пока пуст.`;
            messageEl.style.display = 'block';
        }
        return false;
    }

    if (messageEl) messageEl.style.display = 'none';

    const selectedPairs = shuffleArray(selected.pairs.slice());
    cards = selectedPairs;
    currentIndex = 0;
    cardEl.classList.remove('flipped');
    if (flipTimer) {
        clearTimeout(flipTimer);
        flipTimer = null;
    }
    isAnimating = false;

    // Прячем выбор темы, показываем карточки
    if (themeSelector) themeSelector.style.display = 'none';
    if (cardWrapper) cardWrapper.style.display = 'block';
    if (nav) nav.style.display = 'flex';
    if (shuffleBtn) shuffleBtn.style.display = 'inline-block';
    if (backBtn) backBtn.style.display = 'inline-block';
    if (subtitle) subtitle.innerHTML = 'Коснись карточки<span class="hide-on-mobile"> или нажми пробел</span>';

    isThemeSelected = true;
    updateCardData(0, true);
    return true;
}

// ---- ВОЗВРАТ К ВЫБОРУ ТЕМЫ ----
function goBackToTheme() {
    if (isAnimating) return;
    if (flipTimer) {
        clearTimeout(flipTimer);
        flipTimer = null;
    }
    if (cardWrapper) cardWrapper.style.display = 'none';
    if (nav) nav.style.display = 'none';
    if (shuffleBtn) shuffleBtn.style.display = 'none';
    if (backBtn) backBtn.style.display = 'none';
    if (themeSelector) themeSelector.style.display = 'flex';
    if (subtitle) subtitle.textContent = 'Выбери тему';
    isThemeSelected = false;
    cardEl.classList.remove('flipped');
    if (patternDisplay) patternDisplay.textContent = '';
    if (noteFrontDisplay) noteFrontDisplay.textContent = '';
    if (noteFrontDisplay) noteFrontDisplay.style.display = 'none';
    if (answerDisplay) answerDisplay.textContent = '';
    if (noteBackDisplay) noteBackDisplay.textContent = '';
    if (noteBackDisplay) noteBackDisplay.style.display = 'none';
    if (counterEl) counterEl.textContent = '0 / 0';
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
    if (themeButtons) themeButtons.forEach(b => b.classList.remove('selected'));
    if (messageEl) messageEl.style.display = 'none';
}

// ---- ИНИЦИАЛИЗАЦИЯ ПРИЛОЖЕНИЯ ----
function initApp(config) {
    // config: { title, themeData, defaultTheme? }

    // Получаем DOM-элементы
    cardEl = document.getElementById('card');
    patternDisplay = document.getElementById('patternDisplay');
    noteFrontDisplay = document.getElementById('noteFrontDisplay');
    answerDisplay = document.getElementById('answerDisplay');
    noteBackDisplay = document.getElementById('noteBackDisplay');
    explanationDisplay = document.getElementById('explanationDisplay');
    counterEl = document.getElementById('counter');
    prevBtn = document.getElementById('prevBtn');
    nextBtn = document.getElementById('nextBtn');
    shuffleBtn = document.getElementById('shuffleBtn');
    backBtn = document.getElementById('backBtn');
    cardWrapper = document.getElementById('cardWrapper');
    themeSelector = document.getElementById('theme-selector');
    subtitle = document.getElementById('subtitle');
    messageEl = document.getElementById('message');
    nav = document.querySelector('.nav');

    // Устанавливаем заголовок
    const titleEl = document.querySelector('h1');
    if (titleEl && config.title) titleEl.textContent = config.title;

    // Генерируем кнопки тем, если есть контейнер
    const themeButtonsContainer = document.querySelector('.theme-buttons');
    if (themeButtonsContainer && config.themeData) {
        themeButtonsContainer.innerHTML = '';
        for (const [key, value] of Object.entries(config.themeData)) {
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.dataset.theme = key;
            btn.textContent = (value.icon || '📌') + ' ' + value.name;
            themeButtonsContainer.appendChild(btn);
        }
        themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', function () {
                themeButtons.forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                if (messageEl) messageEl.style.display = 'none';
                const theme = this.dataset.theme;
                loadTheme(theme, config.themeData);
            });
        });
    }

    // Назначаем обработчики событий
    if (backBtn) backBtn.addEventListener('click', goBackToTheme);
    if (prevBtn) prevBtn.addEventListener('click', showPrev);
    if (nextBtn) nextBtn.addEventListener('click', showNext);
    if (shuffleBtn) shuffleBtn.addEventListener('click', shuffleCards);

    // Touch-события для карточки
    if (cardWrapper) {
        let touchStartX = 0, touchStartY = 0;
        let touchMoved = false;
        let swipeHandled = false;

        cardWrapper.addEventListener('touchstart', function (e) {
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            touchMoved = false;
            swipeHandled = false;
        }, { passive: true });

        cardWrapper.addEventListener('touchmove', function (e) {
            if (touchStartX === 0 && touchStartY === 0) return;
            const touch = e.touches[0];
            const dx = touch.clientX - touchStartX;
            const dy = touch.clientY - touchStartY;
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                touchMoved = true;
            }
        }, { passive: true });

        cardWrapper.addEventListener('touchend', function (e) {
            if (touchMoved) {
                const dx = e.changedTouches[0].clientX - touchStartX;
                const dy = e.changedTouches[0].clientY - touchStartY;
                if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    e.preventDefault();
                    swipeHandled = true;
                    if (dx < 0) {
                        showNext();
                    } else {
                        showPrev();
                    }
                }
            } else {
                e.preventDefault();
                handleTap();
            }
            touchStartX = 0;
            touchStartY = 0;
            touchMoved = false;
        }, { passive: false });

        cardWrapper.addEventListener('click', function (e) {
            if (e.pointerType === 'touch' || ('ontouchstart' in window)) {
                if (swipeHandled) {
                    e.preventDefault();
                    swipeHandled = false;
                    return;
                }
                if (touchMoved === false && touchStartX !== 0) {
                    e.preventDefault();
                    return;
                }
            }
            handleTap();
        });
    }

    // Клавиатура
    document.addEventListener('keydown', function (e) {
        if (!isThemeSelected) return;
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            showPrev();
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            showNext();
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            handleTap();
        }
    });

    // Тёмная тема
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.textContent = '☀️';
        }
        themeToggle.addEventListener('click', function () {
            document.body.classList.toggle('dark-theme');
            const isDark = document.body.classList.contains('dark-theme');
            themeToggle.textContent = isDark ? '☀️' : '🌙';
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        });
    }

    // Загружаем тему по умолчанию или показываем выбор
    if (config.defaultTheme && config.themeData && config.themeData[config.defaultTheme]) {
        if (themeSelector) themeSelector.style.display = 'none';
        if (cardWrapper) cardWrapper.style.display = 'block';
        if (nav) nav.style.display = 'flex';
        if (shuffleBtn) shuffleBtn.style.display = 'inline-block';
        if (backBtn) backBtn.style.display = 'inline-block';
        if (subtitle) subtitle.innerHTML = 'Коснись карточки<span class="hide-on-mobile"> или нажми пробел</span>';

        if (themeButtons) {
            const defaultBtn = document.querySelector(`.theme-btn[data-theme="${config.defaultTheme}"]`);
            if (defaultBtn) defaultBtn.classList.add('selected');
        }
        loadTheme(config.defaultTheme, config.themeData);
    } else {
        if (themeSelector) themeSelector.style.display = 'flex';
        if (cardWrapper) cardWrapper.style.display = 'none';
        if (nav) nav.style.display = 'none';
        if (shuffleBtn) shuffleBtn.style.display = 'none';
        if (backBtn) backBtn.style.display = 'none';
        if (subtitle) subtitle.textContent = 'Выбери тему';
        isThemeSelected = false;
    }
}