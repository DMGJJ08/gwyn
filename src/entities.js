// Project GWYN - Entities and Projectiles Classes

// Global Ground Y coordinate (updated dynamically in game.js)
let groundY = 160;

// Key out background checkerboard colors to create true transparency
function removeCheckeredBackground(image) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(image, 0, 0);
  
  const isRemoveBg = image.src && image.src.includes('removebg');
  
  try {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    
    const cellW = Math.floor(canvas.width / 4);
    const cellH = Math.floor(canvas.height / 4);
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const a = data[i+3];
        
        if (a === 0) continue;
        
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const diff = max - min;
        
        // 1. Key out near-grayscale pixels (fake gray checkerboards)
        // Exclude very dark black outlines (r < 20) to keep outlines intact!
        const isGreyChecker = !isRemoveBg && (diff < 26) && (r > 20);
        
        // 2. Key out the light blue-gray JPEG compression artifacts (e.g. [194, 205, 211])
        const isBlueGrayArtifact = !isRemoveBg && (r >= 165 && r <= 235 && g >= 175 && g <= 240 && b >= 185 && b <= 245);
        
        // 3. Key out near-white pixels (light gray/white border artifacts)
        const isNearWhite = !isRemoveBg && (r >= 235 && g >= 235 && b >= 235);
        
        // 4. Key out black/dark-gray grid border lines at cell boundaries (4-pixel margin)
        const xMod = x % cellW;
        const yMod = y % cellH;
        const isGridBorder = (xMod < 4 || xMod > cellW - 4 || yMod < 4 || yMod > cellH - 4) && (r < 110 && g < 110 && b < 110) && (diff < 20);
        
        if (isGreyChecker || isBlueGrayArtifact || isNearWhite || isGridBorder) {
          data[i+3] = 0; // Transparent
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.error("Failed to key out checkered background", e);
  }
  
  return canvas;
}

// Draw an image with a custom tint overlay (chroma-keying only the drawn pixels)
function drawTintedImage(ctx, image, sx, sy, sw, sh, dx, dy, dw, dh, tintColor) {
  const offscreen = document.createElement('canvas');
  offscreen.width = dw;
  offscreen.height = dh;
  const oCtx = offscreen.getContext('2d');
  
  // Draw sprite to offscreen
  oCtx.drawImage(image, sx, sy, sw, sh, 0, 0, dw, dh);
  
  // Apply composite overlay on top of drawn pixels only
  oCtx.save();
  oCtx.fillStyle = tintColor;
  oCtx.globalCompositeOperation = 'source-atop';
  oCtx.fillRect(0, 0, dw, dh);
  oCtx.restore();
  
  // Draw offscreen back to main context
  ctx.drawImage(offscreen, dx, dy);
}

// Vector Class for Math Helper
class Vector2D {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  
  distanceTo(other) {
    return Math.sqrt((this.x - other.x) ** 2 + (this.y - other.y) ** 2);
  }
}

// Particle system for visual feedback
class Particle {
  constructor(x, y, vx, vy, color, text = null, size = 4, life = 1.0, isXp = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.text = text; // For damage numbers
    this.size = size;
    this.life = life; // Life from 1.0 down to 0
    this.maxLife = life;
    this.isXp = isXp;
  }
  
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.text) {
      this.vy += 20 * dt; // Gravity effect on damage text
    }
  }
  
  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    
    if (this.text) {
      ctx.fillStyle = this.color;
      ctx.font = `bold ${this.size}px 'Outfit', sans-serif`;
      ctx.textAlign = 'center';
      ctx.shadowColor = 'black';
      ctx.shadowBlur = 4;
      ctx.fillText(this.text, this.x, this.y);
    } else {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}

// Base Entity Class
class Entity {
  constructor(x, y, width, height, hp, speed, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.hp = hp;
    this.maxHp = hp;
    this.speed = speed;
    this.color = color;
    this.isDead = false;
    this.damageEffectTimer = 0;
  }
  
  takeDamage(amount) {
    if (this.isDead) return;
    this.hp = Math.max(0, this.hp - amount);
    this.damageEffectTimer = 0.15; // Red flash duration
    if (window.soundManager) window.soundManager.playHitSound();
    if (this.hp <= 0) {
      this.isDead = true;
    }
  }
  
  drawHealthBar(ctx) {
    if (this.isDead) return;
    const barWidth = this.width * 1.2;
    const barHeight = 4;
    const bx = this.x + (this.width - barWidth) / 2;
    const by = this.y - 8;
    
    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(bx, by, barWidth, barHeight);
    
    // Fill
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = this.isBoss ? 'hsl(350, 90%, 55%)' : 'hsl(350, 80%, 50%)';
    ctx.fillRect(bx, by, barWidth * hpRatio, barHeight);
  }
}

// Player Class
class Player extends Entity {
  constructor(className) {
    super(50, groundY - 30, 24, 32, 100, 100, '#fff');
    this.className = className;
    this.level = 1;
    this.xp = 0;
    this.xpToNextLevel = 100;
    this.gold = 0;
    
    // Equipment Stats
    this.upgrades = {
      weapon: 1,
      armor: 1,
      ring: 1
    };
    
    this.atkTimer = 0;
    this.target = null;
    this.previousTarget = null;
    
    // Inventory initialization
    this.inventory = {
      usable: {
        hp_potion: 5,
        mp_potion: 5
      },
      etc: {
        vip2coin: 0
      }
    };
    
    // Stats attributes
    this.baseStats = { str: 1, agi: 1, vit: 1, int: 1, dex: 1, luk: 1 };
    this.allocatedStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
    this.jobBonuses = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };
    
    this.spriteSheet = new Image();
    this.processedSheet = null;
    this.sheetLoaded = false;
    this.spriteSheet.onload = () => {
      this.processedSheet = removeCheckeredBackground(this.spriteSheet);
      this.sheetLoaded = true;
      if (window.updateUI) window.updateUI();
    };
    
