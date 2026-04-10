let gameState = { fragments: 0 };
let currentSceneId = "";
let currentLineIndex = 0;
let currentGameConfig = null;
let currentActiveSprites = {}; 
let unplayedFragments = []; 

// === АУДИО МЕНЕДЖЕР (OGG) ===
let currentMusicType = null;
let currentSfx = null; // Сюда будем сохранять звуки (скример, спираль), чтобы их выключать
let fireSfx = new Audio("assets/sfx_fire.ogg");
fireSfx.loop = true;

const audioTracks = {
    "hub": new Audio("assets/bgm_hub.ogg"),
    "memory": new Audio("assets/bgm_memory.ogg"),
    "horror": new Audio("assets/bgm_horror.ogg"),
    "good_end": new Audio("assets/bgm_good_end.ogg")
};

for (let key in audioTracks) { audioTracks[key].loop = true; }

function playMusic(trackType) {
    if (currentMusicType === trackType) return; 
    
    if (currentMusicType && audioTracks[currentMusicType]) {
        audioTracks[currentMusicType].pause();
        audioTracks[currentMusicType].currentTime = 0;
    }
    
    if (trackType && audioTracks[trackType]) {
        audioTracks[trackType].play().catch(e => console.log("Блокировка автоплея", e));
        currentMusicType = trackType;
    } else {
        currentMusicType = null;
    }
}

// Запуск одиночных звуков
function playSfx(src) {
    if (currentSfx) {
        currentSfx.pause();
        currentSfx.currentTime = 0;
    }
    currentSfx = new Audio(src);
    currentSfx.play().catch(e => console.log("SFX блок", e));
}

// Принудительная остановка звука (скримера/спирали)
function stopSfx() {
    if (currentSfx) {
        currentSfx.pause();
        currentSfx.currentTime = 0;
        currentSfx = null;
    }
}
// =========================

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    let targetScreen = document.getElementById(screenId);
    if (targetScreen) targetScreen.classList.add('active');
}

function startGame() {
    showScreen('vn-screen');
    document.getElementById('vn-screen').classList.remove('fade-out');
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.remove('hidden', 'fade-out');
    
    let completedPuzzle = document.getElementById('completed-puzzle');
    if(completedPuzzle) {
        completedPuzzle.classList.remove('active');
        completedPuzzle.classList.add('hidden');
    }

    gameState.fragments = 0; 
    unplayedFragments = ["shadow_1", "shadow_2", "sun_1", "sun_2", "holly_1", "holly_2"];
    
    document.querySelectorAll('.inv-slot').forEach(slot => {
        slot.style.backgroundImage = 'none';
        slot.classList.remove('filled');
    });

    loadScene('intro');
}

function returnToMenu() {
    // ВЫКЛЮЧАЕМ ВООБЩЕ ВСЁ ПРИ ВЫХОДЕ В МЕНЮ
    playMusic(null); 
    stopSfx();
    fireSfx.pause();
    
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('hidden');
    showScreen('main-menu');
}

function loadScene(sceneId) {
    currentSceneId = sceneId;
    currentLineIndex = 0;
    
    let scene = story[sceneId];
    if (!scene) { console.error("ОШИБКА: Сцена " + sceneId + " не найдена!"); return; }

    if (scene.music) playMusic(scene.music);

    let bg = document.getElementById('background');
    if (bg) {
        bg.style.backgroundSize = ""; 
        bg.style.backgroundRepeat = "";
        bg.style.filter = "";

        if (scene.bg && scene.bg !== "") bg.style.backgroundImage = `url('${scene.bg}')`; 
        else { bg.style.backgroundImage = "none"; bg.style.backgroundColor = "#000000"; }
        
        if (scene.effect === "burning") {
            bg.classList.add('burning');
            fireSfx.play().catch(e=>{});
        } else { 
            bg.classList.remove('burning');
            fireSfx.pause();
        }
    }

    let wisp = document.getElementById('wisp');
    if (wisp) {
        wisp.classList.add('hidden');
        wisp.classList.remove('fly-away');
    }
    
    let spritesCont = document.getElementById('sprites-container');
    if (spritesCont) spritesCont.innerHTML = ""; 
    currentActiveSprites = {};

    renderLine();
}

