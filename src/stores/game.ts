import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { GameState, GameLogEntry, ClueConnection } from '@/types'
import { getCaseById } from '@/data/cases'

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
    lastSaveTime: Date.now()
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

  function startCase(caseId: string) {
    const caseData = getCaseById(caseId)
    if (!caseData) return false

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
      lastSaveTime: Date.now()
    }

    addLog('discovery', `开始调查案件：${caseData.title}`)
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
      lastSaveTime: Date.now()
    }
  }

  return {
    gameState,
    currentCase,
    sanityPercentage,
    isLowSanity,
    isCriticalSanity,
    startCase,
    modifySanity,
    discoverEvidence,
    discoverClue,
    analyzeClue,
    addClueConnection,
    visitScene,
    addLog,
    getGameState,
    loadGameState,
    resetGame
  }
})