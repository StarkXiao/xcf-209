import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SaveData, SaveRiskAssessment, GameState, PollutionEvent } from '@/types'
import { useGameStore } from './game'
import { setCaseStatus } from '@/data/cases'
import { assessSaveRisk } from '@/data/spiritualPollution'

const STORAGE_KEY = 'cthulhu-game-saves'
const GLOBAL_UNLOCKS_KEY = 'cthulhu-global-unlocks'

export const useSaveStore = defineStore('save', () => {
  const saves = ref<SaveData[]>([])
  const maxSaves = 10
  const globalUnlockedTools = ref<string[]>([])

  const saveCount = computed(() => saves.value.length)
  const hasSaves = computed(() => saves.value.length > 0)

  function loadSavesFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        saves.value = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load saves:', error)
      saves.value = []
    }

    try {
      const unlockData = localStorage.getItem(GLOBAL_UNLOCKS_KEY)
      if (unlockData) {
        globalUnlockedTools.value = JSON.parse(unlockData)
      }
    } catch (error) {
      console.error('Failed to load global unlocks:', error)
      globalUnlockedTools.value = []
    }
  }

  function saveSavesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(saves.value))
    } catch (error) {
      console.error('Failed to save:', error)
    }
  }

  function saveGlobalUnlocks() {
    try {
      localStorage.setItem(GLOBAL_UNLOCKS_KEY, JSON.stringify(globalUnlockedTools.value))
    } catch (error) {
      console.error('Failed to save global unlocks:', error)
    }
  }

  function getCurrentSaveRisk(): SaveRiskAssessment {
    const gameStore = useGameStore()
    const state = gameStore.gameState
    if (!state.currentCase) {
      return {
        level: 'safe',
        corruptionChance: 0,
        dataLossChance: 0,
        hallucinationInjectionChance: 0,
        warningMessage: '没有进行中的案件。'
      }
    }
    return assessSaveRisk(state.spiritualPollution, state.sanity, state.maxSanity)
  }

  function corruptGameState(state: GameState, level: 'mild' | 'moderate' | 'severe'): GameState {
    const corrupted = JSON.parse(JSON.stringify(state)) as GameState
    
    switch (level) {
      case 'mild':
        corrupted.sanity = Math.max(0, corrupted.sanity - 5)
        if (corrupted.spiritualPollution.pollutionEvents.length > 0) {
          const fakeEvent: PollutionEvent = {
            id: `fake-pollution-${Date.now()}`,
            type: 'short_term_shock',
            amount: 5,
            source: 'save_ritual',
            description: '存档时产生的虚幻记忆...',
            timestamp: Date.now()
          }
          corrupted.spiritualPollution.pollutionEvents.push(fakeEvent)
        }
        break
        
      case 'moderate':
        corrupted.sanity = Math.max(0, corrupted.sanity - 15)
        corrupted.spiritualPollution.shortTermShock = Math.min(
          corrupted.spiritualPollution.maxShortTermShock,
          corrupted.spiritualPollution.shortTermShock + 20
        )
        if (corrupted.discoveredClues.length > 3) {
          const removeCount = Math.min(2, Math.floor(corrupted.discoveredClues.length / 3))
          for (let i = 0; i < removeCount; i++) {
            const idx = Math.floor(Math.random() * corrupted.discoveredClues.length)
            corrupted.discoveredClues.splice(idx, 1)
          }
        }
        break
        
      case 'severe':
        corrupted.sanity = Math.max(0, corrupted.sanity - 30)
        corrupted.spiritualPollution.shortTermShock = corrupted.spiritualPollution.maxShortTermShock
        corrupted.spiritualPollution.longTermErosion = Math.min(
          corrupted.spiritualPollution.maxLongTermErosion,
          corrupted.spiritualPollution.longTermErosion + 15
        )
        if (corrupted.discoveredEvidence.length > 2) {
          const removeCount = Math.min(3, Math.floor(corrupted.discoveredEvidence.length / 2))
          for (let i = 0; i < removeCount; i++) {
            const idx = Math.floor(Math.random() * corrupted.discoveredEvidence.length)
            corrupted.discoveredEvidence.splice(idx, 1)
          }
        }
        corrupted.gameLog.push({
          id: `log-corrupted-${Date.now()}`,
          timestamp: Date.now(),
          type: 'sanity_loss',
          description: '💀 这个存档...似乎被什么东西触碰过了...'
        })
        break
    }
    
    return corrupted
  }

  function createSave(name: string, forceSave: boolean = false): { success: boolean; risk: SaveRiskAssessment; corrupted: boolean } {
    const gameStore = useGameStore()
    const currentGameState = gameStore.getGameState()
    
    if (!currentGameState.currentCase) {
      return { 
        success: false, 
        risk: getCurrentSaveRisk(), 
        corrupted: false 
      }
    }

    const risk = assessSaveRisk(
      currentGameState.spiritualPollution, 
      currentGameState.sanity, 
      currentGameState.maxSanity
    )

    if (!forceSave && (risk.level === 'critical' || risk.level === 'corrupted')) {
      return { success: false, risk, corrupted: false }
    }

    let finalGameState = currentGameState
    let corrupted = false

    const corruptionRoll = Math.random() * 100
    if (corruptionRoll < risk.corruptionChance) {
      corrupted = true
      const severity = corruptionRoll < risk.corruptionChance * 0.2 ? 'severe' :
                       corruptionRoll < risk.corruptionChance * 0.6 ? 'moderate' : 'mild'
      finalGameState = corruptGameState(currentGameState, severity)
      gameStore.addLog('sanity_loss', `⚠️ 存档仪式受到干扰...（${severity === 'severe' ? '严重' : severity === 'moderate' ? '中等' : '轻微'}污染）`)
    }

    const hallucinationRoll = Math.random() * 100
    if (hallucinationRoll < risk.hallucinationInjectionChance) {
      const messages = [
        '存档画面中似乎闪过了一个扭曲的影子...',
        '保存的瞬间，你听到了远处传来的低语...',
        '这个存档文件名...是你自己输入的吗？',
        '存档完成后，你感到一阵眩晕...',
        '你确定刚才真的按下了保存键吗？'
      ]
      gameStore.addLog('sanity_loss', `👁️ ${messages[Math.floor(Math.random() * messages.length)]}`)
    }

    if (saves.value.length >= maxSaves) {
      saves.value.shift()
    }

    const saveId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const displayName = corrupted ? `[污染] ${name}` : name
    
    const save: SaveData = {
      id: saveId,
      name: displayName,
      caseId: finalGameState.currentCase!,
      gameState: finalGameState,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      characterProfileId: finalGameState.characterProfileId ?? undefined
    }

    saves.value.push(save)
    saveSavesToStorage()
    
    gameStore.addPollution(5, 2, 'save_ritual', '进行存档仪式')
    
    return { success: true, risk, corrupted }
  }

  function loadSave(saveId: string): { success: boolean; corruptionWarning?: string } {
    const save = saves.value.find(s => s.id === saveId)
    if (!save) return { success: false }

    const gameStore = useGameStore()
    
    const isCorrupted = save.name.startsWith('[污染]')
    let gameStateToLoad = save.gameState
    
    if (isCorrupted && Math.random() < 0.5) {
      const dataLossRoll = Math.random()
      if (dataLossRoll < 0.2) {
        gameStateToLoad = corruptGameState(save.gameState, 'severe')
        return { 
          success: false, 
          corruptionWarning: '这个存档已经完全被深渊吞噬，无法读取...' 
        }
      } else if (dataLossRoll < 0.6) {
        gameStateToLoad = corruptGameState(save.gameState, 'moderate')
      }
    }
    
    gameStore.loadGameState(gameStateToLoad)

    if (save.gameState.currentCase) {
      setCaseStatus(save.gameState.currentCase, 'in_progress')
    }
    
    if (isCorrupted) {
      gameStore.addLog('sanity_loss', '💀 读取被污染的存档...你的记忆出现了断层。')
      gameStore.modifySanity(-5, '读取被污染的存档', 'shock')
      return { 
        success: true, 
        corruptionWarning: '读取了被污染的存档，理智受到轻微影响。' 
      }
    }
    
    return { success: true }
  }

  function deleteSave(saveId: string): boolean {
    const index = saves.value.findIndex(s => s.id === saveId)
    if (index === -1) return false

    saves.value.splice(index, 1)
    saveSavesToStorage()
    return true
  }

  function updateSave(saveId: string): boolean {
    const save = saves.value.find(s => s.id === saveId)
    if (!save) return false

    const gameStore = useGameStore()
    const currentGameState = gameStore.getGameState()
    
    save.gameState = currentGameState
    save.updatedAt = Date.now()
    saveSavesToStorage()
    return true
  }

  function getSaveById(saveId: string): SaveData | undefined {
    return saves.value.find(s => s.id === saveId)
  }

  function getSavesByCase(caseId: string): SaveData[] {
    return saves.value.filter(s => s.caseId === caseId)
  }

  function startNewGamePlus(caseId: string, sourceSaveId: string): boolean {
    const sourceSave = getSaveById(sourceSaveId)
    if (!sourceSave) return false

    const gameStore = useGameStore()
    
    const inheritedToolIds = sourceSave.gameState.tools
      .filter(t => t.tier >= 2 || t.durability > 50)
      .map(t => t.id)
    
    const allToolIds = [...new Set([...inheritedToolIds, ...globalUnlockedTools.value])]

    const success = gameStore.startCase(caseId, allToolIds)
    if (success) {
      gameStore.addLog('discovery', '新游戏+：继承了部分工具')
      gameStore.modifySanity(20, '新游戏+奖励')
    }
    return success
  }

  function unlockGlobalTool(toolId: string): boolean {
    if (globalUnlockedTools.value.includes(toolId)) return false
    
    globalUnlockedTools.value.push(toolId)
    saveGlobalUnlocks()
    return true
  }

  function getInheritedToolsFromSave(saveId: string): string[] {
    const save = getSaveById(saveId)
    if (!save) return []
    
    return save.gameState.tools
      .filter(t => t.tier >= 2 || t.durability > 30)
      .map(t => t.id)
  }

  function formatDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getPlayDuration(startTime: number): string {
    const duration = Date.now() - startTime
    const hours = Math.floor(duration / 3600000)
    const minutes = Math.floor((duration % 3600000) / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    
    if (hours > 0) {
      return `${hours}小时${minutes}分钟`
    } else if (minutes > 0) {
      return `${minutes}分钟${seconds}秒`
    } else {
      return `${seconds}秒`
    }
  }

  loadSavesFromStorage()

  return {
    saves,
    saveCount,
    hasSaves,
    maxSaves,
    globalUnlockedTools,
    createSave,
    loadSave,
    deleteSave,
    updateSave,
    getSaveById,
    getSavesByCase,
    startNewGamePlus,
    unlockGlobalTool,
    getInheritedToolsFromSave,
    formatDate,
    getPlayDuration,
    getCurrentSaveRisk
  }
})