function renderLine() {
    let scene = story[currentSceneId];
    if (!scene || !scene.dialogue) return;

    if (currentLineIndex < scene.dialogue.length) {
        let line = scene.dialogue[currentLineIndex];
        
        if (line.changeBg !== undefined) {
            let bg = document.getElementById('background');
            if (bg) {
                bg.style.backgroundSize = ""; 
                bg.style.backgroundRepeat = "";
                bg.style.filter = "";

                if (line.changeBg !== "") {
                    bg.style.backgroundImage = `url('${line.changeBg}')`;
                    if (line.changeBg.includes('good_ending_art')) {
                        let completedPuzzle = document.getElementById('completed-puzzle');
                        if(completedPuzzle) {
                            completedPuzzle.classList.remove('active');
                            setTimeout(() => completedPuzzle.classList.add('hidden'), 500); 
                        }
                    }
                } else { 
                    bg.style.backgroundImage = "none"; bg.style.backgroundColor = "#000000"; 
                }
            }
        }
        
        if (line.removeEffect === "burning") {
            let bg = document.getElementById('background');
            if (bg) bg.classList.remove('burning');
            fireSfx.pause(); 
        }

        let speakerDiv = document.getElementById('speaker-name');
        if (speakerDiv) speakerDiv.innerText = line.speaker || "";

        let textDiv = document.getElementById('dialogue-text');
        if (textDiv) {
            textDiv.innerHTML = line.text || "";
            if (line.isHorror) textDiv.classList.add('horror-text');
            else textDiv.classList.remove('horror-text');
            textDiv.classList.remove('fade-in-text');
            void textDiv.offsetWidth; 
            textDiv.classList.add('fade-in-text');
        }

        if (line.clearSprites) {
            let spritesCont = document.getElementById('sprites-container');
            if (spritesCont) spritesCont.innerHTML = ""; 
            currentActiveSprites = {};
        }

        // === ИСПРАВЛЕННЫЕ СПРАЙТЫ ===
        if (line.show) updateSprites(line.show);
        if (line.hide) hideSprites(line.hide);

        highlightSpeaker(line.speaker);

        let wisp = document.getElementById('wisp');
        if (wisp) {
            if (line.action === "show_wisp") wisp.classList.remove('hidden', 'fly-away');
            if (line.action === "hide_wisp") wisp.classList.add('hidden');
            if (line.action === "wisp_fly_away") {
                wisp.classList.add('fly-away'); 
                let paws = document.getElementById('paw-prints');
                if(paws) paws.classList.add('show');
            }
        }
        if (line.action === "hide_completed_puzzle") {
            let cp = document.getElementById('completed-puzzle');
            if (cp) { cp.classList.remove('active'); setTimeout(() => cp.classList.add('hidden'), 500); }
        }

        let inv = document.getElementById('inventory');
        if (inv) {
            if (line.isHorror || currentSceneId === "bad_ending") inv.classList.add('fade-out');
            else inv.classList.remove('fade-out');
        }

        if (line.action === "play_puzzle_animation") {
            playFullPuzzleAnimation(() => {
                currentLineIndex++;
                renderLine();
            });
            return; 
        }
        
        let nextBtn = document.getElementById('next-btn');
        let choicesBox = document.getElementById('choices-container');
        if (line.choices) {
            if(nextBtn) nextBtn.classList.add('hidden');
            if(choicesBox) {
                choicesBox.classList.remove('hidden');
                choicesBox.innerHTML = "";
                line.choices.forEach(choice => {
                    let btn = document.createElement('button');
                    btn.className = "choice-btn";
                    btn.innerHTML = choice.text;
                    btn.onclick = (e) => { e.stopPropagation(); makeChoice(choice.nextAction); };
                    choicesBox.appendChild(btn);
                });
                setTimeout(() => { document.getElementById('text-wrapper').scrollTop = document.getElementById('text-wrapper').scrollHeight; }, 50);
            }
        } else {
            if(nextBtn) nextBtn.classList.remove('hidden');
            if(choicesBox) choicesBox.classList.add('hidden');
            document.getElementById('text-wrapper').scrollTop = 0;
            currentLineIndex++;
        }
    } else {
        handleNextAction(scene.nextAction, scene.gameConfig, scene.nextScene);
    }
}

