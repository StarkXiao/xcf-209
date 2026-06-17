import { reactive } from 'vue'
import type { Case } from '@/types'

export const cases = reactive<Case[]>([
  {
    id: 'case-001',
    title: '消失的灯塔守望者',
    description: '1932年，黑石岛灯塔的守望者在一夜之间神秘失踪。当地渔民报告称，那晚灯塔发出了诡异的紫光，并伴随着令人毛骨悚然的低语声。你被派往调查这起离奇案件。',
    difficulty: 'easy',
    status: 'available',
    sanityCost: 15,
    recommendedSanity: 80,
    startingTools: ['tool-magnifier-basic', 'tool-fingerprint-kit', 'tool-uv-light'],
    chapter: 1,
    prerequisites: [],
    rewards: {
      tools: ['tool-recorder'],
      unlocksCases: ['case-002'],
      sanityBonus: 10,
      description: '解锁录音笔，可捕捉声音类证据'
    },
    timeLimit: {
      totalSeconds: 900,
      sceneSwitchCost: 10,
      searchAttemptCost: 5,
      failedSearchPenalty: 15,
      clueAnalysisCost: 8,
      specialEventBonus: 30
    },
    branchRewards: {
      'standard': {
        tools: ['tool-recorder'],
        unlocksCases: ['case-002'],
        sanityBonus: 10,
        description: '标准结局奖励'
      },
      'deep-truth': {
        tools: ['tool-magnifier-pro', 'tool-uv-light-advanced', 'tool-lockpick', 'tool-recorder'],
        unlocksCases: ['case-002'],
        sanityBonus: 20,
        description: '深渊真相结局奖励：解锁全套高级工具'
      }
    },
    scenes: [
      {
        id: 'scene-lighthouse',
        name: '废弃灯塔',
        description: '一座古老的灯塔矗立在悬崖边，塔身布满苔藓和奇怪的刻痕。空气中弥漫着咸腥的海风和一股说不清的腐朽气息。',
        background: 'lighthouse',
        searched: false,
        evidence: [
          {
            id: 'evidence-diary',
            name: '守望者的日记',
            description: '一本沾满海水的皮革日记，最后几页的字迹变得扭曲疯狂，反复提到"来自深渊的呼唤"和"他即将苏醒"。',
            type: 'document',
            sanityEffect: -5,
            discovered: false,
            location: { x: 30, y: 45 },
            size: { width: 15, height: 20 },
            baseHitRate: 75,
            toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
            hiddenClues: ['clue-call', 'clue-awakening'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 4, chance: 100 },
              { materialId: 'mat-organic-residue', minQuantity: 1, maxQuantity: 2, chance: 60 }
            ],
            processable: true,
            processRecipeId: 'recipe-document-restore'
          },
          {
            id: 'evidence-symbol',
            name: '奇怪的符文',
            description: '灯塔内部墙壁上刻满了诡异的螺旋状符文，触摸时会感到一阵刺骨的寒意。这些符文似乎在微微发光。',
            type: 'trace',
            sanityEffect: -8,
            discovered: false,
            location: { x: 60, y: 30 },
            size: { width: 20, height: 25 },
            baseHitRate: 60,
            toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
            isSpecial: false,
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 70 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ],
            processable: true,
            processRecipeId: 'recipe-advanced-evidence-process'
          },
          {
            id: 'evidence-telescope',
            name: '破碎的望远镜',
            description: '守望者的望远镜被摔碎在地上，镜片上残留着一些黑色的黏液，散发着令人作呕的气味。',
            type: 'object',
            sanityEffect: -3,
            discovered: false,
            location: { x: 75, y: 55 },
            size: { width: 12, height: 15 },
            baseHitRate: 70,
            toolBoost: ['tool-fingerprint-kit', 'tool-chemical-analyzer'],
            hiddenClues: ['clue-substance'],
            materialDrops: [
              { materialId: 'metallic-fragment', minQuantity: 2, maxQuantity: 4, chance: 90 },
              { materialId: 'mat-lens-component', minQuantity: 1, maxQuantity: 2, chance: 50 },
              { materialId: 'mat-mysterious-liquid', minQuantity: 1, maxQuantity: 2, chance: 65 }
            ]
          },
          {
            id: 'evidence-hidden-mark',
            name: '隐藏的印记',
            description: '在灯塔楼梯的暗处，有一个几乎看不见的手印印记，在紫外线下会发出诡异的绿色荧光。手印的指节数量...似乎不太对。',
            type: 'trace',
            sanityEffect: -12,
            discovered: false,
            location: { x: 45, y: 70 },
            size: { width: 10, height: 12 },
            baseHitRate: 30,
            requiredTool: 'tool-uv-light',
            isSpecial: true,
            hiddenClues: ['clue-deep-one'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 1, chance: 40 },
              { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 2, chance: 60 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-secret-notes',
            name: '秘密笔记',
            description: '藏在灯塔顶部透镜缝隙中的一叠小纸条，上面写满了只有守望者自己能看懂的密码。破译后揭示了一个可怕的真相...',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 50, y: 15 },
            size: { width: 8, height: 10 },
            baseHitRate: 45,
            toolBoost: ['tool-magnifier-pro'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'clue_analyzed',
              requiredClueId: 'clue-call'
            },
            hiddenClues: ['clue-truth'],
            materialDrops: [
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 100 },
              { materialId: 'mat-torn-page', minQuantity: 3, maxQuantity: 5, chance: 80 }
            ],
            processable: true,
            processRecipeId: 'recipe-cipher-decode'
          },
          {
            id: 'evidence-ngplus-ancient-manuscript',
            name: '远古手稿',
            description: '【二周目特殊证据】一块被嵌入灯塔地基的石板，上面刻着比守望者日记古老数千年的符文。这些符文记录了一个关于"门"的契约——每过一个纪元，必须有人自愿守望。这似乎就是灯塔存在的真正原因。',
            type: 'document',
            sanityEffect: -20,
            discovered: false,
            location: { x: 20, y: 85 },
            size: { width: 10, height: 12 },
            baseHitRate: 20,
            toolBoost: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
            isInitiallyHidden: true,
            isSpecial: true,
            isNgPlusOnly: true,
            hiddenClues: ['clue-covenant'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 5, chance: 100 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          }
        ]
      },
      {
        id: 'scene-cottage',
        name: '守望者小屋',
        description: '灯塔旁的一间破旧小屋，屋内一片狼藉，仿佛发生过激烈的挣扎。桌上还摆着半杯已经发霉的咖啡。',
        background: 'cottage',
        searched: false,
        evidence: [
          {
            id: 'evidence-letter',
            name: '神秘信件',
            description: '一封来自"深海研究协会"的信件，邀请守望者参加一个秘密研究项目，信纸上有淡淡的磷光。',
            type: 'document',
            sanityEffect: -4,
            discovered: false,
            location: { x: 45, y: 35 },
            size: { width: 18, height: 22 },
            baseHitRate: 70,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-organization'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 3, chance: 90 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ]
          },
          {
            id: 'evidence-photo',
            name: '模糊的照片',
            description: '一张在灯塔顶部拍摄的照片，照片中央有一个模糊的人形轮廓，但仔细看去，那个轮廓似乎有太多的肢体...',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 20, y: 60 },
            size: { width: 15, height: 18 },
            baseHitRate: 65,
            toolBoost: ['tool-magnifier-pro'],
            hiddenClues: ['clue-entity'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 2, chance: 70 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 35 }
            ]
          },
          {
            id: 'evidence-amulet',
            name: '古老护符',
            description: '一个用未知金属制成的护符，表面刻着触手缠绕的图案。握在手中时，你会感到一阵眩晕。',
            type: 'object',
            sanityEffect: -6,
            discovered: false,
            location: { x: 70, y: 70 },
            size: { width: 10, height: 12 },
            baseHitRate: 55,
            toolBoost: ['tool-chemical-analyzer'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'metallic-fragment', minQuantity: 3, maxQuantity: 6, chance: 85 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 15 }
            ]
          },
          {
            id: 'evidence-locked-drawer',
            name: '上锁的抽屉',
            description: '书桌最下面的抽屉被牢牢锁住，里面似乎藏着什么重要的东西。锁孔里有一些奇怪的刻痕。',
            type: 'object',
            sanityEffect: -8,
            discovered: false,
            location: { x: 55, y: 50 },
            size: { width: 15, height: 10 },
            baseHitRate: 40,
            requiredTool: 'tool-lockpick',
            isSpecial: true,
            hiddenClues: ['clue-ritual'],
            materialDrops: [
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 75 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 3, chance: 50 },
              { materialId: 'mat-circuit-board', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ]
          },
          {
            id: 'evidence-hidden-chamber',
            name: '暗室入口',
            description: '壁炉后面似乎有一个隐藏的空间，边缘有新鲜的摩擦痕迹。里面可能藏着守望者最大的秘密。',
            type: 'trace',
            sanityEffect: -10,
            discovered: false,
            location: { x: 30, y: 75 },
            size: { width: 18, height: 15 },
            baseHitRate: 35,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'evidence_discovered',
              requiredEvidenceId: 'evidence-diary'
            },
            hiddenClues: ['clue-deep-one'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 50 },
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 4, chance: 80 },
              { materialId: 'mat-medicinal-herb', minQuantity: 1, maxQuantity: 3, chance: 40 }
            ]
          }
        ]
      },
      {
        id: 'scene-shore',
        name: '黑石海滩',
        description: '灯塔下方的海滩上散落着大量死鱼，它们的眼睛都朝着同一个方向——深海。远处，海面上似乎有什么东西在蠕动...',
        background: 'shore',
        searched: false,
        evidence: [
          {
            id: 'evidence-fish',
            name: '变异的死鱼',
            description: '这些死鱼不仅眼睛朝向异常，部分鱼身上还长出了奇怪的小触手，触手仍在微微抽动。',
            type: 'trace',
            sanityEffect: -12,
            discovered: false,
            location: { x: 35, y: 50 },
            size: { width: 25, height: 20 },
            baseHitRate: 80,
            toolBoost: ['tool-magnifier-basic'],
            materialDrops: [
              { materialId: 'mat-organic-residue', minQuantity: 3, maxQuantity: 6, chance: 100 },
              { materialId: 'mat-mysterious-liquid', minQuantity: 1, maxQuantity: 3, chance: 70 },
              { materialId: 'mat-medicinal-herb', minQuantity: 1, maxQuantity: 2, chance: 25 }
            ]
          },
          {
            id: 'evidence-footprints',
            name: '奇怪的脚印',
            description: '沙滩上有一串脚印从海边延伸到灯塔，但脚印的形状...不像是人类。更像是某种有蹼的生物。',
            type: 'trace',
            sanityEffect: -7,
            discovered: false,
            location: { x: 65, y: 40 },
            size: { width: 20, height: 15 },
            baseHitRate: 65,
            toolBoost: ['tool-fingerprint-kit'],
            hiddenClues: ['clue-creature'],
            materialDrops: [
              { materialId: 'mat-organic-residue', minQuantity: 1, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ]
          },
          {
            id: 'evidence-bottle',
            name: '漂流瓶',
            description: '一个被冲上岸的漂流瓶，里面有一张发黄的纸条，上面写着："他们不是失踪，而是回归了..."',
            type: 'document',
            sanityEffect: -5,
            discovered: false,
            location: { x: 80, y: 65 },
            size: { width: 12, height: 18 },
            baseHitRate: 50,
            toolBoost: ['tool-magnifier-basic', 'tool-fingerprint-kit'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 2, chance: 90 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 1, chance: 50 }
            ]
          },
          {
            id: 'evidence-whisper',
            name: '诡异的低语',
            description: '在海浪声中，你似乎能听到某种低沉的呢喃声。用录音设备捕捉后，发现那是一种不属于人类语言的诡异音节...',
            type: 'testimony',
            sanityEffect: -15,
            discovered: false,
            location: { x: 15, y: 30 },
            size: { width: 18, height: 15 },
            baseHitRate: 25,
            requiredTool: 'tool-recorder',
            isSpecial: true,
            hiddenClues: ['clue-call-of-deep'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 50 },
              { materialId: 'mat-mind-focus', minQuantity: 1, maxQuantity: 1, chance: 25 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-deep-statue',
            name: '海底雕像',
            description: '被海浪冲上岸的怪异雕像，描绘着一个有着章鱼头部和人类躯体的存在。雕像的眼睛似乎在追踪你的移动...',
            type: 'object',
            sanityEffect: -18,
            discovered: false,
            location: { x: 50, y: 75 },
            size: { width: 12, height: 18 },
            baseHitRate: 25,
            toolBoost: ['tool-magnifier-pro', 'tool-chemical-analyzer'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'scene_visited_count',
              requiredSceneVisitCount: 3,
              sceneId: 'scene-shore'
            },
            hiddenClues: ['clue-entity'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 5, chance: 90 },
              { materialId: 'mat-crystal-shard', minQuantity: 2, maxQuantity: 4, chance: 70 },
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 3, chance: 50 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 20 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          },
          {
            id: 'evidence-mysterious-scale',
            name: '神秘鳞片',
            description: '一块不属于任何已知生物的巨大鳞片，在月光下会散发出诡异的彩虹色光芒。',
            type: 'trace',
            sanityEffect: -8,
            discovered: false,
            location: { x: 75, y: 80 },
            size: { width: 8, height: 10 },
            baseHitRate: 40,
            toolBoost: ['tool-magnifier-basic'],
            isInitiallyHidden: true,
            discoveryTrigger: {
              type: 'random_after_search',
              chance: 12
            },
            materialDrops: [
              { materialId: 'mat-organic-residue', minQuantity: 2, maxQuantity: 4, chance: 100 },
              { materialId: 'mat-mysterious-liquid', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 35 }
            ]
          },
          {
            id: 'evidence-abyss-gateway',
            name: '深渊之门',
            description: '当你将变异死鱼、奇怪脚印和诡异低语联系在一起时，海滩深处浮现出一个半透明的光门。门后是漆黑的海水，但你隐约能听到...某种有节奏的心跳声。',
            type: 'trace',
            sanityEffect: -25,
            discovered: false,
            location: { x: 50, y: 50 },
            size: { width: 20, height: 25 },
            baseHitRate: 15,
            toolBoost: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'evidence_combo',
              requiredEvidenceIds: ['evidence-fish', 'evidence-footprints', 'evidence-whisper']
            },
            hiddenClues: ['clue-abyss-gateway'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 3, maxQuantity: 5, chance: 100 },
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 4, chance: 80 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 2, chance: 50 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          }
        ]
      },
      {
        id: 'scene-abyss-altar',
        name: '深渊祭坛',
        description: '穿过光门后，你来到了一个不该存在于现实中的空间。一座古老的祭坛矗立在黑暗中，祭坛中央的凹陷处放着一个仍在跳动的心脏——这就是所有异变的源头。空气中弥漫着令人窒息的威压，你能感觉到某种古老的存在正在注视着你...',
        background: 'shore',
        searched: false,
        locked: true,
        unlockConditions: [
          {
            type: 'evidence_combo',
            requiredEvidenceIds: ['evidence-abyss-gateway', 'evidence-hidden-mark', 'evidence-locked-drawer'],
            description: '收集深渊之门、隐藏印记和上锁抽屉中的证据'
          }
        ],
        evidence: [
          {
            id: 'evidence-altar-heart',
            name: '祭坛之心',
            description: '祭坛中央跳动的心脏，不属于任何已知生物。它的每一次跳动都会让你感到一阵精神刺痛，仿佛它正在与你的心跳产生共鸣。',
            type: 'object',
            sanityEffect: -30,
            discovered: false,
            location: { x: 50, y: 50 },
            size: { width: 20, height: 20 },
            baseHitRate: 20,
            toolBoost: ['tool-chemical-analyzer', 'tool-uv-light-advanced'],
            isSpecial: true,
            hiddenClues: ['clue-covenant'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 5, maxQuantity: 8, chance: 100 },
              { materialId: 'mat-elder-sign', minQuantity: 2, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-mind-focus', minQuantity: 2, maxQuantity: 3, chance: 60 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-altar-inscription',
            name: '祭坛铭文',
            description: '祭坛四周的墙壁上刻满了古老的铭文，记录着一个关于"自愿献祭"的古老仪式——守望者并非受害者，而是延续契约的执行者。铭文最后写道："当门开启之时，选择将降临于后来者。"',
            type: 'trace',
            sanityEffect: -15,
            discovered: false,
            location: { x: 25, y: 30 },
            size: { width: 30, height: 15 },
            baseHitRate: 50,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light'],
            isSpecial: true,
            hiddenClues: ['clue-truth'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 4, maxQuantity: 6, chance: 100 },
              { materialId: 'mat-cipher-text', minQuantity: 2, maxQuantity: 3, chance: 70 }
            ],
            processable: true,
            processRecipeId: 'recipe-cipher-decode'
          },
          {
            id: 'evidence-watcher-remains',
            name: '守望者残躯',
            description: '祭坛角落有一套半透明的守望者制服，制服下隐约可见某种非人形态的轮廓。他真的完成了蜕变——不是死亡，而是进化成了某种介于人与深潜者之间的存在。',
            type: 'trace',
            sanityEffect: -22,
            discovered: false,
            location: { x: 75, y: 65 },
            size: { width: 18, height: 22 },
            baseHitRate: 35,
            toolBoost: ['tool-fingerprint-kit', 'tool-chemical-analyzer'],
            isSpecial: true,
            hiddenClues: ['clue-deep-one'],
            materialDrops: [
              { materialId: 'mat-organic-residue', minQuantity: 5, maxQuantity: 8, chance: 100 },
              { materialId: 'mat-mysterious-liquid', minQuantity: 3, maxQuantity: 5, chance: 80 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 3, chance: 50 }
            ]
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-call',
        name: '深渊呼唤',
        description: '日记中提到的"来自深渊的呼唤"似乎是一种精神感应，能够影响特定人群的心智。',
        type: 'documentary',
        source: '守望者的日记',
        connections: ['clue-entity', 'clue-awakening'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-awakening',
        name: '苏醒仪式',
        description: '符文和日记暗示，某种古老的仪式正在唤醒海底沉睡的存在。',
        type: 'deduction',
        source: '守望者的日记 + 奇怪的符文',
        connections: ['clue-call', 'clue-organization'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-substance',
        name: '深海黏液',
        description: '望远镜上的黑色黏液经过分析，含有未知的有机化合物，似乎来自深海生物。',
        type: 'physical',
        source: '破碎的望远镜',
        connections: ['clue-creature', 'clue-entity'],
        importance: 2,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-organization',
        name: '深海研究协会',
        description: '这个神秘组织似乎在进行某种深海相关的秘密研究，可能与守望者的失踪有关。',
        type: 'testimonial',
        source: '神秘信件',
        connections: ['clue-awakening', 'clue-call'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-entity',
        name: '深渊存在',
        description: '照片中的模糊轮廓和所有证据指向同一个结论：某种不可名状的存在正在接近我们的世界。',
        type: 'deduction',
        source: '模糊的照片 + 深渊呼唤',
        connections: ['clue-call', 'clue-substance', 'clue-creature'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-creature',
        name: '深潜者',
        description: '脚印和变异鱼类表明，深海中存在着某种半人半鱼生物，它们可能与守望者的失踪有关。',
        type: 'physical',
        source: '奇怪的脚印 + 变异的死鱼',
        connections: ['clue-substance', 'clue-entity'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-deep-one',
        name: '非人手印',
        description: '隐藏在暗处的手印显示出某种非人特征——指节数量异常，指间有蹼状痕迹。这证实了深潜者的存在。',
        type: 'physical',
        source: '隐藏的印记',
        connections: ['clue-creature', 'clue-ritual'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-uv-light'
      },
      {
        id: 'clue-ritual',
        name: '献祭仪式',
        description: '从锁着的抽屉中发现的仪式手册显示，守望者并非受害者，而是自愿的祭品。他相信通过献祭能够获得"深海的祝福"。',
        type: 'documentary',
        source: '上锁的抽屉',
        connections: ['clue-awakening', 'clue-organization'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-lockpick'
      },
      {
        id: 'clue-call-of-deep',
        name: '深海之音',
        description: '录音中捕捉到的低语是某种古老的语言，反复提及"达贡"和"克苏鲁"的名号。这些声音似乎具有某种精神控制的力量。',
        type: 'testimonial',
        source: '诡异的低语',
        connections: ['clue-entity', 'clue-call'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-recorder'
      },
      {
        id: 'clue-truth',
        name: '守望者的真相',
        description: '秘密笔记揭示守望者早已知晓自己将发生蜕变，他不是受害者，而是主动选择了这条道路。灯塔不仅是导航设施，更是封印之门。',
        type: 'deduction',
        source: '秘密笔记',
        connections: ['clue-ritual', 'clue-organization', 'clue-covenant'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-covenant',
        name: '远古契约',
        description: '【二周目线索】灯塔地基中的远古手稿记载了一份比人类文明更古老的契约——每过一个纪元，必须有人自愿守望在"门"旁，以防止深渊存在完全降临。守望者的蜕变并非诅咒，而是契约的代价。',
        type: 'deduction',
        source: '远古手稿',
        connections: ['clue-truth', 'clue-deep-one'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-abyss-gateway',
        name: '深渊之门',
        description: '海滩深处浮现的光门是通往某种异度空间的入口。门后传来的心跳声表明，某种庞然大物正在门的另一侧等待着...这就是守望者最终的归宿。',
        type: 'deduction',
        source: '变异死鱼 + 奇怪脚印 + 诡异低语',
        connections: ['clue-entity', 'clue-ritual', 'clue-covenant'],
        importance: 5,
        discovered: false,
        analyzed: false
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-ritual',
      evidence: ['evidence-diary', 'evidence-symbol', 'evidence-letter', 'evidence-photo'],
      sanityThreshold: 30,
      options: [
        {
          id: 'conclusion-accident',
          text: '守望者因意外坠海身亡',
          isCorrect: false,
          sanityCost: 0,
          feedback: '这个结论无法解释那些超自然的证据...'
        },
        {
          id: 'conclusion-escape',
          text: '守望者因精神崩溃而逃离',
          isCorrect: false,
          sanityCost: 5,
          feedback: '虽然守望者确实精神不稳定，但这无法解释那些物理证据...'
        },
        {
          id: 'conclusion-ritual',
          text: '守望者被深海教团献祭，以唤醒某种古老存在',
          isCorrect: true,
          sanityCost: 10,
          feedback: '所有证据都指向这个令人不安的真相。守望者成为了某个疯狂仪式的祭品...',
          branch: 'standard'
        },
        {
          id: 'conclusion-transformation',
          text: '守望者自愿转化为了某种深海生物',
          isCorrect: false,
          sanityCost: 15,
          feedback: '这个推测有一定道理，但缺乏决定性证据支持...'
        },
        {
          id: 'conclusion-deep-truth',
          text: '守望者并非被献祭，而是回应了深海的召唤，自愿成为深潜者的一员',
          isCorrect: true,
          sanityCost: 20,
          feedback: '你发现了隐藏在表面之下的真正真相。守望者并非被迫献祭，而是主动回应了深海的呼唤，完成了向深潜者的蜕变。这是一般调查无法触及的深渊真相...',
          requiredTools: ['tool-uv-light', 'tool-recorder', 'tool-lockpick'],
          requiredEvidence: ['evidence-hidden-mark', 'evidence-whisper', 'evidence-locked-drawer'],
          branch: 'deep-truth'
        },
        {
          id: 'conclusion-true-awakening',
          text: '守望者的蜕变是远古契约的履行——他理解了守望的意义，并非被强迫，而是主动拥抱了命运',
          isCorrect: true,
          sanityCost: 30,
          feedback: '你触及了最深层的真相。灯塔不是建筑，而是封印；守望者不是受害者，而是守护者；蜕变不是诅咒，而是契约的代价。深潜者的血脉在他体内觉醒，但他保留了人类的意志——这才是真正的觉醒。',
          requiredTools: ['tool-uv-light-advanced', 'tool-recorder', 'tool-lockpick', 'tool-chemical-analyzer'],
          requiredEvidence: ['evidence-hidden-mark', 'evidence-whisper', 'evidence-locked-drawer', 'evidence-ngplus-ancient-manuscript'],
          branch: 'true-awakening',
          isNgPlusExclusive: true
        }
      ]
    }
  },
  {
    id: 'case-002',
    title: '暗影图书馆',
    description: '市立图书馆的地下藏书室被发现，但没有任何建筑图纸记录过它的存在。进入过那里的图书管理员都声称听到了低语声，并且开始出现严重的精神问题。',
    difficulty: 'normal',
    status: 'locked',
    sanityCost: 25,
    recommendedSanity: 70,
    startingTools: ['tool-magnifier-basic', 'tool-fingerprint-kit', 'tool-uv-light', 'tool-recorder'],
    chapter: 2,
    prerequisites: ['case-001'],
    rewards: {
      tools: ['tool-chemical-analyzer'],
      unlocksCases: ['case-003'],
      sanityBonus: 15,
      description: '解锁化学分析仪，可分析微量物质证据'
    },
    timeLimit: {
      totalSeconds: 1200,
      sceneSwitchCost: 12,
      searchAttemptCost: 6,
      failedSearchPenalty: 20,
      clueAnalysisCost: 10,
      specialEventBonus: 45
    },
    branchRewards: {
      'deep-truth': {
        tools: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
        unlocksCases: [],
        sanityBonus: 25,
        description: '深渊真相结局奖励：揭示图书馆的终极秘密'
      }
    },
    scenes: [
      {
        id: 'scene-reading-room',
        name: '地下阅览室',
        description: '一间隐藏在图书馆地下的圆形阅览室，书架上摆满了用未知文字书写的古籍。空气中弥漫着铁锈和陈旧羊皮纸的气味，墙壁上的烛台发出不自然的绿光。',
        background: 'cottage',
        searched: false,
        evidence: [
          {
            id: 'evidence-ngplus-star-chamber-letter',
            name: '星庭密函',
            description: '【二周目特殊证据】一封藏在书架暗格中的密函，信头印着星辰图案和"星庭裁决所"的字样。信中提到这个地下阅览室是裁决所的前哨站，用于保管最危险的知识。',
            type: 'document',
            sanityEffect: -15,
            discovered: false,
            location: { x: 65, y: 25 },
            size: { width: 12, height: 15 },
            baseHitRate: 25,
            toolBoost: ['tool-uv-light-advanced', 'tool-magnifier-pro'],
            isInitiallyHidden: true,
            isSpecial: true,
            isNgPlusOnly: true,
            hiddenClues: ['clue-star-chamber'],
            materialDrops: [
              { materialId: 'mat-cipher-text', minQuantity: 2, maxQuantity: 3, chance: 100 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 70 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ],
            processable: true,
            processRecipeId: 'recipe-cipher-decode'
          },
          {
            id: 'evidence-library-book',
            name: '禁忌典籍',
            description: '一本没有书名的黑色皮革书，书页上的文字似乎在移动，每次阅读都能看到不同的内容。阅读时你会感到头痛欲裂。',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 30, y: 40 },
            size: { width: 15, height: 18 },
            baseHitRate: 70,
            toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
            hiddenClues: ['clue-living-text'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 4, chance: 90 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 1, chance: 25 }
            ],
            processable: true,
            processRecipeId: 'recipe-document-restore'
          },
          {
            id: 'evidence-whisper-room',
            name: '低语墙壁',
            description: '阅览室中央的墙壁上有无数细小的孔洞，将耳朵贴上去时能听到无数声音在同时低语，它们似乎在讲述不同的故事...',
            type: 'trace',
            sanityEffect: -12,
            discovered: false,
            location: { x: 50, y: 60 },
            size: { width: 20, height: 25 },
            baseHitRate: 60,
            toolBoost: ['tool-recorder'],
            hiddenClues: ['clue-voices'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 80 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ]
          },
          {
            id: 'evidence-librarian-notes',
            name: '管理员笔记',
            description: '一位前图书管理员的笔记本，记录了他每次进入地下阅览室后的症状：幻听、失眠、记忆混乱...最后几页只有一句话重复了一百遍："它在阅读我"。',
            type: 'document',
            sanityEffect: -8,
            discovered: false,
            location: { x: 20, y: 30 },
            size: { width: 12, height: 15 },
            baseHitRate: 75,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-knowledge-corruption'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 3, chance: 85 },
              { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 1, chance: 45 }
            ]
          },
          {
            id: 'evidence-hidden-door',
            name: '暗门',
            description: '在低语墙壁后面发现了一扇隐藏的门，门上的锁孔形状扭曲，不是任何已知的锁具设计。门缝中渗出微弱的蓝光。',
            type: 'object',
            sanityEffect: -15,
            discovered: false,
            location: { x: 48, y: 78 },
            size: { width: 14, height: 12 },
            baseHitRate: 35,
            requiredTool: 'tool-lockpick',
            isSpecial: true,
            hiddenClues: ['clue-deeper-chamber'],
            materialDrops: [
              { materialId: 'metallic-fragment', minQuantity: 2, maxQuantity: 3, chance: 75 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 2, chance: 50 }
            ]
          }
        ]
      },
      {
        id: 'scene-archive',
        name: '禁忌档案室',
        description: '通过暗门后进入的房间，比阅览室更加深邃。这里的书架似乎延伸到无边的黑暗中，一些书本会自行从架子上掉落，仿佛有看不见的手在翻阅它们。',
        background: 'lighthouse',
        searched: false,
        evidence: [
          {
            id: 'evidence-self-writing',
            name: '自行书写的书',
            description: '一本打开的书，上面的文字正在自行出现，仿佛有一支看不见的笔在书写。内容描述的正是你此刻的一举一动。',
            type: 'document',
            sanityEffect: -18,
            discovered: false,
            location: { x: 35, y: 45 },
            size: { width: 15, height: 18 },
            baseHitRate: 55,
            toolBoost: ['tool-magnifier-pro', 'tool-recorder'],
            isSpecial: true,
            hiddenClues: ['clue-observer'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 70 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 80 },
              { materialId: 'mat-mind-focus', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-catalog',
            name: '禁忌书目',
            description: '一份详细记录所有地下藏书室藏书的目录。每本书的条目旁都有一个符号标注其危险等级，最高的等级标注让你感到一阵寒意。',
            type: 'document',
            sanityEffect: -6,
            discovered: false,
            location: { x: 70, y: 35 },
            size: { width: 12, height: 15 },
            baseHitRate: 65,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-catalog-system'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 3, chance: 95 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 1, chance: 55 }
            ]
          },
          {
            id: 'evidence-guardian-shadow',
            name: '守护者之影',
            description: '在档案室最深处的墙壁上，有一个总是比你的影子慢半拍的影子。它似乎在守护着什么，又似乎在警告着什么。用紫外线照射时，影子的轮廓显现为长袍人的形状。',
            type: 'trace',
            sanityEffect: -20,
            discovered: false,
            location: { x: 15, y: 55 },
            size: { width: 18, height: 25 },
            baseHitRate: 30,
            toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'scene_visited_count',
              requiredSceneVisitCount: 2,
              sceneId: 'scene-archive'
            },
            hiddenClues: ['clue-guardian'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 4, chance: 75 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 20 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-living-text',
        name: '活文字',
        description: '禁忌典籍中的文字是活的，它们会根据阅读者的心智改变内容。这解释了为什么每个阅读者都看到了不同的东西。',
        type: 'physical',
        source: '禁忌典籍',
        connections: ['clue-knowledge-corruption', 'clue-voices'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-voices',
        name: '众声低语',
        description: '墙壁中的低语来自无数被这些禁忌知识侵蚀的心智，他们的意识被困在了文字之中，成为了图书馆的一部分。',
        type: 'testimonial',
        source: '低语墙壁',
        connections: ['clue-living-text', 'clue-knowledge-corruption'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-knowledge-corruption',
        name: '知识侵蚀',
        description: '管理员笔记证实，接触这些禁忌知识会逐渐侵蚀人的心智。这不是普通的精神疾病，而是知识本身具有的超自然力量。',
        type: 'documentary',
        source: '管理员笔记',
        connections: ['clue-living-text', 'clue-voices'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-deeper-chamber',
        name: '深层密室',
        description: '暗门之后还有一个更深层的地方，那里的知识比阅览室中的更加危险。能感觉到那股力量正在试图穿透门扉。',
        type: 'deduction',
        source: '暗门',
        connections: ['clue-observer', 'clue-guardian'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-observer',
        name: '观察者',
        description: '自行书写的书证明了有什么东西在观察着这里的一切，并通过文字记录下来。它不仅观察，还在预测和引导事件的发展。',
        type: 'deduction',
        source: '自行书写的书',
        connections: ['clue-deeper-chamber', 'clue-guardian'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-guardian',
        name: '图书馆守护者',
        description: '守护者之影是曾经的图书管理员，他的意识被禁锢在这里成为了图书馆的一部分。他在守护着最危险的秘密，同时也在警告闯入者。',
        type: 'deduction',
        source: '守护者之影',
        connections: ['clue-observer', 'clue-deeper-chamber', 'clue-star-chamber'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-uv-light'
      },
      {
        id: 'clue-catalog-system',
        name: '危险知识体系',
        description: '禁忌书目揭示了一个完整的超自然知识体系，从低到高分为七个危险等级。第七等级的知识据说能够改写现实本身。',
        type: 'documentary',
        source: '禁忌书目',
        connections: ['clue-knowledge-corruption', 'clue-living-text'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-star-chamber',
        name: '星庭裁决所',
        description: '【二周目线索】星庭密函揭示这个地下阅览室是星庭裁决所设立的前哨站，用于保管和监控最危险的超自然知识。守护者之影正是裁决所派遣的看守。',
        type: 'testimonial',
        source: '星庭密函',
        connections: ['clue-guardian', 'clue-catalog-system'],
        importance: 5,
        discovered: false,
        analyzed: false
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-forbidden',
      evidence: ['evidence-library-book', 'evidence-whisper-room', 'evidence-librarian-notes'],
      sanityThreshold: 40,
      options: [
        {
          id: 'conclusion-hallucination',
          text: '图书管理员们集体产生了幻觉',
          isCorrect: false,
          sanityCost: 0,
          feedback: '集体幻觉无法解释地下室的物理存在...'
        },
        {
          id: 'conclusion-architect',
          text: '地下室是某位疯狂的建筑师秘密建造的',
          isCorrect: false,
          sanityCost: 5,
          feedback: '建筑师的疯狂无法解释那些超自然现象...'
        },
        {
          id: 'conclusion-forbidden',
          text: '地下室藏有禁忌的知识，会侵蚀接触者的心智',
          isCorrect: true,
          sanityCost: 15,
          feedback: '某些知识确实不应该被人类知晓...',
          branch: 'standard'
        },
        {
          id: 'conclusion-deep-library',
          text: '地下图书馆本身就是一个活着的存在，它以读者的理智为食，用禁忌知识引诱猎物',
          isCorrect: true,
          sanityCost: 25,
          feedback: '你窥见了更深层的真相。图书馆不只是存放知识的地方——它本身就是一种掠食者，用禁忌知识作为诱饵，以人类的理智为养分。',
          requiredTools: ['tool-recorder', 'tool-lockpick'],
          requiredEvidence: ['evidence-hidden-door', 'evidence-self-writing'],
          branch: 'deep-truth'
        },
        {
          id: 'conclusion-star-chamber',
          text: '这里是星庭裁决所的前哨站，守护者以自身为牢，封印着足以改写现实的知识',
          isCorrect: true,
          sanityCost: 35,
          feedback: '你揭开了最深的秘密。星庭裁决所并非传说，他们一直在暗中守护人类，将最危险的知识封印在此。而那个守护者之影，正是为这份使命献出了一切的裁决所成员。',
          requiredTools: ['tool-uv-light-advanced', 'tool-recorder', 'tool-lockpick'],
          requiredEvidence: ['evidence-ngplus-star-chamber-letter', 'evidence-guardian-shadow', 'evidence-hidden-door'],
          branch: 'star-chamber',
          isNgPlusExclusive: true
        }
      ]
    }
  },
  {
    id: 'case-003',
    title: '梦魇画作',
    description: '著名画家在完成最后一幅作品后发疯自杀。所有看过那幅画的人都报告做同样的噩梦，梦中有一个反复出现的几何图案...',
    difficulty: 'hard',
    status: 'locked',
    sanityCost: 35,
    recommendedSanity: 60,
    startingTools: ['tool-magnifier-pro', 'tool-uv-light-advanced', 'tool-chemical-analyzer'],
    chapter: 3,
    prerequisites: ['case-002'],
    rewards: {
      tools: [],
      unlocksCases: [],
      sanityBonus: 25,
      description: '完成所有案件的最终奖励'
    },
    timeLimit: {
      totalSeconds: 1500,
      sceneSwitchCost: 15,
      searchAttemptCost: 8,
      failedSearchPenalty: 25,
      clueAnalysisCost: 12,
      specialEventBonus: 60
    },
    branchRewards: {
      'deep-truth': {
        tools: ['tool-uv-light-advanced'],
        unlocksCases: [],
        sanityBonus: 20,
        description: '深渊真相结局奖励：看清画作的真正本质'
      }
    },
    scenes: [
      {
        id: 'scene-studio',
        name: '画家画室',
        description: '画家生前工作的画室，到处散落着颜料和画布。空气中弥漫着松节油和一种说不出的甜腻气味。最引人注目的是画架上那幅未完成的画...',
        background: 'cottage',
        searched: false,
        evidence: [
          {
            id: 'evidence-final-painting',
            name: '最后一幅画',
            description: '那幅让画家发疯的画作。画面上的几何图案看似杂乱，但长时间注视后会发现它在旋转——一个不可能存在于三维空间的形状。看久了你会感到恶心。',
            type: 'object',
            sanityEffect: -15,
            discovered: false,
            location: { x: 40, y: 35 },
            size: { width: 20, height: 25 },
            baseHitRate: 80,
            toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
            hiddenClues: ['clue-geometry'],
            materialDrops: [
              { materialId: 'mat-crystal-shard', minQuantity: 2, maxQuantity: 4, chance: 90 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 45 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-painter-diary',
            name: '画家日记',
            description: '画家最后几个月的日记，字迹从工整逐渐变得狂乱。反复提到"那个形状"和"它在呼唤我"，最后一条写着："我终于看到了门的另一侧..."',
            type: 'document',
            sanityEffect: -8,
            discovered: false,
            location: { x: 20, y: 55 },
            size: { width: 12, height: 15 },
            baseHitRate: 70,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-painter-madness'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 4, chance: 85 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 1, chance: 50 }
            ]
          },
          {
            id: 'evidence-paint-analysis',
            name: '异常颜料',
            description: '一些用未知材料制成的颜料，化学分析显示其中含有不属于地球的矿物质。这些颜料被用于最后一幅画的关键部分。',
            type: 'trace',
            sanityEffect: -6,
            discovered: false,
            location: { x: 70, y: 60 },
            size: { width: 10, height: 12 },
            baseHitRate: 55,
            toolBoost: ['tool-chemical-analyzer'],
            hiddenClues: ['clue-otherworldly-material'],
            materialDrops: [
              { materialId: 'mat-mysterious-liquid', minQuantity: 2, maxQuantity: 4, chance: 100 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 2, chance: 70 },
              { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 2, chance: 60 }
            ]
          },
          {
            id: 'evidence-hidden-sketches',
            name: '隐藏的素描',
            description: '画室地板下藏着的一叠素描，每一幅都描绘着同样的几何图案，但从不同角度。将所有素描叠在一起时，图案呈现出一个清晰的门形轮廓。',
            type: 'document',
            sanityEffect: -12,
            discovered: false,
            location: { x: 55, y: 75 },
            size: { width: 15, height: 12 },
            baseHitRate: 40,
            toolBoost: ['tool-magnifier-pro'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'clue_analyzed',
              requiredClueId: 'clue-geometry'
            },
            hiddenClues: ['clue-gate-shape'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 3, maxQuantity: 5, chance: 95 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 75 }
            ],
            processable: true,
            processRecipeId: 'recipe-document-restore'
          }
        ]
      },
      {
        id: 'scene-gallery',
        name: '噩梦画廊',
        description: '曾经展出过画家作品的画廊。所有观众都报告做了相同的噩梦，画廊因此关闭。空荡的展厅中，墙壁上似乎还残留着画作的影子。',
        background: 'shore',
        searched: false,
        evidence: [
          {
            id: 'evidence-viewer-records',
            name: '观众症状记录',
            description: '画廊保存的观众反馈表，几乎所有人都描述了相同的噩梦：站在一个巨大的几何形状前，有声音邀请他们"走过去"。',
            type: 'document',
            sanityEffect: -5,
            discovered: false,
            location: { x: 25, y: 40 },
            size: { width: 15, height: 18 },
            baseHitRate: 75,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-shared-dream'],
            materialDrops: [
              { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 3, chance: 90 }
            ]
          },
          {
            id: 'evidence-wall-residue',
            name: '墙壁残留',
            description: '画作被取下后，墙面上留下了无法清除的几何图案痕迹，像是从画中渗透出来的。用紫外线照射时，这些痕迹会发出微弱的紫光。',
            type: 'trace',
            sanityEffect: -10,
            discovered: false,
            location: { x: 60, y: 30 },
            size: { width: 20, height: 25 },
            baseHitRate: 50,
            toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
            isSpecial: true,
            hiddenClues: ['clue-bleed-through'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 3, chance: 75 },
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 55 }
            ]
          },
          {
            id: 'evidence-curator-testimony',
            name: '馆长证词录音',
            description: '画廊馆长的录音证词，她声称在关闭画廊的最后一晚，看到画作中的几何形状在旋转，然后画框消失了，只剩下一个通往黑暗的开口...',
            type: 'testimony',
            sanityEffect: -15,
            discovered: false,
            location: { x: 45, y: 65 },
            size: { width: 12, height: 15 },
            baseHitRate: 60,
            toolBoost: ['tool-recorder'],
            hiddenClues: ['clue-gate-opening'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 2, chance: 65 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-ngplus-dream-catcher',
            name: '梦境捕获器',
            description: '【二周目特殊证据】一个藏在画廊天花板夹层中的装置，由未知金属和符文构成。分析后确认它是某种"门"的稳定器——有人在利用画作维持一个通往另一个维度的通道。',
            type: 'object',
            sanityEffect: -22,
            discovered: false,
            location: { x: 80, y: 15 },
            size: { width: 10, height: 12 },
            baseHitRate: 20,
            toolBoost: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
            isInitiallyHidden: true,
            isSpecial: true,
            isNgPlusOnly: true,
            hiddenClues: ['clue-gate-keeper'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 5, chance: 100 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 4, chance: 85 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 35 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-geometry',
        name: '不可能几何',
        description: '画作中的几何图案是不可能在三维空间中存在的形状，但它却能被画出来。这暗示着它描绘的是另一个维度的景象。',
        type: 'physical',
        source: '最后一幅画',
        connections: ['clue-gate-shape', 'clue-shared-dream'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-painter-madness',
        name: '画家疯狂',
        description: '画家的疯狂并非逐渐发生的，而是在完成画作某个部分后突然降临。仿佛他在画中看到了什么不可承受的东西。',
        type: 'documentary',
        source: '画家日记',
        connections: ['clue-geometry', 'clue-otherworldly-material'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-otherworldly-material',
        name: '异界物质',
        description: '异常颜料中的矿物质不属于地球，它们似乎是从另一个维度"渗透"到我们世界的物质。',
        type: 'physical',
        source: '异常颜料',
        connections: ['clue-geometry', 'clue-bleed-through'],
        importance: 4,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-chemical-analyzer'
      },
      {
        id: 'clue-gate-shape',
        name: '门的形状',
        description: '隐藏的素描揭示了几何图案的真实本质——它是一扇门的形状。画家不是在创作艺术，而是在描绘一个通道。',
        type: 'deduction',
        source: '隐藏的素描',
        connections: ['clue-geometry', 'clue-gate-opening'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-shared-dream',
        name: '共享噩梦',
        description: '所有观众经历相同的噩梦证明画作具有精神影响力，它在向所有观看者传递某种信息——邀请他们通过那扇门。',
        type: 'testimonial',
        source: '观众症状记录',
        connections: ['clue-geometry', 'clue-bleed-through'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-bleed-through',
        name: '维度渗透',
        description: '墙壁残留表明画作的力量已经渗透到了现实世界中，另一个维度的存在正在试图突破。',
        type: 'deduction',
        source: '墙壁残留',
        connections: ['clue-otherworldly-material', 'clue-gate-opening'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-uv-light'
      },
      {
        id: 'clue-gate-opening',
        name: '开启的门',
        description: '馆长证词和所有证据指向同一个结论：画作确实打开了一扇通往另一个维度的门，而画家在门的那一侧看到了什么，让他选择了自杀。',
        type: 'deduction',
        source: '馆长证词录音 + 门的形状',
        connections: ['clue-gate-shape', 'clue-bleed-through'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-gate-keeper',
        name: '守门人',
        description: '【二周目线索】梦境捕获器证明有人刻意维持着画作开启的通道。这不是意外——有人在利用画家的作品作为通往另一个维度的稳定入口。',
        type: 'deduction',
        source: '梦境捕获器',
        connections: ['clue-gate-opening', 'clue-bleed-through'],
        importance: 5,
        discovered: false,
        analyzed: false
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-gate',
      evidence: ['evidence-final-painting', 'evidence-painter-diary', 'evidence-paint-analysis'],
      sanityThreshold: 50,
      options: [
        {
          id: 'conclusion-coincidence',
          text: '这只是巧合和心理暗示',
          isCorrect: false,
          sanityCost: 0,
          feedback: '太多的巧合就不是巧合了...'
        },
        {
          id: 'conclusion-mass-hysteria',
          text: '画家的技巧引发了群体性歇斯底里',
          isCorrect: false,
          sanityCost: 5,
          feedback: '技巧无法解释那些物理证据...'
        },
        {
          id: 'conclusion-gate',
          text: '画作是通往另一个维度的门户',
          isCorrect: true,
          sanityCost: 20,
          feedback: '艺术有时能够打开通往未知的大门...',
          branch: 'standard'
        },
        {
          id: 'conclusion-gate-deep',
          text: '画家无意中用异界颜料绘制了维度之门，他的自杀是为了从门的那一侧永远关闭它',
          isCorrect: true,
          sanityCost: 30,
          feedback: '你触及了更深的真相。画家并非发疯自杀，他在门的那一侧看到了即将降临的灾难，于是用生命为代价从另一侧关闭了门。他的最后一幅画，是他对人类的牺牲。',
          requiredTools: ['tool-uv-light', 'tool-chemical-analyzer'],
          requiredEvidence: ['evidence-wall-residue', 'evidence-curator-testimony', 'evidence-hidden-sketches'],
          branch: 'deep-truth'
        },
        {
          id: 'conclusion-eternal-return',
          text: '有人在刻意维持着这扇门——这不是意外，而是某种跨越时间轮回的计划，画家只是棋子',
          isCorrect: true,
          sanityCost: 45,
          feedback: '你发现了轮回的真相。画作中的门不是偶然打开的，有人——或者说某个跨越时间的存在——一直在寻找合适的媒介来维持这个通道。画家是棋子，你也可能是。但这已经不是你第一次站在这里了，对吗？',
          requiredTools: ['tool-uv-light-advanced', 'tool-chemical-analyzer', 'tool-recorder'],
          requiredEvidence: ['evidence-ngplus-dream-catcher', 'evidence-wall-residue', 'evidence-curator-testimony'],
          branch: 'eternal-return',
          isNgPlusExclusive: true
        }
      ]
    }
  },
  {
    id: 'case-secret-final',
    title: '星辰裁决',
    description: '【隐藏案件】当所有真相被揭开，星辰裁决所的大门向你敞开。你将直面人类对抗超自然威胁的最后防线...以及他们守护的终极秘密。',
    difficulty: 'hard',
    status: 'locked',
    sanityCost: 50,
    recommendedSanity: 80,
    startingTools: ['tool-magnifier-pro', 'tool-fingerprint-kit', 'tool-uv-light-advanced', 'tool-recorder', 'tool-chemical-analyzer', 'tool-lockpick'],
    chapter: 4,
    prerequisites: ['case-003'],
    rewards: {
      tools: ['tool-magnifier-pro', 'tool-uv-light-advanced', 'tool-chemical-analyzer', 'tool-lockpick', 'tool-recorder'],
      unlocksCases: [],
      sanityBonus: 50,
      description: '解锁星辰裁决所的全部秘密，获得终极工具套装'
    },
    timeLimit: {
      totalSeconds: 2000,
      sceneSwitchCost: 15,
      searchAttemptCost: 8,
      failedSearchPenalty: 30,
      clueAnalysisCost: 15,
      specialEventBonus: 90
    },
    branchRewards: {
      'truth': {
        tools: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
        unlocksCases: [],
        sanityBonus: 30,
        description: '真相结局奖励'
      },
      'eternal': {
        tools: ['tool-chemical-analyzer', 'tool-lockpick'],
        unlocksCases: [],
        sanityBonus: 60,
        description: '永恒结局奖励：你做出了超越人类的选择'
      }
    },
    scenes: [
      {
        id: 'scene-chamber',
        name: '裁决所大厅',
        description: '星辰裁决所的中央大厅，穹顶上镶嵌着不断变幻的星图。大厅中央悬浮着一个缓慢旋转的几何体，与梦魇画作中的图案如出一辙。数十把空椅子围绕着它，仿佛刚刚还有人坐在这里。',
        background: 'lighthouse',
        searched: false,
        evidence: [
          {
            id: 'evidence-star-map',
            name: '星辰图录',
            description: '穹顶上星图的解读手册，记载着每个星座对应的"门"的位置。灯塔、图书馆、画廊...你调查过的每个案件都在图上被标注。',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 30, y: 20 },
            size: { width: 15, height: 18 },
            baseHitRate: 65,
            toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
            hiddenClues: ['clue-star-gates'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 4, chance: 90 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 2, chance: 50 }
            ],
            processable: true,
            processRecipeId: 'recipe-cipher-decode'
          },
          {
            id: 'evidence-oath-tablet',
            name: '誓约石板',
            description: '一块古老的石板，上面刻着裁决所成员的誓词："吾以星辰之名起誓，守护人间与深渊之间的每扇门，直至永恒。"石板底部有数十个签名，最后几个签名是扭曲的符文。',
            type: 'object',
            sanityEffect: -12,
            discovered: false,
            location: { x: 60, y: 50 },
            size: { width: 18, height: 22 },
            baseHitRate: 70,
            toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
            hiddenClues: ['clue-oath'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 5, chance: 95 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 25 }
            ]
          },
          {
            id: 'evidence-geo-device',
            name: '中央几何体',
            description: '悬浮在大厅中央的几何体，与梦魇画作中的图案完全一致。近距离观察时，你能看到几何体内部有微弱的光点在移动——像是另一个世界中的星辰。',
            type: 'object',
            sanityEffect: -20,
            discovered: false,
            location: { x: 50, y: 35 },
            size: { width: 15, height: 15 },
            baseHitRate: 45,
            toolBoost: ['tool-chemical-analyzer', 'tool-recorder'],
            isSpecial: true,
            hiddenClues: ['clue-nexus'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 4, chance: 80 },
              { materialId: 'mat-crystal-shard', minQuantity: 2, maxQuantity: 3, chance: 75 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-empty-chairs',
            name: '空椅档案',
            description: '每把椅子上刻着一位裁决所成员的名字和状态。大部分标注为"守望中"，少数标注为"已回归"。一把椅子上刻着你从未见过的名字，但当你触碰时，你感到一阵莫名的熟悉...',
            type: 'document',
            sanityEffect: -15,
            discovered: false,
            location: { x: 15, y: 65 },
            size: { width: 12, height: 15 },
            baseHitRate: 55,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
            isInitiallyHidden: true,
            isSpecial: true,
            hiddenClues: ['clue-watchers'],
            materialDrops: [
              { materialId: 'mat-cipher-text', minQuantity: 2, maxQuantity: 3, chance: 85 },
              { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 60 }
            ]
          }
        ]
      },
      {
        id: 'scene-vault',
        name: '誓约金库',
        description: '裁决所最深层的地方，存放着历代守望者留下的契约原本。金库的墙壁上刻满了密密麻麻的名字——每一个都是曾经守护过"门"的人。空气凝重，仿佛时间在这里停止了流动。',
        background: 'cottage',
        searched: false,
        evidence: [
          {
            id: 'evidence-original-covenant',
            name: '原始契约',
            description: '最古老的契约原本，用一种远超人类历史的文字书写。通过紫外线和化学分析，你解读出核心条款：每隔一个纪元，必须有人自愿守望，以维持人间与深渊之间的屏障。',
            type: 'document',
            sanityEffect: -25,
            discovered: false,
            location: { x: 40, y: 30 },
            size: { width: 18, height: 22 },
            baseHitRate: 35,
            toolBoost: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
            isSpecial: true,
            hiddenClues: ['clue-covenant-core'],
            materialDrops: [
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 6, chance: 100 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 4, chance: 80 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 50 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          },
          {
            id: 'evidence-watcher-remains',
            name: '守望者遗物',
            description: '历代守望者留下的个人物品，包括守望者的怀表、图书馆管理员的钢笔、画家的画笔...这些物品散发着微弱的光芒，仿佛它们的主人仍在某处守望。',
            type: 'object',
            sanityEffect: -18,
            discovered: false,
            location: { x: 70, y: 60 },
            size: { width: 15, height: 18 },
            baseHitRate: 50,
            toolBoost: ['tool-magnifier-pro', 'tool-fingerprint-kit'],
            hiddenClues: ['clue-watcher-chain'],
            materialDrops: [
              { materialId: 'metallic-fragment', minQuantity: 3, maxQuantity: 5, chance: 90 },
              { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 2, chance: 65 },
              { materialId: 'mat-mind-focus', minQuantity: 1, maxQuantity: 1, chance: 40 }
            ]
          },
          {
            id: 'evidence-time-loop-evidence',
            name: '时间循环记录',
            description: '一份详细的记录，记载着同样的案件在不同时间线上反复发生。每一次循环都有微小的变化，但结局总是相同的——直到这一次，循环出现了前所未有的偏差...',
            type: 'document',
            sanityEffect: -30,
            discovered: false,
            location: { x: 70, y: 70 },
            size: { width: 12, height: 15 },
            baseHitRate: 25,
            requiredTool: 'tool-lockpick',
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'clue_analyzed',
              requiredClueId: 'clue-covenant-core'
            },
            hiddenClues: ['clue-time-loop'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 3, maxQuantity: 5, chance: 90 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 2, chance: 45 },
              { materialId: 'mat-cipher-text', minQuantity: 2, maxQuantity: 3, chance: 80 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-star-gates',
        name: '星辰之门',
        description: '星辰图录揭示了一个惊人的事实：你调查的每个案件地点都是一个"门"的位置，而星辰裁决所的使命就是守护所有这些门。',
        type: 'documentary',
        source: '星辰图录',
        connections: ['clue-oath', 'clue-nexus'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-oath',
        name: '永恒誓言',
        description: '誓约石板上的誓言不只是形式——每个签名的成员都以某种方式与"门"绑定了。签名时，他们放弃了永远离开裁决所的可能。',
        type: 'documentary',
        source: '誓约石板',
        connections: ['clue-star-gates', 'clue-watchers'],
        importance: 4,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-uv-light'
      },
      {
        id: 'clue-nexus',
        name: '核心枢纽',
        description: '中央几何体是所有"门"的枢纽，它连接着每一扇你曾经调查过的门。裁决所通过它监控和维持所有门的封印。',
        type: 'deduction',
        source: '中央几何体',
        connections: ['clue-star-gates', 'clue-covenant-core'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-watchers',
        name: '守望者链条',
        description: '空椅档案揭示了一个令人不安的事实：裁决所的成员数量正在减少。标注"已回归"的椅子越来越多，而新的签名已经很久没有出现了。',
        type: 'deduction',
        source: '空椅档案',
        connections: ['clue-oath', 'clue-watcher-chain'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-covenant-core',
        name: '契约核心',
        description: '原始契约的核心是等价交换：人类以自由意志提供守望者，深渊以不再主动入侵作为交换。这个契约比人类文明更古老，而且正在走向终结。',
        type: 'deduction',
        source: '原始契约',
        connections: ['clue-nexus', 'clue-time-loop'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-chemical-analyzer'
      },
      {
        id: 'clue-watcher-chain',
        name: '守望者传承',
        description: '守望者遗物证明了一个代代相传的守望传统。灯塔守望者、图书管理员、画家...他们都是不同时代的守望者，以不同的形式守护着不同的门。',
        type: 'testimonial',
        source: '守望者遗物',
        connections: ['clue-watchers', 'clue-oath'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-time-loop',
        name: '时间轮回',
        description: '时间循环记录揭示了一个超越一切的真相：这一切不是第一次发生。同样的案件、同样的守望者、同样的选择，已经重复了无数次。而你，在每一次循环中，都站在这个十字路口。',
        type: 'deduction',
        source: '时间循环记录',
        connections: ['clue-covenant-core', 'clue-nexus'],
        importance: 5,
        discovered: false,
        analyzed: false
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-eternal-vigil',
      evidence: ['evidence-star-map', 'evidence-oath-tablet', 'evidence-geo-device', 'evidence-original-covenant'],
      sanityThreshold: 60,
      options: [
        {
          id: 'conclusion-join',
          text: '加入星辰裁决所，成为人类的守护者',
          isCorrect: false,
          sanityCost: 25,
          feedback: '你选择了成为守护者，但这并非终点...',
          branch: 'truth'
        },
        {
          id: 'conclusion-expose',
          text: '将真相公之于众，让人类自己选择命运',
          isCorrect: false,
          sanityCost: 35,
          feedback: '真相有时比谎言更危险...',
          branch: 'truth'
        },
        {
          id: 'conclusion-eternal-vigil',
          text: '接受古老契约，成为超越时间的永恒守望者',
          isCorrect: true,
          sanityCost: 50,
          feedback: '你理解了裁决所存在的真正意义——不是对抗，而是守望。在时间之外，你将永远注视着人类的命运...',
          requiredTools: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
          branch: 'eternal'
        }
      ]
    }
  },
  {
    id: 'case-secret-origins',
    title: '起源回响',
    description: '【三周目隐藏案件】时间循环的裂隙中，你看到了一切的起点。第一个调查员，第一宗超自然案件，以及那场改变了人类命运的古老契约...',
    difficulty: 'hard',
    status: 'locked',
    sanityCost: 60,
    recommendedSanity: 100,
    startingTools: ['tool-magnifier-pro', 'tool-fingerprint-kit', 'tool-uv-light-advanced', 'tool-recorder', 'tool-chemical-analyzer', 'tool-lockpick'],
    chapter: 0,
    prerequisites: ['case-001'],
    rewards: {
      tools: [],
      unlocksCases: [],
      sanityBonus: 100,
      description: '起源之谜的终极奖励'
    },
    timeLimit: {
      totalSeconds: 2500,
      sceneSwitchCost: 18,
      searchAttemptCost: 10,
      failedSearchPenalty: 35,
      clueAnalysisCost: 18,
      specialEventBonus: 120
    },
    branchRewards: {
      'deep-truth': {
        tools: ['tool-uv-light-advanced', 'tool-chemical-analyzer'],
        unlocksCases: [],
        sanityBonus: 80,
        description: '起源真相结局：你继承了最古老的意志'
      }
    },
    scenes: [
      {
        id: 'scene-time-rift',
        name: '时间裂隙',
        description: '在现实的裂缝中，过去与未来交织在一起。你看到了灯塔建成的那一天，图书馆奠基的那一刻，画布上第一笔落下的那一瞬。所有时间线在此汇聚。',
        background: 'shore',
        searched: false,
        evidence: [
          {
            id: 'evidence-first-investigator',
            name: '第一位调查员的徽章',
            description: '一枚古老的徽章，上面的星辰图案与裁决所的标志一脉相承。徽章背面刻着一个名字和一个日期——比人类已知最早的文明还要古老。',
            type: 'object',
            sanityEffect: -15,
            discovered: false,
            location: { x: 35, y: 40 },
            size: { width: 12, height: 15 },
            baseHitRate: 55,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
            hiddenClues: ['clue-first-one'],
            materialDrops: [
              { materialId: 'metallic-fragment', minQuantity: 3, maxQuantity: 5, chance: 95 },
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 3, chance: 80 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 1, chance: 30 }
            ]
          },
          {
            id: 'evidence-timeline-fragment',
            name: '时间碎片',
            description: '一片悬浮在空中的水晶碎片，内部封存着一段过去的影像：一个人站在海边，面对从深海中升起的巨大存在，伸出了手。那一刻，第一份契约诞生了。',
            type: 'trace',
            sanityEffect: -20,
            discovered: false,
            location: { x: 65, y: 30 },
            size: { width: 15, height: 18 },
            baseHitRate: 45,
            toolBoost: ['tool-chemical-analyzer', 'tool-recorder'],
            isSpecial: true,
            hiddenClues: ['clue-first-covenant'],
            materialDrops: [
              { materialId: 'mat-crystal-shard', minQuantity: 3, maxQuantity: 5, chance: 100 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 3, chance: 70 },
              { materialId: 'mat-mind-focus', minQuantity: 1, maxQuantity: 1, chance: 35 }
            ],
            processable: true,
            processRecipeId: 'recipe-special-analysis'
          },
          {
            id: 'evidence-loop-memory',
            name: '轮回记忆',
            description: '散落在裂隙中的记忆碎片，每一片都承载着你在不同时间线上的经历。你看到了自己无数次站在同样的十字路口，做出同样的选择...或不同的选择。',
            type: 'document',
            sanityEffect: -25,
            discovered: false,
            location: { x: 20, y: 70 },
            size: { width: 18, height: 15 },
            baseHitRate: 35,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
            isInitiallyHidden: true,
            isSpecial: true,
            hiddenClues: ['clue-past-selves'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 3, maxQuantity: 5, chance: 90 },
              { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 4, chance: 75 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 2, chance: 40 }
            ]
          }
        ]
      },
      {
        id: 'scene-origin',
        name: '契约原点',
        description: '时间裂隙的最深处，一切的起点。这里没有上下左右，只有一片无边的虚空和你面前那扇最初的"门"。门的一侧是人间，另一侧是深渊。而你，是第一个站在门前的人...也是第无数次。',
        background: 'lighthouse',
        searched: false,
        evidence: [
          {
            id: 'evidence-abyss-voice',
            name: '深渊之声',
            description: '门另一侧传来的声音，不是威胁，不是引诱，而是一个简单的提议："与我立约，我将不再主动踏入你的世界。作为交换，你必须在每一个时代都留下守望者。"这声音在所有语言中同时响起。',
            type: 'testimony',
            sanityEffect: -30,
            discovered: false,
            location: { x: 50, y: 40 },
            size: { width: 20, height: 25 },
            baseHitRate: 40,
            toolBoost: ['tool-recorder', 'tool-chemical-analyzer'],
            isSpecial: true,
            hiddenClues: ['clue-abyss-offer'],
            materialDrops: [
              { materialId: 'mat-abyssal-essence', minQuantity: 3, maxQuantity: 6, chance: 95 },
              { materialId: 'mat-ancient-rune', minQuantity: 3, maxQuantity: 5, chance: 85 },
              { materialId: 'mat-elder-sign', minQuantity: 2, maxQuantity: 3, chance: 50 }
            ],
            processable: true,
            processRecipeId: 'recipe-elder-sign-craft'
          },
          {
            id: 'evidence-first-choice',
            name: '最初的选择',
            description: '门前有一个石台，上面放着两样东西：一把钥匙和一把锁。钥匙代表打开门让两个世界融合，锁代表永远封印。石台上的铭文写着："你并非第一个做出选择的人，但你可以成为最后一个。"',
            type: 'object',
            sanityEffect: -35,
            discovered: false,
            location: { x: 50, y: 70 },
            size: { width: 15, height: 18 },
            baseHitRate: 30,
            requiredTool: 'tool-lockpick',
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'clue_analyzed',
              requiredClueId: 'clue-abyss-offer'
            },
            hiddenClues: ['clue-final-choice'],
            materialDrops: [
              { materialId: 'metallic-fragment', minQuantity: 4, maxQuantity: 6, chance: 100 },
              { materialId: 'mat-elder-sign', minQuantity: 1, maxQuantity: 2, chance: 60 },
              { materialId: 'mat-abyssal-essence', minQuantity: 2, maxQuantity: 4, chance: 75 }
            ]
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-first-one',
        name: '最初之人',
        description: '第一位调查员的徽章证实了传说的真实性——在人类文明诞生之前，就已经有人站在了深渊面前，并做出了选择。那个人，就是第一个守望者。',
        type: 'documentary',
        source: '第一位调查员的徽章',
        connections: ['clue-first-covenant', 'clue-past-selves'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-first-covenant',
        name: '第一份契约',
        description: '时间碎片中的影像揭示了契约的起源：不是人类主动发起的，而是深渊提出的。深渊选择了自我约束，条件是人类必须永远提供守望者。',
        type: 'testimonial',
        source: '时间碎片',
        connections: ['clue-first-one', 'clue-abyss-offer'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-past-selves',
        name: '过去的自己',
        description: '轮回记忆揭示了一个残酷的事实：你可能就是第一位调查员的转世。每一次循环，你都重新站在门前，重新做出选择。而每一次，你都选择了守望。',
        type: 'deduction',
        source: '轮回记忆',
        connections: ['clue-first-one', 'clue-final-choice'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-abyss-offer',
        name: '深渊的提议',
        description: '深渊之声并非威胁——它是一个疲惫的提议。深渊也不想无止境地入侵人间，它需要的是秩序和平衡。契约对双方都是一种约束。',
        type: 'testimonial',
        source: '深渊之声',
        connections: ['clue-first-covenant', 'clue-final-choice'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-recorder'
      },
      {
        id: 'clue-final-choice',
        name: '最终选择',
        description: '钥匙和锁代表了两个根本性的选择：让两个世界融合（终结守望的循环），或永远维持封印（让循环继续）。但也许还有第三种选择...',
        type: 'deduction',
        source: '最初的选择',
        connections: ['clue-past-selves', 'clue-abyss-offer'],
        importance: 5,
        discovered: false,
        analyzed: false
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-original-covenant',
      evidence: ['evidence-first-investigator', 'evidence-timeline-fragment', 'evidence-abyss-voice'],
      sanityThreshold: 70,
      options: [
        {
          id: 'conclusion-break-cycle',
          text: '打破时间循环，让一切重新开始',
          isCorrect: false,
          sanityCost: 40,
          feedback: '循环已被打破...但新的故事将如何展开？'
        },
        {
          id: 'conclusion-original-covenant',
          text: '继承第一位调查员的意志，延续永恒的契约',
          isCorrect: true,
          sanityCost: 70,
          feedback: '你终于理解了一切的起源。那个古老的契约不是诅咒，而是一份沉重的责任。而你，选择了承担。',
          branch: 'deep-truth'
        }
      ]
    }
  }
])

export function getCaseById(id: string): Case | undefined {
  return cases.find(c => c.id === id)
}

export function unlockNextCase(currentCaseId: string): void {
  const currentIndex = cases.findIndex(c => c.id === currentCaseId)
  if (currentIndex >= 0 && currentIndex < cases.length - 1) {
    cases[currentIndex + 1].status = 'available'
  }
}

export function getEvidenceById(caseId: string, evidenceId: string) {
  const caseData = getCaseById(caseId)
  if (!caseData) return undefined
  
  for (const scene of caseData.scenes) {
    const evidence = scene.evidence.find(e => e.id === evidenceId)
    if (evidence) return evidence
  }
  return undefined
}

export function completeCase(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false
  
  caseData.status = 'completed'
  return true
}

export function setCaseStatus(caseId: string, status: Case['status']): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false
  
  caseData.status = status
  return true
}

export function resetCaseForReplay(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false

  caseData.scenes.forEach(scene => {
    scene.searched = false
    scene.evidence.forEach(e => {
      e.discovered = false
    })
  })

  caseData.clues.forEach(clue => {
    clue.discovered = false
    clue.analyzed = false
  })

  caseData.status = 'reopened'
  return true
}

export function failCase(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false

  caseData.status = 'failed'
  return true
}

export function abandonCase(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false

  caseData.status = 'abandoned'
  return true
}

export function reopenCase(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false

  caseData.scenes.forEach(scene => {
    scene.searched = false
    scene.evidence.forEach(e => {
      e.discovered = false
    })
  })

  caseData.clues.forEach(clue => {
    clue.discovered = false
    clue.analyzed = false
  })

  caseData.status = 'reopened'
  return true
}
