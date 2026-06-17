import type { Talent, TalentEffectType } from '@/types'

export const talents: Talent[] = [
  {
    id: 'steady_mind',
    name: '钢铁意志',
    description: '多年的训练让你对精神污染有更强的抵抗力。',
    icon: '🛡️',
    rarity: 'common',
    effects: [
      { type: 'sanity_cost_reduction', value: 15, description: '理智消耗降低15%' }
    ],
    requiredStats: { willpower: 60 },
    unlocked: true
  },
  {
    id: 'keen_eye',
    name: '敏锐洞察',
    description: '你善于发现他人忽略的细节。',
    icon: '👁️',
    rarity: 'common',
    effects: [
      { type: 'evidence_hit_rate', value: 10, description: '证据发现率+10%' }
    ],
    requiredStats: { perception: 60 },
    unlocked: true
  },
  {
    id: 'quick_analysis',
    name: '快速分析',
    description: '你能够迅速整理线索之间的关联。',
    icon: '⚡',
    rarity: 'common',
    effects: [
      { type: 'clue_analysis_speed', value: 25, description: '线索分析效率+25%' }
    ],
    requiredStats: { wisdom: 60 },
    unlocked: true
  },
  {
    id: 'brave_heart',
    name: '无畏之心',
    description: '面对恐怖时你比常人更加冷静。',
    icon: '❤️',
    rarity: 'common',
    effects: [
      { type: 'sanity_cost_reduction', value: 10, description: '理智消耗降低10%' },
      { type: 'max_sanity_bonus', value: 10, description: '最大理智值+10' }
    ],
    requiredStats: { courage: 60 },
    unlocked: true
  },
  {
    id: 'lucky_find',
    name: '幸运发现',
    description: '好运似乎总是站在你这边。',
    icon: '🍀',
    rarity: 'common',
    effects: [
      { type: 'clue_discovery_bonus', value: 15, description: '隐藏线索发现率+15%' }
    ],
    requiredStats: { luck: 60 },
    unlocked: true
  },
  {
    id: 'careful_handler',
    name: '细心操作者',
    description: '你知道如何正确使用和保养工具。',
    icon: '🔧',
    rarity: 'common',
    effects: [
      { type: 'tool_durability_bonus', value: 20, description: '工具耐久消耗降低20%' }
    ],
    unlocked: true
  },
  {
    id: 'occult_scholar',
    name: '神秘学者',
    description: '你对超自然现象有深入研究，即使这会让你付出代价。',
    icon: '📚',
    rarity: 'rare',
    effects: [
      { type: 'clue_analysis_speed', value: 35, description: '线索分析效率+35%' },
      { type: 'special_event_unlock', value: 1, description: '解锁特殊神秘事件' }
    ],
    requiredStats: { wisdom: 75, willpower: 50 },
    prerequisites: ['quick_analysis'],
    unlocked: false
  },
  {
    id: 'fearless',
    name: '无所畏惧',
    description: '你已经见识过太多恐怖，很少有东西能再动摇你。',
    icon: '⚔️',
    rarity: 'rare',
    effects: [
      { type: 'sanity_cost_reduction', value: 25, description: '理智消耗降低25%' },
      { type: 'event_trigger_chance', value: 20, description: '正面事件触发率+20%' }
    ],
    requiredStats: { courage: 80, willpower: 70 },
    prerequisites: ['brave_heart'],
    unlocked: false
  },
  {
    id: 'sixth_sense',
    name: '第六感',
    description: '有时候你能预感到即将发生的事情。',
    icon: '🔮',
    rarity: 'rare',
    effects: [
      { type: 'evidence_hit_rate', value: 15, description: '证据发现率+15%' },
      { type: 'event_trigger_chance', value: 15, description: '特殊事件触发率+15%' }
    ],
    requiredStats: { perception: 75, luck: 70 },
    prerequisites: ['keen_eye'],
    unlocked: false
  },
  {
    id: 'meditation',
    name: '冥想修行',
    description: '你掌握了恢复精神的技巧。',
    icon: '🧘',
    rarity: 'rare',
    effects: [
      { type: 'sanity_recovery_bonus', value: 30, description: '理智恢复效果+30%' },
      { type: 'max_sanity_bonus', value: 15, description: '最大理智值+15' }
    ],
    requiredStats: { willpower: 75, wisdom: 65 },
    prerequisites: ['steady_mind'],
    unlocked: false
  },
  {
    id: 'master_investigator',
    name: '神探',
    description: '你是天生的调查员，没有什么真相能逃过你的眼睛。',
    icon: '🔍',
    rarity: 'legendary',
    effects: [
      { type: 'evidence_hit_rate', value: 20, description: '证据发现率+20%' },
      { type: 'clue_analysis_speed', value: 30, description: '线索分析效率+30%' },
      { type: 'clue_discovery_bonus', value: 25, description: '隐藏线索发现率+25%' }
    ],
    requiredStats: { perception: 90, wisdom: 85, luck: 70 },
    prerequisites: ['keen_eye', 'quick_analysis'],
    unlocked: false
  },
  {
    id: 'elder_sign_bearer',
    name: '古印持有者',
    description: '你持有一枚古老的印章，它能保护你免受超自然力量的侵害。',
    icon: '✨',
    rarity: 'legendary',
    effects: [
      { type: 'sanity_cost_reduction', value: 35, description: '理智消耗降低35%' },
      { type: 'max_sanity_bonus', value: 25, description: '最大理智值+25' },
      { type: 'special_event_unlock', value: 1, description: '解锁古老印记相关事件' }
    ],
    requiredStats: { willpower: 90, courage: 80, wisdom: 75 },
    prerequisites: ['steady_mind', 'fearless'],
    unlocked: false
  },
  {
    id: 'destiny_chosen',
    name: '天选之人',
    description: '似乎有某种神秘的力量在引导着你。',
    icon: '🌟',
    rarity: 'legendary',
    effects: [
      { type: 'event_trigger_chance', value: 30, description: '特殊事件触发率+30%' },
      { type: 'luck_bonus', value: 20, description: '幸运值+20' },
      { type: 'clue_discovery_bonus', value: 20, description: '隐藏线索发现率+20%' },
      { type: 'special_event_unlock', value: 1, description: '解锁命运相关特殊事件' }
    ],
    requiredStats: { luck: 95, perception: 80, willpower: 80 },
    prerequisites: ['sixth_sense', 'lucky_find'],
    unlocked: false
  }
]

export function getTalentById(talentId: string): Talent | undefined {
  return talents.find(t => t.id === talentId)
}

export function getAvailableTalents(statValues: { courage: number; wisdom: number; perception: number; willpower: number; luck: number }, unlockedTalentIds: string[]): Talent[] {
  return talents.filter(talent => {
    if (talent.prerequisites && !talent.prerequisites.every(p => unlockedTalentIds.includes(p))) {
      return false
    }
    if (talent.requiredStats) {
      for (const [stat, required] of Object.entries(talent.requiredStats)) {
        if (statValues[stat as keyof typeof statValues] < (required || 0)) {
          return false
        }
      }
    }
    return true
  })
}

export function calculateTalentEffect(talentIds: string[], effectType: TalentEffectType): number {
  return talentIds.reduce((total, talentId) => {
    const talent = getTalentById(talentId)
    if (!talent) return total
    const effect = talent.effects.find(e => e.type === effectType)
    return total + (effect?.value || 0)
  }, 0)
}

export function unlockTalent(talentId: string): boolean {
  const talent = talents.find(t => t.id === talentId)
  if (!talent) return false
  talent.unlocked = true
  return true
}