function advanceStory() { 
    let scene = story[currentSceneId];
    if(scene && scene.dialogue && scene.dialogue[currentLineIndex-1] && scene.dialogue[currentLineIndex-1].choices) {
        return; 
    }
    renderLine(); 
}

function updateSprites(spritesData) {
    let container = document.getElementById('sprites-container');
    if (!container) return;

    // ВАЖНО: Мы больше НЕ удаляем персонажей, которых нет в текущем списке!
    // Они остаются на месте, пока не вызовут hide или clearSprites.

    spritesData.forEach(spriteInfo => {
        let existing = container.querySelector(`img[data-name="${spriteInfo.name}"]`);
        if (existing) {
            existing.className = `sprite pos-${spriteInfo.pos} ${spriteInfo.anim || ''}`;
            if (!existing.src.includes(spriteInfo.img)) {
                existing.src = spriteInfo.img; 
            }
        } else {
            let img = document.createElement('img');
            img.src = spriteInfo.img; 
            img.className = `sprite pos-${spriteInfo.pos} ${spriteInfo.anim || ''}`;
            img.dataset.name = spriteInfo.name;
            img.onerror = function() { this.style.display = 'none'; };
            container.appendChild(img);
            currentActiveSprites[spriteInfo.name] = true;
        }
    });
}

function hideSprites(namesArray) {
    let container = document.getElementById('sprites-container');
    if (!container) return;
    namesArray.forEach(name => {
        let s = container.querySelector(`img[data-name="${name}"]`);
        if (s) { s.remove(); delete currentActiveSprites[name]; }
    });
}

function highlightSpeaker(speakerName) {
    let sprites = document.querySelectorAll('.sprite');
    let targetName = (speakerName === "Спасительница") ? "Ноча" : speakerName;

    sprites.forEach(sprite => {
        if (sprite.dataset.name === targetName) sprite.classList.add('active');
        else sprite.classList.remove('active');
    });
}

function handleNextAction(action, config, nextSceneId) {
    if (action === "random_next") {
        if (unplayedFragments.length === 0) {
            loadScene('good_ending_intro'); 
        } else {
            let randomIndex = Math.floor(Math.random() * unplayedFragments.length);
            let nextFragId = unplayedFragments.splice(randomIndex, 1)[0];
            loadScene(nextFragId); 
        }
    }
    else if (action === "play_jumpscare") triggerJumpscareAndBadEnd();
    else if (action === "show_ending_card_good") showEndingCard("good");
    else if (action === "show_ending_card_bad") showEndingCard("bad");
    else if (action === "main_menu") returnToMenu();
    else if (action === "minigame") startMinigame(config);
    else if (action === "collect_fragment") collectFragment(nextSceneId);
    else loadScene(action); 
}

// === ПОЛНОЦЕННАЯ МИНИ-ИГРА ===
let minigameMistakes = 0;
let itemsToFind = 5;
let itemsFound = 0;
let targetItemsList = [];

function startMinigame(config) { 
    currentGameConfig = config; 
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('fade-out'); 
    
    minigameMistakes = 0;
    itemsFound = 0;
    document.getElementById('mistakes-counter').innerText = `Ошибок: 0 / 3`;
    
    let bg = document.getElementById('minigame-bg');
    let randBg = Math.floor(Math.random() * 3) + 1;
    bg.style.backgroundImage = `url('assets/minigame_bg_${randBg}.jpg')`;

    if (config.isGlitch) bg.classList.add('glitch-bg');
    else bg.classList.remove('glitch-bg');

    spawnItems();
    showScreen('minigame-screen'); 
}

