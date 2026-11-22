/* =============================================================================
   characters.js  —  所有角色資料（屬性 / 招式 / 外觀 / 臉部參數）
   -----------------------------------------------------------------------------
   index.html 只負責遊戲引擎，唔會寫死任何角色。
   想「加角色」或「改招式」：只需要改呢個檔案，唔使掂 index.html。

   結構：
     1. CharacterDefaults   預設招式 + 預設臉部參數（角色冇寫嘅項目就用呢度）
     2. CharacterRoster     角色名單（陣列次序 = 選角畫面次序）
     3. CharacterRegistry   將 Roster 同 Defaults 合併，俾 index.html 讀取（一般唔使改）

   ─────────────────────────  加新角色 3 步  ─────────────────────────
   1) 喺下面 CharacterRoster 陣列加一個物件（可以複製現有角色改）
   2) 填 id / name / role / 四項屬性 / special1 / special2 / appearance
   3) 重新整理頁面，選角畫面會自動出現新角色（卡片、3D 預覽、頭像都自動生成）

   ─────────────────────────  改招式  ─────────────────────────
   喺角色物件加 moves: { ... }，只寫你想改嘅部分，其餘沿用 CharacterDefaults.moves。
   例：  moves: { kick: { mult: 1.6, range: 2.2 } }

   招式欄位（所有攻擊通用）：
     anim       動畫：'punch' | 'punch2' | 'heavy' | 'kick' | 'special'（引擎內置姿勢）
     duration   出招時間（秒，會再按 spd 加速）
     mult       傷害倍率（× atk × 0.24）
     range      攻擊距離           zRange  前後（縱深）判定範圍
     knockback  擊退力度           knockdown  true = 打低對手
     hitStart / hitEnd  判定生效嘅動作進度 0~1（預設 0.25 ~ 0.72）
     sfx        音效：'punch' | 'kick' | 'heavy' | 'special'
   ============================================================================= */

