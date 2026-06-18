import type { CaseTemplatePreset, EvidenceDefinition, ClueDefinition, TimeLimitConfig } from '@/types'
import { createEvidence, createClue } from './caseRegistry'
import { caseRegistry } from './cases'

const DEFAULT_TIME_LIMIT: TimeLimitConfig = {
  totalSeconds: 900,
  sceneSwitchCost: 10,
  searchAttemptCost: 5,
  failedSearchPenalty: 15,
  clueAnalysisCost: 8,
  specialEventBonus: 30
}

const NORMAL_TIME_LIMIT: TimeLimitConfig = {
  totalSeconds: 1200,
  sceneSwitchCost: 12,
  searchAttemptCost: 6,
  failedSearchPenalty: 20,
  clueAnalysisCost: 10,
  specialEventBonus: 45
}

const HARD_TIME_LIMIT: TimeLimitConfig = {
  totalSeconds: 1500,
  sceneSwitchCost: 15,
  searchAttemptCost: 8,
  failedSearchPenalty: 25,
  clueAnalysisCost: 12,
  specialEventBonus: 60
}

const STANDARD_EVIDENCE_TEMPLATES: Record<string, EvidenceDefinition> = {
  torn_diary: createEvidence(
    'tpl-evidence-torn-diary',
    '残破的日记',
    '一本残破的日记本，部分页面被撕毁，剩余的页面记录了主人最后的日子。',
    {
      type: 'document',
      sanityEffect: -5,
      baseHitRate: 75,
      toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
      hiddenClues: ['tpl-clue-owner-identity'],
      materialDrops: [
        { materialId: 'mat-torn-page', minQuantity: 2, maxQuantity: 4, chance: 100 }
      ],
      processable: true,
      processRecipeId: 'recipe-document-restore'
    }
  ),

  strange_rune: createEvidence(
    'tpl-evidence-strange-rune',
    '奇怪的符文',
    '墙上或物体上刻着的诡异符文，触摸时感到刺骨寒意，似乎在微微发光。',
    {
      type: 'trace',
      sanityEffect: -8,
      baseHitRate: 60,
      toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
      materialDrops: [
        { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 70 },
        { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 30 }
      ],
      processable: true,
      processRecipeId: 'recipe-advanced-evidence-process'
    }
  ),

  broken_object: createEvidence(
    'tpl-evidence-broken-object',
    '破碎的物品',
    '一件被摔碎的物品，碎片上残留着可疑的痕迹。',
    {
      type: 'object',
      sanityEffect: -3,
      baseHitRate: 70,
      toolBoost: ['tool-fingerprint-kit', 'tool-chemical-analyzer'],
      materialDrops: [
        { materialId: 'metallic-fragment', minQuantity: 2, maxQuantity: 4, chance: 90 },
        { materialId: 'mat-lens-component', minQuantity: 1, maxQuantity: 2, chance: 50 }
      ]
    }
  ),

  mysterious_letter: createEvidence(
    'tpl-evidence-mysterious-letter',
    '神秘信件',
    '一封来源不明的信件，信纸有淡淡的磷光。',
    {
      type: 'document',
      sanityEffect: -4,
      baseHitRate: 70,
      toolBoost: ['tool-magnifier-basic'],
      hiddenClues: ['tpl-clue-organization-link'],
      materialDrops: [
        { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 3, chance: 90 },
        { materialId: 'mat-cipher-text', minQuantity: 1, maxQuantity: 1, chance: 40 }
      ]
    }
  ),

  blurry_photo: createEvidence(
    'tpl-evidence-blurry-photo',
    '模糊的照片',
    '一张拍摄于暗处的照片，中央有一个模糊的轮廓，细节难以辨认。',
    {
      type: 'document',
      sanityEffect: -10,
      baseHitRate: 65,
      toolBoost: ['tool-magnifier-pro'],
      hiddenClues: ['tpl-clue-entity-presence'],
      materialDrops: [
        { materialId: 'mat-torn-page', minQuantity: 1, maxQuantity: 2, chance: 70 },
        { materialId: 'mat-crystal-shard', minQuantity: 1, maxQuantity: 1, chance: 35 }
      ]
    }
  ),

  hidden_mark: createEvidence(
    'tpl-evidence-hidden-mark',
    '隐藏的印记',
    '在某处发现的隐藏印记，在紫外线下发出诡异荧光，形状似乎不太对。',
    {
      type: 'trace',
      sanityEffect: -12,
      baseHitRate: 30,
      requiredTool: 'tool-uv-light',
      isSpecial: true,
      hiddenClues: ['tpl-clue-nonhuman-presence'],
      materialDrops: [
        { materialId: 'mat-ancient-rune', minQuantity: 2, maxQuantity: 3, chance: 80 },
        { materialId: 'mat-abyssal-essence', minQuantity: 1, maxQuantity: 1, chance: 40 },
        { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 2, chance: 60 }
      ],
      processable: true,
      processRecipeId: 'recipe-special-analysis'
    }
  ),

  old_amulet: createEvidence(
    'tpl-evidence-old-amulet',
    '古老护符',
    '一个用未知金属制成的护符，表面刻着诡异的图案。握在手中时会感到眩晕。',
    {
      type: 'object',
      sanityEffect: -6,
      baseHitRate: 55,
      toolBoost: ['tool-chemical-analyzer'],
      materialDrops: [
        { materialId: 'mat-ancient-rune', minQuantity: 1, maxQuantity: 2, chance: 60 },
        { materialId: 'metallic-fragment', minQuantity: 3, maxQuantity: 6, chance: 85 }
      ]
    }
  ),

  strange_footprints: createEvidence(
    'tpl-evidence-strange-footprints',
    '奇怪的脚印',
    '一串形状不太正常的脚印，不像是普通人类留下的。',
    {
      type: 'trace',
      sanityEffect: -7,
      baseHitRate: 65,
      toolBoost: ['tool-fingerprint-kit'],
      hiddenClues: ['tpl-clue-creature-exists'],
      materialDrops: [
        { materialId: 'mat-organic-residue', minQuantity: 1, maxQuantity: 3, chance: 80 },
        { materialId: 'mat-reagent-powder', minQuantity: 1, maxQuantity: 1, chance: 40 }
      ]
    }
  )
}

