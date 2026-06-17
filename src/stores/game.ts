import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameLogEntry, ClueConnection, Tool, HitRateResult, SearchResult, Evidence, SceneEvent, CaseScoreBreakdown, ScoreGrade, CaseScoreConfig, AnomalyEvent, HallucinationEffect, MisleadingClue, DeductionCandidateChange } from '@/types'
import { getCaseById, setCaseStatus } from '@/data/cases'
import { createToolInstance, getToolEffectiveness, getDurabilityPenalty, getSanityPenalty, defaultStartingTools } from '@/data/tools'
import { useSaveStore } from './save'
import { useCharacterStore } from './character'
import { useInventoryStore } from './inventory'
import { useBestiaryStore } from './bestiary'
import { getEventsForTrigger, checkEventTrigger, resetEvents } from '@/data/events'
import { 
  getAvailableAnomalyEvents, 
  checkAnomalyTrigger, 
  createInitialAnomalyState, 
  resetAnomalyEvents,
  getSanityTier 
} from '@/data/anomalyEvents'

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
    craftingHistory: []
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
    const finalMaxSanity = baseMaxSanity + maxSanityBonus

    const charId = activeCharacterId.value
    const timeLimit = caseData.timeLimit || { totalSeconds: 900, sceneSwitchCost: 10, searchAttemptCost: 5, failedSearchPenalty: 15, clueAnalysisCost: 8 }

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
      craftingHistory: []
    }

    startTimer()

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

    getInventoryStore().applyGlobalRecipeUnlocks()
    getInventoryStore().checkAndUnlockRecipes()

    setCaseStatus(caseId, 'in_progress')
    return true
  }

  function modifySanity(amount: number, reason: string) {
    let finalAmount = amount
    
    if (amount < 0) {
      const reductionPercent = talentEffects.value.sanityCostReduction
      const reduction = Math.abs(amount) * (reductionPercent / 100)
      finalAmount = -(Math.abs(amount) - reduction)
      
      const actualLoss = Math.abs(finalAmount)
      addLog('sanity_loss', `理智值下降 ${actualLoss} 点（天赋减免 ${Math.abs(amount) - actualLoss} 点）：${reason}`)
    } else if (amount > 0) {
      const recoveryBonus = talentEffects.value.sanityRecoveryBonus
      const bonus = amount * (recoveryBonus / 100)
      finalAmount = amount + bonus
      
      addLog('discovery', `理智值恢复 ${finalAmount} 点（天赋加成 ${bonus.toFixed(1)} 点）：${reason}`)
    }
    
    gameState.value.sanity = Math.max(0, Math.min(gameState.value.maxSanity, gameState.value.sanity + finalAmount))

    if (amount < 0) {
      checkAnomalyEvents()
    }

    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnSanityChange(gameState.value.sanity)

    if (gameState.value.sanity <= 0) {
      return 'insane'
    }
    
    return 'ok'
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

    let finalRate = baseRate + toolBonus + talentBonus - durabilityPenalty - sanityPenalty
    finalRate = Math.max(5, Math.min(95, finalRate))

    const isGuaranteed = finalRate >= 95
    const isImpossible = finalRate <= 5

    return {
      baseRate,
      toolBonus: toolBonus + talentBonus,
      durabilityPenalty,
      sanityPenalty,
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
    return gameState.value.unlockedHiddenEvidence.includes(evidence.id)
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
    
    const eventTriggerBonus = talentEffects.value.eventTriggerChance
    
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
    
    penaltyScore = Math.round(penaltyScore * DEFAULT_SCORE_CONFIG.penaltyMultiplier)

    let totalScore = evidenceScore + clueScore + deductionScore + timeScore + sanityScore + bonusScore - penaltyScore
    totalScore = Math.max(0, Math.min(100, totalScore))

    const gradeDescriptions: Record<ScoreGrade, string> = {
      'S': '完美调查！你是当之无愧的传奇侦探，揭露了所有真相！',
      'A': '出色的调查！你成功揭示了核心真相，几乎没有遗漏。',
      'B': '良好的调查！你找到了主要线索，虽然有些细节仍待完善。',
      'C': '合格的调查！你得出了正确的结论，但仍有改进空间。',
      'D': '勉强通过...你的调查过程较为艰难，下次要更谨慎。',
      'F': '调查失败...真相被迷雾掩盖，需要重新开始。'
    }

    let grade: ScoreGrade = 'F'
    const thresholds = DEFAULT_SCORE_CONFIG.gradeThresholds
    if (totalScore >= thresholds.S) grade = 'S'
    else if (totalScore >= thresholds.A) grade = 'A'
    else if (totalScore >= thresholds.B) grade = 'B'
    else if (totalScore >= thresholds.C) grade = 'C'
    else if (totalScore >= thresholds.D) grade = 'D'

    addLog('conclusion', `案件评分：${grade}级 (${totalScore}分)`, {
      breakdown: { evidenceScore, clueScore, deductionScore, timeScore, sanityScore, bonusScore, penaltyScore }
    })

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
      craftingHistory: []
    }
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
    startCase,
    modifySanity,
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
    resetGame
  }
})