function spawnItems() {
    let container = document.getElementById('minigame-items-container');
    let taskBox = document.getElementById('target-items-container');
    container.innerHTML = "";
    taskBox.innerHTML = "";

    // 1. Выбираем 10 уникальных случайных ID предметов (от 1 до 10)
    let allItems = [];
    while(allItems.length < 10) {
        let r = Math.floor(Math.random() * 10) + 1;
        if(!allItems.includes(r)) allItems.push(r);
    }
    
    // 2. Первые 5 предметов из списка объявляем ЦЕЛЕВЫМИ
    targetItemsList = allItems.slice(0, 5);
    
    // 3. Рисуем силуэты целевых предметов в нижней панели
    targetItemsList.forEach(id => {
        let silhouette = document.createElement('div');
        silhouette.className = `target-silhouette item-id-${id}`;
        silhouette.style.backgroundImage = `url('assets/item_${id}.png')`;
        taskBox.appendChild(silhouette);
    });

    // 4. УМНЫЙ СПАВН: раскидываем все 10 предметов по полю так, чтобы они не пересекались
    let spawnedPositions = []; // Храним координаты уже поставленных предметов
    const minDistance = 12; // Минимальная дистанция между центрами предметов (в процентах экрана)

    allItems.forEach(id => {
        let isTarget = targetItemsList.includes(id);
        let item = document.createElement('div');
        item.className = 'mg-item';
        item.style.backgroundImage = `url('assets/item_${id}.png')`;
        
        let validPosition = false;
        let randomTop, randomLeft;
        let attempts = 0;

        // Пытаемся найти свободное место (до 100 попыток на предмет)
        while (!validPosition && attempts < 100) {
            randomTop = Math.random() * 70 + 10;  // от 10% до 80%
            randomLeft = Math.random() * 80 + 10; // от 10% до 90%
            
            validPosition = true;
            // Проверяем расстояние до всех уже поставленных предметов
            for (let i = 0; i < spawnedPositions.length; i++) {
                let pos = spawnedPositions[i];
                let dx = randomLeft - pos.x;
                let dy = randomTop - pos.y;
                let distance = Math.sqrt(dx*dx + dy*dy); // Теорема Пифагора
                
                if (distance < minDistance) {
                    validPosition = false; // Слишком близко, ищем заново!
                    break;
                }
            }
            attempts++;
        }

        // Запоминаем найденную успешную позицию
        spawnedPositions.push({ x: randomLeft, y: randomTop });

        // Применяем позицию
        item.style.top = randomTop + '%';
        item.style.left = randomLeft + '%';
        
        // Рандомный размер (0.7 до 1.05) и поворот
        item.style.transform = `rotate(${Math.random() * 360}deg) scale(${Math.random() * 0.35 + 0.7})`;

        // Логика клика
        item.onclick = (e) => {
            e.stopPropagation(); 
            if (isTarget) {
                item.remove(); // Убираем предмет с поля
                itemsFound++;
                
                // Подсвечиваем силуэт в панели заданий
                let sil = document.querySelector(`.target-silhouette.item-id-${id}`);
                if(sil) sil.classList.add('found');
                
                // Проверяем победу
                if (itemsFound >= 5) winMinigame();
            } else {
                handleMissClick(); // Если кликнули по обманке
            }
        };
        
        container.appendChild(item);
    });
}

function handleMissClick(e) {
    minigameMistakes++;
    document.getElementById('mistakes-counter').innerText = `Ошибок: ${minigameMistakes} / 3`;
    
    let bg = document.getElementById('minigame-bg');
    bg.classList.remove('error-flash');
    void bg.offsetWidth; 
    bg.classList.add('error-flash');

    if (minigameMistakes >= 3) {
        loseMinigame();
    }
}

function winMinigame() { 
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.remove('fade-out'); 
    showScreen('vn-screen'); 
    if (currentGameConfig.winScene === "random_next") {
        handleNextAction("random_next");
    } else {
        loadScene(currentGameConfig.winScene); 
    }
}
function loseMinigame() { 
    showScreen('vn-screen'); 
    loadScene(currentGameConfig.loseScene); 
}