const STANDARD_CLUE_TEMPLATES: Record<string, ClueDefinition> = {
  owner_identity: createClue(
    'tpl-clue-owner-identity',
    '物品所有者身份',
    '从物品的细节推断出其所有者的身份信息。',
    '物品分析 + 文字解读',
    {
      type: 'documentary',
      importance: 3,
      connections: ['tpl-clue-owner-motivation']
    }
  ),

  owner_motivation: createClue(
    'tpl-clue-owner-motivation',
    '所有者动机',
    '分析所有者的行为动机，推测其可能的目的。',
    '身份确认 + 背景调查',
    {
      type: 'deduction',
      importance: 4,
      connections: ['tpl-clue-owner-identity']
    }
  ),

  organization_link: createClue(
    'tpl-clue-organization-link',
    '神秘组织关联',
    '证据指向某个神秘组织，他们可能与案件有关。',
    '信件内容分析',
    {
      type: 'testimonial',
      importance: 3,
      connections: ['tpl-clue-deeper-conspiracy']
    }
  ),

  deeper_conspiracy: createClue(
    'tpl-clue-deeper-conspiracy',
    '深层阴谋',
    '所有的线索都指向一个更大的阴谋，案件只是冰山一角。',
    '组织线索 + 多方证据',
    {
      type: 'deduction',
      importance: 5,
      connections: ['tpl-clue-organization-link']
    }
  ),

  entity_presence: createClue(
    'tpl-clue-entity-presence',
    '异常存在',
    '照片中的轮廓和其他证据表明，现场存在着某种无法解释的存在。',
    '模糊照片 + 物理痕迹',
    {
      type: 'deduction',
      importance: 5,
      connections: ['tpl-clue-nonhuman-presence', 'tpl-clue-creature-exists']
    }
  ),

  nonhuman_presence: createClue(
    'tpl-clue-nonhuman-presence',
    '非人痕迹',
    '物理证据显示出非人类的特征，这证实了某种非人存在的可能性。',
    '隐藏印记分析',
    {
      type: 'physical',
      importance: 5,
      connections: ['tpl-clue-creature-exists', 'tpl-clue-entity-presence'],
      requiredToolForAnalysis: 'tool-uv-light'
    }
  ),

  creature_exists: createClue(
    'tpl-clue-creature-exists',
    '生物存在',
    '物理痕迹表明存在某种未知生物，它可能与案件有关。',
    '脚印 + 有机残留物分析',
    {
      type: 'physical',
      importance: 4,
      connections: ['tpl-clue-entity-presence', 'tpl-clue-nonhuman-presence']
    }
  )
}

