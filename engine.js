let gameState = { fragments: 0 };
let currentSceneId = "";
let currentLineIndex = 0;
let currentGameConfig = null;
let currentActiveSprites = {}; 
let unplayedFragments = []; 

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
    
    // Прячем финальный пазл, если он остался от прошлой игры
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
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('hidden');
    showScreen('main-menu');
}

function loadScene(sceneId) {
    currentSceneId = sceneId;
    currentLineIndex = 0;
    
    let scene = story[sceneId];
    if (!scene) {
        console.error("ОШИБКА: Сцена " + sceneId + " не найдена!");
        return;
    }

    let bg = document.getElementById('background');
    if (bg) {
        bg.style.backgroundSize = ""; 
        bg.style.backgroundRepeat = "";
        bg.style.filter = "";

        if (scene.bg && scene.bg !== "") bg.style.backgroundImage = `url('${scene.bg}')`; 
        else { bg.style.backgroundImage = "none"; bg.style.backgroundColor = "#000000"; }
        
        if (scene.effect === "burning") bg.classList.add('burning');
        else bg.classList.remove('burning');
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
                    
                    // Если мы меняем фон на АРТ концовки, ПРЯЧЕМ СОБРАННЫЙ ПАЗЛ
                    if (line.changeBg.includes('good_ending_art')) {
                        let completedPuzzle = document.getElementById('completed-puzzle');
                        if(completedPuzzle) {
                            completedPuzzle.classList.remove('active');
                            setTimeout(() => completedPuzzle.classList.add('hidden'), 500); // Плавное исчезновение
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

        let inv = document.getElementById('inventory');
        if (inv) {
            if (line.isHorror || currentSceneId === "bad_ending") inv.classList.add('fade-out');
            else inv.classList.remove('fade-out');
        }

        // === ИСПРАВЛЕНО: ЗАПУСК АНИМАЦИИ ПАЗЛА ===
        if (line.action === "play_puzzle_animation") {
            playFullPuzzleAnimation(() => {
                currentLineIndex++;
                renderLine();
            });
            return; // Ждем окончания анимации
        }
        
        document.getElementById('text-wrapper').scrollTop = 0;
        currentLineIndex++;
    } else {
        handleNextAction(scene.nextAction, scene.gameConfig, scene.nextScene);
    }
}

function advanceStory() { renderLine(); }

function updateSprites(spritesData) {
    let container = document.getElementById('sprites-container');
    if (!container) return;

    let newNames = spritesData.map(s => s.name);
    Array.from(container.children).forEach(child => {
        if (!newNames.includes(child.dataset.name)) {
            child.remove();
            delete currentActiveSprites[child.dataset.name];
        }
    });

    spritesData.forEach(spriteInfo => {
        let existing = container.querySelector(`img[data-name="${spriteInfo.name}"]`);
        if (existing) {
            existing.className = `sprite pos-${spriteInfo.pos} ${spriteInfo.anim || ''}`;
            if (existing.src !== spriteInfo.img && !existing.src.includes(spriteInfo.img)) {
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
    sprites.forEach(sprite => {
        if (sprite.dataset.name === speakerName) sprite.classList.add('active');
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

function startMinigame(config) { 
    currentGameConfig = config; 
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('fade-out'); 
    showScreen('minigame-screen'); 
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

// === ИСПРАВЛЕННАЯ ЛОГИКА ФИНАЛЬНОГО ПАЗЛА ===
function playFullPuzzleAnimation(callback) {
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
            
            // ВАЖНО: Делаем видимым наш новый слой с пазлом!
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
            
            // Запускаем следующую реплику текста!
            if (callback) callback(); 
        }, 1000); 
    }, 2800); 
}

function triggerJumpscareAndBadEnd() {
    let inv = document.getElementById('inventory');
    if (inv) inv.classList.add('hidden');
    let ui = document.getElementById('ui-layer');
    if (ui) ui.classList.add('hidden');
    
    showScreen('jumpscare-screen');
    
    setTimeout(() => { 
        showScreen('vn-screen');
        if(ui) ui.classList.remove('hidden');
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