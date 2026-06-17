import type { 
  CorruptionMilestone, 
  EndingDescriptor, 
  SaveRiskAssessment, 
  SaveRiskLevel,
  SpiritualPollutionState
} from '@/types'

export const CORRUPTION_MILESTONES: CorruptionMilestone[] = [
  {
    id: 'milestone-unsettling',
    name: '心神不宁',
    description: '你开始注意到一些不对劲的地方，但还能保持理智。',
    erosionThreshold: 15,
    effects: {
      sanityRecoveryPenalty: 10,
      anomalyEventBonus: 10
    },
    triggered: false
  },
  {
    id: 'milestone-night-terrors',
    name: '噩梦缠身',
    description: '夜晚的梦境变得越来越真实，你开始分不清梦境与现实。',
    erosionThreshold: 30,
    effects: {
      maxSanityReduction: 5,
      sanityRecoveryPenalty: 20,
      anomalyEventBonus: 20
    },
    triggered: false
  },
  {
    id: 'milestone-echoes',
    name: '深渊回响',
    description: '你听到了来自虚空的低语，它们在讲述着不该被知道的真相。',
    erosionThreshold: 50,
    effects: {
      maxSanityReduction: 10,
      sanityRecoveryPenalty: 35,
      hitRatePenalty: 10,
      anomalyEventBonus: 30,
      unlockEnding: 'forgetful'
    },
    triggered: false
  },
  {
    id: 'milestone-corruption',
    name: '精神侵蚀',
    description: '你的灵魂已经被印记所触及，凡人的世界开始变得陌生。',
    erosionThreshold: 70,
    effects: {
      maxSanityReduction: 20,
      sanityRecoveryPenalty: 50,
      hitRatePenalty: 20,
      anomalyEventBonus: 50,
      unlockEnding: 'corrupted'
    },
    triggered: false
  },
  {
    id: 'milestone-abyss',
    name: '凝视深渊',
    description: '当你凝视深渊时，深渊也在凝视着你。现在，它微笑了。',
    erosionThreshold: 90,
    effects: {
      maxSanityReduction: 35,
      sanityRecoveryPenalty: 75,
      hitRatePenalty: 35,
      anomalyEventBonus: 75,
      unlockEnding: 'fully_insane'
    },
    triggered: false
  }
]

export const ENDING_DESCRIPTORS: EndingDescriptor[] = [
  {
    id: 'truth_seeker',
    name: '追寻真相者',
    description: '你以钢铁般的意志承受了一切，将真相公之于众。虽然伤痕累累，但你的灵魂依然纯净。',
    pollutionRequirement: {
      maxLongTermErosion: 29,
      maxTotalPollution: 60
    },
    sanityRequirement: { min: 40 },
    scoreModifier: 15,
    unlocksBranches: ['deep-truth']
  },
  {
    id: 'survivor',
    name: '幸存者',
    description: '你选择了更安全的道路，没有触碰最黑暗的秘密。你活下来了，带着少许噩梦。',
    pollutionRequirement: {
      maxLongTermErosion: 49,
      maxTotalPollution: 100
    },
    sanityRequirement: { min: 25 },
    scoreModifier: 5
  },
  {
    id: 'forgetful',
    name: '选择性遗忘',
    description: '为了保护心智，你的大脑主动封存了最可怕的记忆。有些空白，或许是一种恩赐。',
    pollutionRequirement: {
      minLongTermErosion: 30,
      maxLongTermErosion: 69
    },
    sanityRequirement: { min: 10 },
    scoreModifier: -5
  },
  {
    id: 'martyr',
    name: '殉道者',
    description: '你以理智为代价，换来了至关重要的信息。愿后人能够完成你未竟的事业。',
    pollutionRequirement: {
      maxLongTermErosion: 69,
      minTotalPollution: 80
    },
    sanityRequirement: { max: 25 },
    scoreModifier: 10
  },
  {
    id: 'corrupted',
    name: '堕落者',
    description: '你窥见了真相的全貌，它改变了你。现在的你，已不再是从前的那个人了。',
    pollutionRequirement: {
      minLongTermErosion: 50,
      maxLongTermErosion: 89
    },
    sanityRequirement: { max: 40 },
    scoreModifier: -15,
    unlocksBranches: ['corrupted-truth']
  },
  {
    id: 'fully_insane',
    name: '失心者',
    description: '你的心智已彻底崩解，成为深渊的又一个囚徒。但在疯狂之中，你看到了...一切。',
    pollutionRequirement: {
      minLongTermErosion: 70
    },
    sanityRequirement: { max: 20 },
    scoreModifier: -30,
    unlocksBranches: ['forbidden-truth']
  }
]

