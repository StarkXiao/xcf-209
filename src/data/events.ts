import type { SceneEvent } from '@/types'

export const sceneEvents: SceneEvent[] = [
  {
    id: 'found_note',
    name: '神秘纸条',
    description: '你在角落发现了一张皱巴巴的纸条，上面写着一些看不懂的符号。仔细研究后，你获得了一条重要线索。',
    type: 'positive',
    triggerCondition: {
      type: 'random',
      chance: 15
    },
    effects: {
      clueDiscovery: ['clue_extra_note']
    },
    triggered: false
  },
  {
    id: 'ancient_protection',
    name: '古老的庇护',
    description: '空气中弥漫着一股神秘的气息，你感到一阵平静。也许这里曾经被某种力量保护着。',
    type: 'positive',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'elder_sign_bearer',
      chance: 40
    },
    effects: {
      sanity: 10
    },
    triggered: false
  },
  {
    id: 'whispers',
    name: '低语声',
    description: '你听到了微弱的低语声在耳边回响。理智受到了影响。',
    type: 'negative',
    triggerCondition: {
      type: 'sanity_level',
      sanityThreshold: 50,
      chance: 20
    },
    effects: {
      sanity: -8
    },
    triggered: false
  },
  {
    id: 'hidden_compartment',
    name: '暗格',
    description: '凭借你的第六感，你注意到墙壁似乎有什么不对劲。仔细检查后发现了一个暗格！',
    type: 'special',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'sixth_sense',
      chance: 35
    },
    effects: {
      evidenceBonus: 15
    },
    triggered: false
  },
  {
    id: 'old_diary',
    name: '旧日日记',
    description: '你发现了一本尘封的日记，记录着这里曾经发生的故事。这可能包含重要信息。',
    type: 'neutral',
    triggerCondition: {
      type: 'scene_enter',
      chance: 25
    },
    effects: {
      clueDiscovery: ['clue_diary_entry']
    },
    triggered: false
  },
  {
    id: 'sudden_chill',
    name: '寒意突袭',
    description: '一阵突如其来的寒意席卷全身，你感到有什么东西从你身边经过。',
    type: 'negative',
    triggerCondition: {
      type: 'random',
      chance: 10
    },
    effects: {
      sanity: -5
    },
    triggered: false
  },
  {
    id: 'occult_vision',
    name: '神秘幻象',
    description: '你的神秘知识让你看到了常人无法察觉的景象。',
    type: 'special',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'occult_scholar',
      chance: 50
    },
    effects: {
      clueDiscovery: ['clue_occult_knowledge'],
      evidenceBonus: 10
    },
    triggered: false
  },
  {
    id: 'fortunate_turn',
    name: '时来运转',
    description: '似乎有什么在帮助你。运气似乎站在你这边。',
    type: 'positive',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'destiny_chosen',
      chance: 60
    },
    effects: {
      sanity: 15,
      evidenceBonus: 20
    },
    triggered: false
  },
  {
    id: 'meditation_spot',
    name: '冥想之地',
    description: '你找到一个安静的角落，在这里你可以集中精神，恢复一些理智。',
    type: 'positive',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'meditation',
      chance: 45
    },
    effects: {
      sanity: 12
    },
    triggered: false
  },
  {
    id: 'courage_boost',
    name: '勇气涌现',
    description: '你感到内心充满了勇气，无所畏惧。',
    type: 'positive',
    triggerCondition: {
      type: 'talent_based',
      requiredTalent: 'fearless',
      chance: 40
    },
    effects: {
      sanity: 8,
      evidenceBonus: 5
    },
    triggered: false
  }
]

export function getEventById(eventId: string): SceneEvent | undefined {
  return sceneEvents.find(e => e.id === eventId)
}

export function getEventsForTrigger(
  triggerType: SceneEvent['triggerCondition']['type'],
  talentIds: string[],
  currentSanity: number
): SceneEvent[] {
  return sceneEvents.filter(event => {
    if (event.triggered) return false
    if (event.triggerCondition.type !== triggerType) return false
    
    switch (triggerType) {
      case 'talent_based':
        return event.triggerCondition.requiredTalent && 
               talentIds.includes(event.triggerCondition.requiredTalent)
      case 'sanity_level':
        return currentSanity <= (event.triggerCondition.sanityThreshold || 50)
      default:
        return true
    }
  })
}

export function checkEventTrigger(
  event: SceneEvent,
  _talentIds: string[],
  eventTriggerBonus: number = 0
): boolean {
  if (event.triggered) return false
  
  const baseChance = event.triggerCondition.chance || 10
  const finalChance = Math.min(95, baseChance + eventTriggerBonus)
  
  return Math.random() * 100 < finalChance
}

export function resetEvents() {
  sceneEvents.forEach(event => {
    event.triggered = false
  })
}
