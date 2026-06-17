import type { AnomalyEvent, SanityTier, AnomalyState } from '@/types'

export const anomalyEvents: AnomalyEvent[] = [
  {
    id: 'shadow_flicker',
    name: '暗影闪烁',
    description: '眼角的余光似乎捕捉到了什么在移动...',
    type: 'hallucination',
    sanityTier: 'mild',
    triggerChance: 15,
    cooldown: 30000,
    effects: {
      hallucination: {
        visualType: 'shadow',
        intensity: 1,
        duration: 3000,
        message: '你是不是看到了什么？'
      }
    },
    triggered: false
  },
  {
    id: 'whispering_shadows',
    name: '低语的阴影',
    description: '阴影中似乎有什么在低语，声音模糊不清。',
    type: 'hallucination',
    sanityTier: 'moderate',
    triggerChance: 25,
    cooldown: 45000,
    effects: {
      hallucination: {
        visualType: 'phantom',
        intensity: 2,
        duration: 5000,
        message: '你听到了吗？那些低语...'
      }
    },
    triggered: false
  },
  {
    id: 'reality_warp',
    name: '现实扭曲',
    description: '周围的一切开始扭曲变形，仿佛世界本身在融化。',
    type: 'hallucination',
    sanityTier: 'severe',
    triggerChance: 35,
    cooldown: 60000,
    effects: {
      hallucination: {
        visualType: 'distortion',
        intensity: 3,
        duration: 8000,
        message: '世界在扭曲...这不是真的...'
      }
    },
    triggered: false
  },
  {
    id: 'text_corruption',
    name: '文字腐化',
    description: '眼前的文字开始扭曲变形，变成无法辨认的符号。',
    type: 'hallucination',
    sanityTier: 'critical',
    triggerChance: 50,
    cooldown: 40000,
    effects: {
      hallucination: {
        visualType: 'text_corruption',
        intensity: 4,
        duration: 6000,
        message: '文字...文字在改变...'
      }
    },
    triggered: false
  },
  {
    id: 'phantom_figure',
    name: '幻影',
    description: '一个模糊的身影在远处一闪而过。',
    type: 'hallucination',
    sanityTier: 'moderate',
    triggerChance: 20,
    cooldown: 50000,
    effects: {
      hallucination: {
        visualType: 'phantom',
        intensity: 2,
        duration: 2000,
        message: '那里有人...吗？'
      }
    },
    triggered: false
  },
  {
    id: 'false_clue_memory',
    name: '虚假记忆',
    description: '你突然"想起"了一条从未见过的线索。',
    type: 'misleading_clue',
    sanityTier: 'moderate',
    triggerChance: 20,
    cooldown: 80000,
    effects: {
      misleadingClue: {
        fakeClueId: 'fake_fragmented_memory',
        fakeClueName: '碎片化的记忆',
        fakeClueDescription: '一段模糊的记忆涌上心头，似乎暗示着什么重要的事情。但细节总是模糊不清，仿佛被什么东西遮蔽了。',
        fakeClueType: 'deduction',
        fakeConnections: [],
        isDisproven: false
      }
    },
    triggered: false
  },
  {
    id: 'imaginary_evidence',
    name: '臆想的证据',
    description: '你确信自己看到了某个证据，但它真的存在吗？',
    type: 'misleading_clue',
    sanityTier: 'severe',
    triggerChance: 30,
    cooldown: 100000,
    effects: {
      misleadingClue: {
        fakeClueId: 'fake_imaginary_evidence',
        fakeClueName: '可疑的痕迹',
        fakeClueDescription: '地上有些奇怪的痕迹，看起来像是某种符号。但当你仔细观察时，又觉得可能只是普通的划痕。',
        fakeClueType: 'physical',
        fakeConnections: [],
        isDisproven: false
      }
    },
    triggered: false
  },
  {
    id: 'delusional_testimony',
    name: '妄想的证词',
    description: '你"记得"有人告诉过你某件事，但那个人真的存在吗？',
    type: 'misleading_clue',
    sanityTier: 'critical',
    triggerChance: 40,
    cooldown: 120000,
    effects: {
      misleadingClue: {
        fakeClueId: 'fake_delusional_testimony',
        fakeClueName: '神秘人的警告',
        fakeClueDescription: '一个戴着兜帽的人曾经警告过你关于这个地方的危险。但你现在想不起那个人的脸了，甚至不确定这件事是否真的发生过。',
        fakeClueType: 'testimonial',
        fakeConnections: [],
        isDisproven: false
      }
    },
    triggered: false
  },
  {
    id: 'phantom_discovery',
    name: '幻觉发现',
    description: '日志中似乎多了一条你不记得写过的记录。',
    type: 'extra_log',
    sanityTier: 'mild',
    triggerChance: 20,
    cooldown: 60000,
    effects: {
      extraLog: {
        logType: 'discovery',
        description: '发现了一些奇怪的符号...等等，这是什么时候的事？',
        isFake: true
      }
    },
    triggered: false
  },
  {
    id: 'false_sanity_loss',
    name: '虚假的理智流失',
    description: '你感觉自己的理智在快速流失，但这可能只是错觉。',
    type: 'extra_log',
    sanityTier: 'moderate',
    triggerChance: 25,
    cooldown: 70000,
    effects: {
      extraLog: {
        logType: 'sanity_loss',
        description: '一阵强烈的眩晕感袭来...或者并没有？',
        details: { fake: true },
        isFake: true
      }
    },
    triggered: false
  },
  {
    id: 'imaginary_tool_use',
    name: '想象中的工具使用',
    description: '你似乎记得使用过某个工具，但真的用过吗？',
    type: 'extra_log',
    sanityTier: 'severe',
    triggerChance: 30,
    cooldown: 90000,
    effects: {
      extraLog: {
        logType: 'tool_use',
        description: '使用了...等等，我用了什么工具来着？',
        isFake: true
      }
    },
    triggered: false
  },
  {
    id: 'memory_hole_log',
    name: '记忆空洞',
    description: '日志中出现了一段完全没有印象的记录。',
    type: 'extra_log',
    sanityTier: 'critical',
    triggerChance: 45,
    cooldown: 80000,
    effects: {
      extraLog: {
        logType: 'discovery',
        description: '【数据损坏】这段记录已经无法辨认...',
        details: { corrupted: true, fake: true },
        isFake: true
      }
    },
    triggered: false
  },
  {
    id: 'alternate_truth',
    name: '另一种真相',
    description: '你的脑海中浮现出一个完全不同的结论。',
    type: 'deduction_candidate',
    sanityTier: 'moderate',
    triggerChance: 15,
    cooldown: 150000,
    effects: {
      deductionCandidate: {
        fakeOptionId: 'fake_alternate_truth',
        fakeOptionText: '这一切都是巧合，根本没有什么阴谋。',
        fakeSanityCost: 5,
        isDisproven: false
      }
    },
    triggered: false
  },
  {
    id: 'conspiracy_theory',
    name: '阴谋论',
    description: '你开始怀疑一切都是一个巨大的阴谋。',
    type: 'deduction_candidate',
    sanityTier: 'severe',
    triggerChance: 25,
    cooldown: 180000,
    effects: {
      deductionCandidate: {
        fakeOptionId: 'fake_conspiracy',
        fakeOptionText: '所有人都在撒谎，他们合谋掩盖真相。',
        fakeSanityCost: 15,
        isDisproven: false
      }
    },
    triggered: false
  },
  {
    id: 'supernatural_explanation',
    name: '超自然解释',
    description: '也许...这根本不是人力所能做到的。',
    type: 'deduction_candidate',
    sanityTier: 'critical',
    triggerChance: 40,
    cooldown: 200000,
    effects: {
      deductionCandidate: {
        fakeOptionId: 'fake_supernatural',
        fakeOptionText: '有某种超越人类理解的存在在操控这一切。',
        fakeSanityCost: 25,
        isDisproven: false
      }
    },
    triggered: false
  }
]

