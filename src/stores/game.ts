import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameLogEntry, ClueConnection, Tool, HitRateResult, SearchResult, Evidence, SceneEvent, CaseScoreBreakdown, ScoreGrade, CaseScoreConfig, AnomalyEvent, HallucinationEffect, MisleadingClue, DeductionCandidateChange, Mail, Document, MailReplyOption, PollutionEvent, PollutionSource, EndingDescriptor, ClueAnnotation, ClueConfidence, ClueComparison, DeductionHint, AnnotationType } from '@/types'
import { getCaseById, setCaseStatus, failCase as failCaseData, abandonCase as abandonCaseData } from '@/data/cases'
import { createToolInstance, getToolEffectiveness, getDurabilityPenalty, getSanityPenalty, defaultStartingTools } from '@/data/tools'
import { useSaveStore } from './save'
import { useCharacterStore } from './character'
import { useInventoryStore } from './inventory'
import { useBestiaryStore } from './bestiary'
import { useNewGamePlusStore } from './newGamePlus'
import { useProgressStore } from './progress'
import { getEventsForTrigger, checkEventTrigger, resetEvents } from '@/data/events'
import { 
  getAvailableAnomalyEvents, 
  checkAnomalyTrigger, 
  createInitialAnomalyState, 
  resetAnomalyEvents,
  getSanityTier 
} from '@/data/anomalyEvents'
import { 
  getMailSystemByCaseId, 
  getPhasesForCase,
  createInitialIntelligenceState,
  mailDeliveryEvents
} from '@/data/mailSystem'
import {
  createInitialPollutionState,
  getTotalPollution,
  getShockTier,
  getErosionTier,
  getMilestoneEffects,
  calculatePollutionFromSanityLoss,
  calculateDecay,
  determineEndingAlignment,
  CORRUPTION_MILESTONES
} from '@/data/spiritualPollution'

let timerInterval: ReturnType<typeof setInterval> | null = null

const DEFAULT_SCORE_CONFIG: CaseScoreConfig = {
  evidenceWeight: 30,
  clueWeight: 20,
  deductionWeight: 20,
  timeWeight: 15,
  sanityWeight: 15,
  bonusMultiplier: 1.5,
  penaltyMultiplier: 1.0,
  gradeThresholds: {
    'S': 90,
    'A': 80,
    'B': 70,
    'C': 60,
    'D': 40,
    'F': 0
  }
}