function collectFragment(nextSceneId) {
    gameState.fragments++;
    let overlay = document.getElementById('puzzle-overlay');
    let piece = document.getElementById('puzzle-piece-large');
    
    if (piece) {
        piece.classList.remove('anim-fly-to-inventory');
        piece.style.backgroundImage = `url('assets/frag_${gameState.fragments}.png')`;
    }
    if (overlay) {
        overlay.classList.remove('hidden');
        overlay.classList.add('active');
    }

    setTimeout(() => {
        if (piece) piece.classList.add('anim-fly-to-inventory');
        setTimeout(() => {
            if (overlay) {
                overlay.classList.remove('active');
                overlay.classList.add('hidden');
            }
            let slot = document.getElementById(`inv-slot-${gameState.fragments}`);
            if (slot) {
                slot.style.backgroundImage = `url('assets/frag_${gameState.fragments}.png')`;
                slot.classList.add('filled');
            }
            
            if (gameState.fragments >= 6) {
                loadScene('good_ending_intro');
            } else if (nextSceneId) {
                loadScene(nextSceneId); 
            } else {
                handleNextAction("random_next"); 
            }
        }, 1500); 
    }, 1500); 
}

function playFullPuzzleAnimation(callback) {
    playMusic(null); 
    let sfx = new Audio("assets/sfx_spiral.ogg");
    sfx.play().catch(e=>{});

    let overlay = document.getElementById('full-puzzle-overlay');
    let swirlContainer = document.getElementById('swirl-container');
    let flash = document.getElementById('flash-screen');
    let uiLayer = document.getElementById('ui-layer');

    if (uiLayer) uiLayer.classList.add('hidden'); 
    if (!overlay || !swirlContainer || !flash) return;

    swirlContainer.innerHTML = '';
    flash.classList.remove('flash-anim');

    overlay.classList.remove('hidden');
    overlay.classList.add('active');

    for(let i = 1; i <= 6; i++) {
        let p = document.createElement('div');
        p.className = 'swirl-piece';
        p.style.backgroundImage = `url('assets/frag_${i}.png')`;
        p.style.setProperty('--start-rot', `${i * 60}deg`); 
        swirlContainer.appendChild(p);
    }

    setTimeout(() => {
        flash.classList.add('flash-anim');
        setTimeout(() => {
            
            // ВАЖНО: Мы больше не трогаем background!
            // Мы включаем независимый слой completed-puzzle
            let completedPuzzle = document.getElementById('completed-puzzle');
            if (completedPuzzle) {
                completedPuzzle.classList.remove('hidden');
                setTimeout(() => completedPuzzle.classList.add('active'), 50); // Плавно показываем
            }

            let spritesCont = document.getElementById('sprites-container');
            if(spritesCont) spritesCont.innerHTML = "";
            currentActiveSprites = {};

            overlay.classList.remove('active');
            overlay.classList.add('hidden');
            
            if (uiLayer) uiLayer.classList.remove('hidden');
            
            playMusic("good_end"); 
            if (callback) callback(); 
        }, 1000); 
    }, 2800); 
}

function triggerJumpscareAndBadEnd() {
    playMusic(null); // Пауза для тишины
    playSfx("assets/sfx_jumpscare.ogg"); // Скример!

    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('hidden');
    let ui = document.getElementById('ui-layer');
    if (ui) ui.classList.add('hidden');
    
    document.getElementById('vn-screen').classList.add('fade-out'); 
    showScreen('jumpscare-screen');
    
    setTimeout(() => { 
        document.getElementById('vn-screen').classList.remove('fade-out');
        if(ui) ui.classList.remove('hidden');
        
        stopSfx(); // Жестко рубим звук скримера
        playMusic("horror"); // Врубаем хоррор фон на концовку
        
        showEndingCard("bad");
    }, 3000); 
}

function showEndingCard(type) {
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('hidden');
    
    let cardScreen = document.getElementById('ending-card-screen');
    let title = document.getElementById('ending-title');
    let cardImg = document.getElementById('ending-card-img');
    let bg = document.getElementById('ending-card-bg');
    
    if (!cardScreen || !title || !cardImg) return;

    if(type === "good") {
        title.innerText = "ХОРОШАЯ КОНЦОВКА";
        title.style.color = "#00ffff";
        cardImg.style.backgroundImage = "url('assets/good_ending_art.jpg')"; 
        bg.style.backgroundImage = "url('assets/good_ending_art.jpg')"; 
    } else {
        title.innerText = "Мне не удалось вспомнить..";
        title.style.color = "#ff0000";
        cardImg.style.backgroundImage = "url('assets/bad_ending_art.jpg')"; 
        bg.style.backgroundImage = "url('assets/bad_ending_art.jpg')"; 
    }
    
    showScreen('ending-card-screen');
}