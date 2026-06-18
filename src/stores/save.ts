import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  SaveData, 
  SaveRiskAssessment, 
  GameState, 
  PollutionEvent,
  SaveType,
  KeySnapshotTriggerType,
  KeySnapshotMetadata,
  SaveCoverSummary,
  CaseProgressMetric,
  CrossCaseComparison
} from '@/types'
import { useGameStore } from './game'
import { setCaseStatus, getCaseById, getAllCases } from '@/data/cases'
import { assessSaveRisk } from '@/data/spiritualPollution'
import { useProgressStore } from './progress'

const STORAGE_KEY = 'cthulhu-game-saves'
const GLOBAL_UNLOCKS_KEY = 'cthulhu-global-unlocks'
const AUTO_SAVE_CONFIG_KEY = 'cthulhu-auto-save-config'
const COMPARISON_KEY = 'cthulhu-case-comparisons'

const DEFAULT_AUTO_SAVE_INTERVAL = 5
const MAX_AUTO_SAVES = 5
const MAX_SNAPSHOTS_PER_CASE = 20

export const useSaveStore = defineStore('save', () => {
  const saves = ref<SaveData[]>([])
  const maxSaves = 50
  const globalUnlockedTools = ref<string[]>([])
  const comparisons = ref<CrossCaseComparison[]>([])
  
  const autoSaveEnabled = ref(true)
  const autoSaveIntervalMinutes = ref(DEFAULT_AUTO_SAVE_INTERVAL)
  const autoSaveTimerId = ref<number | null>(null)
  const lastAutoSaveTime = ref<number>(0)
  
  const saveCount = computed(() => saves.value.length)
  const hasSaves = computed(() => saves.value.length > 0)
  
  const manualSaves = computed(() => saves.value.filter(s => s.saveType === 'manual'))
  const autoSaves = computed(() => saves.value.filter(s => s.saveType === 'auto'))
  const snapshots = computed(() => saves.value.filter(s => s.saveType === 'snapshot'))
  const checkpoints = computed(() => saves.value.filter(s => s.saveType === 'checkpoint'))

  function loadAutoSaveConfig() {
    try {
      const config = localStorage.getItem(AUTO_SAVE_CONFIG_KEY)
      if (config) {
        const parsed = JSON.parse(config)
        autoSaveEnabled.value = parsed.enabled ?? true
        autoSaveIntervalMinutes.value = parsed.intervalMinutes ?? DEFAULT_AUTO_SAVE_INTERVAL
      }
    } catch (error) {
      console.error('Failed to load auto save config:', error)
    }
  }

  function saveAutoSaveConfig() {
    try {
      localStorage.setItem(AUTO_SAVE_CONFIG_KEY, JSON.stringify({
        enabled: autoSaveEnabled.value,
        intervalMinutes: autoSaveIntervalMinutes.value
      }))
    } catch (error) {
      console.error('Failed to save auto save config:', error)
    }
  }

  function loadComparisons() {
    try {
      const data = localStorage.getItem(COMPARISON_KEY)
      if (data) {
        comparisons.value = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load comparisons:', error)
      comparisons.value = []
    }
  }

  function saveComparisons() {
    try {
      localStorage.setItem(COMPARISON_KEY, JSON.stringify(comparisons.value))
    } catch (error) {
      console.error('Failed to save comparisons:', error)
    }
  }

  function loadSavesFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const loaded = JSON.parse(data) as SaveData[]
        saves.value = loaded.map(s => ({
          ...s,
          saveType: s.saveType || 'manual',
          playTimeSeconds: s.playTimeSeconds || 0,
          tags: s.tags || []
        }))
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
        hallucinationChance: 0,
        sanityLossOnLoad: 0,
        pollutionGain: 0,
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

  function calculateProgressPercentage(caseId: string, gameState: GameState): number {
    const caseData = getCaseById(caseId)
    if (!caseData) return 0

    let totalEvidence = 0
    let totalClues = 0
    caseData.scenes.forEach(s => {
      totalEvidence += s.evidence.filter(e => !e.isInitiallyHidden).length
    })
    totalClues = caseData.clues.length

    const evidenceProgress = totalEvidence > 0 
      ? (gameState.discoveredEvidence.length / totalEvidence) * 50 
      : 0
    const clueProgress = totalClues > 0 
      ? (gameState.analyzedClues.length / totalClues) * 30 
      : 0
    const deductionProgress = gameState.deductionBranches.length > 0 ? 20 : 0

    return Math.min(100, Math.round(evidenceProgress + clueProgress + deductionProgress))
  }

  function determineMoodTag(gameState: GameState): SaveCoverSummary['moodTag'] {
    const sanity = gameState.sanity
    const erosion = gameState.spiritualPollution.longTermErosion
    const shock = gameState.spiritualPollution.shortTermShock

    if (erosion > 60 || gameState.gameLog.some(l => l.description.includes('深渊'))) {
      return 'corrupted'
    }
    if (sanity < 20 || shock > 70) {
      return 'dangerous'
    }
    if (sanity < 50 || shock > 40 || erosion > 30) {
      return 'tense'
    }
    if (gameState.deductionBranches.length >= 2) {
      return 'victorious'
    }
    if (gameState.discoveredClues.length < 3) {
      return 'mysterious'
    }
    return 'hopeful'
  }

  function extractKeyHighlights(gameState: GameState, caseId: string): string[] {
    const highlights: string[] = []
    const caseData = getCaseById(caseId)

    if (gameState.discoveredEvidence.length > 0) {
      const specialCount = caseData?.scenes.reduce((acc, s) => 
        acc + s.evidence.filter(e => e.isSpecial && gameState.discoveredEvidence.includes(e.id)).length
      , 0) || 0
      if (specialCount > 0) {
        highlights.push(`发现 ${specialCount} 个关键证据`)
      } else {
        highlights.push(`收集 ${gameState.discoveredEvidence.length} 个证据`)
      }
    }

    if (gameState.analyzedClues.length > 0) {
      highlights.push(`分析 ${gameState.analyzedClues.length} 条线索`)
    }

    if (gameState.clueConnections.length > 0) {
      highlights.push(`建立 ${gameState.clueConnections.length} 个关联`)
    }

    if (gameState.deductionBranches.length > 0) {
      highlights.push(`解锁 ${gameState.deductionBranches.length} 个推理分支`)
    }

    if (gameState.spiritualPollution.unlockedCorruptionMilestones.length > 0) {
      highlights.push(`触发 ${gameState.spiritualPollution.unlockedCorruptionMilestones.length} 个腐化里程碑`)
    }

    return highlights.slice(0, 4)
  }

  function generateCoverSummary(
    caseId: string, 
    gameState: GameState
  ): SaveCoverSummary {
    const caseData = getCaseById(caseId)
    const difficultyLabels: Record<string, string> = {
      easy: '简单',
      normal: '普通',
      hard: '困难'
    }

    const moodMessages: Record<SaveCoverSummary['moodTag'], string> = {
      hopeful: '一切似乎都在掌握之中',
      tense: '气氛开始变得紧张',
      dangerous: '形势危急，需要谨慎',
      corrupted: '深渊已经留下了印记',
      mysterious: '迷雾重重，真相未知',
      victorious: '已经接近真相'
    }

    const currentSceneName = gameState.visitedScenes.length > 0
      ? (caseData?.scenes.find(s => s.id === gameState.visitedScenes[gameState.visitedScenes.length - 1])?.name || '未知场景')
      : '尚未开始'

    const phaseName = gameState.intelligenceState.currentPhaseId
      ? `第 ${parseInt(gameState.intelligenceState.currentPhaseId.split('-').pop() || '1')} 阶段`
      : '初期调查'

    const progress = calculateProgressPercentage(caseId, gameState)
    let endingHint: string | undefined

    if (progress >= 90) {
      endingHint = '即将揭开真相'
    } else if (progress >= 70) {
      endingHint = '线索逐渐明朗'
    } else if (progress >= 40) {
      endingHint = '调查进行中'
    }

    return {
      caseTitle: caseData?.title || '未知案件',
      caseDifficulty: difficultyLabels[caseData?.difficulty || 'normal'],
      progressPercentage: progress,
      phaseName,
      currentSceneName,
      keyHighlights: extractKeyHighlights(gameState, caseId),
      moodTag: determineMoodTag(gameState),
      sanityStatus: moodMessages[determineMoodTag(gameState)],
      timeElapsed: formatPlayDuration(gameState.startTime),
      discoveredCount: {
        evidence: gameState.discoveredEvidence.length,
        clues: gameState.analyzedClues.length,
        connections: gameState.clueConnections.length
      },
      endingHint
    }
  }

  function calculatePlayTimeSeconds(startTime: number): number {
    return Math.floor((Date.now() - startTime) / 1000)
  }

  function cleanupOldSavesByType(saveType: SaveType, maxCount: number, caseId?: string) {
    const filtered = saves.value
      .filter(s => s.saveType === saveType && (!caseId || s.caseId === caseId))
      .sort((a, b) => b.createdAt - a.createdAt)

    if (filtered.length > maxCount) {
      const toRemove = filtered.slice(maxCount)
      toRemove.forEach(s => {
        const idx = saves.value.findIndex(sv => sv.id === s.id)
        if (idx !== -1) saves.value.splice(idx, 1)
      })
      saveSavesToStorage()
    }
  }

  function createSaveInternal(
    name: string, 
    saveType: SaveType,
    forceSave: boolean = false,
    snapshotMetadata?: KeySnapshotMetadata,
    tags?: string[]
  ): { success: boolean; risk: SaveRiskAssessment; corrupted: boolean; saveId?: string } {
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

    if (!forceSave && (risk.level === 'critical' || risk.level === 'corrupted') && saveType === 'manual') {
      return { success: false, risk, corrupted: false }
    }

    let finalGameState = currentGameState
    let corrupted = false

    if (saveType === 'manual' || saveType === 'checkpoint') {
      const corruptionRoll = Math.random()
      if (corruptionRoll < risk.corruptionChance) {
        corrupted = true
        const severity = corruptionRoll < risk.corruptionChance * 0.2 ? 'severe' :
                         corruptionRoll < risk.corruptionChance * 0.6 ? 'moderate' : 'mild'
        finalGameState = corruptGameState(currentGameState, severity)
        gameStore.addLog('sanity_loss', `⚠️ 存档仪式受到干扰...（${severity === 'severe' ? '严重' : severity === 'moderate' ? '中等' : '轻微'}污染）`)
      }

      const hallucinationRoll = Math.random()
      if (hallucinationRoll < risk.hallucinationChance) {
        const messages = [
          '存档画面中似乎闪过了一个扭曲的影子...',
          '保存的瞬间，你听到了远处传来的低语...',
          '这个存档文件名...是你自己输入的吗？',
          '存档完成后，你感到一阵眩晕...',
          '你确定刚才真的按下了保存键吗？'
        ]
        gameStore.addLog('sanity_loss', `👁️ ${messages[Math.floor(Math.random() * messages.length)]}`)
      }

      if (risk.pollutionGain > 0 && forceSave) {
        gameStore.addPollution(0, risk.pollutionGain, 'save_ritual', '强行进行存档仪式带来的精神侵蚀')
      }
    }

    if (saves.value.length >= maxSaves) {
      const oldestAuto = saves.value.find(s => s.saveType === 'auto')
      if (oldestAuto) {
        const idx = saves.value.findIndex(s => s.id === oldestAuto.id)
        saves.value.splice(idx, 1)
      } else {
        saves.value.shift()
      }
    }

    const saveId = `save-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const displayName = corrupted && saveType === 'manual' ? `[污染] ${name}` : name
    const coverSummary = generateCoverSummary(currentGameState.currentCase, finalGameState)
    
    const save: SaveData = {
      id: saveId,
      name: displayName,
      caseId: finalGameState.currentCase!,
      gameState: finalGameState,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      characterProfileId: finalGameState.characterProfileId ?? undefined,
      saveType,
      snapshotMetadata,
      coverSummary,
      playTimeSeconds: calculatePlayTimeSeconds(finalGameState.startTime),
      autoSaveConfig: saveType === 'auto' ? {
        intervalMinutes: autoSaveIntervalMinutes.value,
        enabled: autoSaveEnabled.value
      } : undefined,
      tags: tags || []
    }

    saves.value.push(save)
    saveSavesToStorage()
    
    if (saveType === 'manual') {
      gameStore.addPollution(5, 2, 'save_ritual', '进行存档仪式')
    }

    if (saveType === 'auto') {
      cleanupOldSavesByType('auto', MAX_AUTO_SAVES)
    } else if (saveType === 'snapshot') {
      cleanupOldSavesByType('snapshot', MAX_SNAPSHOTS_PER_CASE, save.caseId)
    }
    
    return { success: true, risk, corrupted, saveId }
  }

  function createSave(name: string, forceSave: boolean = false, tags?: string[]) {
    return createSaveInternal(name, 'manual', forceSave, undefined, tags)
  }

  function createAutoSave(): { success: boolean; saveId?: string } {
    const gameStore = useGameStore()
    if (!gameStore.currentCase) {
      return { success: false }
    }
    
    const result = createSaveInternal(
      `[自动] ${new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })}`,
      'auto',
      true,
      undefined,
      ['auto-save']
    )
    
    if (result.success) {
      lastAutoSaveTime.value = Date.now()
      gameStore.addLog('timer', '📋 系统已自动保存进度')
    }
    
    return result
  }

  function createKeySnapshot(
    triggerType: KeySnapshotTriggerType,
    description: string,
    options?: {
      relatedIds?: string[]
      phaseId?: string
      sceneId?: string
      significance?: KeySnapshotMetadata['significance']
      customName?: string
    }
  ): { success: boolean; saveId?: string } {
    const gameStore = useGameStore()
    if (!gameStore.currentCase) {
      return { success: false }
    }

    const significance = options?.significance || (
      triggerType === 'conclusion_reached' ? 'critical' :
      triggerType === 'phase_unlocked' || triggerType === 'deduction_branch' ? 'major' :
      triggerType === 'sanity_threshold' ? 'moderate' : 'minor'
    )

    const triggerLabels: Record<KeySnapshotTriggerType, string> = {
      evidence_discovered: '发现证据',
      clue_analyzed: '分析线索',
      phase_unlocked: '阶段推进',
      deduction_branch: '解锁分支',
      scene_entered: '进入场景',
      sanity_threshold: '理智警戒',
      mail_read: '阅读邮件',
      document_read: '阅读文档',
      tool_acquired: '获得工具',
      conclusion_reached: '得出结论'
    }

    const snapshotName = options?.customName || 
      `[快照] ${triggerLabels[triggerType]} - ${new Date().toLocaleTimeString('zh-CN')}`

    const metadata: KeySnapshotMetadata = {
      triggerType,
      triggerDescription: description,
      relatedIds: options?.relatedIds,
      phaseId: options?.phaseId,
      sceneId: options?.sceneId,
      significance
    }

    const result = createSaveInternal(
      snapshotName,
      'snapshot',
      true,
      metadata,
      ['snapshot', triggerType]
    )

    return result
  }

  function createCheckpoint(name?: string, tags?: string[]): { success: boolean; saveId?: string } {
    const gameStore = useGameStore()
    if (!gameStore.currentCase) {
      return { success: false }
    }

    const checkpointName = name || 
      `[节点] ${new Date().toLocaleString('zh-CN', {
        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
      })}`

    return createSaveInternal(
      checkpointName,
      'checkpoint',
      true,
      undefined,
      ['checkpoint', ...(tags || [])]
    )
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
    save.playTimeSeconds = calculatePlayTimeSeconds(currentGameState.startTime)
    save.coverSummary = generateCoverSummary(save.caseId, currentGameState)
    saveSavesToStorage()
    return true
  }

  function getSaveById(saveId: string): SaveData | undefined {
    return saves.value.find(s => s.id === saveId)
  }

  function getSavesByCase(caseId: string): SaveData[] {
    return saves.value.filter(s => s.caseId === caseId)
  }

  function getSnapshotsByCase(caseId: string): SaveData[] {
    return saves.value.filter(s => s.caseId === caseId && s.saveType === 'snapshot')
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function getCheckpointsByCase(caseId: string): SaveData[] {
    return saves.value.filter(s => s.caseId === caseId && s.saveType === 'checkpoint')
      .sort((a, b) => b.createdAt - a.createdAt)
  }

  function getTimelineForCase(caseId: string): SaveData[] {
    return saves.value
      .filter(s => s.caseId === caseId)
      .sort((a, b) => a.createdAt - b.createdAt)
  }

  function startAutoSaveTimer() {
    stopAutoSaveTimer()
    
    if (!autoSaveEnabled.value) return

    autoSaveTimerId.value = window.setInterval(() => {
      const gameStore = useGameStore()
      if (!gameStore.currentCase) return

      const minutesSinceLast = (Date.now() - lastAutoSaveTime.value) / 60000
      if (minutesSinceLast >= autoSaveIntervalMinutes.value) {
        const risk = getCurrentSaveRisk()
        if (risk.level !== 'corrupted') {
          createAutoSave()
        }
      }
    }, 60000)
  }

  function stopAutoSaveTimer() {
    if (autoSaveTimerId.value !== null) {
      clearInterval(autoSaveTimerId.value)
      autoSaveTimerId.value = null
    }
  }

  function setAutoSaveEnabled(enabled: boolean) {
    autoSaveEnabled.value = enabled
    saveAutoSaveConfig()
    
    if (enabled) {
      startAutoSaveTimer()
    } else {
      stopAutoSaveTimer()
    }
  }

  function setAutoSaveInterval(minutes: number) {
    autoSaveIntervalMinutes.value = Math.max(1, Math.min(60, minutes))
    saveAutoSaveConfig()
    
    if (autoSaveEnabled.value) {
      startAutoSaveTimer()
    }
  }

  function generateCaseMetrics(caseId: string, save?: SaveData): CaseProgressMetric[] {
    const caseData = getCaseById(caseId)
    const progressStore = useProgressStore()
    const progress = progressStore.getProgress(caseId)
    const gameState = save?.gameState
    
    const totalEvidence = caseData?.scenes.reduce((acc, s) => 
      acc + s.evidence.filter(e => !e.isInitiallyHidden).length
    , 0) || 0
    const totalClues = caseData?.clues.length || 0

    const metrics: CaseProgressMetric[] = []
    
    const discoveredEvidence = gameState?.discoveredEvidence.length || progress?.discoveredEvidence.length || 0
    metrics.push({
      metricId: 'evidence_progress',
      metricName: '证据收集',
      value: discoveredEvidence,
      maxValue: totalEvidence,
      unit: '个',
      color: '#4a90d9'
    })

    const analyzedClues = gameState?.analyzedClues.length || progress?.discoveredClues.length || 0
    metrics.push({
      metricId: 'clue_progress',
      metricName: '线索分析',
      value: analyzedClues,
      maxValue: totalClues,
      unit: '条',
      color: '#6b4c9a'
    })

    metrics.push({
      metricId: 'connections',
      metricName: '线索关联',
      value: gameState?.clueConnections.length || 0,
      unit: '个',
      color: '#3a8b5a'
    })

    metrics.push({
      metricId: 'branches',
      metricName: '推理分支',
      value: gameState?.deductionBranches.length || progress?.unlockedBranches.length || 0,
      unit: '个',
      color: '#d4850a'
    })

    const sanity = gameState?.sanity
    if (sanity !== undefined && gameState?.maxSanity !== undefined) {
      metrics.push({
        metricId: 'sanity',
        metricName: '剩余理智',
        value: sanity,
        maxValue: gameState.maxSanity,
        unit: '%',
        color: sanity > 60 ? '#3a8b5a' : sanity > 30 ? '#8b6b3a' : '#8b3a3a'
      })
    }

    const progressPct = gameState 
      ? calculateProgressPercentage(caseId, gameState)
      : (progress?.completed ? 100 : Math.round(((discoveredEvidence / Math.max(1, totalEvidence)) * 0.5 + (analyzedClues / Math.max(1, totalClues)) * 0.5) * 100))
    
    metrics.push({
      metricId: 'overall_progress',
      metricName: '整体进度',
      value: progressPct,
      maxValue: 100,
      unit: '%',
      color: '#6b4c9a'
    })

    metrics.push({
      metricId: 'play_count',
      metricName: '游玩次数',
      value: progress?.playCount || 0,
      unit: '次',
      color: '#888'
    })

    if (progress?.bestScore) {
      metrics.push({
        metricId: 'best_score',
        metricName: '最佳分数',
        value: progress.bestScore.totalScore,
        unit: '分',
        color: '#ffd700'
      })
    }

    if (progress?.fastestTime) {
      metrics.push({
        metricId: 'fastest_time',
        metricName: '最快用时',
        value: Math.round(progress.fastestTime / 60),
        unit: '分钟',
        color: '#4a90d9'
      })
    }

    const totalSanityLost = progress?.totalSanityLost || 0
    metrics.push({
      metricId: 'sanity_lost',
      metricName: '累计理智损失',
      value: totalSanityLost,
      unit: '点',
      color: '#8b3a3a'
    })

    return metrics
  }

  function calculateOverallScore(metrics: CaseProgressMetric[]): number {
    let score = 0
    const weights: Record<string, number> = {
      overall_progress: 3,
      evidence_progress: 2,
      clue_progress: 2,
      connections: 1.5,
      branches: 2,
      sanity: 1,
      best_score: 2,
      fastest_time: 1,
      play_count: 0.5,
      sanity_lost: -1
    }

    metrics.forEach(m => {
      const weight = weights[m.metricId] || 0.5
      let normalizedValue = m.maxValue ? (m.value / m.maxValue) * 100 : m.value
      
      if (m.metricId === 'fastest_time') {
        normalizedValue = Math.max(0, 100 - normalizedValue)
      }
      if (m.metricId === 'sanity_lost') {
        normalizedValue = Math.max(0, 100 - Math.min(normalizedValue, 100))
      }
      
      score += normalizedValue * weight
    })

    return Math.round(score)
  }

  function compareCaseProgress(caseIds: string[]): CrossCaseComparison {
    const metricsMap: Record<string, CaseProgressMetric[]> = {}
    const rankings: { caseId: string; score: number; rank: number }[] = []

    caseIds.forEach(caseId => {
      const latestSave = [...getSavesByCase(caseId)]
        .sort((a, b) => b.updatedAt - a.updatedAt)[0]
      
      const metrics = generateCaseMetrics(caseId, latestSave)
      metricsMap[caseId] = metrics
      rankings.push({
        caseId,
        score: calculateOverallScore(metrics),
        rank: 0
      })
    })

    rankings.sort((a, b) => b.score - a.score)
    rankings.forEach((r, i) => r.rank = i + 1)

    const summaryNotes: string[] = []
    if (rankings.length >= 2) {
      const best = rankings[0]
      const bestCase = getCaseById(best.caseId)
      summaryNotes.push(`🏆 综合表现最佳：${bestCase?.title || best.caseId}`)

      const evidenceLeader = caseIds.reduce((a, b) => {
        const aEv = metricsMap[a].find(m => m.metricId === 'evidence_progress')?.value || 0
        const bEv = metricsMap[b].find(m => m.metricId === 'evidence_progress')?.value || 0
        return aEv >= bEv ? a : b
      })
      if (evidenceLeader !== best.caseId) {
        summaryNotes.push(`🔍 证据收集最全面：${getCaseById(evidenceLeader)?.title || evidenceLeader}`)
      }

      const sanityLeader = caseIds.reduce((a, b) => {
        const aS = metricsMap[a].find(m => m.metricId === 'sanity')
        const bS = metricsMap[b].find(m => m.metricId === 'sanity')
        const aVal = aS && aS.maxValue ? (aS.value / aS.maxValue) * 100 : 0
        const bVal = bS && bS.maxValue ? (bS.value / bS.maxValue) * 100 : 0
        return aVal >= bVal ? a : b
      })
      if (sanityLeader !== best.caseId) {
        summaryNotes.push(`🧠 理智保持最好：${getCaseById(sanityLeader)?.title || sanityLeader}`)
      }
    }

    const comparison: CrossCaseComparison = {
      caseIds,
      comparisonDate: Date.now(),
      metrics: metricsMap,
      overallRanking: rankings,
      summaryNotes
    }

    comparisons.value.push(comparison)
    if (comparisons.value.length > 20) {
      comparisons.value = comparisons.value.slice(-20)
    }
    saveComparisons()

    return comparison
  }

  function getAvailableCasesForComparison(): string[] {
    const progressStore = useProgressStore()
    return getAllCases()
      .filter(c => {
        const progress = progressStore.getProgress(c.id)
        const hasSaves = getSavesByCase(c.id).length > 0
        return progress?.completed || (progress?.playCount ?? 0) > 0 || hasSaves
      })
      .map(c => c.id)
  }

  function getLastComparison(): CrossCaseComparison | null {
    return comparisons.value.length > 0 
      ? comparisons.value[comparisons.value.length - 1]
      : null
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

  function formatPlayDuration(startTime: number): string {
    const duration = Date.now() - startTime
    return formatDurationMs(duration)
  }

  function formatDurationMs(duration: number): string {
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

  function formatDurationSeconds(seconds: number): string {
    return formatDurationMs(seconds * 1000)
  }

  function getSaveTypeLabel(type: SaveType): string {
    const labels: Record<SaveType, string> = {
      manual: '手动存档',
      auto: '自动存档',
      snapshot: '快照',
      checkpoint: '关键节点'
    }
    return labels[type]
  }

  function getSaveTypeColor(type: SaveType): string {
    const colors: Record<SaveType, string> = {
      manual: '#4a90d9',
      auto: '#6b4c9a',
      snapshot: '#d4850a',
      checkpoint: '#3a8b5a'
    }
    return colors[type]
  }

  function getSignificanceLabel(significance: KeySnapshotMetadata['significance']): string {
    const labels = {
      minor: '次要',
      moderate: '一般',
      major: '重要',
      critical: '关键'
    }
    return labels[significance]
  }

  function getSignificanceColor(significance: KeySnapshotMetadata['significance']): string {
    const colors = {
      minor: '#888',
      moderate: '#d4850a',
      major: '#4a90d9',
      critical: '#8b3a3a'
    }
    return colors[significance]
  }

  function getMoodTagLabel(tag: SaveCoverSummary['moodTag']): string {
    const labels: Record<SaveCoverSummary['moodTag'], string> = {
      hopeful: '充满希望',
      tense: '紧张不安',
      dangerous: '形势危急',
      corrupted: '被污染',
      mysterious: '神秘未知',
      victorious: '胜利在望'
    }
    return labels[tag]
  }

  function getMoodTagEmoji(tag: SaveCoverSummary['moodTag']): string {
    const emojis: Record<SaveCoverSummary['moodTag'], string> = {
      hopeful: '✨',
      tense: '😰',
      dangerous: '⚠️',
      corrupted: '💀',
      mysterious: '🌙',
      victorious: '🏆'
    }
    return emojis[tag]
  }

  loadSavesFromStorage()
  loadAutoSaveConfig()
  loadComparisons()

  return {
    saves,
    saveCount,
    hasSaves,
    maxSaves,
    globalUnlockedTools,
    manualSaves,
    autoSaves,
    snapshots,
    checkpoints,
    autoSaveEnabled,
    autoSaveIntervalMinutes,
    lastAutoSaveTime,
    comparisons,
    createSave,
    createAutoSave,
    createKeySnapshot,
    createCheckpoint,
    loadSave,
    deleteSave,
    updateSave,
    getSaveById,
    getSavesByCase,
    getSnapshotsByCase,
    getCheckpointsByCase,
    getTimelineForCase,
    startAutoSaveTimer,
    stopAutoSaveTimer,
    setAutoSaveEnabled,
    setAutoSaveInterval,
    generateCoverSummary,
    generateCaseMetrics,
    compareCaseProgress,
    getAvailableCasesForComparison,
    getLastComparison,
    startNewGamePlus,
    unlockGlobalTool,
    getInheritedToolsFromSave,
    formatDate,
    formatPlayDuration,
    formatDurationMs,
    formatDurationSeconds,
    getSaveTypeLabel,
    getSaveTypeColor,
    getSignificanceLabel,
    getSignificanceColor,
    getMoodTagLabel,
    getMoodTagEmoji,
    getCurrentSaveRisk,
    calculateProgressPercentage
  }
})
