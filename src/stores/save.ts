import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { SaveData } from '@/types'
import { useGameStore } from './game'
import { setCaseStatus } from '@/data/cases'

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

  function createSave(name: string): boolean {
    const gameStore = useGameStore()
    const currentGameState = gameStore.getGameState()
    
    if (!currentGameState.currentCase) {
      return false
    }

    if (saves.value.length >= maxSaves) {
      saves.value.shift()
    }

    const save: SaveData = {
      id: `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      caseId: currentGameState.currentCase,
      gameState: currentGameState,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      characterProfileId: currentGameState.characterProfileId ?? undefined
    }

    saves.value.push(save)
    saveSavesToStorage()
    return true
  }

  function loadSave(saveId: string): boolean {
    const save = saves.value.find(s => s.id === saveId)
    if (!save) return false

    const gameStore = useGameStore()
    gameStore.loadGameState(save.gameState)

    if (save.gameState.currentCase) {
      setCaseStatus(save.gameState.currentCase, 'in_progress')
    }
    return true
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
    getPlayDuration
  }
})
