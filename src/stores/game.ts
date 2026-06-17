import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameLogEntry, ClueConnection, Tool, HitRateResult, SearchResult, Evidence } from '@/types'
import { getCaseById } from '@/data/cases'
import { createToolInstance, getToolEffectiveness, getDurabilityPenalty, getSanityPenalty, defaultStartingTools } from '@/data/tools'

export const useGameStore = defineStore('game', () => {
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
    deductionBranches: []
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

    const startingToolIds = inheritedTools?.length ? inheritedTools : (caseData.startingTools || defaultStartingTools)
    const startingTools = startingToolIds
      .map(id => createToolInstance(id))
      .filter((t): t is Tool => t !== null)

    gameState.value = {
      currentCase: caseId,
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
      tools: startingTools,
      selectedToolId: startingTools.length > 0 ? startingTools[0].id : null,
      failedSearches: [],
      deductionBranches: []
    }

    addLog('discovery', `开始调查案件：${caseData.title}`)
    addLog('tool_use', `携带工具：${startingTools.map(t => t.name).join('、')}`)
    return true
  }

  function modifySanity(amount: number, reason: string) {
    gameState.value.sanity = Math.max(0, Math.min(gameState.value.maxSanity, gameState.value.sanity + amount))
    
    if (amount < 0) {
      addLog('sanity_loss', `理智值下降 ${Math.abs(amount)} 点：${reason}`)
    }

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

    const sanityPenalty = getSanityPenalty(gameState.value.sanity, gameState.value.maxSanity)

    let finalRate = baseRate + toolBonus - durabilityPenalty - sanityPenalty
    finalRate = Math.max(5, Math.min(95, finalRate))

    const isGuaranteed = finalRate >= 95
    const isImpossible = finalRate <= 5

    return {
      baseRate,
      toolBonus,
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
      durabilityLost = baseDurabilityLoss
      consumeToolDurability(selectedToolData.id, 1, baseDurabilityLoss)
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
    addLog('analysis', `分析线索：${clueId} - ${result}`)
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
    }
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
      deductionBranches: []
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
    resetGame
  }
})