// ─────────────────────────────────────────────────────────────────────────────
// 1. 預設值
// ─────────────────────────────────────────────────────────────────────────────
const CharacterDefaults = {
  moves: {
    // J 鍵連擊：按次序循環，最後一招完成後重新由第一招開始
    combo: [
      { anim: 'punch',  duration: 0.24, mult: 0.90, range: 1.50, knockback: 2.2, sfx: 'punch' },
      { anim: 'punch2', duration: 0.25, mult: 1.05, range: 1.55, knockback: 2.8, sfx: 'punch' },
      { anim: 'heavy',  duration: 0.36, mult: 1.55, range: 1.75, knockback: 6.2, knockdown: true, sfx: 'heavy' }
    ],
    comboWindow: 0.75,   // 連擊輸入時限（秒）

    // 衝刺中按 J
    dashAttack: { anim: 'heavy', duration: 0.34, mult: 1.50, range: 1.85, knockback: 6.5, knockdown: true, sfx: 'heavy' },

    // K 鍵：地面踢 / 空中踢
    kick: {
      anim: 'kick', duration: 0.32, mult: 1.25, range: 1.80, knockback: 4.8, sfx: 'kick',
      comboKnockdown: 2   // 連擊去到第幾段之後，踢會打低對手
    },
    airKick: { anim: 'kick', duration: 0.34, mult: 1.35, range: 1.80, knockback: 5.8, knockdown: true, sfx: 'kick' },

    // O 鍵：抓摔
    grab: {
      duration: 0.34,
      reach: 1.65, reachZ: 0.95,   // 抓取範圍（左右 / 縱深）
      pull: 0.95,                  // 對手被拉到面前嘅距離
      damageMult: 0.34, knockback: 9.2,
      energyGain: 12               // 成功後回復幾多能量
    },

    // 必殺技（U / 拳+腳）同 大招（H）嘅共通設定；name / cost / mult / radius 喺角色物件度寫
    special1: { cost: 35,  duration: 0.48, invuln: 0.45, knockback: 6.5, knockdown: true, color: 0x00d4ff, sfx: 'special', banner: false },
    special2: { cost: 100, duration: 0.65, invuln: 0.75, knockback: 9.5, knockdown: true, color: 0xff2a5f, sfx: 'special', banner: true }
  },

  // 臉部 / 頭部參數預設值（角色冇寫就用呢度）
  face: {
    template: 'sidepart',          // 臉部／髮型模板：'messy' | 'undercut' | 'sidepart' | 'longhair' | 'fade' | 'street'
    palette: null,                 // null = 根據 appearance 嘅顏色自動生成
    head:  { sx: 0.220, sy: 0.270, sz: 0.218, jaw: 0.21, cheek: 0.015 },  // 3D 頭形
    earX: 0.212,                   // 耳仔左右位置
    noseScale: 0.88,               // 3D 鼻樑大細
    tex: {                         // 臉部貼圖微調
      noseW: 14, noseY: 21,
      sideHairY: 210,              // 鬢角延伸高度
      sideburnSolid: false,        // true = 鬢角全黑實色
      earY: 244, faceCy: 240, faceScale: 1.44
    }
  },

  // 敵人 / Boss 共用嘅 3D 頭形
  enemyHead: { sx: 0.218, sy: 0.258, sz: 0.218, jaw: 0.24, cheek: 0.01 }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. 角色名單（次序 = 選角畫面由左至右）
// ─────────────────────────────────────────────────────────────────────────────
const CharacterRoster = [
  // ── 1. WAI：力量型 ─────────────────────────────────────────────────────────
  {
    id: 'WAI',
    name: 'WAI',
    role: 'POWER TYPE',
    hp: 85, def: 65, atk: 100, spd: 55,
    special1: { name: 'Earthquake Slam',    cost: 35,  mult: 1.85, radius: 3.6, color: 0xff9e00 },
    special2: { name: 'Titan Meteor Crush', cost: 100, mult: 3.10, radius: 4.8, color: 0xff2a5f },
    appearance: {
      faceId: 'WAI',
      skin: 0xd9a886, hair: 0x17171a, hairStyle: 'messy',
      shirt: 0x35382a, pants: 0x15161a,
      torsoW: 0.68, pocket: true, glasses: null
    },
    face: {
      template: 'messy',
      palette: {
        base: '#d9a886', hi: '#e9c2a4', mid: '#ce9977', sh: '#b88260',
        lip: '#be7b6e', lipLine: '#7a453b', hair: '#17171a', hairHi: '#2f3038',
        shirt: '#35382a', shirtDark: '#272a1f', bgA: '#2c3024', bgB: '#12151f'
      },
      head: { sx: 0.238, sy: 0.258, sz: 0.228, jaw: 0.14, cheek: 0.055 },
      earX: 0.225,
      noseScale: 1.08,
      tex: { noseW: 17.5, noseY: 23, sideHairY: 280, sideburnSolid: true, earY: 244, faceCy: 240, faceScale: 1.48 }
    }
  },

  // ── 2. SHING：速度型 ───────────────────────────────────────────────────────
  {
    id: 'SHING',
    name: 'SHING',
    role: 'SPEED TYPE',
    hp: 75, def: 55, atk: 75, spd: 100,
    special1: { name: 'Cyclone Kick',       cost: 35,  mult: 1.70, radius: 3.8, color: 0x00d4ff },
    special2: { name: 'Hyper Blitz Flurry', cost: 100, mult: 2.95, radius: 5.0, color: 0x00f5d4 },
    appearance: {
      faceId: 'SHING',
      skin: 0xe8bfa4, hair: 0x261b15, hairStyle: 'undercut',
      shirt: 0xf0eadc, pants: 0x1c2940,
      torsoW: 0.62, pocket: false, glasses: 'silver'
    },
    face: {
      template: 'undercut',
      palette: {
        base: '#e8bfa4', hi: '#f7d9c4', mid: '#ddae90', sh: '#c49275',
        lip: '#c47b74', lipLine: '#844640', hair: '#261b15', hairHi: '#423026',
        shirt: '#f0eadc', shirtDark: '#d6cdb8', bgA: '#1d2948', bgB: '#0f1324'
      },
      head: { sx: 0.218, sy: 0.258, sz: 0.218, jaw: 0.24, cheek: 0.01 },
      earX: 0.212,
      noseScale: 0.88,
      tex: { noseW: 13.5, noseY: 21, sideHairY: 210, sideburnSolid: false, earY: 244, faceCy: 240, faceScale: 1.44 }
    }
  },

  // ── 3. GEORGE：防禦型 ──────────────────────────────────────────────────────
  {
    id: 'GEORGE',
    name: 'GEORGE',
    role: 'DEFENSE TYPE',
    hp: 100, def: 100, atk: 70, spd: 45,
    special1: { name: 'Aegis Shockwave', cost: 35,  mult: 1.75, radius: 4.0, color: 0x4cc9f0 },
    special2: { name: 'Fortress Nova',   cost: 100, mult: 3.00, radius: 5.2, color: 0x4361ee },
    appearance: {
      faceId: 'GEORGE',
      skin: 0xe0ad8b, hair: 0x141518, hairStyle: 'sidepart',
      shirt: 0x222854, pants: 0xc2b192,
      torsoW: 0.65, pocket: false, glasses: 'black'
    },
    face: {
      template: 'sidepart',
      palette: {
        base: '#e0ad8b', hi: '#f0c6a8', mid: '#d39c7a', sh: '#ba8463',
        lip: '#be796d', lipLine: '#78443a', hair: '#141518', hairHi: '#2a2c33',
        shirt: '#222854', shirtDark: '#171c3d', bgA: '#1e2752', bgB: '#0f1326'
      },
      head: { sx: 0.220, sy: 0.270, sz: 0.218, jaw: 0.21, cheek: 0.015 },
      earX: 0.212,
      noseScale: 0.88,
      tex: { noseW: 14.5, noseY: 21, sideHairY: 210, sideburnSolid: false, earY: 236, faceCy: 236, faceScale: 1.44 }
    }
  },

  // ── 4. MISTY：敏捷格鬥型（女角｜黑衫＋胸口多啦A夢圖案）────────────────────────
  {
    id: 'MISTY',
    name: 'MISTY',
    role: 'AGILE STRIKER',
    hp: 78, def: 62, atk: 80, spd: 92,
    special1: { name: 'Pocket Bell Spin',     cost: 35,  mult: 1.78, radius: 3.9, color: 0x00b4d8 },
    special2: { name: 'Midnight Lotus Storm', cost: 100, mult: 3.05, radius: 5.1, color: 0xff4d8d },
    appearance: {
      faceId: 'MISTY',
      gender: 'female',
      skin: 0xeab996, hair: 0x1c1411, hairStyle: 'longhair',
      shirt: 0x15171d, pants: 0x222530,
      torsoW: 0.56, pocket: false, glasses: null,
      chestPrint: 'doraemon'        // 胸口中央多啦A夢圖案
    },
    face: {
      template: 'longhair',         // 長直深棕黑髮＋左分斜瀏海＋溫暖露齒微笑
      palette: {
        base: '#eab996', hi: '#fad5b9', mid: '#dda782', sh: '#c48d6a',
        lip: '#d8787b', lipLine: '#9c484c', hair: '#1c1411', hairHi: '#3d2a22',
        shirt: '#15171d', shirtDark: '#0b0c10', bgA: '#2b2038', bgB: '#0e101c'
      },
      head: { sx: 0.212, sy: 0.250, sz: 0.212, jaw: 0.27, cheek: 0.032 },
      earX: 0.200,
      noseScale: 0.78,
      tex: { noseW: 12.2, noseY: 20, sideHairY: 325, sideburnSolid: true, earY: 244, faceCy: 240, faceScale: 1.44 }
    },
    moves: {
      // 專屬 4 段高速拳腳連擊
      combo: [
        { anim: 'punch',  duration: 0.20, mult: 0.82, range: 1.50, knockback: 1.8, sfx: 'punch' },
        { anim: 'punch2', duration: 0.20, mult: 0.90, range: 1.55, knockback: 2.2, sfx: 'punch' },
        { anim: 'kick',   duration: 0.24, mult: 1.15, range: 1.80, knockback: 3.6, sfx: 'kick' },
        { anim: 'heavy',  duration: 0.32, mult: 1.55, range: 1.85, knockback: 6.4, knockdown: true, sfx: 'heavy' }
      ],
      kick: { anim: 'kick', duration: 0.28, mult: 1.35, range: 1.92, knockback: 5.2, sfx: 'kick', comboKnockdown: 2 }
    }
  },

  // ── 5. JOHNNY：空中灌籃型（男角｜紫衫＋胸口 NBA 字樣｜黑框眼鏡＋高額短髮）───────
  {
    id: 'JOHNNY',
    name: 'JOHNNY',
    role: 'AERIAL BRAWLER',
    hp: 82, def: 60, atk: 88, spd: 82,
    special1: { name: 'Alley-Oop Slam',     cost: 35,  mult: 1.82, radius: 3.8, color: 0x9b5de5 },
    special2: { name: 'Court Breaker Dunk', cost: 100, mult: 3.15, radius: 5.0, color: 0xffbe0b },
    appearance: {
      faceId: 'JOHNNY',
      skin: 0xdead8c, hair: 0x151519, hairStyle: 'fade',
      shirt: 0x5c249c, pants: 0x191726,
      torsoW: 0.65, pocket: false, glasses: 'black', // 還原相片深色長方眼鏡
      chestPrint: 'nba'             // 胸口中央 NBA 字樣徽章
    },
    face: {
      template: 'fade',             // 高額短平漸層髮型＋濃眉＋淺鬍青＋溫和微笑
      palette: {
        base: '#dead8c', hi: '#f0c7ab', mid: '#cf9b79', sh: '#b58060',
        lip: '#ba7770', lipLine: '#7a4540', hair: '#151519', hairHi: '#30313a',
        shirt: '#5c249c', shirtDark: '#3f1670', bgA: '#36195e', bgB: '#100c1f'
      },
      head: { sx: 0.218, sy: 0.274, sz: 0.218, jaw: 0.25, cheek: 0.015 },
      earX: 0.212,
      noseScale: 0.96,
      tex: { noseW: 15.6, noseY: 22, sideHairY: 192, sideburnSolid: false, earY: 246, faceCy: 246, faceScale: 1.42 }
    },
    moves: {
      // 強化衝刺重擊與空中灌籃飛踢
      dashAttack: { anim: 'heavy', duration: 0.30, mult: 1.65, range: 2.00, knockback: 7.2, knockdown: true, sfx: 'heavy' },
      airKick:    { anim: 'kick',  duration: 0.32, mult: 1.60, range: 1.95, knockback: 6.8, knockdown: true, sfx: 'heavy' }
    }
  },

  // ── 6. MARK：街頭反擊型（男角｜有帽外套＋胸口 SUP 圖案｜旁分黑髮＋眉心痣＋下巴小鬍鬚）
  {
    id: 'MARK',
    name: 'MARK',
    role: 'STREET BRAWLER',
    hp: 90, def: 82, atk: 82, spd: 60,
    special1: { name: 'Hype Shockwave',   cost: 35,  mult: 1.80, radius: 3.9, color: 0xe6192e },
    special2: { name: 'Drop Zone Impact', cost: 100, mult: 3.10, radius: 5.1, color: 0xff3b30 },
    appearance: {
      faceId: 'MARK',
      skin: 0xdfb091, hair: 0x161517, hairStyle: 'street',
      shirt: 0x262a34, pants: 0x15171c,
      torsoW: 0.67, pocket: false, glasses: null,
      hoodie: true,                 // 有帽長袖連帽外套＋白色抽繩
      chestPrint: 'sup'             // 胸口中央紅底白字 SUP 圖案
    },
    face: {
      template: 'street',           // 蓬鬆斜瀏海黑髮＋眉心小痣＋淺唇鬚與下巴小鬍鬚＋笑眼微笑
      palette: {
        base: '#dfb091', hi: '#f1cab0', mid: '#d19e7e', sh: '#b88567',
        lip: '#b66c6e', lipLine: '#7a4245', hair: '#161517', hairHi: '#343238',
        shirt: '#262a34', shirtDark: '#171a21', bgA: '#3b151c', bgB: '#11121c'
      },
      head: { sx: 0.232, sy: 0.260, sz: 0.224, jaw: 0.16, cheek: 0.050 },
      earX: 0.222,
      noseScale: 1.06,
      tex: { noseW: 17.8, noseY: 22, sideHairY: 270, sideburnSolid: true, earY: 244, faceCy: 240, faceScale: 1.46 }
    },
    moves: {
      // 強化重拳三連擊與高回氣抓摔
      combo: [
        { anim: 'punch',  duration: 0.24, mult: 0.96, range: 1.55, knockback: 2.6, sfx: 'punch' },
        { anim: 'punch2', duration: 0.25, mult: 1.12, range: 1.60, knockback: 3.4, sfx: 'punch' },
        { anim: 'heavy',  duration: 0.35, mult: 1.68, range: 1.82, knockback: 7.0, knockdown: true, sfx: 'heavy' }
      ],
      grab: { duration: 0.32, reach: 1.75, reachZ: 1.00, pull: 0.95, damageMult: 0.38, knockback: 9.8, energyGain: 15 }
    }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// 3. Registry（合併預設值，俾 index.html 使用；一般唔使改）
// ─────────────────────────────────────────────────────────────────────────────
const CharacterRegistry = (() => {
  const byId = {};
  const ids = [];

  const hex = (n) => '#' + (n >>> 0).toString(16).padStart(6, '0').slice(-6);
  const shade = (n, f) => {
    // f > 0 變亮，f < 0 變暗
    const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
      Math.max(0, Math.min(255, Math.round(f >= 0 ? c + (255 - c) * f : c * (1 + f))))
    );
    return hex((ch[0] << 16) | (ch[1] << 8) | ch[2]);
  };

  // 冇寫 palette 嘅角色，由 appearance 嘅顏色自動生成
  const autoPalette = (a) => {
    const skin = a.skin != null ? a.skin : 0xdca583;
    const hair = a.hair != null ? a.hair : 0x1a1a1a;
    const shirt = a.shirt != null ? a.shirt : 0x333333;
    return {
      base: hex(skin), hi: shade(skin, 0.18), mid: shade(skin, -0.06), sh: shade(skin, -0.20),
      lip: shade(skin, -0.22), lipLine: shade(skin, -0.50),
      hair: hex(hair), hairHi: shade(hair, 0.22),
      shirt: hex(shirt), shirtDark: shade(shirt, -0.25),
      bgA: shade(shirt, -0.55), bgB: '#0f1324'
    };
  };

  const merge = (def, ov) => Object.assign({}, def, ov || {});

  function register(raw) {
    if (!raw || !raw.id) throw new Error('CharacterRegistry.register: 角色需要 id');
    const D = CharacterDefaults;
    const m = raw.moves || {};
    const app = Object.assign({ faceId: raw.id }, raw.appearance || {});
    const f = raw.face || {};

    const data = {
      id: raw.id,
      name: raw.name || raw.id,
      role: raw.role || '',
      hp: raw.hp, def: raw.def, atk: raw.atk, spd: raw.spd,
      appearance: app,
      special1: merge(merge(D.moves.special1, m.special1), raw.special1),
      special2: merge(merge(D.moves.special2, m.special2), raw.special2),
      moves: {
        combo: m.combo || D.moves.combo,
        comboWindow: m.comboWindow != null ? m.comboWindow : D.moves.comboWindow,
        dashAttack: merge(D.moves.dashAttack, m.dashAttack),
        kick: merge(D.moves.kick, m.kick),
        airKick: merge(D.moves.airKick, m.airKick),
        grab: merge(D.moves.grab, m.grab)
      },
      face: {
        template: f.template || D.face.template,
        palette: f.palette || autoPalette(app),
        head: merge(D.face.head, f.head),
        earX: f.earX != null ? f.earX : D.face.earX,
        noseScale: f.noseScale != null ? f.noseScale : D.face.noseScale,
        tex: merge(D.face.tex, f.tex)
      }
    };

    if (!byId[data.id]) ids.push(data.id);
    byId[data.id] = data;
    return data;
  }

  CharacterRoster.forEach(register);

  return {
    ids,                                           // 角色 id 列表（選角次序）
    register,                                      // 亦可以喺其他檔案 CharacterRegistry.register({...}) 加角色
    has: (id) => !!byId[id],
    get: (id) => byId[id] || byId[ids[0]],         // 搵唔到就用第一個角色
    list: () => ids.map((i) => byId[i])
  };
})();