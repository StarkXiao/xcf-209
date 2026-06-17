import type { Material, Recipe, MaterialType } from '@/types'

export const materials: Material[] = [
  {
    id: 'mat-organic-residue',
    name: '有机残留物',
    description: '从证据表面提取的可疑有机物质，可能含有重要线索。',
    icon: '🧬',
    type: 'organic',
    rarity: 'common',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeValue: 2
  },
  {
    id: 'mat-mysterious-liquid',
    name: '神秘液体',
    description: '散发着诡异荧光的不明液体，化学成分尚不清楚。',
    icon: '🧪',
    type: 'organic',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 50,
    sanityEffect: -2,
    usable: false,
    tradeValue: 8
  },
  {
    id: 'metallic-fragment',
    name: '金属碎片',
    description: '某种合金的碎片，比普通金属坚硬得多。',
    icon: '🔩',
    type: 'inorganic',
    rarity: 'common',
    stackable: true,
    maxStack: 99,
    usable: false,
    tradeValue: 3
  },
  {
    id: 'mat-crystal-shard',
    name: '水晶碎片',
    description: '散发着微弱紫光的水晶碎片，触摸时会感到轻微眩晕。',
    icon: '💎',
    type: 'inorganic',
    rarity: 'rare',
    stackable: true,
    maxStack: 30,
    sanityEffect: -3,
    usable: false,
    tradeValue: 25
  },
  {
    id: 'mat-ancient-rune',
    name: '古老符文',
    description: '刻有未知文字的石片，似乎蕴含着某种古老的力量。',
    icon: '🔮',
    type: 'arcane',
    rarity: 'rare',
    stackable: true,
    maxStack: 20,
    sanityEffect: -5,
    usable: false,
    tradeValue: 35
  },
  {
    id: 'mat-abyssal-essence',
    name: '深渊精粹',
    description: '从异常区域提取的纯粹能量精华，极其稀有且危险。',
    icon: '🌀',
    type: 'arcane',
    rarity: 'legendary',
    stackable: true,
    maxStack: 10,
    sanityEffect: -10,
    usable: false,
    tradeValue: 100
  },
  {
    id: 'mat-torn-page',
    name: '残破书页',
    description: '从某本古籍上撕下的页面，记载着被遗忘的知识。',
    icon: '📜',
    type: 'document',
    rarity: 'common',
    stackable: true,
    maxStack: 50,
    usable: false,
    tradeValue: 5
  },
  {
    id: 'mat-cipher-text',
    name: '密文手稿',
    description: '用未知密码写成的手稿，需要特殊方法才能解读。',
    icon: '🔐',
    type: 'document',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeValue: 15
  },
  {
    id: 'mat-lens-component',
    name: '光学组件',
    description: '精密的透镜和棱镜组合，可用于制造高级观察工具。',
    icon: '🔭',
    type: 'tool_part',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeValue: 18
  },
  {
    id: 'mat-circuit-board',
    name: '电路板模块',
    description: '精密电子元件，用于制造和修复电子分析设备。',
    icon: '💾',
    type: 'tool_part',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 20,
    usable: false,
    tradeValue: 20
  },
  {
    id: 'mat-reagent-powder',
    name: '显影试剂',
    description: '特殊化学粉末，与特定物质反应后会显现隐藏痕迹。',
    icon: '✨',
    type: 'tool_part',
    rarity: 'rare',
    stackable: true,
    maxStack: 30,
    usable: false,
    tradeValue: 22
  },
  {
    id: 'mat-elder-sign',
    name: '旧印印记',
    description: '传说中能够抵御虚空存在的神秘印记，蕴含古老的保护之力。',
    icon: '🛡️',
    type: 'rare',
    rarity: 'legendary',
    stackable: true,
    maxStack: 5,
    sanityEffect: 5,
    usable: true,
    usableEffect: {
      type: 'sanity_restore',
      value: 30
    },
    tradeValue: 150
  },
  {
    id: 'mat-medicinal-herb',
    name: '安神草药',
    description: '具有镇定效果的稀有草药，能够平复紧张的神经。',
    icon: '🌿',
    type: 'organic',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 30,
    usable: true,
    usableEffect: {
      type: 'sanity_restore',
      value: 15
    },
    tradeValue: 12
  },
  {
    id: 'mat-mind-focus',
    name: '专注药剂',
    description: '能够提升专注力的特殊药剂，暂时提高证据发现率。',
    icon: '💊',
    type: 'organic',
    rarity: 'rare',
    stackable: true,
    maxStack: 15,
    usable: true,
    usableEffect: {
      type: 'hit_rate_boost',
      value: 20,
      duration: 120
    },
    tradeValue: 40
  },
  {
    id: 'mat-reveal-chalk',
    name: '显形粉笔',
    description: '用特殊材料制成的粉笔，能够显现被隐藏的事物。',
    icon: '🖍️',
    type: 'tool_part',
    rarity: 'rare',
    stackable: true,
    maxStack: 10,
    usable: true,
    usableEffect: {
      type: 'reveal_hidden',
      value: 1
    },
    tradeValue: 45
  },
  {
    id: 'mat-repair-kit',
    name: '工具维修包',
    description: '包含各种维修工具和材料的综合包。',
    icon: '🧰',
    type: 'tool_part',
    rarity: 'uncommon',
    stackable: true,
    maxStack: 10,
    usable: true,
    usableEffect: {
      type: 'tool_repair',
      value: 50
    },
    tradeValue: 30
  }
]