export function getSanityTier(sanity: number, maxSanity: number): SanityTier {
  const percentage = (sanity / maxSanity) * 100
  
  if (percentage > 80) return 'normal'
  if (percentage > 60) return 'mild'
  if (percentage > 40) return 'moderate'
  if (percentage > 20) return 'severe'
  return 'critical'
}

export function getAnomalyEventsForTier(tier: SanityTier): AnomalyEvent[] {
  return anomalyEvents.filter(e => e.sanityTier === tier)
}

export function getAvailableAnomalyEvents(
  sanity: number,
  maxSanity: number,
  cooldowns: Record<string, number>,
  now: number = Date.now()
): AnomalyEvent[] {
  const currentTier = getSanityTier(sanity, maxSanity)
  const tiers: SanityTier[] = ['normal', 'mild', 'moderate', 'severe', 'critical']
  const currentTierIndex = tiers.indexOf(currentTier)
  
  return anomalyEvents.filter(event => {
    const eventTierIndex = tiers.indexOf(event.sanityTier)
    if (eventTierIndex > currentTierIndex) return false
    
    const lastTriggered = cooldowns[event.id] || 0
    if (now - lastTriggered < event.cooldown) return false
    
    return true
  })
}

export function checkAnomalyTrigger(
  event: AnomalyEvent,
  sanity: number,
  maxSanity: number,
  eventTriggerBonus: number = 0
): boolean {
  const tier = getSanityTier(sanity, maxSanity)
  const tiers: SanityTier[] = ['normal', 'mild', 'moderate', 'severe', 'critical']
  const tierIndex = tiers.indexOf(tier)
  const eventTierIndex = tiers.indexOf(event.sanityTier)
  
  const tierMultiplier = 1 + (tierIndex - eventTierIndex) * 0.3
  
  const baseChance = event.triggerChance
  const finalChance = Math.min(95, (baseChance + eventTriggerBonus) * tierMultiplier)
  
  return Math.random() * 100 < finalChance
}

export function createInitialAnomalyState(): AnomalyState {
  return {
    activeHallucinations: [],
    activeMisleadingClues: [],
    activeFakeLogs: [],
    activeFakeDeductions: [],
    anomalyEventHistory: [],
    lastAnomalyCheck: 0,
    anomalyCooldowns: {}
  }
}

export function resetAnomalyEvents() {
  anomalyEvents.forEach(event => {
    event.triggered = false
    event.lastTriggeredAt = undefined
  })
}