export const CASE_TEMPLATE_PRESETS: CaseTemplatePreset[] = [
  {
    id: 'tpl-preset-easy-document',
    name: '简易文档调查模板',
    description: '适合创建以文档证据为主的入门案件，包含标准证据模板和入门级难度。',
    baseEvidence: [
      { ...STANDARD_EVIDENCE_TEMPLATES.torn_diary, id: 'tpl-evidence-torn-diary' },
      { ...STANDARD_EVIDENCE_TEMPLATES.mysterious_letter, id: 'tpl-evidence-mysterious-letter' }
    ],
    baseClues: [
      { ...STANDARD_CLUE_TEMPLATES.owner_identity, id: 'tpl-clue-owner-identity' },
      { ...STANDARD_CLUE_TEMPLATES.organization_link, id: 'tpl-clue-organization-link' }
    ],
    defaultTimeLimit: { ...DEFAULT_TIME_LIMIT },
    defaultSanityCost: 15,
    defaultRecommendedSanity: 80
  },
  {
    id: 'tpl-preset-normal-supernatural',
    name: '超自然调查模板',
    description: '适合创建涉及超自然元素的中等难度案件，包含符文、护符等特殊证据。',
    baseEvidence: [
      { ...STANDARD_EVIDENCE_TEMPLATES.strange_rune, id: 'tpl-evidence-strange-rune' },
      { ...STANDARD_EVIDENCE_TEMPLATES.old_amulet, id: 'tpl-evidence-old-amulet' },
      { ...STANDARD_EVIDENCE_TEMPLATES.blurry_photo, id: 'tpl-evidence-blurry-photo' }
    ],
    baseClues: [
      { ...STANDARD_CLUE_TEMPLATES.entity_presence, id: 'tpl-clue-entity-presence' },
      { ...STANDARD_CLUE_TEMPLATES.nonhuman_presence, id: 'tpl-clue-nonhuman-presence' }
    ],
    defaultTimeLimit: { ...NORMAL_TIME_LIMIT },
    defaultSanityCost: 25,
    defaultRecommendedSanity: 70
  },
  {
    id: 'tpl-preset-hard-creature',
    name: '生物追踪模板',
    description: '适合创建涉及未知生物追踪高难度案件，包含特殊证据和高级线索。',
    baseEvidence: [
      { ...STANDARD_EVIDENCE_TEMPLATES.hidden_mark, id: 'tpl-evidence-hidden-mark' },
      { ...STANDARD_EVIDENCE_TEMPLATES.strange_footprints, id: 'tpl-evidence-strange-footprints' },
      { ...STANDARD_EVIDENCE_TEMPLATES.broken_object, id: 'tpl-evidence-broken-object' }
    ],
    baseClues: [
      { ...STANDARD_CLUE_TEMPLATES.creature_exists, id: 'tpl-clue-creature-exists' },
      { ...STANDARD_CLUE_TEMPLATES.nonhuman_presence, id: 'tpl-clue-nonhuman-presence' },
      { ...STANDARD_CLUE_TEMPLATES.entity_presence, id: 'tpl-clue-entity-presence' }
    ],
    defaultTimeLimit: { ...HARD_TIME_LIMIT },
    defaultSanityCost: 35,
    defaultRecommendedSanity: 60
  },
  {
    id: 'tpl-preset-conspiracy',
    name: '阴谋调查模板',
    description: '适合创建涉及组织阴谋的案件，以文档和证词类证据为主。',
    baseEvidence: [
      { ...STANDARD_EVIDENCE_TEMPLATES.mysterious_letter, id: 'tpl-evidence-mysterious-letter' },
      { ...STANDARD_EVIDENCE_TEMPLATES.torn_diary, id: 'tpl-evidence-torn-diary' },
      { ...STANDARD_EVIDENCE_TEMPLATES.strange_rune, id: 'tpl-evidence-strange-rune' }
    ],
    baseClues: [
      { ...STANDARD_CLUE_TEMPLATES.organization_link, id: 'tpl-clue-organization-link' },
      { ...STANDARD_CLUE_TEMPLATES.deeper_conspiracy, id: 'tpl-clue-deeper-conspiracy' },
      { ...STANDARD_CLUE_TEMPLATES.owner_motivation, id: 'tpl-clue-owner-motivation' }
    ],
    defaultTimeLimit: { ...NORMAL_TIME_LIMIT },
    defaultSanityCost: 25,
    defaultRecommendedSanity: 70
  }
]