export const materialCategories: Record<MaterialType, { name: string; color: string }> = {
  organic: { name: '有机材料', color: '#4caf50' },
  inorganic: { name: '无机材料', color: '#607d8b' },
  arcane: { name: '奥术材料', color: '#9c27b0' },
  document: { name: '文档碎片', color: '#795548' },
  tool_part: { name: '工具组件', color: '#2196f3' },
  rare: { name: '稀有物品', color: '#ff9800' }
}

export function getMaterialById(id: string): Material | undefined {
  return materials.find(m => m.id === id)
}

export function getMaterialsByType(type: MaterialType): Material[] {
  return materials.filter(m => m.type === type)
}

export const rarityColors: Record<Material['rarity'], string> = {
  common: '#9e9e9e',
  uncommon: '#4caf50',
  rare: '#2196f3',
  legendary: '#ff9800'
}

export const recipes: Recipe[] = [
  {
    id: 'recipe-basic-evidence-analysis',
    name: '基础证据分析',
    description: '对普通证据进行化学分析，提取隐藏信息。',
    type: 'process',
    icon: '🔬',
    inputs: [
      { materialId: 'mat-organic-residue', quantity: 3, consumed: true },
      { materialId: 'mat-reagent-powder', quantity: 1, consumed: true }
    ],
    outputs: [
      { type: 'clue', quantity: 1 },
      { type: 'sanity', quantity: -5 }
    ],
    requiredTool: 'tool-chemical-analyzer',
    sanityCost: 5,
    timeCost: 15,
    successRate: 85,
    category: '证据加工',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredCount: 3
    }
  },
  {
    id: 'recipe-advanced-evidence-process',
    name: '高级证据处理',
    description: '使用奥术材料对特殊证据进行深度加工。',
    type: 'process',
    icon: '⚗️',
    inputs: [
      { materialId: 'mat-ancient-rune', quantity: 2, consumed: true },
      { materialId: 'mat-mysterious-liquid', quantity: 2, consumed: true },
      { materialId: 'mat-crystal-shard', quantity: 1, consumed: true }
    ],
    outputs: [
      { type: 'clue', quantity: 2 },
      { type: 'material', id: 'mat-abyssal-essence', quantity: 1 }
    ],
    requiredTool: 'tool-chemical-analyzer',
    requiredClues: ['clue-deep-one'],
    sanityCost: 15,
    timeCost: 30,
    successRate: 65,
    isSpecial: true,
    category: '证据加工',
    unlockCondition: {
      type: 'clue_discovered',
      requiredId: 'clue-deep-one'
    }
  },
  {
    id: 'recipe-lens-craft',
    name: '制作高级透镜',
    description: '将水晶碎片加工成精密透镜。',
    type: 'craft',
    icon: '🔭',
    inputs: [
      { materialId: 'mat-crystal-shard', quantity: 3, consumed: true },
      { materialId: 'metallic-fragment', quantity: 5, consumed: true },
      { materialId: 'mat-lens-component', quantity: 2, consumed: true }
    ],
    outputs: [
      { type: 'tool', id: 'tool-magnifier-pro', quantity: 1 }
    ],
    requiredTool: 'tool-magnifier-basic',
    sanityCost: 3,
    timeCost: 20,
    successRate: 75,
    category: '工具制造',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredCount: 5
    }
  },
  {
    id: 'recipe-reagent-synthesis',
    name: '合成显影试剂',
    description: '通过有机和无机材料合成特殊显影试剂。',
    type: 'craft',
    icon: '✨',
    inputs: [
      { materialId: 'mat-organic-residue', quantity: 5, consumed: true },
      { materialId: 'mat-mysterious-liquid', quantity: 2, consumed: true },
      { materialId: 'metallic-fragment', quantity: 3, consumed: true }
    ],
    outputs: [
      { type: 'material', id: 'mat-reagent-powder', quantity: 2 }
    ],
    sanityCost: 5,
    timeCost: 12,
    successRate: 90,
    category: '材料合成',
    unlockCondition: {
      type: 'tool_owned',
      requiredId: 'tool-uv-light'
    }
  },
  {
    id: 'recipe-sanity-restore',
    name: '熬制安神药剂',
    description: '用草药熬制恢复理智的药剂。',
    type: 'craft',
    icon: '🌿',
    inputs: [
      { materialId: 'mat-medicinal-herb', quantity: 2, consumed: true },
      { materialId: 'mat-mysterious-liquid', quantity: 1, consumed: true }
    ],
    outputs: [
      { type: 'sanity', quantity: 25 }
    ],
    sanityCost: 0,
    timeCost: 8,
    successRate: 95,
    category: '恢复用品',
    unlockCondition: {
      type: 'clue_discovered',
      requiredCount: 2
    }
  },
  {
    id: 'recipe-cipher-decode',
    name: '破译密文',
    description: '使用特殊方法破译加密文档。',
    type: 'analyze',
    icon: '📖',
    inputs: [
      { materialId: 'mat-cipher-text', quantity: 1, consumed: true },
      { materialId: 'mat-torn-page', quantity: 3, consumed: false }
    ],
    outputs: [
      { type: 'clue', quantity: 1 },
      { type: 'time_bonus', quantity: 30 }
    ],
    requiredClues: ['clue-organization'],
    sanityCost: 8,
    timeCost: 25,
    successRate: 70,
    category: '文档分析',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredId: 'evidence-letter'
    }
  },
  {
    id: 'recipe-special-analysis',
    name: '特殊深度分析',
    description: '启用特殊分析入口，对异常证据进行超深度分析。可能触发未知发现。',
    type: 'analyze',
    icon: '👁️',
    inputs: [
      { materialId: 'mat-abyssal-essence', quantity: 1, consumed: true },
      { materialId: 'mat-ancient-rune', quantity: 3, consumed: true },
      { materialId: 'mat-crystal-shard', quantity: 2, consumed: true }
    ],
    outputs: [
      { type: 'branch_unlock', quantity: 1 },
      { type: 'clue', quantity: 3 },
      { type: 'sanity', quantity: -20 }
    ],
    requiredTool: 'tool-uv-light-advanced',
    requiredEvidence: ['evidence-hidden-mark'],
    sanityCost: 20,
    timeCost: 60,
    successRate: 50,
    isSpecial: true,
    category: '特殊分析',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredId: 'evidence-hidden-mark'
    }
  },
  {
    id: 'recipe-uv-upgrade',
    name: '升级紫外线设备',
    description: '用特殊水晶升级紫外线探测仪的性能。',
    type: 'upgrade',
    icon: '💡',
    inputs: [
      { materialId: 'mat-crystal-shard', quantity: 5, consumed: true },
      { materialId: 'mat-circuit-board', quantity: 2, consumed: true },
      { materialId: 'mat-lens-component', quantity: 3, consumed: true }
    ],
    outputs: [
      { type: 'tool', id: 'tool-uv-light-advanced', quantity: 1 }
    ],
    requiredTool: 'tool-uv-light',
    sanityCost: 5,
    timeCost: 35,
    successRate: 70,
    category: '工具升级',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredCount: 8
    }
  },
  {
    id: 'recipe-elder-sign-craft',
    name: '制作旧印护符',
    description: '将古老符文与深渊精粹结合，制作传说中的防护护符。',
    type: 'craft',
    icon: '🛡️',
    inputs: [
      { materialId: 'mat-elder-sign', quantity: 1, consumed: true },
      { materialId: 'mat-abyssal-essence', quantity: 2, consumed: true },
      { materialId: 'metallic-fragment', quantity: 10, consumed: true }
    ],
    outputs: [
      { type: 'sanity', quantity: 50 }
    ],
    sanityCost: 30,
    timeCost: 90,
    successRate: 40,
    isSpecial: true,
    category: '特殊合成',
    unlockCondition: {
      type: 'chapter_completed',
      requiredId: '1'
    }
  },
  {
    id: 'recipe-document-restore',
    name: '修复残破文档',
    description: '使用特殊技术修复并复原受损的文档碎片。',
    type: 'process',
    icon: '📄',
    inputs: [
      { materialId: 'mat-torn-page', quantity: 5, consumed: true },
      { materialId: 'mat-organic-residue', quantity: 2, consumed: true }
    ],
    outputs: [
      { type: 'clue', quantity: 1 },
      { type: 'material', id: 'mat-cipher-text', quantity: 1 }
    ],
    requiredTool: 'tool-magnifier-basic',
    sanityCost: 3,
    timeCost: 10,
    successRate: 80,
    category: '文档分析',
    unlockCondition: {
      type: 'evidence_discovered',
      requiredId: 'evidence-diary'
    }
  }
]

export function getRecipeById(id: string): Recipe | undefined {
  return recipes.find(r => r.id === id)
}

export function getRecipesByCategory(category: string): Recipe[] {
  return recipes.filter(r => r.category === category)
}

export function getRecipesByType(type: Recipe['type']): Recipe[] {
  return recipes.filter(r => r.type === type)
}

export const recipeCategories = [
  '证据加工',
  '材料合成',
  '工具制造',
  '工具升级',
  '文档分析',
  '恢复用品',
  '特殊分析',
  '特殊合成'
]