    this.initClassStats();
    this.hp = this.maxHp; // Start with full health
  }
  
  initClassStats() {
    this.y = groundY - 30;
    
    // Load class-specific spritesheet
    let targetSrc = `assets/${this.className.toLowerCase()}_sheet.png`;
    if (this.className === 'Warrior') {
      targetSrc = 'assets/Gemini_Generated_Image_3t4xfn3t4xfn3t4x-removebg-preview.png';
    } else if (this.className === 'Archer') {
      targetSrc = 'assets/Gemini_Generated_Image_6fnz0d6fnz0d6fnz-removebg-preview.png';
    } else if (this.className === 'Mage') {
      targetSrc = 'assets/Gemini_Generated_Image_vkuw7evkuw7evkuw-removebg-preview.png';
    }
    if (!this.spriteSheet.src.includes(targetSrc)) {
      this.sheetLoaded = false;
      this.processedSheet = null;
      this.spriteSheet.src = `${targetSrc}?v=${Date.now()}`;
    }
    
    // Assign job bonuses and archetype-tuned base stats based on class
    if (this.className === 'Warrior') {
      this.jobBonuses = { str: 4, agi: 1, vit: 3, int: 0, dex: 2, luk: 1 };
      this.baseHp = 170;
      this.baseDamage = 8; // Improved melee damage
      this.atkRange = 50;
      this.baseAtkSpeed = 1.1;
      this.speed = 140; // Swift melee tank
      this.color = 'hsl(0, 70%, 45%)';
    } else if (this.className === 'Archer') {
      this.jobBonuses = { str: 1, agi: 4, vit: 1, int: 0, dex: 3, luk: 1 };
      this.baseHp = 75; // Weakness: Lowest base HP
      this.baseDamage = 6; // Weakness: Lowest base damage (offset by rapid attack rate)
      this.atkRange = 220;
      this.baseAtkSpeed = 1.7;
      this.speed = 90; // Slower ranged sniper
      this.arrowSpeed = 520;
      this.color = 'hsl(120, 60%, 40%)';
    } else if (this.className === 'Mage') {
      this.jobBonuses = { str: 0, agi: 1, vit: 2, int: 5, dex: 2, luk: 0 };
      this.baseHp = 90; // Improved starting HP (safer than Archer)
      this.baseDamage = 16; // Balanced magic base damage
      this.atkRange = 240;
      this.baseAtkSpeed = 0.75;
      this.speed = 80; // Slow caster speed
      this.fireballSpeed = 260;
      this.color = 'hsl(210, 80%, 50%)';
    }
    
    // Sum total stats: base + allocated + job bonuses
    const str = this.baseStats.str + this.allocatedStats.str + this.jobBonuses.str;
    const agi = this.baseStats.agi + this.allocatedStats.agi + this.jobBonuses.agi;
    const vit = this.baseStats.vit + this.allocatedStats.vit + this.jobBonuses.vit;
    const int = this.baseStats.int + this.allocatedStats.int + this.jobBonuses.int;
    const dex = this.baseStats.dex + this.allocatedStats.dex + this.jobBonuses.dex;
    const luk = this.baseStats.luk + this.allocatedStats.luk + this.jobBonuses.luk;
    
    // Upgrades bonuses
    const weaponBonus = (this.upgrades.weapon - 1) * 3;
    const armorBonus = (this.upgrades.armor - 1) * 20;
    const ringBonus = (this.upgrades.ring - 1) * 0.08; // 8% speed increase per upgrade
    
    // Max HP formula: Max HP +1% per point of VIT
    this.maxHp = Math.floor((this.baseHp + armorBonus) * (1 + vit * 0.01));
    this.hp = Math.min(this.hp, this.maxHp); // Cap current hp
    
    // Max MP formula: Max MP +1.5% per point of INT
    let baseMp = 30;
    if (this.className === 'Archer') baseMp = 50;
    else if (this.className === 'Mage') baseMp = 100;
    this.maxMp = Math.floor(baseMp * (1 + int * 0.015));
    if (this.mp === undefined) this.mp = this.maxMp;
    this.mp = Math.min(this.mp, this.maxMp);
    
    // ATK / MATK calculation based on formulas
    if (this.className === 'Mage') {
      // Magic ATK formula
      const statusMATK = Math.floor(this.level / 4) + Math.floor(str / 5) + Math.floor(dex / 5) + Math.floor(luk / 3) + Math.floor(int * 1.5);
      const weaponMATK = (this.baseDamage + weaponBonus) * (1 + int * 0.015);
      this.atk = Math.floor(statusMATK + weaponMATK);
    } else if (this.className === 'Archer') {
      // Ranged Physical ATK formula
      const statusATK = Math.floor(this.level / 4) + Math.floor(str / 5) + Math.floor(dex * 0.75) + Math.floor(luk / 3);
      const weaponATK = (this.baseDamage + weaponBonus) * (1 + dex * 0.003);
      this.atk = Math.floor(statusATK + weaponATK);
    } else {
      // Melee Physical ATK (Warrior)
      const statusATK = Math.floor(this.level / 4) + str + Math.floor(dex / 5) + Math.floor(luk / 3);
      const weaponATK = (this.baseDamage + weaponBonus) * (1 + str * 0.005);
      this.atk = Math.floor(statusATK + weaponATK);
    }
    
    // Attack Speed (ASPD): AGI adds 0.8% and DEX adds 0.2%
    this.atkSpeed = this.baseAtkSpeed * (1 + ringBonus + agi * 0.008 + dex * 0.002);
  }
  
  resetHp() {
    this.hp = this.maxHp;
    this.mp = this.maxMp;
    this.isDead = false;
  }
  
  takeDamage(amount) {
    let defense = 0;
    const vit = this.baseStats.vit + this.allocatedStats.vit + this.jobBonuses.vit;
    const int = this.baseStats.int + this.allocatedStats.int + this.jobBonuses.int;
    const dex = this.baseStats.dex + this.allocatedStats.dex + this.jobBonuses.dex;
    const armorLvl = this.upgrades.armor;
    
    if (this.className === 'Warrior') {
      defense = Math.floor(vit * 0.6) + (armorLvl - 1) * 2;
    } else if (this.className === 'Archer') {
      defense = Math.floor(vit * 0.15) + (armorLvl - 1) * 0.5; // Weakness: Fragile defense, no DEX scaling
    } else if (this.className === 'Mage') {
      defense = Math.floor(int * 0.15) + Math.floor(vit * 0.2) + (armorLvl - 1) * 0.6;
    }
    
    const finalDamage = Math.max(1, Math.round(amount - defense));
    super.takeDamage(finalDamage);
  }
  
  gainXp(amount, particles) {
    if (this.isDead) return;
    this.xp += amount;
    
    // Spawn floaty XP texts
    particles.push(new Particle(this.x + this.width / 2, this.y - 15, 0, -60, 'hsl(145, 80%, 45%)', `+${amount} XP`, 13, 0.8));
    
    if (this.xp >= this.xpToNextLevel) {
      this.xp -= this.xpToNextLevel;
      this.level++;
      this.xpToNextLevel = Math.floor(100 * (1.5 ** (this.level - 1)));
      
      // Upgrade base stats
      this.initClassStats();
      this.hp = this.maxHp; // Full heal on level up
      if (window.soundManager) window.soundManager.playLevelUpSound();
      
      // Level Up flash particles
      for (let i = 0; i < 20; i++) {
        particles.push(new Particle(
          this.x + this.width / 2,
          this.y + this.height / 2,
          (Math.random() - 0.5) * 120,
          -Math.random() * 150 - 50,
          'hsl(42, 95%, 55%)',
          null,
          4,
          1.2
        ));
      }
      particles.push(new Particle(this.x + this.width / 2, this.y - 30, 0, -80, 'hsl(42, 95%, 55%)', 'LEVEL UP!', 20, 1.5));
    }
  }
  
  gainGold(amount, particles) {
    this.gold += amount;
    particles.push(new Particle(this.x + this.width / 2, this.y, (Math.random() - 0.5) * 40, -90, 'hsl(42, 95%, 55%)', `+🪙${amount}`, 13, 0.8));
  }
  
  update(dt, enemies, projectiles, particles) {
    if (this.isDead) return;
    
    // Keep Y aligned to current ground level
    this.y = groundY - this.height;
    
    // Mana/MP slow regeneration (2.5 MP per second)
    this.mp = Math.min(this.maxMp, this.mp + 2.5 * dt);
    
    // VIP Auto-Heal Check
    if (this.inventory && this.inventory.etc && this.inventory.etc.vip2coin > 0 && window.autoHealActive) {
      // HP Auto-Heal check
      if (window.assignedHpItem && this.inventory.usable[window.assignedHpItem] > 0) {
        const hpPercent = (this.hp / this.maxHp) * 100;
        if (hpPercent <= window.hpHealThreshold) {
          this.hp = Math.min(this.maxHp, this.hp + 50);
          this.inventory.usable[window.assignedHpItem]--;
          particles.push(new Particle(this.x + this.width / 2, this.y - 15, 0, -60, 'hsl(145, 80%, 45%)', '+50 HP', 13, 0.8));
          if (window.soundManager) window.soundManager.playHitSound(); // Quick beep
          if (window.updateUI) window.updateUI();
        }
      }
      
      // MP Auto-Heal check
      if (window.assignedMpItem && this.inventory.usable[window.assignedMpItem] > 0) {
        const mpPercent = (this.mp / this.maxMp) * 100;
        if (mpPercent <= window.mpHealThreshold) {
          this.mp = Math.min(this.maxMp, this.mp + 30);
          this.inventory.usable[window.assignedMpItem]--;
          particles.push(new Particle(this.x + this.width / 2, this.y - 15, 0, -60, 'hsl(210, 80%, 50%)', '+30 MP', 13, 0.8));
          if (window.soundManager) window.soundManager.playHitSound(); // Quick beep
          if (window.updateUI) window.updateUI();
        }
      }
    }
    
    if (this.damageEffectTimer > 0) {
      this.damageEffectTimer -= dt;
    }
    
    // Attack timer cooldown
    if (this.atkTimer > 0) {
      this.atkTimer -= dt;
    }
    
    // Find closest alive enemy
    let closestEnemy = null;
    let closestDist = Infinity;
    
    for (const enemy of enemies) {
      if (enemy.isDead) continue;
      const dist = this.x - enemy.x; // Enemies spawn from right, so distance is x differences
      const absDist = Math.abs(dist);
      if (absDist < closestDist) {
        closestDist = absDist;
        closestEnemy = enemy;
      }
    }
    
    this.target = closestEnemy;
    
    // Reset player back to the left of the screen if previous target died
    if (this.previousTarget && this.previousTarget.isDead && this.target !== this.previousTarget) {
      this.x = 50;
    }
    this.previousTarget = this.target;
    
    if (this.target) {
      const distance = Math.abs(this.x + this.width - this.target.x);
      
      if (distance > this.atkRange) {
        // Move towards target
        this.x += this.speed * dt;
        // Cap position so player doesn't walk past screen bounds
        if (this.x > 820 - this.width) {
          this.x = 820 - this.width;
        }
      } else {
        // Attack when in range and cooldown is ready
        if (this.atkTimer <= 0) {
          this.fireAtk(projectiles, particles);
          this.atkTimer = 1 / this.atkSpeed;
        }
      }
    } else {
      // No target: move back to the left side
      if (this.x > 80) {
        this.x -= this.speed * dt;
      } else if (this.x < 50) {
        this.x += this.speed * dt;
      }
    }
  }
  
  fireAtk(projectiles, particles) {
    if (!this.target) return;
    
    if (this.className === 'Warrior') {
      // Melee Swing: Slash graphic + Instant Damage
      particles.push(new Particle(this.target.x + this.target.width / 2, this.target.y + this.target.height / 2, 0, -20, 'hsl(0, 0%, 96%)', '⚔️', 24, 0.25));
      this.target.takeDamage(this.atk);
      // Spawn hit particles
      for (let i = 0; i < 5; i++) {
        particles.push(new Particle(
          this.target.x + this.target.width / 2,
          this.target.y + this.target.height / 2,
          (Math.random() - 0.5) * 100,
          (Math.random() - 0.5) * 100,
          this.color,
          null,
          3,
          0.4
        ));
      }
      // Floating damage number
      particles.push(new Particle(
        this.target.x + this.target.width / 2,
        this.target.y - 10,
        (Math.random() - 0.5) * 30,
        -70,
        '#fff',
        `-${this.atk}`,
        14,
        0.7
      ));
    } else if (this.className === 'Archer') {
      // Ranged Bow: Fire single arrow projectile
      projectiles.push(new Projectile(
        this.x + this.width,
        this.y + this.height / 2 - 2,
        this.arrowSpeed || 450, // Speed
        this.atk,
        'player',
        this.target,
        'arrow'
      ));
    } else if (this.className === 'Mage') {
      // Ranged Mage: Fire a magic fireball projectile (costs 8 MP) or magic bolt (free)
      if (this.mp >= 8) {
        this.mp -= 8;
        projectiles.push(new Projectile(
          this.x + this.width,
          this.y + this.height / 2 - 4,
          this.fireballSpeed || 280,
          this.atk,
          'player',
          this.target,
          'fireball'
        ));
      } else {
        // Weak spell projectile
        projectiles.push(new Projectile(
          this.x + this.width,
          this.y + this.height / 2 - 4,
          350,
          Math.max(1, Math.floor(this.atk * 0.4)),
          'player',
          this.target,
          'magic_bolt'
        ));
      }
    }
  }
  
  draw(ctx) {
    if (this.isDead) {
      if (this.sheetLoaded) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        
        const drawSize = 64;
        const dx = -drawSize / 2;
        const dy = -drawSize / 2 - 4;
        
        const sheetW = this.spriteSheet.width || this.processedSheet.width;
        const sheetH = this.spriteSheet.height || this.processedSheet.height;
        const sw = (sheetW > 0) ? Math.floor(sheetW / 4) : 125;
        const sh = (sheetH > 0) ? Math.floor(sheetH / 4) : 125;
        
        // Defeated Frame is Row 3 Col 0
        if (this.damageEffectTimer > 0) {
          drawTintedImage(ctx, this.processedSheet, 0, sh * 3, sw, sh, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
        } else {
          ctx.drawImage(this.processedSheet, 0, sh * 3, sw, sh, dx, dy, drawSize, drawSize);
        }
        ctx.restore();
      }
      return;
    }
    
    ctx.save();
    
    if (this.sheetLoaded) {
      const isMoving = this.target && Math.abs(this.x + this.width - this.target.x) > this.atkRange;
      const isAttacking = this.target && this.atkTimer > 0 && Math.abs(this.x + this.width - this.target.x) <= this.atkRange;
      
      const sheetW = this.spriteSheet.width || this.processedSheet.width;
      const sheetH = this.spriteSheet.height || this.processedSheet.height;
      const sw = (sheetW > 0) ? Math.floor(sheetW / 4) : 125;
      const sh = (sheetH > 0) ? Math.floor(sheetH / 4) : 125;
      
      let sx = 0;
      let sy = 0;
      
      if (isAttacking) {
        const totalCooldown = 1 / this.atkSpeed;
        const progress = this.atkTimer / totalCooldown;
        const swingFrame = Math.min(2, Math.floor((1.0 - progress) * 3));
        sx = swingFrame * sw;
        sy = sh * 2; // Row 2
      } else if (isMoving) {
        const walkFrame = Math.floor(Date.now() / 110) % 4;
        sx = walkFrame * sw;
        sy = sh * 1; // Row 1
      } else {
        const idleFrame = Math.floor(Date.now() / 150) % 3;
        sx = idleFrame * sw;
        sy = 0; // Row 0
      }
      
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      const drawSize = 64;
      const dx = -drawSize / 2;
      const dy = -drawSize / 2 - 4;
      
      // Draw the cropped frame standing on the ground
      if (this.damageEffectTimer > 0) {
        drawTintedImage(ctx, this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
      } else {
        ctx.drawImage(this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      // Draw main character body (glowing rounded rect)
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 4);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Draw class decoration details
      ctx.fillStyle = '#fff';
      if (this.className === 'Warrior') {
        // Draw sword on back
        ctx.fillRect(this.x - 3, this.y + 8, 3, 14);
        ctx.fillRect(this.x - 5, this.y + 18, 7, 2);
      } else if (this.className === 'Archer') {
        // Draw quiver on back
        ctx.fillStyle = 'hsl(35, 60%, 30%)';
        ctx.fillRect(this.x - 4, this.y + 10, 4, 12);
      } else if (this.className === 'Mage') {
        // Draw wizard hat tip
        ctx.fillStyle = 'hsl(260, 50%, 35%)';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + this.width / 2, this.y - 10);
        ctx.lineTo(this.x + this.width, this.y);
        ctx.closePath();
        ctx.fill();
      }
      
      // Draw Weapon/Staff in front
      ctx.fillStyle = 'hsl(45, 20%, 60%)';
      ctx.fillRect(this.x + this.width, this.y + this.height / 2, 4, 10);
      
      // Flash red on damage for fallback vector boxes
      if (this.damageEffectTimer > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
      ctx.restore();
    }
    
    // Health bar above player
    this.drawHealthBar(ctx);
  }
}

class Enemy extends Entity {
  constructor(name, type, stage, level, hp, speed, damage, xpReward, goldReward, sizeMultiplier = 1) {
    const width = 32 * sizeMultiplier;
    const height = 32 * sizeMultiplier;
    super(820, groundY - height, width, height, hp, speed, '#aaa');
    
    this.name = name;
    this.type = type; // chicken, pig, jellyfish, scorpion, etc.
    this.stage = stage;
    this.level = level;
    this.atk = damage;
    this.atkRange = 15;
    this.atkSpeed = 1.0;
    this.atkTimer = 0;
    this.xpReward = xpReward;
    this.goldReward = goldReward;
    this.isWalking = false;
    
    // Spritesheet support
    this.spriteSheet = new Image();
    this.processedSheet = null;
    this.sheetLoaded = false;
    this.spriteSheet.onload = () => {
      this.processedSheet = removeCheckeredBackground(this.spriteSheet);
      this.sheetLoaded = true;
    };
    
    // Single sprite fallback loader
    this.sprite = new Image();
    this.spriteLoaded = false;
    this.sprite.onload = () => { this.spriteLoaded = true; };
    
    this.initVisuals();
  }
  
  initVisuals() {
    this.y = groundY - this.height;
    
    // Set asset sources safely without redundant reloads
    if (this.type === 'boss') {
      // Boss constructor will handle loading boss-specific assets
      this.sheetLoaded = false;
    } else {
      let targetSrc = `assets/${this.type}_sheet.png`;
      if (this.type === 'jellyfish') {
        targetSrc = 'assets/jellyfish_sheet-removebg-preview.png';
      } else if (this.type === 'crab') {
        targetSrc = 'assets/crab_sheet-removebg-preview.png';
      } else if (this.type === 'scorpion') {
        targetSrc = 'assets/scorpion_sheet-removebg-preview.png';
      } else if (this.type === 'mummy') {
        targetSrc = 'assets/Gemini_Generated_Image_qr2tbwqr2tbwqr2t-removebg-preview.png';
      } else if (this.type === 'spider') {
        targetSrc = 'assets/Gemini_Generated_Image_ezxwglezxwglezxw-removebg-preview.png';
      }
      if (!this.spriteSheet.src.includes(targetSrc)) {
        this.sheetLoaded = false;
        this.processedSheet = null;
        this.spriteSheet.src = `${targetSrc}?v=${Date.now()}`;
      }
    }
    
    if (this.type !== 'boss') {
      this.spriteLoaded = false;
      this.sprite.src = `assets/${this.type}_sprite.png?v=${Date.now()}`;
    }
    
    if (this.stage === 1) {
      // Farm colors
      if (this.type === 'chicken') this.color = 'hsl(0, 0%, 90%)';
      else if (this.type === 'pig') this.color = 'hsl(350, 100%, 82%)';
      else if (this.type === 'sheep') this.color = 'hsl(210, 10%, 88%)';
    } else if (this.stage === 2) {
      // Underwater colors
      if (this.type === 'jellyfish') this.color = 'hsl(300, 80%, 75%)';
      else if (this.type === 'crab') this.color = 'hsl(10, 85%, 55%)';
      else if (this.type === 'seahorse') this.color = 'hsl(45, 90%, 65%)';
      else if (this.type === 'shark') this.color = 'hsl(205, 50%, 45%)';
    } else if (this.stage === 3) {
      // Desert colors
      if (this.type === 'scorpion') this.color = 'hsl(28, 70%, 45%)';
      else if (this.type === 'cobra') this.color = 'hsl(125, 45%, 35%)';
      else if (this.type === 'mummy') this.color = 'hsl(45, 30%, 65%)';
      else if (this.type === 'spider') this.color = 'hsl(28, 50%, 30%)';
    }
  }
  
  takeDamage(amount) {
    let defense = Math.floor((this.stage - 1) * 2 + this.level * 0.6);
    if (this.type === 'crab') {
      defense += 4; // Armored crabs are extra matigas
    }
    if (this.type === 'boss') {
      defense += 8; // Bosses are extremely matigas
    }
    const finalDamage = Math.max(1, Math.round(amount - defense));
    super.takeDamage(finalDamage);
  }
  
  update(dt, player) {
    if (this.isDead || player.isDead) {
      this.isWalking = false;
      return;
    }
    
    this.y = groundY - this.height;
    
    if (this.damageEffectTimer > 0) {
      this.damageEffectTimer -= dt;
    }
    
    if (this.atkTimer > 0) {
      this.atkTimer -= dt;
    }
    
    // Distance to player
    const dist = Math.abs((this.x) - (player.x + player.width));
    
    if (dist > this.atkRange) {
      // Move left towards the player
      this.x -= this.speed * dt;
      this.isWalking = true;
    } else {
      this.isWalking = false;
      // Attack player
      if (this.atkTimer <= 0) {
        player.takeDamage(this.atk);
        
        // Damage floating text on player
        player.damageEffectTimer = 0.15;
        this.atkTimer = 1 / this.atkSpeed;
      }
    }
  }
  
  draw(ctx) {
    if (this.isDead) return;
    
    ctx.save();
    
    if (this.sheetLoaded) {
      let sx = 0;
      let sy = 0;
      let sw = 256;
      let sh = 256;
      
      const isMoving = this.isWalking;
      const isAttacking = this.atkTimer > 0;
      
      // Dynamically detect cell dimensions from loaded spritesheet size
      const sheetW = this.spriteSheet.width || this.processedSheet.width;
      if (sheetW > 0 && sheetW <= 600) {
        sw = 125;
        sh = 125;
      }
      
      if (isAttacking) {
        const totalCooldown = 1 / this.atkSpeed;
        const progress = this.atkTimer / totalCooldown;
        const attackFrame = Math.min(2, Math.floor((1.0 - progress) * 3));
        sx = attackFrame * sw;
        sy = sh * 2; // Row 2 (Attack - 3 frames)
      } else if (isMoving) {
        const walkFrame = Math.floor(Date.now() / 120) % 4;
        sx = walkFrame * sw;
        sy = sh * 1; // Row 1 (Walk - 4 frames)
      } else {
        const idleFrame = Math.floor(Date.now() / 150) % 3;
        sx = idleFrame * sw;
        sy = 0; // Row 0 (Stand - 3 frames)
      }
      
      // Mirror horizontally so the enemy faces the player (walks left)
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.scale(-1, 1);
      
      const drawSize = this.width;
      const dx = -drawSize / 2;
      const dy = -drawSize / 2;
      
      if (this.damageEffectTimer > 0) {
        drawTintedImage(ctx, this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
      } else {
        ctx.drawImage(this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize);
      }
      ctx.restore();
    } else if (this.spriteLoaded) {
      ctx.save();
      const isMoving = this.isWalking;
      let bounceY = isMoving ? Math.abs(Math.sin(Date.now() / 120)) * 4 : 0;
      
      // Mirror horizontally so the enemy faces the player (walks left)
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2 - bounceY);
      ctx.scale(-1, 1);
      
      // Wobble/bounce scale transformation when moving
      if (isMoving) {
        ctx.scale(1 + Math.sin(Date.now() / 60) * 0.08, 1 - Math.sin(Date.now() / 60) * 0.08);
      }
      
      const drawSize = this.width;
      const dx = -drawSize / 2;
      const dy = -drawSize / 2;
      
      if (this.damageEffectTimer > 0) {
        drawTintedImage(ctx, this.sprite, 0, 0, this.sprite.width, this.sprite.height, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
      } else {
        ctx.drawImage(this.sprite, 0, 0, this.sprite.width, this.sprite.height, dx, dy, drawSize, drawSize);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      // Draw enemy body
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
      
      // Custom decoration details based on type
      ctx.fillStyle = '#000';
      if (this.stage === 1) { // Farm
        if (this.type === 'chicken') {
          // Red comb on head
          ctx.fillStyle = 'red';
          ctx.fillRect(this.x + this.width - 6, this.y - 4, 4, 4);
          // Beak
          ctx.fillStyle = 'orange';
          ctx.fillRect(this.x + this.width, this.y + 4, 3, 2);
        } else if (this.type === 'pig') {
          // Snout
          ctx.fillStyle = 'pink';
          ctx.fillRect(this.x + this.width - 4, this.y + 8, 4, 4);
        }
      } else if (this.stage === 2) { // Sea
        if (this.type === 'crab') {
          // Claws
          ctx.fillStyle = 'red';
          ctx.fillRect(this.x + this.width, this.y + 2, 4, 6);
          ctx.fillRect(this.x - 4, this.y + 2, 4, 6);
        }
      } else if (this.stage === 3) { // Desert
        if (this.type === 'mummy') {
          // Wrapping lines
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(this.x, this.y + 6);
          ctx.lineTo(this.x + this.width, this.y + 6);
          ctx.moveTo(this.x, this.y + 14);
          ctx.lineTo(this.x + this.width, this.y + 14);
          ctx.stroke();
        }
      }
      
      // Flash red on damage for fallback vector shapes
      if (this.damageEffectTimer > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
    
    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

// Boss Class (inherits from Enemy)
class Boss extends Enemy {
  constructor(name, stage, hp, speed, damage, xpReward, goldReward) {
    // Bosses are much bigger (sizeMultiplier = 2.2)
    super(name, 'boss', stage, 5, hp, speed, damage, xpReward, goldReward, 2.2);
    this.isBoss = true;
    this.chargeTimer = 0;
    this.krakenAtkTimer = 0;
    this.pharaohMinionTimer = 0;
    
    // Custom Boss Spritesheet safely loaded
    let bossName = 'bull';
    if (stage === 2) bossName = 'kraken';
    else if (stage === 3) bossName = 'pharaoh';
    
    let targetSrc = `assets/boss_${bossName}_sheet.png`;
    if (bossName === 'bull') {
      targetSrc = 'assets/boss_bull_sheet-removebg-preview.png';
    } else if (bossName === 'pharaoh') {
      targetSrc = 'assets/Gemini_Generated_Image_c8tik3c8tik3c8ti-removebg-preview.png';
    }
    
    if (!this.spriteSheet.src.includes(targetSrc)) {
      this.sheetLoaded = false;
      this.processedSheet = null;
      this.spriteSheet.src = `${targetSrc}?v=${Date.now()}`;
    }
    
    // Single sprite loader fallback
    this.spriteLoaded = false;
    this.sprite.src = `assets/boss_${bossName}_sprite.png?v=${Date.now()}`;
  }
  
  update(dt, player, projectiles, particles, spawnMinionCallback) {
    if (this.isDead || player.isDead) {
      this.isWalking = false;
      return;
    }
    
    this.y = groundY - this.height;
    
    if (this.damageEffectTimer > 0) {
      this.damageEffectTimer -= dt;
    }
    
    if (this.atkTimer > 0) {
      this.atkTimer -= dt;
    }
    
    const dist = Math.abs(this.x - (player.x + player.width));
    
    // Boss specific ability loops
    if (this.stage === 1) { // Bull Charge Attack
      this.chargeTimer += dt;
      if (this.chargeTimer >= 6.0) {
        // Trigger screen warning, charge forward rapidly!
        this.speed = 350;
        this.atk = this.maxHp * 0.25; // Massive charge damage
        particles.push(new Particle(this.x, this.y, -100, -80, 'red', 'BULL CHARGE!', 18, 1.2));
        this.chargeTimer = 0;
      }
      
      // If speed was high and has passed player, reset speed
      if (this.speed > 100 && this.x < player.x) {
        this.speed = 45;
        this.atk = 15;
      }
    } else if (this.stage === 2) { // Kraken ink spitting
      this.krakenAtkTimer += dt;
      if (this.krakenAtkTimer >= 4.0) {
        // Spit ink projectile
        projectiles.push(new Projectile(
          this.x,
          this.y + this.height / 2,
          -220, // Moves left
          this.atk * 1.5,
          'boss',
          player,
          'ink'
        ));
        particles.push(new Particle(this.x, this.y, -30, -50, 'hsl(280, 80%, 40%)', 'INK SPLAT', 14, 0.8));
        this.krakenAtkTimer = 0;
      }
    } else if (this.stage === 3) { // Pharaoh summons sandstorms or minions
      this.pharaohMinionTimer += dt;
      if (this.pharaohMinionTimer >= 5.0) {
        // Summon 2 small mummies
        spawnMinionCallback();
        particles.push(new Particle(this.x, this.y, -50, -60, 'hsl(45, 90%, 55%)', 'SUMMON MINIONS', 14, 0.8));
        this.pharaohMinionTimer = 0;
      }
    }
    
    // Normal movement / attack
    if (dist > this.atkRange) {
      this.x -= this.speed * dt;
      this.isWalking = true;
    } else {
      this.isWalking = false;
      if (this.atkTimer <= 0) {
        player.takeDamage(this.atk);
        this.atkTimer = 1.2; // Slower boss swing
      }
    }
  }
  
  draw(ctx) {
    if (this.isDead) return;
    
    ctx.save();
    
    if (this.sheetLoaded) {
      let sx = 0;
      let sy = 0;
      let sw = 256;
      let sh = 256;
      
      const isMoving = this.isWalking;
      const isAttacking = this.atkTimer > 0;
      
      // Dynamically detect cell dimensions from loaded spritesheet size
      const sheetW = this.spriteSheet.width || this.processedSheet.width;
      if (sheetW > 0 && sheetW <= 600) {
        sw = 125;
        sh = 125;
      }
      
      if (isAttacking) {
        const totalCooldown = 1.2;
        const progress = this.atkTimer / totalCooldown;
        const attackFrame = Math.min(2, Math.floor((1.0 - progress) * 3));
        sx = attackFrame * sw;
        sy = sh * 2; // Row 2 (Attack - 3 frames)
      } else if (isMoving) {
        const walkFrame = Math.floor(Date.now() / 120) % 4;
        sx = walkFrame * sw;
        sy = sh * 1; // Row 1 (Walk - 4 frames)
      } else {
        const idleFrame = Math.floor(Date.now() / 150) % 3;
        sx = idleFrame * sw;
        sy = 0; // Row 0 (Stand - 3 frames)
      }
      
      // Mirror horizontally so the boss faces the player (walks left)
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
      ctx.scale(-1, 1);
      
      const drawSize = this.width;
      const dx = -drawSize / 2;
      const dy = -drawSize / 2;
      
      if (this.damageEffectTimer > 0) {
        drawTintedImage(ctx, this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
      } else {
        ctx.drawImage(this.processedSheet, sx, sy, sw, sh, dx, dy, drawSize, drawSize);
      }
      ctx.restore();
    } else if (this.spriteLoaded) {
      ctx.save();
      const isMoving = this.isWalking;
      let bounceY = isMoving ? Math.abs(Math.sin(Date.now() / 120)) * 4 : 0;
      
      // Mirror horizontally so the boss faces the player (walks left)
      ctx.translate(this.x + this.width / 2, this.y + this.height / 2 - bounceY);
      ctx.scale(-1, 1);
      
      // Wobble/bounce scale transformation when moving
      if (isMoving) {
        ctx.scale(1 + Math.sin(Date.now() / 60) * 0.08, 1 - Math.sin(Date.now() / 60) * 0.08);
      }
      
      const drawSize = this.width;
      const dx = -drawSize / 2;
      const dy = -drawSize / 2;
      
      if (this.damageEffectTimer > 0) {
        drawTintedImage(ctx, this.sprite, 0, 0, this.sprite.width, this.sprite.height, dx, dy, drawSize, drawSize, 'rgba(255, 0, 0, 0.45)');
      } else {
        ctx.drawImage(this.sprite, 0, 0, this.sprite.width, this.sprite.height, dx, dy, drawSize, drawSize);
      }
      ctx.restore();
    } else {
      ctx.fillStyle = this.color;
      // Draw boss body
      ctx.beginPath();
      ctx.roundRect(this.x, this.y, this.width, this.height, 8);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Custom decoration details based on stage boss
      if (this.stage === 1) { // Giant Angry Bull
        // Golden horns
        ctx.fillStyle = 'hsl(45, 95%, 55%)';
        ctx.beginPath();
        ctx.moveTo(this.x + 8, this.y);
        ctx.lineTo(this.x - 8, this.y - 12);
        ctx.lineTo(this.x + 8, this.y - 4);
        ctx.closePath();
        ctx.fill();
        
        // Nose ring
        ctx.strokeStyle = 'hsl(45, 95%, 55%)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width, this.y + this.height - 15, 6, 0, Math.PI * 2);
        ctx.stroke();
      } else if (this.stage === 2) { // The Deepwater Kraken
        // Octopus-like eyes
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(this.x + 12, this.y + 16, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Tentacles hanging from bottom
        ctx.fillStyle = 'purple';
        ctx.fillRect(this.x + 6, this.y + this.height, 6, 12);
        ctx.fillRect(this.x + 18, this.y + this.height, 6, 15);
        ctx.fillRect(this.x + 30, this.y + this.height, 6, 10);
      } else if (this.stage === 3) { // Pharaoh Mummy
        // Golden Pharaoh Headpiece
        ctx.fillStyle = 'hsl(45, 90%, 55%)';
        ctx.fillRect(this.x + 4, this.y - 8, this.width - 8, 8);
        ctx.fillStyle = 'blue';
        ctx.fillRect(this.x + 12, this.y - 8, 4, 8);
        ctx.fillRect(this.x + 28, this.y - 8, 4, 8);
        
        // Glowing green eyes
        ctx.fillStyle = 'green';
        ctx.fillRect(this.x + 8, this.y + 10, 4, 4);
        ctx.fillRect(this.x + 24, this.y + 10, 4, 4);
      }
      
      // Flash red on damage for fallback vector shapes
      if (this.damageEffectTimer > 0) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.45)';
        ctx.fillRect(this.x, this.y, this.width, this.height);
      }
    }
    
    ctx.restore();
    this.drawHealthBar(ctx);
  }
}

// Projectile Class
class Projectile {
  constructor(x, y, speed, damage, owner, target, type) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.damage = damage;
    this.owner = owner; // player or boss/enemy
    this.target = target;
    this.type = type; // arrow, fireball, ink, magic_bolt
    this.radius = type === 'fireball' ? 6 : (type === 'ink' ? 8 : (type === 'magic_bolt' ? 4 : 3));
    this.isDead = false;
    
    // Set colors
    if (type === 'arrow') this.color = 'hsl(35, 60%, 40%)';
    else if (type === 'fireball') this.color = 'hsl(18, 95%, 55%)';
    else if (type === 'ink') this.color = 'hsl(280, 80%, 30%)';
    else if (type === 'magic_bolt') this.color = 'hsl(200, 95%, 65%)';
  }
  
  update(dt, enemies, player, particles) {
    if (this.isDead) return;
    
    const prevX = this.x;
    this.x += this.speed * dt;
    
    if (this.owner === 'player') {
      // Check collision with closest target or any enemy
      for (const enemy of enemies) {
        if (enemy.isDead) continue;
        
        // Swept CCD check horizontally, normal box check vertically
        const minX = Math.min(prevX, this.x);
        const maxX = Math.max(prevX, this.x);
        const overlapsX = (maxX >= enemy.x && minX <= enemy.x + enemy.width);
        
        if (overlapsX && this.y >= enemy.y && this.y <= enemy.y + enemy.height) {
          this.triggerCollision(enemy, enemies, particles);
          break;
        }
      }
      
      // Offscreen check
      if (this.x > 820) {
        this.isDead = true;
      }
    } else {
      // Moves left (ink projectile from boss)
      const minX = Math.min(prevX, this.x);
      const maxX = Math.max(prevX, this.x);
      const overlapsX = (minX <= player.x + player.width && maxX >= player.x);
      
      if (overlapsX && this.y >= player.y && this.y <= player.y + player.height) {
        player.takeDamage(this.damage);
        this.isDead = true;
        // Impact splash
        for (let i = 0; i < 8; i++) {
          particles.push(new Particle(
            this.x,
            this.y,
            (Math.random() - 0.5) * 80,
            (Math.random() - 0.5) * 80,
            this.color,
            null,
            2,
            0.5
          ));
        }
      }
      
      if (this.x < 0) {
        this.isDead = true;
      }
    }
  }
  
  triggerCollision(directTarget, allEnemies, particles) {
    this.isDead = true;
    
    if (this.type === 'arrow' || this.type === 'magic_bolt') {
      // Deal direct damage
      directTarget.takeDamage(this.damage);
      // Spawn tiny spark particles
      for (let i = 0; i < 3; i++) {
        particles.push(new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 60,
          (Math.random() - 0.5) * 60,
          this.color,
          null,
          2,
          0.3
        ));
      }
      particles.push(new Particle(
        directTarget.x + directTarget.width / 2,
        directTarget.y - 10,
        (Math.random() - 0.5) * 30,
        -70,
        '#fff',
        `-${this.damage}`,
        14,
        0.7
      ));
    } else if (this.type === 'fireball') {
      // Splash explosion AoE
      const splashRange = 80;
      
      // Explosion particles
      for (let i = 0; i < 15; i++) {
        particles.push(new Particle(
          this.x,
          this.y,
          (Math.random() - 0.5) * 140,
          (Math.random() - 0.5) * 140,
          'hsl(18, 95%, 55%)',
          null,
          4,
          0.6
        ));
      }
      
      // Apply damage to all enemies in range
      for (const enemy of allEnemies) {
        if (enemy.isDead) continue;
        const dist = Math.abs((enemy.x + enemy.width / 2) - this.x);
        if (dist <= splashRange) {
          enemy.takeDamage(this.damage);
          particles.push(new Particle(
            enemy.x + enemy.width / 2,
            enemy.y - 10,
            (Math.random() - 0.5) * 30,
            -70,
            'hsl(18, 95%, 55%)',
            `-${this.damage}`,
            14,
            0.7
          ));
        }
      }
    }
  }
  
  draw(ctx) {
    if (this.isDead) return;
    
    ctx.save();
    ctx.fillStyle = this.color;
    
    if (this.type === 'arrow') {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3.5;
      ctx.shadowBlur = 5;
      ctx.shadowColor = 'gold';
      ctx.beginPath();
      ctx.moveTo(this.x - 22, this.y);
      ctx.lineTo(this.x, this.y);
      
      // Arrowhead points
      ctx.moveTo(this.x - 5, this.y - 3);
      ctx.lineTo(this.x, this.y);
      ctx.lineTo(this.x - 5, this.y + 3);
      
      ctx.stroke();
    } else if (this.type === 'fireball') {
      // Glowing fireball circle
      ctx.shadowBlur = 8;
      ctx.shadowColor = 'orange';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (this.type === 'ink') {
      // Splattery ink drop
      ctx.shadowBlur = 6;
      ctx.shadowColor = 'purple';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
}