export function createInitialPollutionState(): SpiritualPollutionState {
  return {
    shortTermShock: 0,
    longTermErosion: 0,
    maxShortTermShock: 100,
    maxLongTermErosion: 100,
    pollutionEvents: [],
    lastDecayTime: Date.now(),
    lowSanityStreak: 0,
    consecutiveDarkChoices: 0,
    unlockedCorruptionMilestones: []
  }
}

export function getTotalPollution(state: SpiritualPollutionState): number {
  return state.shortTermShock + state.longTermErosion
}

export function getShockTier(shock: number): 'calm' | 'jittery' | 'terrified' | 'panic' | 'catatonic' {
  if (shock < 20) return 'calm'
  if (shock < 45) return 'jittery'
  if (shock < 70) return 'terrified'
  if (shock < 90) return 'panic'
  return 'catatonic'
}

export function getErosionTier(erosion: number): 'pure' | 'touched' | 'marked' | 'stained' | 'lost' {
  if (erosion < 15) return 'pure'
  if (erosion < 30) return 'touched'
  if (erosion < 50) return 'marked'
  if (erosion < 70) return 'stained'
  return 'lost'
}

export function assessSaveRisk(state: SpiritualPollutionState, sanity: number, maxSanity: number): SaveRiskAssessment {
  const totalPollution = getTotalPollution(state)
  const sanityRatio = sanity / maxSanity
  const erosionRatio = state.longTermErosion / state.maxLongTermErosion

  let level: SaveRiskLevel = 'safe'
  let corruptionChance = 0
  let dataLossChance = 0
  let hallucinationInjectionChance = 0
  let warningMessage = '存档稳定，可以安全保存。'

  const riskScore = erosionRatio * 60 + (state.shortTermShock / state.maxShortTermShock) * 25 + (1 - sanityRatio) * 15

  if (riskScore < 15) {
    level = 'safe'
    corruptionChance = 0
    dataLossChance = 0
    hallucinationInjectionChance = 0
    warningMessage = '精神状态稳定，存档安全。'
  } else if (riskScore < 35) {
    level = 'caution'
    corruptionChance = 5
    dataLossChance = 0
    hallucinationInjectionChance = 8
    warningMessage = '你感到一丝不安...存档时请小心。'
  } else if (riskScore < 55) {
    level = 'danger'
    corruptionChance = 15
    dataLossChance = 3
    hallucinationInjectionChance = 20
    warningMessage = '⚠️ 精神波动剧烈，存档可能受到干扰！'
  } else if (riskScore < 80) {
    level = 'critical'
    corruptionChance = 30
    dataLossChance = 10
    hallucinationInjectionChance = 40
    warningMessage = '🚨 深渊正在凝视你！强烈建议恢复精神后再存档！'
  } else {
    level = 'corrupted'
    corruptionChance = 50
    dataLossChance = 25
    hallucinationInjectionChance = 60
    warningMessage = '💀 你的心智已濒临崩溃。此存档可能...无法保证原样读回。'
  }

  if (totalPollution > 150) {
    corruptionChance = Math.min(80, corruptionChance + 20)
    dataLossChance = Math.min(50, dataLossChance + 15)
  }

  return {
    level,
    corruptionChance: Math.round(corruptionChance),
    dataLossChance: Math.round(dataLossChance),
    hallucinationInjectionChance: Math.round(hallucinationInjectionChance),
    warningMessage
  }
}

export function getMilestoneEffects(state: SpiritualPollutionState): {
  maxSanityReduction: number
  sanityRecoveryPenalty: number
  hitRatePenalty: number
  anomalyEventBonus: number
  unlockedEndings: string[]
} {
  let maxSanityReduction = 0
  let sanityRecoveryPenalty = 0
  let hitRatePenalty = 0
  let anomalyEventBonus = 0
  const unlockedEndings: string[] = []

  for (const milestone of CORRUPTION_MILESTONES) {
    if (state.longTermErosion >= milestone.erosionThreshold) {
      if (milestone.effects.maxSanityReduction) {
        maxSanityReduction = Math.max(maxSanityReduction, milestone.effects.maxSanityReduction)
      }
      if (milestone.effects.sanityRecoveryPenalty) {
        sanityRecoveryPenalty = Math.max(sanityRecoveryPenalty, milestone.effects.sanityRecoveryPenalty)
      }
      if (milestone.effects.hitRatePenalty) {
        hitRatePenalty = Math.max(hitRatePenalty, milestone.effects.hitRatePenalty)
      }
      if (milestone.effects.anomalyEventBonus) {
        anomalyEventBonus = Math.max(anomalyEventBonus, milestone.effects.anomalyEventBonus)
      }
      if (milestone.effects.unlockEnding) {
        unlockedEndings.push(milestone.effects.unlockEnding)
      }
    }
  }

  return {
    maxSanityReduction,
    sanityRecoveryPenalty,
    hitRatePenalty,
    anomalyEventBonus,
    unlockedEndings
  }
}

