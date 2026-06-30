// Project GWYN - UI Bindings, Upgrades, & Local Storage Persistence

document.addEventListener('DOMContentLoaded', () => {
  const game = new GameEngine();
  let selectedClass = 'Warrior'; // Default selection
  
  // VIP Auto-Heal global configuration
  window.autoHealActive = false;
  window.assignedHpItem = null;
  window.assignedMpItem = null;
  window.hpHealThreshold = 35;
  window.mpHealThreshold = 35;
  
  // Cache DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');
  const charCards = document.querySelectorAll('.char-select-card');
  const btnStart = document.getElementById('btn-start-game');
  const startOverlay = document.getElementById('start-overlay');
  
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const btnRespawn = document.getElementById('btn-respawn');
  
  const btnToggleMode = document.getElementById('btn-toggle-mode');
  const btnResetGame = document.getElementById('btn-reset-game');
  
  const uiName = document.getElementById('ui-name');
  const uiLevel = document.getElementById('ui-level');
  const uiAvatar = document.getElementById('ui-avatar');
  const uiHpText = document.getElementById('ui-hp-text');
  const uiHpFill = document.getElementById('ui-hp-fill');
  const uiXpText = document.getElementById('ui-xp-text');
  const uiXpFill = document.getElementById('ui-xp-fill');
  
  const uiDamage = document.getElementById('ui-damage');
  const uiRange = document.getElementById('ui-range');
  const uiAtkSpeed = document.getElementById('ui-atk-speed');
  const uiStageProgress = document.getElementById('ui-stage-progress');
  const uiGold = document.getElementById('ui-gold');
  
  // Upgrades
  const btnBuyWeapon = document.getElementById('btn-buy-weapon');
  const btnBuyArmor = document.getElementById('btn-buy-armor');
  const btnBuyRing = document.getElementById('btn-buy-ring');
  
  const shopWeaponLvl = document.getElementById('shop-weapon-lvl');
  const shopWeaponCost = document.getElementById('shop-weapon-cost');
  const shopArmorLvl = document.getElementById('shop-armor-lvl');
  const shopArmorCost = document.getElementById('shop-armor-cost');
  const shopRingLvl = document.getElementById('shop-ring-lvl');
  const shopRingCost = document.getElementById('shop-ring-cost');
  
  // Stage Cards
  const stageCards = document.querySelectorAll('.stage-card');

  let allocatedStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
  let pointsLeft = 9;
  
  const jobBonuses = {
    Warrior: { str: 7, agi: 2, vit: 4, int: 0, dex: 3, luk: 2 },
    Archer:  { str: 2, agi: 7, vit: 2, int: 0, dex: 5, luk: 2 },
    Mage:    { str: 0, agi: 2, vit: 3, int: 8, dex: 4, luk: 1 }
  };

  // Load Saved Game Progress
  function loadSavedData() {
    try {
      // First try to load from the active logged-in user profile
      let data = authLoadGameData();
      
      // Fallback to local storage if no user profile data exists yet
      if (!data) {
        const saved = localStorage.getItem('gwyn_save_data');
        if (saved) {
          data = JSON.parse(saved);
        }
      }
      
      if (data) {
        selectedClass = data.className || 'Warrior';
        game.unlockedStage = 3;
        
        // Disable start-overlay immediately as game already started
        startOverlay.classList.remove('show');
        document.getElementById('main-menu-overlay').classList.add('show'); // Make sure menu displays on boot
        
        // Initialize game engine directly
        game.initGame(selectedClass);
        
        // Apply loaded properties
        game.player.level = data.level || 1;
        game.player.xp = data.xp || 0;
        game.player.gold = data.gold || 0;
        game.player.upgrades = data.upgrades || { weapon: 1, armor: 1, ring: 1 };
        if (data.inventory) {
          game.player.inventory = data.inventory;
        }
        
        // Load allocated stats
        if (data.allocatedStats) {
          game.player.allocatedStats = data.allocatedStats;
        }
        
        // Load VIP configuration
        if (data.vipConfig) {
          window.autoHealActive = data.vipConfig.autoHealActive || false;
          window.assignedHpItem = data.vipConfig.assignedHpItem || null;
          window.assignedMpItem = data.vipConfig.assignedMpItem || null;
          window.hpHealThreshold = data.vipConfig.hpHealThreshold !== undefined ? data.vipConfig.hpHealThreshold : 35;
          window.mpHealThreshold = data.vipConfig.mpHealThreshold !== undefined ? data.vipConfig.mpHealThreshold : 35;
          
          // Sync DOM checkbox and sliders
          document.getElementById('chk-auto-heal-active').checked = window.autoHealActive;
          document.getElementById('slider-hp-heal').value = window.hpHealThreshold;
          document.getElementById('lbl-hp-heal').textContent = `${window.hpHealThreshold}%`;
          document.getElementById('slider-mp-heal').value = window.mpHealThreshold;
          document.getElementById('lbl-mp-heal').textContent = `${window.mpHealThreshold}%`;
          
          // Visually restore slots
          updateAssignedSlotVisuals();
        }
        
        game.player.initClassStats();
        game.player.hp = game.player.maxHp;
        game.player.mp = game.player.maxMp;
        game.isPlaying = false; // Stay paused on main menu initially!
        
        // Update tabs and locked cards UI
        lockClassSelectionUI();
        updateUI();
      } else {
        // First startup: trigger overlay UI bindings
        updateOverlayAttributesUI();
        startOverlay.classList.add('show');
      }
    } catch (e) {
      console.error("Could not load save data", e);
    }
  }

  // Save Game Progress
  function saveGameData() {
    if (!game.player) return;
    try {
      const data = {
        className: game.player.className,
        level: game.player.level,
        xp: game.player.xp,
        gold: game.player.gold,
        upgrades: game.player.upgrades,
        allocatedStats: game.player.allocatedStats,
        unlockedStage: game.unlockedStage,
        inventory: game.player.inventory,
        vipConfig: {
          autoHealActive: window.autoHealActive,
          assignedHpItem: window.assignedHpItem,
          assignedMpItem: window.assignedMpItem,
          hpHealThreshold: window.hpHealThreshold,
          mpHealThreshold: window.mpHealThreshold
        }
      };
      // Save directly to user account profile!
      authSaveGameData(data);
    } catch (e) {
      console.error("Could not save data", e);
    }
  }

  // Auto Save periodically (every 10 seconds)
  setInterval(saveGameData, 10000);

  // Tab Navigation Bindings
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));
      
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      document.getElementById(targetId).classList.add('active');
    });
  });

  // Start Screen overlay class selection bindings
  const overlayClassCards = document.querySelectorAll('.overlay-class-card');
  overlayClassCards.forEach(card => {
    card.addEventListener('click', () => {
      overlayClassCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedClass = card.getAttribute('data-class');
      updateOverlayAttributesUI();
    });
  });

  function updateOverlayAttributesUI() {
    const bonuses = jobBonuses[selectedClass];
    document.getElementById('overlay-points-left').textContent = pointsLeft;
    
    for (let stat in allocatedStats) {
      const valSpan = document.getElementById(`alloc-val-${stat}`);
      const bonusSpan = document.getElementById(`alloc-bonus-${stat}`);
      
      const allocated = allocatedStats[stat];
      const bonus = bonuses[stat];
      
      valSpan.textContent = 1 + allocated;
      bonusSpan.textContent = bonus > 0 ? `+${bonus}` : `+0`;
      
      // Update buttons state
      const minusBtn = document.querySelector(`.btn-minus[data-stat="${stat}"]`);
      const plusBtn = document.querySelector(`.btn-plus[data-stat="${stat}"]`);
      
      if (minusBtn) minusBtn.disabled = allocated <= 0;
      if (plusBtn) plusBtn.disabled = pointsLeft <= 0;
    }
    
    // Enable start game button if all 9 points are spent
    btnStart.disabled = pointsLeft > 0;
    btnStart.textContent = pointsLeft > 0 ? `Spend 9 Attribute Points (${pointsLeft} left)` : "Start Adventure";
  }

  // Plus and Minus button bindings
  document.querySelectorAll('.btn-plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const stat = btn.getAttribute('data-stat');
      if (pointsLeft > 0) {
        allocatedStats[stat]++;
        pointsLeft--;
        updateOverlayAttributesUI();
      }
    });
  });
  
  document.querySelectorAll('.btn-minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const stat = btn.getAttribute('data-stat');
      if (allocatedStats[stat] > 0) {
        allocatedStats[stat]--;
        pointsLeft++;
        updateOverlayAttributesUI();
      }
    });
  });

  function getHeroSpritesheetSrc(className) {
    if (className === 'Warrior') {
      return 'assets/Gemini_Generated_Image_3t4xfn3t4xfn3t4x-removebg-preview.png';
    } else if (className === 'Archer') {
      return 'assets/Gemini_Generated_Image_6fnz0d6fnz0d6fnz-removebg-preview.png';
    } else if (className === 'Mage') {
      return 'assets/Gemini_Generated_Image_vkuw7evkuw7evkuw-removebg-preview.png';
    }
    return `assets/${className.toLowerCase()}_sheet.png`;
  }

  function lockClassSelectionUI() {
    charCards.forEach(c => {
      const clsName = c.getAttribute('data-class');
      if (clsName === selectedClass) {
        c.classList.add('selected');
        c.style.cursor = 'default';
        c.style.pointerEvents = 'none';
        
        // Render detailed segment of spritesheet inside tab avatar box
        const avatar = c.querySelector('.char-select-avatar');
        avatar.style.backgroundColor = 'transparent';
        avatar.style.backgroundImage = `url('${getHeroSpritesheetSrc(selectedClass)}')`;
        avatar.style.backgroundPosition = '0% 0%';
        avatar.style.backgroundSize = '400% 400%';
      } else {
        c.style.display = 'none'; // Hide other classes completely
      }
    });
    
    const tabCharBtn = document.querySelector('.tab-btn[data-tab="tab-character"]');
    if (tabCharBtn) tabCharBtn.textContent = "Hero Status";
  }

  // Start Game Binding
    btnStart.addEventListener('click', () => {
    startOverlay.classList.remove('show');
    game.initGame(selectedClass, allocatedStats);
    
    // Check if we have upgrades stored in local storage for this character
    try {
      const saved = localStorage.getItem('gwyn_save_data');
      if (saved) {
        const data = JSON.parse(saved);
        if (data && data.className === selectedClass) {
          game.player.level = data.level || 1;
          game.player.xp = data.xp || 0;
          game.player.gold = data.gold || 0;
          game.player.upgrades = data.upgrades || { weapon: 1, armor: 1, ring: 1 };
          if (data.inventory) {
            game.player.inventory = data.inventory;
          }
          game.unlockedStage = 3;
          
          if (data.allocatedStats) {
            game.player.allocatedStats = data.allocatedStats;
          }
          
          game.player.initClassStats();
          game.player.hp = game.player.maxHp; // Full heal loaded characters
          game.player.mp = game.player.maxMp;
        }
      }
    } catch (e) {
      console.error("Error loading specific character state", e);
    }
    
    lockClassSelectionUI();
    updateUI();
    
    // START LOOP
    game.isPlaying = true;
    game.lastTime = performance.now();
    requestAnimationFrame((t) => game.gameLoop(t));
  });

  const btnVipRevive = document.getElementById('btn-vip-revive');

  // Respawn Binding - Punishes death by sending the player back to Level 1 of the previous cleared stage
  btnRespawn.addEventListener('click', () => {
    gameoverOverlay.classList.remove('show');
    
    // Set active stage to previous stage (min Stage 1) and reset active level to 1
    game.activeStage = Math.max(1, game.activeStage - 1);
    game.activeLevel = 1;
    
    game.player.resetHp();
    game.isPlaying = true;
    game.startLevel();
    
    // Restart the rendering & physics loop!
    game.lastTime = performance.now();
    requestAnimationFrame((t) => game.gameLoop(t));
    
    updateUI();
  });

  // VIP Revive Binding - Spends 1 VIP Coin to revive immediately on the spot
  btnVipRevive.addEventListener('click', () => {
    if (game.player && game.player.inventory && game.player.inventory.etc && game.player.inventory.etc.vip2coin > 0) {
      game.player.inventory.etc.vip2coin--;
      
      gameoverOverlay.classList.remove('show');
      game.player.resetHp();
      game.player.mp = game.player.maxMp;
      
      // Resume loops immediately
      game.isPlaying = true;
      game.lastTime = performance.now();
      requestAnimationFrame((t) => game.gameLoop(t));
      
      saveGameData();
      updateUI();
    }
  });

  // Taskbar Mode Toggle Binding
  btnToggleMode.addEventListener('click', () => {
    const isTaskbar = document.body.classList.toggle('taskbar-mode');
    
    if (isTaskbar) {
      btnToggleMode.textContent = "Full Window";
      game.setGroundY(90); // Ground position for taskbar canvas height (120px app height - 30px header)
    } else {
      btnToggleMode.textContent = "Taskbar Mode";
      game.setGroundY(250); // Restore full ground level height
    }
    
    // Re-align player ground Y
    if (game.player) {
      game.player.y = groundY - game.player.height;
    }
  });

  // --- SETTINGS OVERLAY BINDINGS ---
  const mainMenuOverlay = document.getElementById('main-menu-overlay');
  const settingsOverlay = document.getElementById('settings-overlay');
  const exitOverlay = document.getElementById('exit-overlay');

  document.getElementById('btn-menu-start').addEventListener('click', () => {
    mainMenuOverlay.classList.remove('show');
    const saved = localStorage.getItem('gwyn_save_data');
    if (!saved) {
      startOverlay.classList.add('show');
    } else {
      game.isPlaying = true;
      game.lastTime = performance.now();
      requestAnimationFrame((t) => game.gameLoop(t));
    }
  });

  document.getElementById('btn-menu-settings').addEventListener('click', () => {
    settingsOverlay.classList.add('show');
  });

  document.getElementById('btn-menu-exit').addEventListener('click', () => {
    exitOverlay.style.display = 'flex';
  });

  document.getElementById('btn-header-settings').addEventListener('click', () => {
    settingsOverlay.classList.add('show');
  });

  document.getElementById('btn-settings-close').addEventListener('click', () => {
    settingsOverlay.classList.remove('show');
  });

  // Slider Volume Control
  const sliderVolume = document.getElementById('slider-volume');
  const lblVolume = document.getElementById('lbl-volume');
  
  // Load saved volume
  const savedVol = localStorage.getItem('gwyn_volume');
  if (savedVol !== null) {
    sliderVolume.value = Math.round(parseFloat(savedVol) * 100);
    lblVolume.textContent = `${sliderVolume.value}%`;
    if (window.soundManager) window.soundManager.setVolume(parseFloat(savedVol));
  }

  sliderVolume.addEventListener('input', (e) => {
    const val = e.target.value / 100;
    lblVolume.textContent = `${e.target.value}%`;
    if (window.soundManager) window.soundManager.setVolume(val);
  });

  // FPS dropdown Limit Control
  const selectFps = document.getElementById('select-fps');
  selectFps.addEventListener('change', (e) => {
    game.targetFps = parseInt(e.target.value);
  });

  // --- INVENTORY BAG SUB-TABS ---
  const bagTabButtons = document.querySelectorAll('.bag-tab-btn');
  bagTabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      bagTabButtons.forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      
      const targetBag = btn.getAttribute('data-bag-tab');
      document.getElementById('bag-usable').style.display = targetBag === 'bag-usable' ? 'grid' : 'none';
      document.getElementById('bag-etc').style.display = targetBag === 'bag-etc' ? 'grid' : 'none';
    });
  });

  // --- AUTO-HEAL CONFIGURATION BINDINGS ---
  const chkAutoHealActive = document.getElementById('chk-auto-heal-active');
  chkAutoHealActive.addEventListener('change', (e) => {
    window.autoHealActive = e.target.checked;
    saveGameData();
  });

  const sliderHpHeal = document.getElementById('slider-hp-heal');
  const lblHpHeal = document.getElementById('lbl-hp-heal');
  sliderHpHeal.addEventListener('input', (e) => {
    window.hpHealThreshold = parseInt(e.target.value);
    lblHpHeal.textContent = `${window.hpHealThreshold}%`;
    saveGameData();
  });

  const sliderMpHeal = document.getElementById('slider-mp-heal');
  const lblMpHeal = document.getElementById('lbl-mp-heal');
  sliderMpHeal.addEventListener('input', (e) => {
    window.mpHealThreshold = parseInt(e.target.value);
    lblMpHeal.textContent = `${window.mpHealThreshold}%`;
    saveGameData();
  });

  // --- DRAG AND DROP & CLICK ASSIGNMENT FOR POTIONS ---
  const bagSlots = document.querySelectorAll('.bag-slot[draggable="true"]');
  const slotHp = document.getElementById('slot-hp-potion');
  const slotMp = document.getElementById('slot-mp-potion');

  // Dragstart handler
  bagSlots.forEach(slot => {
    slot.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', slot.getAttribute('data-item-id'));
    });
    
    // Support simple click to assign as well!
    slot.addEventListener('click', () => {
      const itemId = slot.getAttribute('data-item-id');
      if (itemId === 'hp_potion') {
        window.assignedHpItem = itemId;
      } else if (itemId === 'mp_potion') {
        window.assignedMpItem = itemId;
      }
      updateAssignedSlotVisuals();
      saveGameData();
    });
  });

  // HP Slot Dropzone Listeners
  slotHp.addEventListener('dragover', (e) => {
    e.preventDefault();
    slotHp.classList.add('hover');
  });
  slotHp.addEventListener('dragleave', () => {
    slotHp.classList.remove('hover');
  });
  slotHp.addEventListener('drop', (e) => {
    e.preventDefault();
    slotHp.classList.remove('hover');
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId === 'hp_potion') {
      window.assignedHpItem = itemId;
      updateAssignedSlotVisuals();
      saveGameData();
    }
  });

  // MP Slot Dropzone Listeners
  slotMp.addEventListener('dragover', (e) => {
    e.preventDefault();
    slotMp.classList.add('hover');
  });
  slotMp.addEventListener('dragleave', () => {
    slotMp.classList.remove('hover');
  });
  slotMp.addEventListener('drop', (e) => {
    e.preventDefault();
    slotMp.classList.remove('hover');
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId === 'mp_potion') {
      window.assignedMpItem = itemId;
      updateAssignedSlotVisuals();
      saveGameData();
    }
  });

  // Helper to visually update dropslots
  function updateAssignedSlotVisuals() {
    // HP slot
    if (window.assignedHpItem) {
      slotHp.innerHTML = '<span style="font-size:20px;">🧪</span><span style="font-size:8px; font-weight:bold; color:var(--health); position:absolute; bottom:2px;">HP Pot</span>';
      slotHp.classList.add('assigned');
    } else {
      slotHp.innerHTML = '<span class="slot-placeholder" style="font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1;">Drop HP</span>';
      slotHp.classList.remove('assigned');
    }
    
    // MP slot
    if (window.assignedMpItem) {
      slotMp.innerHTML = '<span style="font-size:20px;">🧪</span><span style="font-size:8px; font-weight:bold; color:hsl(210, 80%, 65%); position:absolute; bottom:2px;">MP Pot</span>';
      slotMp.classList.add('assigned');
    } else {
      slotMp.innerHTML = '<span class="slot-placeholder" style="font-size: 10px; color: var(--text-muted); text-align: center; line-height: 1;">Drop MP</span>';
      slotMp.classList.remove('assigned');
    }
  }
  
  // Bind global helper for saved state restoring
  window.updateAssignedSlotVisuals = updateAssignedSlotVisuals;

  // Reset Game Binding
  btnResetGame.addEventListener('click', () => {
    if (confirm("Are you sure you want to delete your current character and restart from the beginning? This will clear all gold, upgrades, and statistics.")) {
      localStorage.removeItem('gwyn_save_data');
      location.reload();
    }
  });

  // Stage Selection Bindings
  stageCards.forEach(card => {
    card.addEventListener('click', () => {
      const stageNum = parseInt(card.getAttribute('data-stage'));
      if (stageNum <= game.unlockedStage) {
        // Select Stage
        game.activeStage = stageNum;
        game.activeLevel = 1;
        
        stageCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        
        if (game.isPlaying) {
          game.startLevel();
        }
      }
    });
  });

  // Dev Boss Skip Bindings
  const btnDevBosses = document.querySelectorAll('.btn-dev-boss');
  btnDevBosses.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card selection from overriding the skip
      const stageNum = parseInt(btn.getAttribute('data-stage'));
      if (stageNum <= game.unlockedStage) {
        game.activeStage = stageNum;
        game.activeLevel = 5; // Boss fight level
        
        stageCards.forEach(c => c.classList.remove('active'));
        const matchingCard = document.querySelector(`.stage-card[data-stage="${stageNum}"]`);
        if (matchingCard) matchingCard.classList.add('active');
        
        if (game.isPlaying) {
          game.startLevel();
        }
        updateUI();
      }
    });
  });

  // Calculate Upgrade Costs
  const getUpgradeCost = (lvl, multiplier = 1.6) => Math.floor(50 * (multiplier ** (lvl - 1)));

  // Upgrade Weapon
  btnBuyWeapon.addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    const cost = getUpgradeCost(player.upgrades.weapon, 1.55);
    
    if (player.gold >= cost) {
      player.gold -= cost;
      player.upgrades.weapon++;
      player.initClassStats();
      saveGameData();
      updateUI();
    }
  });

  // Upgrade Armor
  btnBuyArmor.addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    const cost = getUpgradeCost(player.upgrades.armor, 1.5);
    
    if (player.gold >= cost) {
      player.gold -= cost;
      player.upgrades.armor++;
      player.initClassStats();
      player.hp = Math.min(player.hp + 20, player.maxHp); // Grant instant small heal
      saveGameData();
      updateUI();
    }
  });

  // Upgrade Ring (Attack Speed)
  btnBuyRing.addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    const cost = getUpgradeCost(player.upgrades.ring, 1.7);
    
    if (player.gold >= cost) {
      player.gold -= cost;
      player.upgrades.ring++;
      player.initClassStats();
      saveGameData();
      updateUI();
    }
  });

  // Usable Shop Purchases
  document.getElementById('btn-buy-hp-potion').addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    if (player.gold >= 10) {
      player.gold -= 10;
      player.inventory.usable.hp_potion += 5;
      saveGameData();
      updateUI();
    }
  });

  document.getElementById('btn-buy-mp-potion').addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    if (player.gold >= 10) {
      player.gold -= 10;
      player.inventory.usable.mp_potion += 5;
      saveGameData();
      updateUI();
    }
  });

  document.getElementById('btn-buy-vip-coin').addEventListener('click', () => {
    const player = game.player;
    if (!player) return;
    if (player.gold >= 150 && player.inventory.etc.vip2coin === 0) {
      player.gold -= 150;
      player.inventory.etc.vip2coin = 1;
      saveGameData();
      updateUI();
    }
  });

  // Update UI Elements
  function updateUI() {
    const player = game.player;
    if (!player) return;
    
    // Core info
    uiName.textContent = player.className;
    uiLevel.textContent = `Lv.${player.level} - Class`;
    uiGold.textContent = player.gold;
    
    // Set character avatar using spritesheet segment
    if (player.processedSheet) {
      uiAvatar.style.backgroundImage = `url('${player.processedSheet.toDataURL()}')`;
    } else {
      uiAvatar.style.backgroundImage = `url('${getHeroSpritesheetSrc(player.className)}')`;
    }
    uiAvatar.style.backgroundPosition = '0% 0%';
    uiAvatar.style.backgroundSize = '400% 400%';
    
    // Also update circular avatar in Hero Status tab
    const activeCard = document.querySelector(`.char-select-card[data-class="${player.className}"]`);
    if (activeCard) {
      const avatar = activeCard.querySelector('.char-select-avatar');
      if (avatar) {
        avatar.style.backgroundColor = 'transparent';
        if (player.processedSheet) {
          avatar.style.backgroundImage = `url('${player.processedSheet.toDataURL()}')`;
        } else {
          avatar.style.backgroundImage = `url('${getHeroSpritesheetSrc(player.className)}')`;
        }
        avatar.style.backgroundPosition = '0% 0%';
        avatar.style.backgroundSize = '400% 400%';
      }
    }
    
    // HP bar
    const hpRatio = player.hp / player.maxHp;
    uiHpFill.style.width = `${hpRatio * 100}%`;
    uiHpText.textContent = `${Math.ceil(player.hp)} / ${player.maxHp}`;
    
    // MP bar
    const mpRatio = player.mp / player.maxMp;
    document.getElementById('ui-mp-fill').style.width = `${mpRatio * 100}%`;
    document.getElementById('ui-mp-text').textContent = `${Math.ceil(player.mp)} / ${player.maxMp}`;
    
    // XP bar
    const xpRatio = player.xp / player.xpToNextLevel;
    uiXpFill.style.width = `${xpRatio * 100}%`;
    uiXpText.textContent = `${Math.floor(xpRatio * 100)}%`;
    
    // Update inventory counts
    document.getElementById('count-hp-potion').textContent = player.inventory.usable.hp_potion;
    document.getElementById('count-mp-potion').textContent = player.inventory.usable.mp_potion;
    document.getElementById('count-vip-coin').textContent = player.inventory.etc.vip2coin;
    
    // Update VIP Auto-Heal visibility/active state
    const hasVip = player.inventory.etc.vip2coin > 0;
    const vipLockedNotice = document.getElementById('vip-locked-notice');
    const vipActivePanel = document.getElementById('vip-active-panel');
    if (hasVip) {
      vipLockedNotice.style.display = 'none';
      vipActivePanel.style.display = 'flex';
    } else {
      vipLockedNotice.style.display = 'flex';
      vipActivePanel.style.display = 'none';
    }
    
    // Disable/Enable buy item buttons based on gold
    document.getElementById('btn-buy-hp-potion').disabled = player.gold < 10;
    document.getElementById('btn-buy-mp-potion').disabled = player.gold < 10;
    document.getElementById('btn-buy-vip-coin').disabled = player.gold < 150 || player.inventory.etc.vip2coin > 0;
    
    // Stats attributes panel
    uiDamage.textContent = player.atk;
    uiRange.textContent = `${player.atkRange}px`;
    uiAtkSpeed.textContent = `${player.atkSpeed.toFixed(1)}/s`;
    
    // Update attribute levels and bonuses
    const bonuses = jobBonuses[player.className];
    document.getElementById('ui-attr-str').textContent = player.baseStats.str + player.allocatedStats.str;
    document.getElementById('ui-attr-str-bonus').textContent = `+${bonuses.str}`;
    
    document.getElementById('ui-attr-int').textContent = player.baseStats.int + player.allocatedStats.int;
    document.getElementById('ui-attr-int-bonus').textContent = `+${bonuses.int}`;
    
    document.getElementById('ui-attr-agi').textContent = player.baseStats.agi + player.allocatedStats.agi;
    document.getElementById('ui-attr-agi-bonus').textContent = `+${bonuses.agi}`;
    
    document.getElementById('ui-attr-dex').textContent = player.baseStats.dex + player.allocatedStats.dex;
    document.getElementById('ui-attr-dex-bonus').textContent = `+${bonuses.dex}`;
    
    document.getElementById('ui-attr-vit').textContent = player.baseStats.vit + player.allocatedStats.vit;
    document.getElementById('ui-attr-vit-bonus').textContent = `+${bonuses.vit}`;
    
    document.getElementById('ui-attr-luk').textContent = player.baseStats.luk + player.allocatedStats.luk;
    document.getElementById('ui-attr-luk-bonus').textContent = `+${bonuses.luk}`;
    
    const stageLabel = game.activeLevel === 5 ? 'Boss' : `Lv ${game.activeLevel}`;
    uiStageProgress.textContent = `${game.activeStage} - ${stageLabel}`;
    
    // Update Upgrade Costs & Labels
    const weaponCost = getUpgradeCost(player.upgrades.weapon, 1.55);
    shopWeaponLvl.textContent = `Level ${player.upgrades.weapon} (+${(player.upgrades.weapon - 1) * 3} Atk)`;
    shopWeaponCost.textContent = weaponCost;
    btnBuyWeapon.disabled = player.gold < weaponCost;
    
    const armorCost = getUpgradeCost(player.upgrades.armor, 1.5);
    shopArmorLvl.textContent = `Level ${player.upgrades.armor} (+${(player.upgrades.armor - 1) * 20} HP)`;
    shopArmorCost.textContent = armorCost;
    btnBuyArmor.disabled = player.gold < armorCost;
    
    const ringCost = getUpgradeCost(player.upgrades.ring, 1.7);
    shopRingLvl.textContent = `Level ${player.upgrades.ring} (+${Math.round((player.upgrades.ring - 1) * 8)}% Speed)`;
    shopRingCost.textContent = ringCost;
    btnBuyRing.disabled = player.gold < ringCost;
    
    // Update Stage List items unlocked state
    stageCards.forEach(card => {
      const stageNum = parseInt(card.getAttribute('data-stage'));
      const statusLabel = card.querySelector('.stage-status');
      
      if (stageNum <= game.unlockedStage) {
        card.classList.remove('locked');
        if (stageNum === game.activeStage) {
          card.classList.add('active');
          statusLabel.textContent = "Active";
        } else {
          card.classList.remove('active');
          statusLabel.textContent = "Unlocked";
        }
      } else {
        card.classList.add('locked');
        statusLabel.textContent = "Locked";
      }
    });
  }
  
  // Bind globals for cross-file notifications
  window.updateUI = updateUI;
  window.showGameOver = () => {
    const respawnStage = Math.max(1, game.activeStage - 1);
    const stageNames = {
      1: "Stage 1: The Farm",
      2: "Stage 2: Underwater",
      3: "Stage 3: The Desert"
    };
    const targetName = stageNames[respawnStage] || `Stage ${respawnStage}`;
    btnRespawn.textContent = `Respawn at ${targetName}`;
    
    // Toggle VIP Revive button display if player owns a VIP Coin
    const hasVipCoin = game.player && game.player.inventory && game.player.inventory.etc && game.player.inventory.etc.vip2coin > 0;
    if (hasVipCoin) {
      btnVipRevive.style.display = 'block';
    } else {
      btnVipRevive.style.display = 'none';
    }
    
    gameoverOverlay.classList.add('show');
  };
  window.showVictory = () => {
    // Non-blocking loop victory logic
    updateUI();
  };
  
  // --- MAIN MENU ANIMATED PARTICLE BACKGROUND ---
  function initMainMenuParticles() {
    const canvas = document.getElementById('main-menu-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const mainMenuOverlay = document.getElementById('main-menu-overlay');
    
    let animationId = null;
    let particles = [];
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    class Spark {
      constructor() {
        this.reset(true);
      }
      
      reset(randomY = false) {
        this.x = Math.random() * canvas.width;
        this.y = randomY ? Math.random() * canvas.height : canvas.height + 20;
        this.size = Math.random() * 2.2 + 0.8;
        this.speedY = -(Math.random() * 45 + 20); // float upwards
        this.speedX = (Math.random() - 0.5) * 8;
        
        // Warm campfire palette: 50% orange, 30% red, 20% yellow/gold
        const rand = Math.random();
        if (rand < 0.5) {
          this.color = 'hsla(25, 100%, 55%, '; // Warm orange
          this.shadowColor = 'hsl(25, 100%, 55%)';
        } else if (rand < 0.8) {
          this.color = 'hsla(12, 100%, 50%, '; // Deep fire red
          this.shadowColor = 'hsl(12, 100%, 50%)';
        } else {
          this.color = 'hsla(45, 100%, 55%, '; // Golden yellow
          this.shadowColor = 'hsl(45, 100%, 55%)';
        }
        
        this.opacity = Math.random() * 0.5 + 0.3;
        this.fadeSpeed = Math.random() * 0.08 + 0.04;
      }
      
      update(dt) {
        this.y += this.speedY * dt;
        this.x += this.speedX * dt;
        
        // slowly fade out as it floats up
        if (this.y < canvas.height * 0.4) {
          this.opacity -= this.fadeSpeed * dt;
        }
        
        if (this.opacity <= 0 || this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
          this.reset();
        }
      }
      
      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.opacity + ')';
        ctx.shadowBlur = this.size * 4;
        ctx.shadowColor = this.shadowColor;
        ctx.fill();
        ctx.restore();
      }
    }
    
    // Spawn particles
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Spark());
    }
    
    let lastTime = performance.now();
    
    function animate(now) {
      if (!mainMenuOverlay.classList.contains('show')) {
        // Stop animating if the main menu is hidden
        animationId = null;
        return;
      }
      
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update(dt);
        p.draw();
      });
      
      animationId = requestAnimationFrame(animate);
    }
    
    // Observe classList changes on main-menu-overlay to start/stop loop
    const observer = new MutationObserver((mutations) => {
      mutations.forEach(m => {
        if (m.attributeName === 'class') {
          const isShow = mainMenuOverlay.classList.contains('show');
          if (isShow && !animationId) {
            lastTime = performance.now();
            animationId = requestAnimationFrame(animate);
          }
        }
      });
    });
    observer.observe(mainMenuOverlay, { attributes: true });
    
    // Start initial animation
    animationId = requestAnimationFrame(animate);
  }

  // --- AUTH SYSTEM BINDINGS & ACTIONS ---
  const authOverlay = document.getElementById('auth-overlay');
  const formLogin = document.getElementById('form-login');
  const formSignup = document.getElementById('form-signup');
  const btnShowLogin = document.getElementById('btn-show-login');
  const btnShowSignup = document.getElementById('btn-show-signup');
  const loginError = document.getElementById('login-error');
  const signupError = document.getElementById('signup-error');
  const signupSuccess = document.getElementById('signup-success');
  
  const userBadge = document.getElementById('ui-user-badge');
  const usernameText = document.getElementById('ui-username');
  const btnLogout = document.getElementById('btn-logout');

  // Toggle Forms
  btnShowLogin.addEventListener('click', () => {
    btnShowLogin.className = 'btn-primary';
    btnShowSignup.className = 'btn-control';
    formLogin.style.display = 'flex';
    formSignup.style.display = 'none';
  });

  btnShowSignup.addEventListener('click', () => {
    btnShowLogin.className = 'btn-control';
    btnShowSignup.className = 'btn-primary';
    formLogin.style.display = 'none';
    formSignup.style.display = 'flex';
  });

  // Login Submit
  formLogin.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    
    const userVal = document.getElementById('login-username').value;
    const passVal = document.getElementById('login-password').value;
    
    const res = authLogin(userVal, passVal);
    if (res.success) {
      authOverlay.style.display = 'none';
      userBadge.style.display = 'block';
      usernameText.textContent = window.currentUser;
      btnLogout.style.display = 'block';
      
      // Load user profile game progress
      loadSavedData();
    } else {
      loginError.textContent = res.message;
      loginError.style.display = 'block';
    }
  });

  // Signup Submit
  formSignup.addEventListener('submit', (e) => {
    e.preventDefault();
    signupError.style.display = 'none';
    signupSuccess.style.display = 'none';
    
    const userVal = document.getElementById('signup-username').value;
    const emailVal = document.getElementById('signup-email').value;
    const passVal = document.getElementById('signup-password').value;
    
    const res = authRegister(userVal, emailVal, passVal);
    if (res.success) {
      signupSuccess.textContent = res.message + " You can now login.";
      signupSuccess.style.display = 'block';
      // Reset inputs
      document.getElementById('signup-username').value = '';
      document.getElementById('signup-email').value = '';
      document.getElementById('signup-password').value = '';
      // Switch back to login form after 1.5s
      setTimeout(() => {
        btnShowLogin.click();
      }, 1500);
    } else {
      signupError.textContent = res.message;
      signupError.style.display = 'block';
    }
  });

  // --- RECOVERY PASSWORD BINDINGS ---
  const formRecover = document.getElementById('form-recover');
  const linkForgotPassword = document.getElementById('link-forgot-password');
  const btnRecoverBack = document.getElementById('btn-recover-back');
  const recoverError = document.getElementById('recover-error');
  const recoverSuccess = document.getElementById('recover-success');

  linkForgotPassword.addEventListener('click', () => {
    formLogin.style.display = 'none';
    formSignup.style.display = 'none';
    formRecover.style.display = 'flex';
    // Clear alerts
    recoverError.style.display = 'none';
    recoverSuccess.style.display = 'none';
  });

  btnRecoverBack.addEventListener('click', () => {
    formRecover.style.display = 'none';
    formLogin.style.display = 'flex';
  });

  formRecover.addEventListener('submit', (e) => {
    e.preventDefault();
    recoverError.style.display = 'none';
    recoverSuccess.style.display = 'none';

    const userVal = document.getElementById('recover-username').value;
    const emailVal = document.getElementById('recover-email').value;

    const res = authRecoverPassword(userVal, emailVal);
    if (res.success) {
      recoverSuccess.textContent = res.message;
      recoverSuccess.style.display = 'block';
      document.getElementById('recover-username').value = '';
      document.getElementById('recover-email').value = '';
    } else {
      recoverError.textContent = res.message;
      recoverError.style.display = 'block';
    }
  });

  // Logout Click
  btnLogout.addEventListener('click', () => {
    authLogout();
  });

  // --- AUTH ANIMATED BACKGROUND ---
  function initAuthParticles() {
    const canvas = document.getElementById('auth-menu-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let animationId = null;
    let particles = [];
    
    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    class Spark {
      constructor() {
        this.reset(true);
      }
      
      reset(init = false) {
        this.x = Math.random() * canvas.width;
        this.y = init ? Math.random() * canvas.height : canvas.height + 10;
        this.size = Math.random() * 2 + 1;
        this.speedY = -(Math.random() * 30 + 15);
        this.speedX = Math.random() * 10 - 5;
        this.opacity = Math.random() * 0.5 + 0.2;
        this.color = 'hsla(' + (Math.random() * 25 + 15) + ', 100%, 55%, ';
        this.shadowColor = 'hsl(' + (Math.random() * 25 + 15) + ', 100%, 50%)';
      }
      
      update(dt) {
        this.y += this.speedY * dt;
        this.x += this.speedX * dt;
        this.opacity -= 0.05 * dt;
        if (this.opacity <= 0 || this.y < -20 || this.x < -20 || this.x > canvas.width + 20) {
          this.reset();
        }
      }
      
      draw() {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color + this.opacity + ')';
        ctx.shadowBlur = this.size * 4;
        ctx.shadowColor = this.shadowColor;
        ctx.fill();
        ctx.restore();
      }
    }
    
    const particleCount = Math.min(80, Math.floor(window.innerWidth / 15));
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Spark());
    }
    
    let lastTime = performance.now();
    
    function animate(now) {
      if (authOverlay.style.display === 'none') {
        animationId = null;
        return;
      }
      
      const dt = Math.min(0.1, (now - lastTime) / 1000);
      lastTime = now;
      
      ctx.fillStyle = '#07080c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(p => {
        p.update(dt);
        p.draw();
      });
      
      animationId = requestAnimationFrame(animate);
    }
    
    const observer = new MutationObserver(() => {
      const isShow = authOverlay.style.display !== 'none';
      if (isShow && !animationId) {
        lastTime = performance.now();
        animationId = requestAnimationFrame(animate);
      }
    });
    observer.observe(authOverlay, { attributes: true, attributeFilter: ['style'] });
    
    animationId = requestAnimationFrame(animate);
  }

  // --- INITIAL STARTUP HANDLER ---

  if (authCheckSession()) {
    authOverlay.style.display = 'none';
    userBadge.style.display = 'block';
    usernameText.textContent = window.currentUser;
    btnLogout.style.display = 'block';
    loadSavedData();
  } else {
    authOverlay.style.display = 'flex';
    userBadge.style.display = 'none';
    btnLogout.style.display = 'none';
  }

  initAuthParticles();
  initMainMenuParticles();
});
