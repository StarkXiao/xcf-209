import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameLogEntry, ClueConnection, Tool, HitRateResult, SearchResult, Evidence, SceneEvent } from '@/types'
import { getCaseById, setCaseStatus } from '@/data/cases'
import { createToolInstance, getToolEffectiveness, getDurabilityPenalty, getSanityPenalty, defaultStartingTools } from '@/data/tools'
import { useSaveStore } from './save'
import { useCharacterStore } from './character'
import { getEventsForTrigger, checkEventTrigger, resetEvents } from '@/data/events'

export const useGameStore = defineStore('game', () => {
  const characterStore = useCharacterStore()
  
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
    triggeredEvents: []
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
      triggeredEvents: []
    }

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

    const hitRateResult = calculateHitRate(evidence)
    const selectedToolData = selectedTool.value
    let durabilityLost = 0

    if (selectedToolData && selectedToolData.uses > 0 && selectedToolData.durability > 0) {
      const baseDurabilityLoss = Math.floor(Math.random() * 5) + 3
      const durabilityReductionPercent = talentEffects.value.toolDurabilityBonus
      const reducedDurabilityLoss = Math.max(1, Math.floor(baseDurabilityLoss * (1 - durabilityReductionPercent / 100)))
      durabilityLost = reducedDurabilityLoss
      consumeToolDurability(selectedToolData.id, 1, reducedDurabilityLoss)
    }

    const roll = Math.random() * 100
    const success = roll < hitRateResult.finalRate

    if (success) {
      discoverEvidence(evidence.id, evidence.sanityEffect)
      
      if (evidence.hiddenClues) {
        evidence.hiddenClues.forEach(clueId => {
          discoverClue(clueId)
        })
      }

      addLog('tool_use', `使用 ${selectedToolData?.name || '徒手搜查'} 成功发现 ${evidence.name}`)

      return {
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
      
      addLog('tool_use', `搜查 ${evidence.name} 失败（成功率 ${hitRateResult.finalRate}%）`)

      return {
        success: false,
        evidenceId: evidence.id,
        hitRate: hitRateResult.finalRate,
        toolUsed: selectedToolData?.id,
        durabilityLost,
        message: '搜查失败，再试一次吧...'
      }
    }
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

    return true
  }

  function discoverClue(clueId: string) {
    if (gameState.value.discoveredClues.includes(clueId)) return false

    gameState.value.discoveredClues.push(clueId)
    addLog('discovery', `获得新线索：${clueId}`)
    return true
  }

  function analyzeClue(clueId: string, result: string) {
    if (gameState.value.analyzedClues.includes(clueId)) return false

    gameState.value.analyzedClues.push(clueId)
    const analysisBonus = talentEffects.value.clueAnalysisSpeed
    if (analysisBonus > 0) {
      addLog('analysis', `分析线索：${clueId} - ${result}（分析效率 +${analysisBonus}%）`)
    } else {
      addLog('analysis', `分析线索：${clueId} - ${result}`)
    }
    return true
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

  function visitScene(sceneId: string) {
    if (!gameState.value.visitedScenes.includes(sceneId)) {
      gameState.value.visitedScenes.push(sceneId)
      addLog('discovery', `探索新场景：${sceneId}`)
      
      triggerRandomEvents('scene_enter')
    } else {
      triggerRandomEvents('random')
    }
    triggerRandomEvents('talent_based')
    triggerRandomEvents('sanity_level')
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

  function resetGame() {
    resetEvents()
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
      triggeredEvents: []
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
    startCase,
    modifySanity,
    calculateHitRate,
    searchEvidence,
    canDiscoverEvidence,
    discoverEvidence,
    discoverClue,
    analyzeClue,
    addClueConnection,
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
    resetGame
  }
})