export const EVIDENCE_TEMPLATES = STANDARD_EVIDENCE_TEMPLATES
export const CLUE_TEMPLATES = STANDARD_CLUE_TEMPLATES
export const TIME_LIMIT_PRESETS = {
  easy: DEFAULT_TIME_LIMIT,
  normal: NORMAL_TIME_LIMIT,
  hard: HARD_TIME_LIMIT
}

export function getEvidenceTemplate(templateId: string, overrideId?: string): EvidenceDefinition | null {
  const template = STANDARD_EVIDENCE_TEMPLATES[templateId]
  if (!template) return null
  return overrideId ? { ...template, id: overrideId } : { ...template }
}

export function getClueTemplate(templateId: string, overrideId?: string): ClueDefinition | null {
  const template = STANDARD_CLUE_TEMPLATES[templateId]
  if (!template) return null
  return overrideId ? { ...template, id: overrideId, connections: template.connections.map(c => c.replace('tpl-', '')) } : { ...template }
}

export function buildEvidenceFromTemplate(
  templateId: string,
  caseId: string,
  customOverrides: Partial<EvidenceDefinition> = {}
): EvidenceDefinition | null {
  const template = getEvidenceTemplate(templateId)
  if (!template) return null
  return {
    ...template,
    id: `${caseId}-${template.id.replace('tpl-evidence-', '')}`,
    ...customOverrides
  }
}

export function buildClueFromTemplate(
  templateId: string,
  caseId: string,
  customOverrides: Partial<ClueDefinition> = {}
): ClueDefinition | null {
  const template = getClueTemplate(templateId, `${caseId}-${templateId.replace('tpl-clue-', '')}`)
  if (!template) return null
  template.connections = template.connections.map(c => {
    if (c.startsWith('tpl-clue-')) {
      return `${caseId}-${c.replace('tpl-clue-', '')}`
    }
    return c
  })
  return {
    ...template,
    ...customOverrides
  }
}

export function registerAllTemplates(): void {
  CASE_TEMPLATE_PRESETS.forEach(preset => {
    caseRegistry.registerTemplate(preset)
  })
}