export const useGameStore = defineStore('game', () => {
  const characterStore = useCharacterStore()
  
  const getInventoryStore = () => useInventoryStore()
  
  const activeCharacterId = computed(() => characterStore.activeProfile?.id || null)
  
  const currentTalentIds = computed(() => characterStore.activeTalentIds)
  
  const talentEffects = computed(() => ({
    sanityCostReduction: characterStore.getTalentEffect('sanity_cost_reduction'),
    maxSanityBonus: characterStore.getTalentEffect('max_sanity_bonus'),
    evidenceHitRateBonus: characterStore.getTalentEffect('evidence_hit_rate'),
    clueAnalysisSpeed: characterStore.getTalentEffect('clue_analysis_speed'),
    clueDiscoveryBonus: characterStore.getTalentEffect('clue_discovery_bonus'),
    eventTriggerChance: characterStore.getTalentEffect('event_trigger_chance'),
    toolDurabilityBonus: characterStore.getTalentEffect('tool_durability_bonus'),
    sanityRecoveryBonus: characterStore.getTalentEffect('sanity_recovery_bonus')
  }))

  const gameState = ref<GameState>({
    currentCase: null,
    sanity: 100,
    maxSanity: 100,
    discoveredEvidence: [],
    discoveredClues: [],
    analyzedClues: [],
    clueConnections: [],
    visitedScenes: [],
    gameLog: [],
    startTime: Date.now(),
    lastSaveTime: Date.now(),
    tools: [],
    selectedToolId: null,
    failedSearches: [],
    deductionBranches: [],
    characterProfileId: null,
    triggeredEvents: [],
    unlockedHiddenEvidence: [],
    timerState: {
      remainingSeconds: 0,
      totalSeconds: 0,
      isRunning: false,
      isPaused: false,
      isExpired: false,
      timeBonusUsed: 0,
      lastActionTime: Date.now(),
      sceneSwitchCount: 0,
      searchAttemptCount: 0,
      failedSearchCount: 0,
      clueAnalysisCount: 0,
      evidenceRefreshCount: 0
    },
    anomalyState: createInitialAnomalyState(),
    inventory: {
      items: [],
      capacity: 500,
      unlocked: true
    },
    activeAnalyses: [],
    unlockedRecipes: [],
    craftingHistory: [],
    intelligenceState: createInitialIntelligenceState(),
    mailDeliveryEvents: [],
    spiritualPollution: createInitialPollutionState(),
    clueAnnotations: [],
    clueConfidences: [],
    clueComparisons: [],
    deductionHints: [],
    comparisonMode: false,
    comparisonSelectedClues: []
  })

  const currentCase = computed(() => {
    if (!gameState.value.currentCase) return null
    return getCaseById(gameState.value.currentCase)
  })

  const sanityPercentage = computed(() => {
    return (gameState.value.sanity / gameState.value.maxSanity) * 100
  })

  const isLowSanity = computed(() => {
    return gameState.value.sanity <= 30
  })

  const isCriticalSanity = computed(() => {
    return gameState.value.sanity <= 15
  })

  const availableTools = computed(() => {
    return gameState.value.tools.filter(t => t.uses > 0 && t.durability > 0)
  })

  const selectedTool = computed(() => {
    if (!gameState.value.selectedToolId) return null
    return gameState.value.tools.find(t => t.id === gameState.value.selectedToolId) || null
  })

  const timerPercentage = computed(() => {
    if (gameState.value.timerState.totalSeconds === 0) return 100
    return (gameState.value.timerState.remainingSeconds / gameState.value.timerState.totalSeconds) * 100
  })

  const isLowTime = computed(() => {
    return gameState.value.timerState.remainingSeconds <= 120 && gameState.value.timerState.totalSeconds > 0
  })

  const isCriticalTime = computed(() => {
    return gameState.value.timerState.remainingSeconds <= 60 && gameState.value.timerState.totalSeconds > 0
  })

  const formattedRemainingTime = computed(() => {
    const seconds = gameState.value.timerState.remainingSeconds
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  })

  const spiritualPollution = computed(() => gameState.value.spiritualPollution)

  const totalPollution = computed(() => getTotalPollution(gameState.value.spiritualPollution))

  const shockTier = computed(() => getShockTier(gameState.value.spiritualPollution.shortTermShock))

  const erosionTier = computed(() => getErosionTier(gameState.value.spiritualPollution.longTermErosion))

  const milestoneEffects = computed(() => getMilestoneEffects(gameState.value.spiritualPollution))

  const effectiveMaxSanity = computed(() => {
    const baseMax = gameState.value.maxSanity
    const reduction = milestoneEffects.value.maxSanityReduction
    return Math.max(10, baseMax - reduction)
  })

  const shockPercentage = computed(() => {
    const state = gameState.value.spiritualPollution
    return (state.shortTermShock / state.maxShortTermShock) * 100
  })

  const erosionPercentage = computed(() => {
    const state = gameState.value.spiritualPollution
    return (state.longTermErosion / state.maxLongTermErosion) * 100
  })

  function startCase(caseId: string, inheritedTools?: string[]) {
    const caseData = getCaseById(caseId)
    if (!caseData) return false

    resetEvents()
    
    const baseToolIds = caseData.startingTools || defaultStartingTools
    
    let finalToolIds: string[]
    if (inheritedTools && inheritedTools.length > 0) {
      finalToolIds = [...new Set([...baseToolIds, ...inheritedTools])]
    } else {
      const saveStore = useSaveStore()
      const globalTools = saveStore.globalUnlockedTools
      finalToolIds = [...new Set([...baseToolIds, ...globalTools])]
    }

    const startingTools = finalToolIds
      .map(id => createToolInstance(id))
      .filter((t): t is Tool => t !== null)

    const baseMaxSanity = 100
    const maxSanityBonus = talentEffects.value.maxSanityBonus
    
    const newGamePlusStore = useNewGamePlusStore()
    const carriedSanityBonus = newGamePlusStore.state.carriedSanityBonus
    const finalMaxSanity = baseMaxSanity + maxSanityBonus + carriedSanityBonus

    const charId = activeCharacterId.value
    const timeLimit = caseData.timeLimit || { totalSeconds: 900, sceneSwitchCost: 10, searchAttemptCost: 5, failedSearchPenalty: 15, clueAnalysisCost: 8 }

    const caseDeliveryEvents = mailDeliveryEvents[caseId] || []
    
    gameState.value = {
      currentCase: caseId,
      sanity: finalMaxSanity,
      maxSanity: finalMaxSanity,
      discoveredEvidence: [],
      discoveredClues: [],
      analyzedClues: [],
      clueConnections: [],
      visitedScenes: [],
      gameLog: [],
      startTime: Date.now(),
      lastSaveTime: Date.now(),
      tools: startingTools,
      selectedToolId: startingTools.length > 0 ? startingTools[0].id : null,
      failedSearches: [],
      deductionBranches: [],
      characterProfileId: charId,
      triggeredEvents: [],
      unlockedHiddenEvidence: [],
      timerState: {
        remainingSeconds: timeLimit.totalSeconds,
        totalSeconds: timeLimit.totalSeconds,
        isRunning: true,
        isPaused: false,
        isExpired: false,
        timeBonusUsed: 0,
        lastActionTime: Date.now(),
        sceneSwitchCount: 0,
        searchAttemptCount: 0,
        failedSearchCount: 0,
        clueAnalysisCount: 0,
        evidenceRefreshCount: 0
      },
      anomalyState: createInitialAnomalyState(),
      inventory: {
        items: [],
        capacity: 500,
        unlocked: true
      },
      activeAnalyses: [],
      unlockedRecipes: [],
      craftingHistory: [],
      intelligenceState: createInitialIntelligenceState(),
      mailDeliveryEvents: JSON.parse(JSON.stringify(caseDeliveryEvents)),
      spiritualPollution: createInitialPollutionState(),
      clueAnnotations: [],
      clueConfidences: [],
      clueComparisons: [],
      deductionHints: [],
      comparisonMode: false,
      comparisonSelectedClues: []
    }

    startTimer()
    startPhase('phase-1')

    if (charId) {
      characterStore.incrementPlayCount(charId)
    }

    const bonusTools = startingTools.filter(t => !baseToolIds.includes(t.id))
    addLog('discovery', `开始调查案件：${caseData.title}`)
    
    if (characterStore.activeProfile) {
      addLog('discovery', `调查员：${characterStore.activeProfile.name} - ${characterStore.activeProfile.title}`)
    }
    
    addLog('tool_use', `携带工具：${startingTools.map(t => t.name).join('、')}`)
    if (bonusTools.length > 0) {
      addLog('discovery', `继承工具：${bonusTools.map(t => t.name).join('、')}`)
    }
    if (maxSanityBonus > 0) {
      addLog('discovery', `天赋加成：最大理智值 +${maxSanityBonus}`)
    }
    if (carriedSanityBonus > 0) {
      addLog('discovery', `🔄 二周目继承：最大理智值 +${carriedSanityBonus}`)
    }

    newGamePlusStore.checkSpecialEvidence()

    getInventoryStore().applyGlobalRecipeUnlocks()
    getInventoryStore().checkAndUnlockRecipes()

    setCaseStatus(caseId, 'in_progress')
    return true
  }

  function addPollution(
    shockAmount: number, 
    erosionAmount: number, 
    source: PollutionSource, 
    description: string
  ) {
    const state = gameState.value.spiritualPollution
    const prevErosion = state.longTermErosion
    
    const actualShock = Math.max(0, Math.min(state.maxShortTermShock - state.shortTermShock, shockAmount))
    const actualErosion = Math.max(0, Math.min(state.maxLongTermErosion - state.longTermErosion, erosionAmount))
    
    if (actualShock > 0) {
      state.shortTermShock += actualShock
    }
    if (actualErosion > 0) {
      state.longTermErosion += actualErosion
    }
    
    if (actualShock > 0 || actualErosion > 0) {
      const event: PollutionEvent = {
        id: `pollution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: actualShock > actualErosion ? 'short_term_shock' : 'long_term_erosion',
        amount: actualShock + actualErosion,
        source,
        description,
        timestamp: Date.now()
      }
      state.pollutionEvents.push(event)
      
      if (actualShock > 0 && actualErosion > 0) {
        addLog('sanity_loss', `⚠️ 精神冲击：惊吓 +${actualShock}，侵蚀 +${actualErosion} - ${description}`)
      } else if (actualShock > 0) {
        addLog('sanity_loss', `⚡ 短期惊吓 +${actualShock}：${description}`)
      } else if (actualErosion > 0) {
        addLog('sanity_loss', `🕳️ 长期侵蚀 +${actualErosion}：${description}`)
      }
    }
    
    checkCorruptionMilestones(prevErosion)
    checkLowSanityStreak()
  }

  function checkCorruptionMilestones(prevErosion: number) {
    const state = gameState.value.spiritualPollution
    
    for (const milestone of CORRUPTION_MILESTONES) {
      if (state.longTermErosion >= milestone.erosionThreshold && prevErosion < milestone.erosionThreshold) {
        if (!state.unlockedCorruptionMilestones.includes(milestone.id)) {
          state.unlockedCorruptionMilestones.push(milestone.id)
          addLog('sanity_loss', `🔮 精神污染里程碑达成：${milestone.name}`)
          addLog('sanity_loss', milestone.description)
          
          if (milestone.effects.maxSanityReduction) {
            addLog('sanity_loss', `最大理智值上限降低 ${milestone.effects.maxSanityReduction} 点`)
          }
          if (milestone.effects.sanityRecoveryPenalty) {
            addLog('sanity_loss', `理智恢复效率降低 ${milestone.effects.sanityRecoveryPenalty}%`)
          }
        }
      }
    }
  }

  function checkLowSanityStreak() {
    const state = gameState.value.spiritualPollution
    const sanityRatio = gameState.value.sanity / effectiveMaxSanity.value
    
    if (sanityRatio < 0.3) {
      state.lowSanityStreak++
      if (state.lowSanityStreak >= 3 && state.lowSanityStreak % 3 === 0) {
        const erosionGain = Math.round(state.lowSanityStreak / 3)
        addPollution(0, erosionGain, 'repeated_low_sanity', `连续${state.lowSanityStreak}次处于低理智状态，精神受到持续侵蚀`)
      }
    } else {
      state.lowSanityStreak = 0
    }
  }

  function decayPollution() {
    const state = gameState.value.spiritualPollution
    const now = Date.now()
    const elapsed = now - state.lastDecayTime
    
    if (elapsed < 30000) return
    
    const { shockDecay, erosionDecay } = calculateDecay(
      state, 
      elapsed, 
      gameState.value.sanity, 
      gameState.value.maxSanity
    )
    
    if (shockDecay > 0 || erosionDecay > 0) {
      state.shortTermShock = Math.max(0, state.shortTermShock - shockDecay)
      state.longTermErosion = Math.max(0, state.longTermErosion - erosionDecay)
      state.lastDecayTime = now
      
      if (shockDecay > 5 || erosionDecay > 2) {
        addLog('discovery', `🧘 精神状态平复：惊吓 -${shockDecay}，侵蚀 -${erosionDecay}`)
      }
    }
  }

  function modifySanity(amount: number, reason: string, sourceType: 'shock' | 'erosion' | 'mixed' = 'mixed') {
    let finalAmount = amount
    
    if (amount < 0) {
      const reductionPercent = talentEffects.value.sanityCostReduction
      const reduction = Math.abs(amount) * (reductionPercent / 100)
      finalAmount = -(Math.abs(amount) - reduction)
      
      const actualLoss = Math.abs(finalAmount)
      addLog('sanity_loss', `理智值下降 ${actualLoss} 点（天赋减免 ${Math.abs(amount) - actualLoss} 点）：${reason}`)
      
      const pollution = calculatePollutionFromSanityLoss(actualLoss, sourceType)
      const pollutionSource: PollutionSource = 
        reason.includes('证据') || reason.includes('禁忌') ? 'evidence_sanity_loss' :
        reason.includes('事件') ? 'scene_event' :
        reason.includes('时间') ? 'time_out' :
        reason.includes('推演') || reason.includes('结论') ? 'wrong_conclusion' :
        'evidence_sanity_loss'
      
      addPollution(pollution.shock, pollution.erosion, pollutionSource, reason)
    } else if (amount > 0) {
      const recoveryBonus = talentEffects.value.sanityRecoveryBonus
      const recoveryPenalty = milestoneEffects.value.sanityRecoveryPenalty
      
      const bonus = amount * (recoveryBonus / 100)
      const penalty = amount * (recoveryPenalty / 100)
      finalAmount = amount + bonus - penalty
      finalAmount = Math.max(0, finalAmount)
      
      const penaltyText = recoveryPenalty > 0 ? `（侵蚀惩罚 -${penalty.toFixed(1)} 点）` : ''
      const bonusText = recoveryBonus > 0 ? `（天赋加成 +${bonus.toFixed(1)} 点）` : ''
      if (bonusText || penaltyText) {
        addLog('discovery', `理智值恢复 ${finalAmount.toFixed(1)} 点${bonusText}${penaltyText}：${reason}`)
      } else {
        addLog('discovery', `理智值恢复 ${finalAmount} 点：${reason}`)
      }
    }
    
    gameState.value.sanity = Math.max(0, Math.min(effectiveMaxSanity.value, gameState.value.sanity + finalAmount))

    if (amount < 0) {
      checkAnomalyEvents()
    }
    
    decayPollution()

    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnSanityChange(gameState.value.sanity)

    if (gameState.value.sanity <= 0) {
      triggerCaseFailure()
      return 'insane'
    }
    
    return 'ok'
  }

  function triggerCaseFailure(): void {
    const caseId = gameState.value.currentCase
    if (!caseId) return

    addLog('sanity_loss', '💀 理智值归零，调查失败...')
    failCaseData(caseId)
    stopTimer()

    const progressStore = useProgressStore()
    progressStore.recordCaseFailure(caseId, gameState.value.maxSanity - gameState.value.sanity)
  }

  function abandonCurrentCase(): boolean {
    const caseId = gameState.value.currentCase
    if (!caseId) return false

    addLog('sanity_loss', '⏸️ 调查已搁置...')
    abandonCaseData(caseId)
    stopTimer()

    const progressStore = useProgressStore()
    progressStore.recordCaseAbandon(caseId)
    return true
  }

  function calculateHitRate(evidence: Evidence): HitRateResult {
    const baseRate = evidence.baseHitRate || 70
    let toolBonus = 0
    let durabilityPenalty = 0

    const selectedToolData = selectedTool.value
    
    if (selectedToolData && selectedToolData.uses > 0 && selectedToolData.durability > 0) {
      toolBonus = getToolEffectiveness(selectedToolData, evidence.type)
      durabilityPenalty = getDurabilityPenalty(selectedToolData.durability, selectedToolData.maxDurability)

      if (evidence.requiredTool && evidence.requiredTool === selectedToolData.id) {
        toolBonus += 20
      }

      if (evidence.toolBoost?.includes(selectedToolData.id)) {
        toolBonus += 10
      }
    }

    const talentBonus = talentEffects.value.evidenceHitRateBonus
    const sanityPenalty = getSanityPenalty(gameState.value.sanity, gameState.value.maxSanity)
    const pollutionPenalty = milestoneEffects.value.hitRatePenalty

    let finalRate = baseRate + toolBonus + talentBonus - durabilityPenalty - sanityPenalty - pollutionPenalty
    finalRate = Math.max(5, Math.min(95, finalRate))

    const isGuaranteed = finalRate >= 95
    const isImpossible = finalRate <= 5

    return {
      baseRate,
      toolBonus: toolBonus + talentBonus,
      durabilityPenalty,
      sanityPenalty: sanityPenalty + pollutionPenalty,
      finalRate,
      isGuaranteed,
      isImpossible
    }
  }

  function searchEvidence(evidence: Evidence): SearchResult {
    if (gameState.value.discoveredEvidence.includes(evidence.id)) {
      return {
        success: false,
        evidenceId: evidence.id,
        hitRate: 100,
        durabilityLost: 0,
        message: '该证据已经被发现了'
      }
    }

    if (evidence.requiredTool && !canDiscoverEvidence(evidence)) {
      return {
        success: false,
        evidenceId: evidence.id,
        hitRate: 0,
        durabilityLost: 0,
        message: '需要特定工具才能发现这个证据'
      }
    }

    if (gameState.value.timerState.isExpired) {
      return {
        success: false,
        evidenceId: evidence.id,
        hitRate: 0,
        durabilityLost: 0,
        message: '⏰ 搜证时间已到，无法继续搜查'
      }
    }

    const hitRateResult = calculateHitRate(evidence)
    const selectedToolData = selectedTool.value
    let durabilityLost = 0
    const searchAttemptCost = currentCase.value?.timeLimit?.searchAttemptCost || 5
    const failedSearchPenalty = currentCase.value?.timeLimit?.failedSearchPenalty || 15

    gameState.value.timerState.searchAttemptCount++
    consumeTime(searchAttemptCost, `搜查证据：${evidence.name}`)

    if (selectedToolData && selectedToolData.uses > 0 && selectedToolData.durability > 0) {
      const baseDurabilityLoss = Math.floor(Math.random() * 5) + 3
      const durabilityReductionPercent = talentEffects.value.toolDurabilityBonus
      const reducedDurabilityLoss = Math.max(1, Math.floor(baseDurabilityLoss * (1 - durabilityReductionPercent / 100)))
      durabilityLost = reducedDurabilityLoss
      consumeToolDurability(selectedToolData.id, 1, reducedDurabilityLoss)
    }

    const roll = Math.random() * 100
    const success = roll < hitRateResult.finalRate

    let result: SearchResult
    
    if (success) {
      discoverEvidence(evidence.id, evidence.sanityEffect)
      
      if (evidence.hiddenClues) {
        evidence.hiddenClues.forEach(clueId => {
          discoverClue(clueId)
        })
      }

      if (evidence.isSpecial) {
        const bonusTime = currentCase.value?.timeLimit?.specialEventBonus || 30
        addTimeBonus(bonusTime, `发现特殊证据：${evidence.name}`)
      }

      addLog('tool_use', `使用 ${selectedToolData?.name || '徒手搜查'} 成功发现 ${evidence.name}`)

      result = {
        success: true,
        evidenceId: evidence.id,
        hitRate: hitRateResult.finalRate,
        toolUsed: selectedToolData?.id,
        durabilityLost,
        message: `成功发现：${evidence.name}`
      }
    } else {
      if (!gameState.value.failedSearches.includes(evidence.id)) {
        gameState.value.failedSearches.push(evidence.id)
      }
      
      gameState.value.timerState.failedSearchCount++
      consumeTime(failedSearchPenalty, `搜查失败惩罚：${evidence.name}`)
      addLog('penalty', `搜查 ${evidence.name} 失败，额外消耗 ${failedSearchPenalty} 秒`)
      addLog('tool_use', `搜查 ${evidence.name} 失败（成功率 ${hitRateResult.finalRate}%）`)

      result = {
        success: false,
        evidenceId: evidence.id,
        hitRate: hitRateResult.finalRate,
        toolUsed: selectedToolData?.id,
        durabilityLost,
        message: '搜查失败，再试一次吧...'
      }
    }
    
    if (success) {
      checkEvidenceRefresh('after_discover_evidence', { evidenceId: evidence.id })
    }
    checkEvidenceRefresh('after_search', { evidenceId: evidence.id, success })
    
    return result
  }

  function canDiscoverEvidence(evidence: Evidence): boolean {
    if (!evidence.requiredTool) return true
    
    return gameState.value.tools.some(t => 
      t.id === evidence.requiredTool && t.uses > 0 && t.durability > 0
    )
  }

  function discoverEvidence(evidenceId: string, sanityEffect: number) {
    if (gameState.value.discoveredEvidence.includes(evidenceId)) return false

    gameState.value.discoveredEvidence.push(evidenceId)
    addLog('discovery', `发现新证据：${evidenceId}`)
    
    if (sanityEffect !== 0) {
      modifySanity(sanityEffect, '接触禁忌知识')
    }

    const caseData = currentCase.value
    if (caseData) {
      for (const scene of caseData.scenes) {
        const evidence = scene.evidence.find(e => e.id === evidenceId)
        if (evidence && evidence.materialDrops && evidence.materialDrops.length > 0) {
          getInventoryStore().dropMaterialsFromEvidence(evidenceId, evidence.materialDrops)
        }
      }
    }

    getInventoryStore().checkAndUnlockRecipes()

    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnEvidence(evidenceId)

    checkSceneUnlockConditionsForAll()
    checkPhaseProgression()
    checkMailDelivery('evidence_discovered', evidenceId)
    updateDeductionCompleteness()

    return true
  }

  function discoverClue(clueId: string) {
    if (gameState.value.discoveredClues.includes(clueId)) return false

    gameState.value.discoveredClues.push(clueId)
    addLog('discovery', `获得新线索：${clueId}`)
    getInventoryStore().checkAndUnlockRecipes()
    
    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnClue(clueId, false)
    
    return true
  }

  function analyzeClue(clueId: string, result: string): { 
    success: boolean
    bonusCluesDiscovered: string[]
    autoConnections: ClueConnection[]
    sanitySaved: number
    extraInsight: string | null
  } {
    if (gameState.value.analyzedClues.includes(clueId)) {
      return { success: false, bonusCluesDiscovered: [], autoConnections: [], sanitySaved: 0, extraInsight: null }
    }

    if (gameState.value.timerState.isExpired) {
      return { success: false, bonusCluesDiscovered: [], autoConnections: [], sanitySaved: 0, extraInsight: null }
    }

    const clueAnalysisCost = currentCase.value?.timeLimit?.clueAnalysisCost || 8
    consumeTime(clueAnalysisCost, `分析线索：${clueId}`)
    gameState.value.timerState.clueAnalysisCount++

    const analysisSpeedBonus = talentEffects.value.clueAnalysisSpeed
    const activeProfile = characterStore.activeProfile
    const wisdomBonus = activeProfile ? (activeProfile.stats.wisdom - 50) * 0.3 : 0
    const totalAnalysisBonus = analysisSpeedBonus + wisdomBonus
    
    gameState.value.analyzedClues.push(clueId)
    
    const bonusCluesDiscovered: string[] = []
    const autoConnections: ClueConnection[] = []
    let sanitySaved = 0
    let extraInsight: string | null = null
    
    if (totalAnalysisBonus >= 50) {
      extraInsight = '深度分析：你注意到了常人容易忽略的细节。'
    }
    
    if (totalAnalysisBonus >= 30) {
      const sanityReduction = Math.min(5, Math.floor(totalAnalysisBonus / 15))
      sanitySaved = sanityReduction
    }
    
    if (totalAnalysisBonus >= 20) {
      const discoveryChance = Math.min(60, totalAnalysisBonus * 1.5)
      if (Math.random() * 100 < discoveryChance) {
        const allClues = currentCase.value?.clues || []
        const undiscoveredClues = allClues.filter(c => 
          !gameState.value.discoveredClues.includes(c.id) && 
          c.importance >= 3
        )
        if (undiscoveredClues.length > 0) {
          const randomClue = undiscoveredClues[Math.floor(Math.random() * undiscoveredClues.length)]
          discoverClue(randomClue.id)
          bonusCluesDiscovered.push(randomClue.id)
        }
      }
    }
    
    if (totalAnalysisBonus >= 40) {
      const connectionChance = Math.min(50, (totalAnalysisBonus - 30) * 2.5)
      if (Math.random() * 100 < connectionChance) {
        const analyzedClue = currentCase.value?.clues.find(c => c.id === clueId)
        if (analyzedClue && analyzedClue.connections.length > 0) {
          for (const connId of analyzedClue.connections) {
            if (gameState.value.discoveredClues.includes(connId)) {
              const existingConnection = gameState.value.clueConnections.some(
                c => (c.clue1Id === clueId && c.clue2Id === connId) ||
                     (c.clue1Id === connId && c.clue2Id === clueId)
              )
              if (!existingConnection) {
                const connection: ClueConnection = {
                  clue1Id: clueId,
                  clue2Id: connId,
                  relationship: '分析推断',
                  confirmed: false
                }
                gameState.value.clueConnections.push(connection)
                autoConnections.push(connection)
              }
            }
          }
        }
      }
    }
    
    let logMessage = `分析线索：${clueId} - ${result}`
    if (totalAnalysisBonus > 0) {
      logMessage += `（分析效率 +${totalAnalysisBonus.toFixed(0)}%）`
    }
    if (bonusCluesDiscovered.length > 0) {
      logMessage += ` [额外发现线索]`
    }
    if (autoConnections.length > 0) {
      logMessage += ` [自动建立关联]`
    }
    addLog('analysis', logMessage)
    
    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnClue(clueId, true)
    
    checkEvidenceRefresh('after_analyze_clue', { clueId })
    checkSceneUnlockConditionsForAll()
    checkPhaseProgression()
    checkMailDelivery('clue_analyzed', clueId)
    updateDeductionCompleteness()
    
    return { 
      success: true, 
      bonusCluesDiscovered, 
      autoConnections, 
      sanitySaved,
      extraInsight 
    }
  }

  function addClueConnection(connection: ClueConnection) {
    const exists = gameState.value.clueConnections.some(
      c => (c.clue1Id === connection.clue1Id && c.clue2Id === connection.clue2Id) ||
           (c.clue1Id === connection.clue2Id && c.clue2Id === connection.clue1Id)
    )
    
    if (!exists) {
      gameState.value.clueConnections.push(connection)
      addLog('connection', `建立线索关联：${connection.clue1Id} ↔ ${connection.clue2Id}`)
    }
  }

  function isEvidenceVisible(evidence: Evidence): boolean {
    if (!evidence.isInitiallyHidden) return true
    if (gameState.value.unlockedHiddenEvidence.includes(evidence.id)) return true
    
    const newGamePlusStore = useNewGamePlusStore()
    return newGamePlusStore.isEvidenceUnlocked(evidence.id)
  }

  function unlockHiddenEvidence(evidenceId: string, reason: string) {
    if (gameState.value.unlockedHiddenEvidence.includes(evidenceId)) return false
    
    gameState.value.unlockedHiddenEvidence.push(evidenceId)
    gameState.value.timerState.evidenceRefreshCount++
    addLog('evidence_refresh', `发现新的可调查物：${evidenceId}（${reason}）`)
    return true
  }

  function checkEvidenceRefresh(triggerType: string, _context?: Record<string, unknown>) {
    const caseData = currentCase.value
    if (!caseData) return

    const newlyUnlocked: string[] = []

    for (const scene of caseData.scenes) {
      for (const evidence of scene.evidence) {
        if (!evidence.isInitiallyHidden) continue
        if (gameState.value.unlockedHiddenEvidence.includes(evidence.id)) continue
        if (!evidence.discoveryTrigger) continue

        const trigger = evidence.discoveryTrigger
        let shouldUnlock = false
        let unlockReason = ''

        switch (trigger.type) {
          case 'clue_analyzed':
            if (triggerType === 'after_analyze_clue' && trigger.requiredClueId) {
              if (gameState.value.analyzedClues.includes(trigger.requiredClueId)) {
                shouldUnlock = true
                unlockReason = `分析线索后解锁`
              }
            }
            break

          case 'evidence_discovered':
            if (triggerType === 'after_discover_evidence' && trigger.requiredEvidenceId) {
              if (gameState.value.discoveredEvidence.includes(trigger.requiredEvidenceId)) {
                shouldUnlock = true
                unlockReason = `发现关联证据后解锁`
              }
            }
            break

          case 'scene_visited_count':
            if (triggerType === 'after_scene_switch' && trigger.requiredSceneVisitCount && trigger.sceneId) {
              const visitCount = gameState.value.visitedScenes.filter(s => s === trigger.sceneId).length
              if (visitCount >= trigger.requiredSceneVisitCount) {
                shouldUnlock = true
                unlockReason = `多次探索场景后解锁`
              }
            }
            break

          case 'search_attempt_count':
            if (triggerType === 'after_search' && trigger.requiredSearchAttempts) {
              if (gameState.value.timerState.searchAttemptCount >= trigger.requiredSearchAttempts) {
                const chance = trigger.chance || 100
                if (Math.random() * 100 < chance) {
                  shouldUnlock = true
                  unlockReason = `深入搜查后解锁`
                }
              }
            }
            break

          case 'random_after_search':
            if (triggerType === 'after_search') {
              const chance = trigger.chance || 10
              if (Math.random() * 100 < chance) {
                shouldUnlock = true
                unlockReason = `随机发现`
              }
            }
            break

          case 'evidence_combo':
            if (triggerType === 'after_discover_evidence' || triggerType === 'after_search') {
              if (trigger.requiredEvidenceIds && trigger.requiredEvidenceIds.length > 0) {
                const hasAll = trigger.requiredEvidenceIds.every(eid =>
                  gameState.value.discoveredEvidence.includes(eid)
                )
                if (hasAll) {
                  shouldUnlock = true
                  unlockReason = `收集到关键证据组合后解锁`
                }
              }
            }
            break
        }

        if (shouldUnlock) {
          unlockHiddenEvidence(evidence.id, unlockReason)
          newlyUnlocked.push(evidence.id)
        }
      }
    }

    return newlyUnlocked
  }

  function visitScene(sceneId: string) {
    const sceneSwitchCost = currentCase.value?.timeLimit?.sceneSwitchCost || 10
    const isFirstVisit = !gameState.value.visitedScenes.includes(sceneId)
    
    gameState.value.visitedScenes.push(sceneId)
    
    if (isFirstVisit) {
      addLog('discovery', `探索新场景：${sceneId}`)
      consumeTime(sceneSwitchCost, `首次进入场景：${sceneId}`)
      gameState.value.timerState.sceneSwitchCount++
      triggerRandomEvents('scene_enter')
    } else {
      consumeTime(Math.floor(sceneSwitchCost * 0.5), `切换场景：${sceneId}`)
      gameState.value.timerState.sceneSwitchCount++
      triggerRandomEvents('random')
    }
    addLog('scene_switch', `场景切换：${sceneId}，消耗时间 ${isFirstVisit ? sceneSwitchCost : Math.floor(sceneSwitchCost * 0.5)} 秒`)
    triggerRandomEvents('talent_based')
    triggerRandomEvents('sanity_level')
    
    checkEvidenceRefresh('after_scene_switch', { sceneId })
    checkMailDelivery('scene_visited', sceneId)
  }

  function triggerRandomEvents(triggerType: SceneEvent['triggerCondition']['type']) {
    const availableEvents = getEventsForTrigger(
      triggerType,
      currentTalentIds.value,
      gameState.value.sanity
    )
    
    const eventTriggerBonus = talentEffects.value.eventTriggerChance
    
    for (const event of availableEvents) {
      if (gameState.value.triggeredEvents.includes(event.id)) continue
      
      if (checkEventTrigger(event, currentTalentIds.value, eventTriggerBonus)) {
        triggerEvent(event)
        break
      }
    }
  }

  function triggerEvent(event: SceneEvent): boolean {
    if (gameState.value.triggeredEvents.includes(event.id)) return false
    
    event.triggered = true
    gameState.value.triggeredEvents.push(event.id)
    
    addLog('discovery', `触发事件：${event.name}`)
    addLog('discovery', event.description)
    
    if (event.effects.sanity !== undefined) {
      if (event.effects.sanity > 0) {
        modifySanity(event.effects.sanity, `事件：${event.name}`)
      } else {
        modifySanity(event.effects.sanity, `事件：${event.name}`)
      }
    }
    
    if (event.effects.clueDiscovery) {
      event.effects.clueDiscovery.forEach(clueId => {
        discoverClue(clueId)
      })
    }
    
    if (event.effects.evidenceBonus) {
      addLog('discovery', `证据发现率临时提升 ${event.effects.evidenceBonus}%`)
    }
    
    return true
  }

  function hasTriggeredEvent(eventId: string): boolean {
    return gameState.value.triggeredEvents.includes(eventId)
  }

  const sanityTier = computed(() => {
    return getSanityTier(gameState.value.sanity, gameState.value.maxSanity)
  })

  const activeHallucinations = computed(() => {
    return gameState.value.anomalyState.activeHallucinations
  })

  const activeMisleadingClues = computed(() => {
    return gameState.value.anomalyState.activeMisleadingClues.filter(c => !c.isDisproven)
  })

  const activeFakeDeductions = computed(() => {
    return gameState.value.anomalyState.activeFakeDeductions.filter(d => !d.isDisproven)
  })

  function checkAnomalyEvents() {
    const now = Date.now()
    const anomalyState = gameState.value.anomalyState
    
    if (now - anomalyState.lastAnomalyCheck < 5000) return
    
    anomalyState.lastAnomalyCheck = now
    
    const availableEvents = getAvailableAnomalyEvents(
      gameState.value.sanity,
      gameState.value.maxSanity,
      anomalyState.anomalyCooldowns,
      now
    )
    
    const eventTriggerBonus = talentEffects.value.eventTriggerChance + milestoneEffects.value.anomalyEventBonus
    
    for (const event of availableEvents) {
      if (checkAnomalyTrigger(event, gameState.value.sanity, gameState.value.maxSanity, eventTriggerBonus)) {
        triggerAnomalyEvent(event)
        break
      }
    }
    
    cleanupExpiredAnomalies()
  }

  function triggerAnomalyEvent(event: AnomalyEvent): boolean {
    const anomalyState = gameState.value.anomalyState
    
    if (anomalyState.anomalyEventHistory.includes(event.id)) {
      const lastTriggered = anomalyState.anomalyCooldowns[event.id] || 0
      if (Date.now() - lastTriggered < event.cooldown) return false
    }
    
    event.triggered = true
    event.lastTriggeredAt = Date.now()
    anomalyState.anomalyEventHistory.push(event.id)
    anomalyState.anomalyCooldowns[event.id] = Date.now()
    
    addLog('discovery', `⚠️ ${event.name}`)
    addLog('discovery', event.description)

    const tierMultiplier: Record<string, number> = {
      normal: 1,
      mild: 1.5,
      moderate: 2,
      severe: 3,
      critical: 4
    }
    const multiplier = tierMultiplier[event.sanityTier] || 1
    addPollution(
      Math.round(8 * multiplier),
      Math.round(3 * multiplier),
      'anomaly_event',
      `异常事件：${event.name}`
    )
    
    if (event.effects.hallucination) {
      addHallucination(event.effects.hallucination)
    }
    
    if (event.effects.misleadingClue) {
      addMisleadingClue(event.effects.misleadingClue)
    }
    
    if (event.effects.extraLog) {
      addFakeLog(event.effects.extraLog)
    }
    
    if (event.effects.deductionCandidate) {
      addFakeDeduction(event.effects.deductionCandidate)
    }
    
    return true
  }

  function addHallucination(hallucination: HallucinationEffect) {
    gameState.value.anomalyState.activeHallucinations.push({
      ...hallucination,
      duration: hallucination.duration
    })
    
    setTimeout(() => {
      removeHallucination(hallucination)
    }, hallucination.duration)
  }

  function removeHallucination(hallucination: HallucinationEffect) {
    const index = gameState.value.anomalyState.activeHallucinations.findIndex(
      h => h.visualType === hallucination.visualType && h.intensity === hallucination.intensity
    )
    if (index > -1) {
      gameState.value.anomalyState.activeHallucinations.splice(index, 1)
    }
  }

  function addMisleadingClue(clue: MisleadingClue) {
    const exists = gameState.value.anomalyState.activeMisleadingClues.some(
      c => c.fakeClueId === clue.fakeClueId && !c.isDisproven
    )
    if (exists) return
    
    gameState.value.anomalyState.activeMisleadingClues.push({ ...clue })
    gameState.value.discoveredClues.push(clue.fakeClueId)
    
    addLog('discovery', `获得新线索：${clue.fakeClueName}`)
  }

  function disproveMisleadingClue(clueId: string): boolean {
    const clue = gameState.value.anomalyState.activeMisleadingClues.find(
      c => c.fakeClueId === clueId
    )
    if (!clue) return false
    
    clue.isDisproven = true
    
    const index = gameState.value.discoveredClues.indexOf(clueId)
    if (index > -1) {
      gameState.value.discoveredClues.splice(index, 1)
    }
    
    addLog('discovery', `证实线索为幻觉：${clue.fakeClueName}`)
    modifySanity(5, '证伪幻觉线索')
    
    return true
  }

  function addFakeLog(fakeLog: { logType: GameLogEntry['type']; description: string; details?: Record<string, unknown>; isFake: boolean }) {
    const entry: GameLogEntry = {
      id: `log-fake-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now() - Math.floor(Math.random() * 60000),
      type: fakeLog.logType,
      description: fakeLog.description,
      details: { ...fakeLog.details, isFake: true }
    }
    gameState.value.gameLog.push(entry)
    gameState.value.anomalyState.activeFakeLogs.push(fakeLog)
  }

  function addFakeDeduction(deduction: DeductionCandidateChange) {
    const exists = gameState.value.anomalyState.activeFakeDeductions.some(
      d => d.fakeOptionId === deduction.fakeOptionId && !d.isDisproven
    )
    if (exists) return
    
    gameState.value.anomalyState.activeFakeDeductions.push({ ...deduction })
  }

  function disproveFakeDeduction(optionId: string): boolean {
    const deduction = gameState.value.anomalyState.activeFakeDeductions.find(
      d => d.fakeOptionId === optionId
    )
    if (!deduction) return false
    
    deduction.isDisproven = true
    addLog('discovery', `证伪推演选项：${deduction.fakeOptionText}`)
    modifySanity(3, '证伪虚假推演')
    
    return true
  }

  function isFakeClue(clueId: string): boolean {
    return gameState.value.anomalyState.activeMisleadingClues.some(
      c => c.fakeClueId === clueId && !c.isDisproven
    )
  }

  function isFakeDeductionOption(optionId: string): boolean {
    return gameState.value.anomalyState.activeFakeDeductions.some(
      d => d.fakeOptionId === optionId && !d.isDisproven
    )
  }

  function cleanupExpiredAnomalies() {
    const now = Date.now()
    
    gameState.value.anomalyState.activeMisleadingClues = 
      gameState.value.anomalyState.activeMisleadingClues.filter(c => {
        if (c.expiresAt && now > c.expiresAt) {
          const index = gameState.value.discoveredClues.indexOf(c.fakeClueId)
          if (index > -1) {
            gameState.value.discoveredClues.splice(index, 1)
          }
          return false
        }
        return true
      })
    
    gameState.value.anomalyState.activeFakeDeductions = 
      gameState.value.anomalyState.activeFakeDeductions.filter(d => {
        if (d.expiresAt && now > d.expiresAt) {
          return false
        }
        return true
      })
  }

  function getMisleadingClueById(clueId: string): MisleadingClue | undefined {
    return gameState.value.anomalyState.activeMisleadingClues.find(
      c => c.fakeClueId === clueId
    )
  }

  function selectTool(toolId: string | null) {
    if (toolId === null) {
      gameState.value.selectedToolId = null
      return
    }
    
    const tool = gameState.value.tools.find(t => t.id === toolId)
    if (tool && tool.uses > 0 && tool.durability > 0) {
      gameState.value.selectedToolId = toolId
    }
  }

  function addTool(toolId: string): boolean {
    const existing = gameState.value.tools.find(t => t.id === toolId)
    if (existing) {
      existing.uses = Math.min(existing.maxUses, existing.uses + Math.floor(existing.maxUses * 0.5))
      addLog('tool_use', `补充了 ${existing.name} 的使用次数`)
      return true
    }

    const newTool = createToolInstance(toolId)
    if (newTool) {
      gameState.value.tools.push(newTool)
      addLog('tool_use', `获得新工具：${newTool.name}`)
      return true
    }
    return false
  }

  function consumeToolDurability(toolId: string, usesConsumed: number, durabilityConsumed: number): boolean {
    const tool = gameState.value.tools.find(t => t.id === toolId)
    if (!tool) return false

    tool.uses = Math.max(0, tool.uses - usesConsumed)
    tool.durability = Math.max(0, tool.durability - durabilityConsumed)

    if (tool.durability <= 0) {
      addLog('tool_break', `工具损坏：${tool.name}`)
    }

    gameState.value.lastSaveTime = Date.now()
    return true
  }

  function repairTool(toolId: string): boolean {
    const tool = gameState.value.tools.find(t => t.id === toolId)
    if (!tool || !tool.repairable) return false

    const oldDurability = tool.durability
    tool.durability = tool.maxDurability
    tool.uses = Math.min(tool.maxUses, tool.uses + Math.floor(tool.maxUses * 0.3))

    addLog('tool_repair', `修复了 ${tool.name}（耐久度：${oldDurability} → ${tool.durability}）`)
    return true
  }

  function addLog(type: GameLogEntry['type'], description: string, details?: Record<string, unknown>) {
    const entry: GameLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      type,
      description,
      details
    }
    gameState.value.gameLog.push(entry)
    gameState.value.lastSaveTime = Date.now()
  }

  function getGameState(): GameState {
    return { ...gameState.value }
  }

  function loadGameState(state: GameState) {
    gameState.value = { ...state }
    
    if (state.characterProfileId) {
      characterStore.setActiveProfile(state.characterProfileId)
    }
  }

  function unlockDeductionBranch(branchId: string) {
    if (!gameState.value.deductionBranches.includes(branchId)) {
      gameState.value.deductionBranches.push(branchId)
      addLog('conclusion', `解锁推演分支：${branchId}`)
    }
  }

  function hasDeductionBranch(branchId: string): boolean {
    return gameState.value.deductionBranches.includes(branchId)
  }

  function startTimer() {
    if (timerInterval) {
      clearInterval(timerInterval)
    }
    
    gameState.value.timerState.isRunning = true
    gameState.value.timerState.isPaused = false
    
    timerInterval = setInterval(() => {
      if (gameState.value.timerState.isPaused || !gameState.value.timerState.isRunning) {
        return
      }
      
      if (gameState.value.timerState.remainingSeconds > 0) {
        gameState.value.timerState.remainingSeconds--
        
        if (gameState.value.timerState.remainingSeconds <= 0) {
          handleTimeExpired()
        }
      }
    }, 1000)
  }

  function pauseTimer() {
    gameState.value.timerState.isPaused = true
    addLog('timer', '计时器已暂停')
  }

  function resumeTimer() {
    gameState.value.timerState.isPaused = false
    addLog('timer', '计时器已恢复')
  }

  function stopTimer() {
    gameState.value.timerState.isRunning = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
  }

  function consumeTime(seconds: number, reason: string) {
    if (gameState.value.timerState.isExpired) return
    
    gameState.value.timerState.remainingSeconds = Math.max(0, gameState.value.timerState.remainingSeconds - seconds)
    gameState.value.timerState.lastActionTime = Date.now()
    
    addLog('timer', `消耗时间 ${seconds} 秒：${reason}`)
    
    if (gameState.value.timerState.remainingSeconds <= 0) {
      handleTimeExpired()
    }
  }

  function addTimeBonus(seconds: number, reason: string) {
    gameState.value.timerState.remainingSeconds = Math.min(
      gameState.value.timerState.totalSeconds,
      gameState.value.timerState.remainingSeconds + seconds
    )
    gameState.value.timerState.timeBonusUsed += seconds
    
    addLog('bonus', `时间奖励 +${seconds} 秒：${reason}`)
  }

  function handleTimeExpired() {
    gameState.value.timerState.remainingSeconds = 0
    gameState.value.timerState.isExpired = true
    gameState.value.timerState.isRunning = false
    
    stopTimer()
    
    const sanityPenalty = 20
    modifySanity(-sanityPenalty, '搜证时间耗尽')
    
    addLog('timeout', `⚠️ 搜证时间已耗尽！理智值 -${sanityPenalty}`)
    addLog('penalty', `时间到惩罚：理智值大幅下降，结案评分将受影响`)
  }

  function getUsedTime(): number {
    return gameState.value.timerState.totalSeconds - gameState.value.timerState.remainingSeconds
  }

  function getEndingDescriptor(isCorrectConclusion: boolean): EndingDescriptor {
    return determineEndingAlignment(
      gameState.value.spiritualPollution,
      gameState.value.sanity,
      gameState.value.maxSanity,
      isCorrectConclusion
    )
  }

  function calculateScore(
    isCorrectConclusion: boolean,
    _conclusionOptionId: string,
    branchId?: string
  ): CaseScoreBreakdown {
    const caseData = currentCase.value
    if (!caseData) {
      return {
        evidenceScore: 0,
        clueScore: 0,
        deductionScore: 0,
        timeScore: 0,
        sanityScore: 0,
        bonusScore: 0,
        penaltyScore: 0,
        totalScore: 0,
        grade: 'F',
        gradeDescription: '数据缺失，无法评分'
      }
    }

    const ending = getEndingDescriptor(isCorrectConclusion)
    addLog('conclusion', `🏆 结局倾向：${ending.name}`)
    addLog('conclusion', ending.description)

    const totalEvidence = caseData.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
    const discoveredEvidence = gameState.value.discoveredEvidence.length
    const evidenceRatio = totalEvidence > 0 ? discoveredEvidence / totalEvidence : 0
    const evidenceScore = Math.round(evidenceRatio * DEFAULT_SCORE_CONFIG.evidenceWeight * 100 / 30)

    const totalClues = caseData.clues.length
    const discoveredClues = gameState.value.discoveredClues.length
    const clueRatio = totalClues > 0 ? discoveredClues / totalClues : 0
    const clueScore = Math.round(clueRatio * DEFAULT_SCORE_CONFIG.clueWeight * 100 / 20)

    const analyzedRatio = discoveredClues > 0 ? gameState.value.analyzedClues.length / discoveredClues : 0
    const connectionBonus = Math.min(gameState.value.clueConnections.length * 2, 10)
    const deductionBaseScore = isCorrectConclusion ? DEFAULT_SCORE_CONFIG.deductionWeight * 100 / 20 : 0
    const deductionScore = Math.round(deductionBaseScore * (0.5 + analyzedRatio * 0.5)) + connectionBonus

    const usedTime = getUsedTime()
    const totalTime = gameState.value.timerState.totalSeconds || caseData.timeLimit.totalSeconds
    const timeRatio = totalTime > 0 ? Math.max(0, 1 - usedTime / totalTime) : 0
    const timeScore = Math.round(timeRatio * DEFAULT_SCORE_CONFIG.timeWeight * 100 / 15)

    const sanityRatio = gameState.value.sanity / gameState.value.maxSanity
    const sanityScore = Math.round(sanityRatio * DEFAULT_SCORE_CONFIG.sanityWeight * 100 / 15)

    let bonusScore = 0
    const specialEvidenceCount = caseData.scenes.reduce(
      (sum, s) => sum + s.evidence.filter(e => e.isSpecial && gameState.value.discoveredEvidence.includes(e.id)).length,
      0
    )
    bonusScore += specialEvidenceCount * 5
    
    const hiddenEvidenceCount = caseData.scenes.reduce(
      (sum, s) => sum + s.evidence.filter(e => e.isInitiallyHidden && gameState.value.discoveredEvidence.includes(e.id)).length,
      0
    )
    bonusScore += hiddenEvidenceCount * 8
    
    const unlockedBranches = gameState.value.deductionBranches.length
    bonusScore += unlockedBranches * 8
    
    if (branchId === 'deep-truth') {
      bonusScore += 15
    }

    const intelligenceCompleteness = gameState.value.intelligenceState.deductionInfoCompleteness
    if (intelligenceCompleteness >= 75) {
      bonusScore += 10
    } else if (intelligenceCompleteness >= 50) {
      bonusScore += 5
    }
    
    bonusScore = Math.round(bonusScore * DEFAULT_SCORE_CONFIG.bonusMultiplier)

    let penaltyScore = 0
    if (gameState.value.timerState.isExpired) {
      penaltyScore += 25
    }
    
    const failedSearchRate = gameState.value.timerState.searchAttemptCount > 0
      ? gameState.value.timerState.failedSearchCount / gameState.value.timerState.searchAttemptCount
      : 0
    penaltyScore += Math.round(failedSearchRate * 15)
    
    penaltyScore += gameState.value.timerState.sceneSwitchCount * 0.5
    
    if (!isCorrectConclusion) {
      penaltyScore += 10
    }

    const erosionPenalty = Math.round(gameState.value.spiritualPollution.longTermErosion * 0.15)
    if (erosionPenalty > 0) {
      penaltyScore += erosionPenalty
      addLog('penalty', `长期侵蚀惩罚：-${erosionPenalty} 分`)
    }

    const shockBonus = gameState.value.spiritualPollution.shortTermShock < 30 ? 5 : 0
    if (shockBonus > 0) {
      bonusScore += shockBonus
      addLog('bonus', `精神状态良好奖励：+${shockBonus} 分`)
    }
    
    penaltyScore = Math.round(penaltyScore * DEFAULT_SCORE_CONFIG.penaltyMultiplier)

    const endingModifier = ending.scoreModifier
    let totalScore = evidenceScore + clueScore + deductionScore + timeScore + sanityScore + bonusScore - penaltyScore + endingModifier
    totalScore = Math.max(0, Math.min(100, totalScore))

    const gradeDescriptions: Record<ScoreGrade, string> = {
      'S': `完美调查！${ending.name}：${ending.description}`,
      'A': `出色的调查！${ending.name}：${ending.description}`,
      'B': `良好的调查！${ending.name}：${ending.description}`,
      'C': `合格的调查！${ending.name}：${ending.description}`,
      'D': `勉强通过...${ending.name}：${ending.description}`,
      'F': `调查失败...${ending.name}：${ending.description}`
    }

    let grade: ScoreGrade = 'F'
    const thresholds = DEFAULT_SCORE_CONFIG.gradeThresholds
    if (totalScore >= thresholds.S) grade = 'S'
    else if (totalScore >= thresholds.A) grade = 'A'
    else if (totalScore >= thresholds.B) grade = 'B'
    else if (totalScore >= thresholds.C) grade = 'C'
    else if (totalScore >= thresholds.D) grade = 'D'

    addLog('conclusion', `案件评分：${grade}级 (${totalScore}分) [结局修正：${endingModifier > 0 ? '+' : ''}${endingModifier}]`, {
      breakdown: { evidenceScore, clueScore, deductionScore, timeScore, sanityScore, bonusScore, penaltyScore },
      ending: ending.id
    })

    if (ending.unlocksBranches) {
      for (const branch of ending.unlocksBranches) {
        if (!gameState.value.deductionBranches.includes(branch)) {
          unlockDeductionBranch(branch)
        }
      }
    }

    return {
      evidenceScore,
      clueScore,
      deductionScore,
      timeScore,
      sanityScore,
      bonusScore,
      penaltyScore,
      totalScore,
      grade,
      gradeDescription: gradeDescriptions[grade]
    }
  }

  const mailSystem = computed(() => {
    if (!gameState.value.currentCase) return null
    return getMailSystemByCaseId(gameState.value.currentCase)
  })

  const currentPhase = computed(() => {
    if (!mailSystem.value || !gameState.value.intelligenceState.currentPhaseId) return null
    return mailSystem.value.phases.find(p => p.id === gameState.value.intelligenceState.currentPhaseId) || null
  })

  const availableMails = computed(() => {
    if (!mailSystem.value) return []
    const phaseId = gameState.value.intelligenceState.currentPhaseId
    if (!phaseId) return []
    
    const deliveredMailIds = gameState.value.mailDeliveryEvents
      .filter(e => e.delivered)
      .map(e => e.mailId)
    
    return mailSystem.value.mails.filter(m => 
      m.phaseId === phaseId && deliveredMailIds.includes(m.id)
    ).sort((a, b) => b.sentAt - a.sentAt)
  })

  const unreadMailCount = computed(() => {
    return availableMails.value.filter(m => !m.isRead).length
  })

  const availableDocuments = computed(() => {
    if (!mailSystem.value) return []
    const phaseId = gameState.value.intelligenceState.currentPhaseId
    if (!phaseId) return []
    
    return mailSystem.value.documents.filter(d => d.phaseId === phaseId)
  })

  const unreadDocumentCount = computed(() => {
    return availableDocuments.value.filter(d => !d.isRead).length
  })

  const allPhases = computed(() => {
    if (!gameState.value.currentCase) return []
    return getPhasesForCase(gameState.value.currentCase)
  })

  const nextPhase = computed(() => {
    if (!currentPhase.value) return null
    return allPhases.value.find(p => p.phaseNumber === currentPhase.value!.phaseNumber + 1) || null
  })

  const overallProgress = computed(() => {
    if (!allPhases.value || allPhases.value.length === 0) return 0
    const completedPhases = allPhases.value.filter(p => p.isCompleted).length
    const currentPhaseProgress = currentPhase.value?.intelligenceLevel || 0
    const total = (completedPhases / allPhases.value.length) * 100
    const currentPhaseContribution = (currentPhaseProgress / allPhases.value.length)
    return Math.min(100, Math.round(total + currentPhaseContribution))
  })

  const deductionInfoCompleteness = computed(() => {
    return gameState.value.intelligenceState.deductionInfoCompleteness
  })

  function getMailById(mailId: string): Mail | undefined {
    if (!mailSystem.value) return undefined
    return mailSystem.value.mails.find(m => m.id === mailId)
  }

  function getDocumentById(docId: string): Document | undefined {
    if (!mailSystem.value) return undefined
    return mailSystem.value.documents.find(d => d.id === docId)
  }

  function readMail(mailId: string): { success: boolean; unlockedClues: string[]; unlockedEvidence: string[] } {
    const mail = getMailById(mailId)
    if (!mail || mail.isRead) return { success: false, unlockedClues: [], unlockedEvidence: [] }

    mail.isRead = true
    gameState.value.intelligenceState.readMails.push(mailId)
    
    addIntelligence(mail.intelligenceValue, `阅读邮件：${mail.subject}`)
    
    if (mail.sanityEffect && mail.sanityEffect !== 0) {
      modifySanity(mail.sanityEffect, '阅读禁忌知识')
    }

    const unlockedClues: string[] = []
    const unlockedEvidence: string[] = []

    if (mail.hiddenClues && mail.hiddenClues.length > 0) {
      mail.hiddenClues.forEach(clueId => {
        if (!gameState.value.discoveredClues.includes(clueId)) {
          discoverClue(clueId)
          unlockedClues.push(clueId)
        }
      })
    }

    if (mail.hiddenEvidence && mail.hiddenEvidence.length > 0) {
      mail.hiddenEvidence.forEach(evidenceId => {
        if (!gameState.value.discoveredEvidence.includes(evidenceId)) {
          unlockHiddenEvidence(evidenceId, `邮件线索：${mail.subject}`)
          unlockedEvidence.push(evidenceId)
        }
      })
    }

    if (mail.unlocksScenes && mail.unlocksScenes.length > 0) {
      mail.unlocksScenes.forEach(sceneId => {
        gameState.value.intelligenceState.sceneUnlockProgress[sceneId] = 100
        addLog('discovery', `解锁新场景：${sceneId}`)
      })
    }

    checkPhaseProgression()
    checkMailDelivery()
    
    addLog('discovery', `阅读邮件：${mail.subject}`, {
      unlockedClues,
      unlockedEvidence
    })

    return { success: true, unlockedClues, unlockedEvidence }
  }

  function replyToMail(mailId: string, replyOption: MailReplyOption): { success: boolean; nextMail?: Mail } {
    const mail = getMailById(mailId)
    if (!mail || !mail.replyOptions) return { success: false }

    if (replyOption.effect) {
      if (replyOption.effect.sanity) {
        modifySanity(replyOption.effect.sanity, '回复邮件')
      }
      if (replyOption.effect.intelligenceBonus) {
        addIntelligence(replyOption.effect.intelligenceBonus, '回复邮件获得情报')
      }
      if (replyOption.effect.unlockClues) {
        replyOption.effect.unlockClues.forEach(clueId => {
          if (!gameState.value.discoveredClues.includes(clueId)) {
            discoverClue(clueId)
          }
        })
      }
      if (replyOption.effect.unlockEvidence) {
        replyOption.effect.unlockEvidence.forEach(evidenceId => {
          if (!gameState.value.discoveredEvidence.includes(evidenceId)) {
            unlockHiddenEvidence(evidenceId, '回复邮件解锁')
          }
        })
      }
      if (replyOption.effect.unlockScenes) {
        replyOption.effect.unlockScenes.forEach(sceneId => {
          gameState.value.intelligenceState.sceneUnlockProgress[sceneId] = 100
          addLog('discovery', `解锁新场景：${sceneId}`)
        })
      }
    }

    let nextMail: Mail | undefined
    if (replyOption.nextMailId) {
      nextMail = getMailById(replyOption.nextMailId)
      if (nextMail) {
        const deliveryEvent = gameState.value.mailDeliveryEvents.find(e => e.mailId === replyOption.nextMailId)
        if (deliveryEvent) {
          deliveryEvent.delivered = true
          deliveryEvent.deliveredAt = Date.now()
        }
      }
    }

    addLog('discovery', `回复邮件：${mail.subject} - ${replyOption.text}`)
    checkPhaseProgression()

    return { success: true, nextMail }
  }

  function readDocument(docId: string): { success: boolean; unlockedClues: string[]; unlockedPages: number[] } {
    const doc = getDocumentById(docId)
    if (!doc) return { success: false, unlockedClues: [], unlockedPages: [] }

    if (doc.requiredEvidenceToRead && doc.requiredEvidenceToRead.length > 0) {
      const hasAllEvidence = doc.requiredEvidenceToRead.every(eid => 
        gameState.value.discoveredEvidence.includes(eid)
      )
      if (!hasAllEvidence) {
        return { success: false, unlockedClues: [], unlockedPages: [] }
      }
    }

    if (doc.requiredCluesToRead && doc.requiredCluesToRead.length > 0) {
      const hasAllClues = doc.requiredCluesToRead.every(cid => 
        gameState.value.discoveredClues.includes(cid)
      )
      if (!hasAllClues) {
        return { success: false, unlockedClues: [], unlockedPages: [] }
      }
    }

    doc.isRead = true
    gameState.value.intelligenceState.readDocuments.push(docId)
    
    addIntelligence(doc.intelligenceValue, `阅读文书：${doc.title}`)
    
    if (doc.sanityEffect && doc.sanityEffect !== 0) {
      modifySanity(doc.sanityEffect, '阅读禁忌文书')
    }

    const unlockedClues: string[] = []
    const unlockedPages: number[] = []

    doc.pages.forEach(page => {
      if (page.isUnlocked) {
        unlockedPages.push(page.pageNumber)
        return
      }

      if (page.unlockCondition) {
        let shouldUnlock = false
        if (page.unlockCondition.type === 'evidence' && page.unlockCondition.requiredIds) {
          shouldUnlock = page.unlockCondition.requiredIds.every(eid => 
            gameState.value.discoveredEvidence.includes(eid)
          )
        } else if (page.unlockCondition.type === 'clue' && page.unlockCondition.requiredIds) {
          shouldUnlock = page.unlockCondition.requiredIds.every(cid => 
            gameState.value.discoveredClues.includes(cid)
          )
        } else if (page.unlockCondition.type === 'previous_page') {
          const prevPage = doc.pages.find(p => p.pageNumber === page.pageNumber - 1)
          shouldUnlock = prevPage?.isUnlocked || false
        }

        if (shouldUnlock) {
          page.isUnlocked = true
          unlockedPages.push(page.pageNumber)
        }
      }
    })

    if (doc.hiddenClues && doc.hiddenClues.length > 0) {
      doc.hiddenClues.forEach(clueId => {
        if (!gameState.value.discoveredClues.includes(clueId)) {
          discoverClue(clueId)
          unlockedClues.push(clueId)
        }
      })
    }

    if (doc.hiddenEvidence && doc.hiddenEvidence.length > 0) {
      doc.hiddenEvidence.forEach(evidenceId => {
        if (!gameState.value.discoveredEvidence.includes(evidenceId)) {
          unlockHiddenEvidence(evidenceId, `文书线索：${doc.title}`)
        }
      })
    }

    if (doc.unlocksScenes && doc.unlocksScenes.length > 0) {
      doc.unlocksScenes.forEach(sceneId => {
        gameState.value.intelligenceState.sceneUnlockProgress[sceneId] = 100
        addLog('discovery', `解锁新场景：${sceneId}`)
      })
    }

    checkPhaseProgression()
    
    addLog('discovery', `阅读文书：${doc.title}`, {
      unlockedClues,
      unlockedPages
    })

    return { success: true, unlockedClues, unlockedPages }
  }

  function canReadDocument(docId: string): boolean {
    const doc = getDocumentById(docId)
    if (!doc) return false

    if (doc.requiredEvidenceToRead && doc.requiredEvidenceToRead.length > 0) {
      const hasAllEvidence = doc.requiredEvidenceToRead.every(eid => 
        gameState.value.discoveredEvidence.includes(eid)
      )
      if (!hasAllEvidence) return false
    }

    if (doc.requiredCluesToRead && doc.requiredCluesToRead.length > 0) {
      const hasAllClues = doc.requiredCluesToRead.every(cid => 
        gameState.value.discoveredClues.includes(cid)
      )
      if (!hasAllClues) return false
    }

    return true
  }

  function unlockDocumentPage(docId: string, pageNumber: number): boolean {
    const doc = getDocumentById(docId)
    if (!doc) return false

    const page = doc.pages.find(p => p.pageNumber === pageNumber)
    if (!page || page.isUnlocked) return false

    if (page.unlockCondition) {
      let shouldUnlock = false
      if (page.unlockCondition.type === 'evidence' && page.unlockCondition.requiredIds) {
        shouldUnlock = page.unlockCondition.requiredIds.every(eid => 
          gameState.value.discoveredEvidence.includes(eid)
        )
      } else if (page.unlockCondition.type === 'clue' && page.unlockCondition.requiredIds) {
        shouldUnlock = page.unlockCondition.requiredIds.every(cid => 
          gameState.value.discoveredClues.includes(cid)
        )
      } else if (page.unlockCondition.type === 'previous_page') {
        const prevPage = doc.pages.find(p => p.pageNumber === pageNumber - 1)
        shouldUnlock = prevPage?.isUnlocked || false
      }

      if (shouldUnlock) {
        page.isUnlocked = true
        addLog('discovery', `解锁文书页面：${doc.title} 第${pageNumber}页`)
        return true
      }
    }

    return false
  }

  function addIntelligence(amount: number, reason: string) {
    gameState.value.intelligenceState.totalIntelligence += amount
    
    const phaseId = gameState.value.intelligenceState.currentPhaseId
    if (phaseId) {
      if (!gameState.value.intelligenceState.phaseIntelligence[phaseId]) {
        gameState.value.intelligenceState.phaseIntelligence[phaseId] = 0
      }
      gameState.value.intelligenceState.phaseIntelligence[phaseId] += amount
      
      const phase = allPhases.value.find(p => p.id === phaseId)
      if (phase) {
        phase.intelligenceLevel = Math.min(100, phase.intelligenceLevel + Math.floor(amount / 2))
      }
    }

    gameState.value.intelligenceState.history.push({
      source: reason,
      value: amount,
      timestamp: Date.now()
    })

    updateDeductionCompleteness()
    addLog('discovery', `获得情报 +${amount}：${reason}`)
  }

  function getClueById(clueId: string) {
    const caseData = currentCase.value
    if (!caseData) return null
    return caseData.clues.find(c => c.id === clueId) || null
  }

  function updateDeductionCompleteness() {
    const caseData = currentCase.value
    if (!caseData) return

    const totalEvidence = caseData.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
    const totalClues = caseData.clues.length
    const totalMails = mailSystem.value?.mails.length || 0
    const totalDocs = mailSystem.value?.documents.length || 0

    const discoveredEvidence = gameState.value.discoveredEvidence.length
    const analyzedClues = gameState.value.analyzedClues.length
    const readMails = gameState.value.intelligenceState.readMails.length
    const readDocs = gameState.value.intelligenceState.readDocuments.length

    const evidenceRatio = totalEvidence > 0 ? discoveredEvidence / totalEvidence : 0
    const clueRatio = totalClues > 0 ? analyzedClues / totalClues : 0
    const mailRatio = totalMails > 0 ? readMails / totalMails : 0
    const docRatio = totalDocs > 0 ? readDocs / totalDocs : 0

    const completeness = Math.round(
      (evidenceRatio * 0.35 + clueRatio * 0.35 + mailRatio * 0.15 + docRatio * 0.15) * 100
    )

    gameState.value.intelligenceState.deductionInfoCompleteness = Math.min(100, completeness)
  }

  function checkPhaseProgression() {
    if (!mailSystem.value) return

    const currentPhaseData = currentPhase.value
    if (!currentPhaseData) return

    const unlockCondition = currentPhaseData.unlockCondition
    let shouldComplete = false

    switch (unlockCondition.type) {
      case 'evidence_discovered':
        if (unlockCondition.requiredIds && unlockCondition.requiredCount) {
          const discoveredCount = unlockCondition.requiredIds.filter(id => 
            gameState.value.discoveredEvidence.includes(id)
          ).length
          shouldComplete = discoveredCount >= unlockCondition.requiredCount
        }
        break
      case 'clue_analyzed':
        if (unlockCondition.requiredIds && unlockCondition.requiredCount) {
          const analyzedCount = unlockCondition.requiredIds.filter(id => 
            gameState.value.analyzedClues.includes(id)
          ).length
          shouldComplete = analyzedCount >= unlockCondition.requiredCount
        }
        break
      case 'mail_read':
        if (unlockCondition.requiredIds && unlockCondition.requiredCount) {
          const readCount = unlockCondition.requiredIds.filter(id => 
            gameState.value.intelligenceState.readMails.includes(id)
          ).length
          shouldComplete = readCount >= unlockCondition.requiredCount
        }
        break
      case 'document_read':
        if (unlockCondition.requiredIds && unlockCondition.requiredCount) {
          const readCount = unlockCondition.requiredIds.filter(id => 
            gameState.value.intelligenceState.readDocuments.includes(id)
          ).length
          shouldComplete = readCount >= unlockCondition.requiredCount
        }
        break
      case 'phase_completed':
        if (unlockCondition.requiredPhaseId) {
          shouldComplete = gameState.value.intelligenceState.completedPhases.includes(unlockCondition.requiredPhaseId)
        }
        break
      case 'manual':
        shouldComplete = false
        break
    }

    if (shouldComplete) {
      completeCurrentPhase()
    }
  }

  function completeCurrentPhase() {
    const phaseId = gameState.value.intelligenceState.currentPhaseId
    if (!phaseId) return

    const phase = currentPhase.value
    if (!phase || phase.isCompleted) return

    phase.isCompleted = true
    phase.isActive = false
    gameState.value.intelligenceState.completedPhases.push(phaseId)

    addLog('discovery', `📋 完成阶段：${phase.name}`)
    addIntelligence(20, `完成阶段：${phase.name}`)

    const nextPhase = allPhases.value.find(p => p.phaseNumber === phase.phaseNumber + 1)
    if (nextPhase) {
      startPhase(nextPhase.id)
    }
  }

  function startPhase(phaseId: string) {
    const phase = allPhases.value.find(p => p.id === phaseId)
    if (!phase || phase.isActive) return

    phase.isActive = true
    gameState.value.intelligenceState.currentPhaseId = phaseId

    addLog('discovery', `🔍 进入新阶段：${phase.name}`)
    addLog('discovery', phase.description)

    if (phase.unlockedScenes && phase.unlockedScenes.length > 0) {
      phase.unlockedScenes.forEach(sceneId => {
        gameState.value.intelligenceState.sceneUnlockProgress[sceneId] = 100
        addLog('discovery', `解锁新场景：${sceneId}`)
      })
    }

    if (phase.unlockedEvidence && phase.unlockedEvidence.length > 0) {
      phase.unlockedEvidence.forEach(evidenceId => {
        unlockHiddenEvidence(evidenceId, `阶段解锁：${phase.name}`)
      })
    }

    if (phase.unlockedClues && phase.unlockedClues.length > 0) {
      phase.unlockedClues.forEach(clueId => {
        if (!gameState.value.discoveredClues.includes(clueId)) {
          discoverClue(clueId)
        }
      })
    }

    checkMailDelivery('phase_started', phaseId)
    updateDeductionCompleteness()
  }

  function setActivePhase(phaseId: string) {
    const phase = allPhases.value.find(p => p.id === phaseId)
    if (!phase || phase.isActive || getPhaseStatus(phase) === 'locked') return

    allPhases.value.forEach(p => {
      p.isActive = false
    })

    phase.isActive = true
    gameState.value.intelligenceState.currentPhaseId = phaseId

    checkMailDelivery('phase_started', phaseId)
    updateDeductionCompleteness()

    addLog('discovery', `切换到阶段：${phase.name}`)
  }

  function getPhaseStatus(phase: any): 'completed' | 'active' | 'locked' {
    if (phase.isCompleted) return 'completed'
    if (phase.isActive) return 'active'
    return 'locked'
  }

  function checkMailDelivery(triggerType?: string, triggerId?: string) {
    if (!gameState.value.currentCase) return

    const now = Date.now()
    const events = gameState.value.mailDeliveryEvents

    for (const event of events) {
      if (event.delivered) continue

      const condition = event.triggerCondition
      let shouldDeliver = false

      if (triggerType) {
        if (condition.type === triggerType && condition.requiredId === triggerId) {
          shouldDeliver = true
        }
      } else {
        switch (condition.type) {
          case 'evidence_discovered':
            if (condition.requiredId) {
              shouldDeliver = gameState.value.discoveredEvidence.includes(condition.requiredId)
            }
            break
          case 'clue_analyzed':
            if (condition.requiredId) {
              shouldDeliver = gameState.value.analyzedClues.includes(condition.requiredId)
            }
            break
          case 'scene_visited':
            if (condition.requiredId) {
              shouldDeliver = gameState.value.visitedScenes.includes(condition.requiredId)
            }
            break
          case 'phase_started':
            if (condition.requiredId) {
              shouldDeliver = gameState.value.intelligenceState.currentPhaseId === condition.requiredId
            }
            break
        }
      }

      if (shouldDeliver) {
        event.delivered = true
        event.deliveredAt = now + event.delaySeconds * 1000
        
        const mail = getMailById(event.mailId)
        if (mail) {
          gameState.value.intelligenceState.mailNotifications.push(event.mailId)
          
          setTimeout(() => {
            addLog('discovery', `📧 收到新邮件：${mail.subject}`)
          }, event.delaySeconds * 1000)
        }
      }
    }
  }

  function clearMailNotification(mailId: string) {
    const index = gameState.value.intelligenceState.mailNotifications.indexOf(mailId)
    if (index > -1) {
      gameState.value.intelligenceState.mailNotifications.splice(index, 1)
    }
  }

  function checkEvidenceCombo(requiredIds: string[]): boolean {
    return requiredIds.every(id => gameState.value.discoveredEvidence.includes(id))
  }

  function checkClueCombo(requiredIds: string[]): boolean {
    return requiredIds.every(id => gameState.value.discoveredClues.includes(id))
  }

  function getSceneUnlockConditionProgress(sceneId: string): {
    total: number
    satisfied: number
    description: string
  } | null {
    if (!currentCase.value) return null
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (!scene || !scene.unlockConditions || scene.unlockConditions.length === 0) return null

    let total = 0
    let satisfied = 0
    const descriptions: string[] = []

    for (const condition of scene.unlockConditions) {
      if (condition.type === 'evidence_combo' && condition.requiredEvidenceIds) {
        total += condition.requiredEvidenceIds.length
        const satisfiedCount = condition.requiredEvidenceIds.filter(
          id => gameState.value.discoveredEvidence.includes(id)
        ).length
        satisfied += satisfiedCount
        if (condition.description) descriptions.push(condition.description)
      } else if (condition.type === 'clue_combo' && condition.requiredClueIds) {
        total += condition.requiredClueIds.length
        const satisfiedCount = condition.requiredClueIds.filter(
          id => gameState.value.discoveredClues.includes(id)
        ).length
        satisfied += satisfiedCount
        if (condition.description) descriptions.push(condition.description)
      } else if (condition.type === 'any_evidence' && condition.requiredEvidenceIds && condition.requiredCount) {
        total += condition.requiredCount
        const satisfiedCount = Math.min(
          condition.requiredCount,
          condition.requiredEvidenceIds.filter(id => gameState.value.discoveredEvidence.includes(id)).length
        )
        satisfied += satisfiedCount
        if (condition.description) descriptions.push(condition.description)
      } else if (condition.type === 'any_clue' && condition.requiredClueIds && condition.requiredCount) {
        total += condition.requiredCount
        const satisfiedCount = Math.min(
          condition.requiredCount,
          condition.requiredClueIds.filter(id => gameState.value.discoveredClues.includes(id)).length
        )
        satisfied += satisfiedCount
        if (condition.description) descriptions.push(condition.description)
      }
    }

    return {
      total,
      satisfied,
      description: descriptions.join('、') || '收集更多证据以解锁'
    }
  }

  function checkSceneUnlockConditions(sceneId: string): boolean {
    if (!currentCase.value) return false
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (!scene || !scene.unlockConditions || scene.unlockConditions.length === 0) return false

    for (const condition of scene.unlockConditions) {
      switch (condition.type) {
        case 'evidence_combo':
          if (!condition.requiredEvidenceIds) continue
          if (!checkEvidenceCombo(condition.requiredEvidenceIds)) return false
          break
        case 'clue_combo':
          if (!condition.requiredClueIds) continue
          if (!checkClueCombo(condition.requiredClueIds)) return false
          break
        case 'any_evidence':
          if (!condition.requiredEvidenceIds || !condition.requiredCount) continue
          const evidenceCount = condition.requiredEvidenceIds.filter(
            id => gameState.value.discoveredEvidence.includes(id)
          ).length
          if (evidenceCount < condition.requiredCount) return false
          break
        case 'any_clue':
          if (!condition.requiredClueIds || !condition.requiredCount) continue
          const clueCount = condition.requiredClueIds.filter(
            id => gameState.value.discoveredClues.includes(id)
          ).length
          if (clueCount < condition.requiredCount) return false
          break
      }
    }
    return true
  }

  function checkSceneUnlockConditionsForAll() {
    if (!currentCase.value) return
    for (const scene of currentCase.value.scenes) {
      if (!isSceneUnlocked(scene.id) && scene.unlockConditions) {
        if (checkSceneUnlockConditions(scene.id)) {
          gameState.value.intelligenceState.sceneUnlockProgress[scene.id] = 100
          addLog('discovery', `🔓 解锁隐藏场景：${scene.name}`)
        }
      }
    }
  }

  function isSceneUnlocked(sceneId: string): boolean {
    if (!currentCase.value) return false
    
    const progress = gameState.value.intelligenceState.sceneUnlockProgress[sceneId]
    if (progress !== undefined && progress >= 100) return true

    for (const phase of allPhases.value) {
      if (phase.isCompleted || phase.isActive) {
        if (phase.unlockedScenes.includes(sceneId)) {
          return true
        }
      }
    }

    if (checkSceneUnlockConditions(sceneId)) {
      gameState.value.intelligenceState.sceneUnlockProgress[sceneId] = 100
      addLog('discovery', `🔓 解锁隐藏场景：${sceneId}`)
      return true
    }

    return false
  }

  function getSceneUnlockingPhase(sceneId: string): string | null {
    for (const phase of allPhases.value) {
      if (phase.unlockedScenes.includes(sceneId)) {
        return phase.id
      }
    }
    return null
  }

  function getUnlockedScenes() {
    if (!currentCase.value) return []
    return currentCase.value.scenes.filter(s => isSceneUnlocked(s.id))
  }

  function resetGame() {
    stopTimer()
    resetEvents()
    resetAnomalyEvents()
    getInventoryStore().resetInventory()
    gameState.value = {
      currentCase: null,
      sanity: 100,
      maxSanity: 100,
      discoveredEvidence: [],
      discoveredClues: [],
      analyzedClues: [],
      clueConnections: [],
      visitedScenes: [],
      gameLog: [],
      startTime: Date.now(),
      lastSaveTime: Date.now(),
      tools: [],
      selectedToolId: null,
      failedSearches: [],
      deductionBranches: [],
      characterProfileId: null,
      triggeredEvents: [],
      unlockedHiddenEvidence: [],
      timerState: {
        remainingSeconds: 0,
        totalSeconds: 0,
        isRunning: false,
        isPaused: false,
        isExpired: false,
        timeBonusUsed: 0,
        lastActionTime: Date.now(),
        sceneSwitchCount: 0,
        searchAttemptCount: 0,
        failedSearchCount: 0,
        clueAnalysisCount: 0,
        evidenceRefreshCount: 0
      },
      anomalyState: createInitialAnomalyState(),
      inventory: {
        items: [],
        capacity: 500,
        unlocked: true
      },
      activeAnalyses: [],
      unlockedRecipes: [],
      craftingHistory: [],
      intelligenceState: createInitialIntelligenceState(),
      mailDeliveryEvents: [],
      spiritualPollution: createInitialPollutionState(),
      clueAnnotations: [],
      clueConfidences: [],
      clueComparisons: [],
      deductionHints: [],
      comparisonMode: false,
      comparisonSelectedClues: []
    }
  }

  function generateAnalysisId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function addClueAnnotation(clueId: string, content: string, type: AnnotationType = 'note'): ClueAnnotation {
    const annotation: ClueAnnotation = {
      id: generateAnalysisId(),
      clueId,
      content,
      type,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    gameState.value.clueAnnotations.push(annotation)
    addLog('analysis', `添加线索批注：${content.slice(0, 30)}${content.length > 30 ? '...' : ''}`)
    generateDeductionHints()
    return annotation
  }

  function updateClueAnnotation(annotationId: string, content: string, type?: AnnotationType): boolean {
    const annotation = gameState.value.clueAnnotations.find(a => a.id === annotationId)
    if (!annotation) return false
    annotation.content = content
    if (type) annotation.type = type
    annotation.updatedAt = Date.now()
    addLog('analysis', `更新线索批注`)
    generateDeductionHints()
    return true
  }

  function deleteClueAnnotation(annotationId: string): boolean {
    const index = gameState.value.clueAnnotations.findIndex(a => a.id === annotationId)
    if (index === -1) return false
    gameState.value.clueAnnotations.splice(index, 1)
    addLog('analysis', `删除线索批注`)
    generateDeductionHints()
    return true
  }

  function getAnnotationsForClue(clueId: string): ClueAnnotation[] {
    return gameState.value.clueAnnotations.filter(a => a.clueId === clueId)
  }

  function setClueConfidence(clueId: string, confidence: number, reasoning: string = '', tags: string[] = []): ClueConfidence {
    const existing = gameState.value.clueConfidences.find(c => c.clueId === clueId)
    if (existing) {
      existing.confidence = Math.max(0, Math.min(100, confidence))
      existing.reasoning = reasoning
      existing.tags = tags
      existing.taggedAt = Date.now()
      addLog('analysis', `更新线索可信度：${confidence}%`)
      generateDeductionHints()
      return existing
    }
    const confidenceEntry: ClueConfidence = {
      clueId,
      confidence: Math.max(0, Math.min(100, confidence)),
      reasoning,
      taggedAt: Date.now(),
      tags,
      evidenceSupporting: [],
      evidenceContradicting: []
    }
    gameState.value.clueConfidences.push(confidenceEntry)
    addLog('analysis', `标记线索可信度：${confidence}%`)
    generateDeductionHints()
    return confidenceEntry
  }

  function getClueConfidence(clueId: string): ClueConfidence | undefined {
    return gameState.value.clueConfidences.find(c => c.clueId === clueId)
  }

  function getAverageConfidenceForClues(clueIds: string[]): number {
    if (clueIds.length === 0) return 50
    const confidences = clueIds
      .map(id => getClueConfidence(id)?.confidence ?? 50)
    return confidences.reduce((a, b) => a + b, 0) / confidences.length
  }

  function toggleComparisonMode(): boolean {
    gameState.value.comparisonMode = !gameState.value.comparisonMode
    if (!gameState.value.comparisonMode) {
      gameState.value.comparisonSelectedClues = []
    }
    return gameState.value.comparisonMode
  }

  function toggleComparisonClue(clueId: string): string[] {
    if (!gameState.value.comparisonMode) return []
    const index = gameState.value.comparisonSelectedClues.indexOf(clueId)
    if (index > -1) {
      gameState.value.comparisonSelectedClues.splice(index, 1)
    } else if (gameState.value.comparisonSelectedClues.length < 2) {
      gameState.value.comparisonSelectedClues.push(clueId)
    }
    return gameState.value.comparisonSelectedClues
  }

  function createClueComparison(clue1Id: string, clue2Id: string, similarities: string[], differences: string[], conclusion: string, supportsConnection: boolean, connectionConfidence: number): ClueComparison {
    const existing = gameState.value.clueComparisons.find(
      c => (c.clue1Id === clue1Id && c.clue2Id === clue2Id) ||
           (c.clue1Id === clue2Id && c.clue2Id === clue1Id)
    )
    if (existing) {
      existing.similarities = similarities
      existing.differences = differences
      existing.conclusion = conclusion
      existing.supportsConnection = supportsConnection
      existing.connectionConfidence = Math.max(0, Math.min(100, connectionConfidence))
      existing.updatedAt = Date.now()
      addLog('analysis', `更新线索比对：${getClueById(clue1Id)?.name || clue1Id} ↔ ${getClueById(clue2Id)?.name || clue2Id}`)
      generateDeductionHints()
      return existing
    }
    const comparison: ClueComparison = {
      id: generateAnalysisId(),
      clue1Id,
      clue2Id,
      similarities,
      differences,
      conclusion,
      supportsConnection,
      connectionConfidence: Math.max(0, Math.min(100, connectionConfidence)),
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    gameState.value.clueComparisons.push(comparison)
    addLog('analysis', `创建线索比对：${getClueById(clue1Id)?.name || clue1Id} ↔ ${getClueById(clue2Id)?.name || clue2Id}`)
    
    if (supportsConnection) {
      const existingConnection = gameState.value.clueConnections.find(
        c => (c.clue1Id === clue1Id && c.clue2Id === clue2Id) ||
             (c.clue1Id === clue2Id && c.clue2Id === clue1Id)
      )
      if (existingConnection) {
        existingConnection.confidence = Math.max(existingConnection.confidence || 50, connectionConfidence)
        if (!existingConnection.supportedBy) existingConnection.supportedBy = []
        if (!existingConnection.supportedBy.includes(comparison.id)) {
          existingConnection.supportedBy.push(comparison.id)
        }
      }
    }
    
    generateDeductionHints()
    return comparison
  }

  function deleteClueComparison(comparisonId: string): boolean {
    const index = gameState.value.clueComparisons.findIndex(c => c.id === comparisonId)
    if (index === -1) return false
    gameState.value.clueComparisons.splice(index, 1)
    addLog('analysis', `删除线索比对`)
    generateDeductionHints()
    return true
  }

  function getComparisonsForClue(clueId: string): ClueComparison[] {
    return gameState.value.clueComparisons.filter(
      c => c.clue1Id === clueId || c.clue2Id === clueId
    )
  }

  function getComparisonBetween(clue1Id: string, clue2Id: string): ClueComparison | undefined {
    return gameState.value.clueComparisons.find(
      c => (c.clue1Id === clue1Id && c.clue2Id === clue2Id) ||
           (c.clue1Id === clue2Id && c.clue2Id === clue1Id)
    )
  }

  function getConnectionSuccessRate(clue1Id: string, clue2Id: string): number {
    let baseRate = 50
    
    const comparison = getComparisonBetween(clue1Id, clue2Id)
    if (comparison) {
      if (comparison.supportsConnection) {
        baseRate = Math.max(baseRate, comparison.connectionConfidence)
        if (comparison.similarities.length > 0) {
          baseRate += Math.min(comparison.similarities.length * 3, 12)
        }
      } else {
        baseRate = Math.min(baseRate, 100 - comparison.connectionConfidence)
        if (comparison.differences.length > 0) {
          baseRate -= Math.min(comparison.differences.length * 3, 12)
        }
      }
    }
    
    const avgConfidence = getAverageConfidenceForClues([clue1Id, clue2Id])
    const confidenceBonus = (avgConfidence - 50) * 0.5
    baseRate += confidenceBonus
    
    const confidence1 = getClueConfidence(clue1Id)
    const confidence2 = getClueConfidence(clue2Id)
    if (confidence1 && confidence2) {
      const bothHigh = confidence1.confidence >= 70 && confidence2.confidence >= 70
      if (bothHigh) {
        baseRate += 8
      }
      const eitherLow = confidence1.confidence <= 30 || confidence2.confidence <= 30
      if (eitherLow) {
        baseRate -= 10
      }
      const bothLow = confidence1.confidence <= 30 && confidence2.confidence <= 30
      if (bothLow) {
        baseRate -= 8
      }
    }
    
    const clue1 = getClueById(clue1Id)
    const clue2 = getClueById(clue2Id)
    if (clue1 && clue2) {
      if (clue1.connections.includes(clue2Id) || clue2.connections.includes(clue1Id)) {
        baseRate += 20
      }
      const typeMatchBonus = clue1.type === clue2.type ? 12 : 0
      baseRate += typeMatchBonus
      const importanceBonus = Math.min((clue1.importance + clue2.importance - 6) * 3, 10)
      baseRate += importanceBonus
    }
    
    const annotations1 = getAnnotationsForClue(clue1Id)
    const annotations2 = getAnnotationsForClue(clue2Id)
    const totalAnnotations = annotations1.length + annotations2.length
    const annotationBonus = Math.min(totalAnnotations * 2, 10)
    baseRate += annotationBonus

    const contradictionAnnotations1 = annotations1.filter(a => a.type === 'contradiction').length
    const contradictionAnnotations2 = annotations2.filter(a => a.type === 'contradiction').length
    const contradictionPenalty = (contradictionAnnotations1 + contradictionAnnotations2) * 5
    baseRate -= contradictionPenalty

    const hypothesisAnnotations1 = annotations1.filter(a => a.type === 'hypothesis').length
    const hypothesisAnnotations2 = annotations2.filter(a => a.type === 'hypothesis').length
    const hypothesisBonus = (hypothesisAnnotations1 + hypothesisAnnotations2) * 2
    baseRate += hypothesisBonus

    const importantAnnotations1 = annotations1.filter(a => a.type === 'important').length
    const importantAnnotations2 = annotations2.filter(a => a.type === 'important').length
    const importantBonus = (importantAnnotations1 + importantAnnotations2) * 3
    baseRate += importantBonus

    const questionAnnotations1 = annotations1.filter(a => a.type === 'question').length
    const questionAnnotations2 = annotations2.filter(a => a.type === 'question').length
    const questionPenalty = (questionAnnotations1 + questionAnnotations2) * 2
    baseRate -= questionPenalty

    const bothAnalyzed = gameState.value.analyzedClues.includes(clue1Id) && gameState.value.analyzedClues.includes(clue2Id)
    if (bothAnalyzed) {
      baseRate += 10
    } else if (gameState.value.analyzedClues.includes(clue1Id) || gameState.value.analyzedClues.includes(clue2Id)) {
      baseRate += 5
    }
    
    return Math.max(5, Math.min(95, Math.round(baseRate)))
  }

  function generateDeductionHints(): DeductionHint[] {
    const hints: DeductionHint[] = []
    const now = Date.now()
    
    gameState.value.clueComparisons.forEach(comparison => {
      const existingConn = gameState.value.clueConnections.find(
        c => (c.clue1Id === comparison.clue1Id && c.clue2Id === comparison.clue2Id) ||
             (c.clue1Id === comparison.clue2Id && c.clue2Id === comparison.clue1Id)
      )

      if (comparison.supportsConnection && comparison.connectionConfidence >= 70) {
        if (!existingConn) {
          const successRate = getConnectionSuccessRate(comparison.clue1Id, comparison.clue2Id)
          hints.push({
            id: generateAnalysisId(),
            type: 'suggestion',
            content: `比对结果显示「${getClueById(comparison.clue1Id)?.name}」与「${getClueById(comparison.clue2Id)?.name}」可能存在关联（预估连线成功率 ${successRate}%）`,
            relatedClues: [comparison.clue1Id, comparison.clue2Id],
            priority: comparison.connectionConfidence,
            source: 'comparison',
            createdAt: now
          })
        } else if (!existingConn.confirmed) {
          const currentConf = existingConn.confidence || 50
          if (currentConf >= 60) {
            hints.push({
              id: generateAnalysisId(),
              type: 'suggestion',
              content: `「${getClueById(comparison.clue1Id)?.name}」↔「${getClueById(comparison.clue2Id)?.name}」已有比对支持（${comparison.connectionConfidence}%），建议确认该连线`,
              relatedClues: [comparison.clue1Id, comparison.clue2Id],
              priority: comparison.connectionConfidence - 10,
              source: 'comparison',
              createdAt: now
            })
          }
        }
      }
      
      if (!comparison.supportsConnection && comparison.connectionConfidence >= 60) {
        if (existingConn && existingConn.confirmed) {
          hints.push({
            id: generateAnalysisId(),
            type: 'contradiction',
            content: `比对结果与已确认的连线矛盾：「${getClueById(comparison.clue1Id)?.name}」与「${getClueById(comparison.clue2Id)?.name}」可能不存在关联，请重新审视`,
            relatedClues: [comparison.clue1Id, comparison.clue2Id],
            priority: comparison.connectionConfidence + 10,
            source: 'comparison',
            createdAt: now
          })
        } else if (existingConn) {
          hints.push({
            id: generateAnalysisId(),
            type: 'warning',
            content: `比对结果显示「${getClueById(comparison.clue1Id)?.name}」与「${getClueById(comparison.clue2Id)?.name}」可能不存在关联，建议删除或重新比对`,
            relatedClues: [comparison.clue1Id, comparison.clue2Id],
            priority: comparison.connectionConfidence,
            source: 'comparison',
            createdAt: now
          })
        } else {
          hints.push({
            id: generateAnalysisId(),
            type: 'warning',
            content: `比对结果显示「${getClueById(comparison.clue1Id)?.name}」与「${getClueById(comparison.clue2Id)?.name}」可能不存在关联`,
            relatedClues: [comparison.clue1Id, comparison.clue2Id],
            priority: comparison.connectionConfidence,
            source: 'comparison',
            createdAt: now
          })
        }
      }
    })
    
    gameState.value.clueConfidences.forEach(conf => {
      if (conf.confidence <= 30) {
        const connectedUnconfirmed = gameState.value.clueConnections.filter(
          c => !c.confirmed && (c.clue1Id === conf.clueId || c.clue2Id === conf.clueId)
        )
        const extraNote = connectedUnconfirmed.length > 0 
          ? `，涉及的 ${connectedUnconfirmed.length} 条未确认连线可能受影响` 
          : ''
        hints.push({
          id: generateAnalysisId(),
          type: 'warning',
          content: `「${getClueById(conf.clueId)?.name}」的可信度较低（${conf.confidence}%），${conf.reasoning || '需要进一步验证'}${extraNote}`,
          relatedClues: [conf.clueId],
          priority: 100 - conf.confidence,
          source: 'confidence',
          createdAt: now
        })
      }
      if (conf.confidence >= 80) {
        const connectedUnconfirmed = gameState.value.clueConnections.filter(
          c => !c.confirmed && (c.clue1Id === conf.clueId || c.clue2Id === conf.clueId)
        )
        const extraNote = connectedUnconfirmed.length > 0 
          ? `，可优先确认涉及该线索的 ${connectedUnconfirmed.length} 条连线` 
          : ''
        hints.push({
          id: generateAnalysisId(),
          type: 'insight',
          content: `「${getClueById(conf.clueId)?.name}」可信度很高（${conf.confidence}%），${conf.reasoning || '可作为核心推理依据'}${extraNote}`,
          relatedClues: [conf.clueId],
          priority: conf.confidence,
          source: 'confidence',
          createdAt: now
        })
      }
    })
    
    gameState.value.clueAnnotations.forEach(annotation => {
      if (annotation.type === 'contradiction') {
        const connectedConns = gameState.value.clueConnections.filter(
          c => (c.clue1Id === annotation.clueId || c.clue2Id === annotation.clueId)
        )
        const extraNote = connectedConns.length > 0 
          ? `，该线索的 ${connectedConns.length} 条关联需要谨慎验证` 
          : ''
        hints.push({
          id: generateAnalysisId(),
          type: 'contradiction',
          content: `「${getClueById(annotation.clueId)?.name}」存在矛盾：${annotation.content.slice(0, 50)}${annotation.content.length > 50 ? '...' : ''}${extraNote}`,
          relatedClues: [annotation.clueId],
          priority: 85,
          source: 'annotation',
          createdAt: now
        })
      }
      if (annotation.type === 'hypothesis') {
        hints.push({
          id: generateAnalysisId(),
          type: 'suggestion',
          content: `假设：${annotation.content.slice(0, 50)}${annotation.content.length > 50 ? '...' : ''}`,
          relatedClues: [annotation.clueId],
          priority: 55,
          source: 'annotation',
          createdAt: now
        })
      }
      if (annotation.type === 'important') {
        const connectedUnconfirmed = gameState.value.clueConnections.filter(
          c => !c.confirmed && (c.clue1Id === annotation.clueId || c.clue2Id === annotation.clueId)
        )
        if (connectedUnconfirmed.length > 0) {
          hints.push({
            id: generateAnalysisId(),
            type: 'insight',
            content: `「${getClueById(annotation.clueId)?.name}」被标记为重要线索，建议优先确认其 ${connectedUnconfirmed.length} 条关联连线`,
            relatedClues: [annotation.clueId],
            priority: 75,
            source: 'annotation',
            createdAt: now
          })
        }
      }
    })

    const unconfirmedConnections = gameState.value.clueConnections.filter(c => !c.confirmed)
    if (unconfirmedConnections.length > 0) {
      const highConfidence = unconfirmedConnections.filter(c => (c.confidence || 50) >= 70)
      if (highConfidence.length > 0) {
        hints.push({
          id: generateAnalysisId(),
          type: 'suggestion',
          content: `有 ${highConfidence.length} 条连线置信度较高（≥70%），建议优先确认以推进推演`,
          relatedClues: [],
          priority: 70,
          source: 'pattern',
          createdAt: now
        })
      }
      const lowConfidence = unconfirmedConnections.filter(c => (c.confidence || 50) < 40)
      if (lowConfidence.length > 0) {
        hints.push({
          id: generateAnalysisId(),
          type: 'warning',
          content: `有 ${lowConfidence.length} 条连线置信度较低（<40%），建议补充批注、比对或删除可疑连线`,
          relatedClues: [],
          priority: 65,
          source: 'pattern',
          createdAt: now
        })
      }
    }

    const confirmedConnections = gameState.value.clueConnections.filter(c => c.confirmed)
    if (confirmedConnections.length > 0 && unconfirmedConnections.length === 0) {
      hints.push({
        id: generateAnalysisId(),
        type: 'insight',
        content: `所有 ${confirmedConnections.length} 条连线均已确认，可以进入推演阶段得出结论`,
        relatedClues: [],
        priority: 90,
        source: 'pattern',
        createdAt: now
      })
    }
    
    const analyzedCount = gameState.value.analyzedClues.length
    const confidenceCount = gameState.value.clueConfidences.length
    if (analyzedCount >= 3 && confidenceCount < analyzedCount * 0.5) {
      hints.push({
        id: generateAnalysisId(),
        type: 'suggestion',
        content: `建议为已分析的线索标记可信度，这将提高连线成功率和推演准确性（已标记 ${confidenceCount}/${analyzedCount}）`,
        relatedClues: [],
        priority: 60,
        source: 'pattern',
        createdAt: now
      })
    }

    const comparisonCount = gameState.value.clueComparisons.length
    if (analyzedCount >= 4 && comparisonCount < Math.floor(analyzedCount / 2)) {
      hints.push({
        id: generateAnalysisId(),
        type: 'suggestion',
        content: `建议对已分析的线索进行比对，比对能显著提高连线的成功率（已比对 ${comparisonCount} 组）`,
        relatedClues: [],
        priority: 55,
        source: 'pattern',
        createdAt: now
      })
    }
    
    gameState.value.deductionHints = hints.sort((a, b) => b.priority - a.priority)
    return hints
  }

  function getDeductionHints(limit?: number): DeductionHint[] {
    const hints = gameState.value.deductionHints
    return limit ? hints.slice(0, limit) : hints
  }

  function dismissDeductionHint(hintId: string): boolean {
    const index = gameState.value.deductionHints.findIndex(h => h.id === hintId)
    if (index === -1) return false
    gameState.value.deductionHints.splice(index, 1)
    return true
  }

  return {
    gameState,
    currentCase,
    sanityPercentage,
    isLowSanity,
    isCriticalSanity,
    availableTools,
    selectedTool,
    activeCharacterId,
    talentEffects,
    timerPercentage,
    isLowTime,
    isCriticalTime,
    formattedRemainingTime,
    sanityTier,
    activeHallucinations,
    activeMisleadingClues,
    activeFakeDeductions,
    mailSystem,
    currentPhase,
    availableMails,
    unreadMailCount,
    availableDocuments,
    unreadDocumentCount,
    allPhases,
    nextPhase,
    overallProgress,
    deductionInfoCompleteness,
    spiritualPollution,
    totalPollution,
    shockTier,
    erosionTier,
    milestoneEffects,
    effectiveMaxSanity,
    shockPercentage,
    erosionPercentage,
    startCase,
    modifySanity,
    addPollution,
    decayPollution,
    getEndingDescriptor,
    calculateHitRate,
    searchEvidence,
    canDiscoverEvidence,
    discoverEvidence,
    discoverClue,
    analyzeClue,
    addClueConnection,
    isEvidenceVisible,
    unlockHiddenEvidence,
    checkEvidenceRefresh,
    visitScene,
    selectTool,
    addTool,
    consumeToolDurability,
    repairTool,
    addLog,
    getGameState,
    loadGameState,
    unlockDeductionBranch,
    hasDeductionBranch,
    triggerRandomEvents,
    triggerEvent,
    hasTriggeredEvent,
    checkAnomalyEvents,
    triggerAnomalyEvent,
    disproveMisleadingClue,
    disproveFakeDeduction,
    isFakeClue,
    isFakeDeductionOption,
    getMisleadingClueById,
    startTimer,
    pauseTimer,
    resumeTimer,
    stopTimer,
    consumeTime,
    addTimeBonus,
    getUsedTime,
    calculateScore,
    getMailById,
    getDocumentById,
    getClueById,
    readMail,
    replyToMail,
    readDocument,
    canReadDocument,
    unlockDocumentPage,
    addIntelligence,
    updateDeductionCompleteness,
    checkPhaseProgression,
    completeCurrentPhase,
    startPhase,
    setActivePhase,
    checkMailDelivery,
    clearMailNotification,
    isSceneUnlocked,
    getSceneUnlockingPhase,
    getUnlockedScenes,
    checkEvidenceCombo,
    checkClueCombo,
    checkSceneUnlockConditions,
    checkSceneUnlockConditionsForAll,
    getSceneUnlockConditionProgress,
    resetGame,
    addClueAnnotation,
    updateClueAnnotation,
    deleteClueAnnotation,
    getAnnotationsForClue,
    setClueConfidence,
    getClueConfidence,
    getAverageConfidenceForClues,
    toggleComparisonMode,
    toggleComparisonClue,
    createClueComparison,
    deleteClueComparison,
    getComparisonsForClue,
    getComparisonBetween,
    getConnectionSuccessRate,
    generateDeductionHints,
    getDeductionHints,
    dismissDeductionHint,
    triggerCaseFailure,
    abandonCurrentCase
  }
})