export function determineEndingAlignment(
  state: SpiritualPollutionState,
  sanity: number,
  maxSanity: number,
  isCorrectConclusion: boolean
): EndingDescriptor {
  const totalPollution = getTotalPollution(state)
  const sanityRatio = sanity / maxSanity

  const candidates = ENDING_DESCRIPTORS.filter(desc => {
    const req = desc.pollutionRequirement
    
    if (req.maxShortTermShock !== undefined && state.shortTermShock > req.maxShortTermShock) {
      return false
    }
    if (req.minLongTermErosion !== undefined && state.longTermErosion < req.minLongTermErosion) {
      return false
    }
    if (req.maxLongTermErosion !== undefined && state.longTermErosion > req.maxLongTermErosion) {
      return false
    }
    if (req.minTotalPollution !== undefined && totalPollution < req.minTotalPollution) {
      return false
    }
    if (req.maxTotalPollution !== undefined && totalPollution > req.maxTotalPollution) {
      return false
    }
    if (desc.sanityRequirement.min !== undefined && sanity < desc.sanityRequirement.min) {
      return false
    }
    if (desc.sanityRequirement.max !== undefined && sanity > desc.sanityRequirement.max) {
      return false
    }
    return true
  })

  if (candidates.length === 0) {
    if (state.longTermErosion >= 70 || sanityRatio < 0.2) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'fully_insane')!
    } else if (state.longTermErosion >= 50) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'corrupted')!
    } else if (sanityRatio < 0.3) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'martyr')!
    } else if (state.longTermErosion >= 30) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'forgetful')!
    }
    return isCorrectConclusion 
      ? ENDING_DESCRIPTORS.find(e => e.id === 'truth_seeker')!
      : ENDING_DESCRIPTORS.find(e => e.id === 'survivor')!
  }

  candidates.sort((a, b) => {
    const aPriority = (a.pollutionRequirement.minLongTermErosion || 0) + (a.scoreModifier)
    const bPriority = (b.pollutionRequirement.minLongTermErosion || 0) + (b.scoreModifier)
    return bPriority - aPriority
  })

  return candidates[0]
}

export function calculatePollutionFromSanityLoss(
  sanityLoss: number, 
  source: 'shock' | 'erosion' | 'mixed'
): { shock: number; erosion: number } {
  if (source === 'shock') {
    return {
      shock: Math.round(sanityLoss * 1.5),
      erosion: Math.round(sanityLoss * 0.1)
    }
  } else if (source === 'erosion') {
    return {
      shock: Math.round(sanityLoss * 0.3),
      erosion: Math.round(sanityLoss * 0.8)
    }
  }
  return {
    shock: Math.round(sanityLoss * 0.8),
    erosion: Math.round(sanityLoss * 0.4)
  }
}

export function calculateDecay(
  state: SpiritualPollutionState,
  elapsedMs: number,
  sanity: number,
  maxSanity: number
): { shockDecay: number; erosionDecay: number } {
  const minutes = elapsedMs / 60000
  const sanityRatio = sanity / maxSanity

  let shockDecayRate = 2.0
  let erosionDecayRate = 0.15

  if (sanityRatio > 0.8) {
    shockDecayRate *= 1.5
    erosionDecayRate *= 1.3
  } else if (sanityRatio > 0.5) {
    shockDecayRate *= 1.0
    erosionDecayRate *= 1.0
  } else if (sanityRatio > 0.3) {
    shockDecayRate *= 0.6
    erosionDecayRate *= 0.5
  } else {
    shockDecayRate *= 0.2
    erosionDecayRate *= 0.1
  }

  const shockDecay = Math.round(state.shortTermShock * Math.min(1, minutes * shockDecayRate / state.maxShortTermShock))
  const erosionDecay = Math.round(state.longTermErosion * Math.min(1, minutes * erosionDecayRate / state.maxLongTermErosion))

  return {
    shockDecay: Math.min(state.shortTermShock, Math.max(0, shockDecay)),
    erosionDecay: Math.min(state.longTermErosion, Math.max(0, erosionDecay))
  }
}
