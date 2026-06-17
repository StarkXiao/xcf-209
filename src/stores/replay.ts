import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  ReplayTimeline, 
  ReplayNode, 
  ReplayNodeType, 
  ReplayEditorState,
  ReplayFilter,
  ReplayPlaybackState,
  ReplayExportData,
  ReplayStats,
  SaveData,
  GameLogEntry,
  CaseProgress
} from '@/types'
import { useSaveStore } from './save'
import { useProgressStore } from './progress'
import { getCaseById } from '@/data/cases'

const STORAGE_KEY = 'cthulhu-replay-timelines'

export const useReplayStore = defineStore('replay', () => {
  const saveStore = useSaveStore()
  const progressStore = useProgressStore()

  const state = ref<ReplayEditorState>({
    activeTimeline: null,
    availableTimelines: {},
    selectedNodeId: null,
    filter: {
      nodeTypes: [],
      searchQuery: '',
      keyMomentsOnly: false
    },
    playback: {
      isPlaying: false,
      currentNodeIndex: 0,
      speed: 1,
      autoAdvance: true,
      intervalId: null
    },
    isEditing: false,
    highlightedNodeIds: []
  })

  const activeTimeline = computed(() => state.value.activeTimeline)
  const selectedNode = computed(() => {
    if (!state.value.activeTimeline || !state.value.selectedNodeId) return null
    return state.value.activeTimeline.nodes.find(n => n.id === state.value.selectedNodeId) || null
  })
  const selectedNodeIndex = computed(() => {
    if (!state.value.activeTimeline || !state.value.selectedNodeId) return -1
    return state.value.activeTimeline.nodes.findIndex(n => n.id === state.value.selectedNodeId)
  })
  const filteredNodes = computed(() => {
    if (!state.value.activeTimeline) return []
    let nodes = [...state.value.activeTimeline.nodes]
    
    if (state.value.filter.nodeTypes.length > 0) {
      nodes = nodes.filter(n => state.value.filter.nodeTypes.includes(n.type))
    }
    
    if (state.value.filter.keyMomentsOnly) {
      nodes = nodes.filter(n => n.isKeyMoment)
    }
    
    if (state.value.filter.searchQuery.trim()) {
      const query = state.value.filter.searchQuery.toLowerCase()
      nodes = nodes.filter(n => 
        n.title.toLowerCase().includes(query) ||
        n.description.toLowerCase().includes(query) ||
        n.tags.some(t => t.toLowerCase().includes(query))
      )
    }
    
    return nodes
  })

  const stats = computed<ReplayStats>(() => {
    const nodes = state.value.activeTimeline?.nodes || []
    const sanityChanges = nodes.map(n => n.sanityChange || 0)
    
    return {
      totalScenesVisited: nodes.filter(n => n.type === 'scene_visit').length,
      totalEvidenceDiscovered: nodes.filter(n => n.type === 'evidence_discovery').length,
      totalCluesDiscovered: nodes.filter(n => n.type === 'clue_discovery').length,
      totalCluesAnalyzed: nodes.filter(n => n.type === 'clue_analysis').length,
      totalConnections: nodes.filter(n => n.type === 'clue_connection').length,
      totalSanityLost: sanityChanges.filter(c => c < 0).reduce((a, b) => a + Math.abs(b), 0),
      totalSanityGained: sanityChanges.filter(c => c > 0).reduce((a, b) => a + b, 0),
      keyMomentCount: nodes.filter(n => n.isKeyMoment).length,
      phaseCount: nodes.filter(n => n.type === 'phase_unlock').length,
      toolsUsed: Array.from(new Set(nodes.filter(n => n.type === 'tool_use').map(n => n.details?.toolId as string).filter(Boolean)))
    }
  })

  function loadTimelinesFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        state.value.availableTimelines = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load replay timelines:', error)
      state.value.availableTimelines = {}
    }
  }

  function saveTimelinesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value.availableTimelines))
    } catch (error) {
      console.error('Failed to save replay timelines:', error)
    }
  }

  function generateTimelineFromSave(saveData: SaveData, caseProgress?: CaseProgress): ReplayTimeline {
    const caseData = getCaseById(saveData.caseId)
    const gameState = saveData.gameState
    const nodes: ReplayNode[] = []
    const startTime = gameState.startTime
    
    let lastTimestamp = startTime

    const addNode = (node: Omit<ReplayNode, 'id' | 'relativeTime'>) => {
      const relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      if (node.timestamp > lastTimestamp) {
        lastTimestamp = node.timestamp
      }
      nodes.push({
        ...node,
        id: `replay-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        relativeTime
      })
    }

    const visitedSceneMap = new Map<string, number>()
    gameState.visitedScenes.forEach((sceneId, idx) => {
      if (!visitedSceneMap.has(sceneId)) {
        visitedSceneMap.set(sceneId, idx)
        const scene = caseData?.scenes.find(s => s.id === sceneId)
        addNode({
          type: 'scene_visit',
          timestamp: startTime + idx * 60000,
          title: scene ? `探索场景：${scene.name}` : `探索场景：${sceneId}`,
          description: scene?.description || '进入新的调查场景',
          details: { sceneId, isFirstVisit: true },
          isKeyMoment: idx === 0 || idx === gameState.visitedScenes.length - 1,
          tags: ['场景', '探索'],
          sceneId
        })
      }
    })

    gameState.discoveredEvidence.forEach((evidenceId, idx) => {
      const evidence = caseData?.scenes
        .flatMap(s => s.evidence)
        .find(e => e.id === evidenceId)
      addNode({
        type: 'evidence_discovery',
        timestamp: startTime + (idx + 1) * 45000,
        title: evidence ? `发现证据：${evidence.name}` : `发现证据`,
        description: evidence?.description || '在调查中发现了新的证据',
        details: { 
          evidenceId, 
          type: evidence?.type,
          sanityEffect: evidence?.sanityEffect,
          isSpecial: evidence?.isSpecial,
          isHidden: evidence?.isInitiallyHidden
        },
        isKeyMoment: !!evidence?.isSpecial || !!evidence?.sanityEffect,
        tags: ['证据', evidence?.type || ''].filter(Boolean),
        sanityChange: evidence?.sanityEffect ? -Math.abs(evidence.sanityEffect) : undefined,
        evidenceId
      })
    })

    gameState.discoveredClues.forEach((clueId, idx) => {
      const clue = caseData?.clues.find(c => c.id === clueId)
      addNode({
        type: 'clue_discovery',
        timestamp: startTime + (idx + 2) * 50000,
        title: clue ? `获得线索：${clue.name}` : `获得线索`,
        description: clue?.description || '通过调查获得了新的线索',
        details: { 
          clueId, 
          type: clue?.type,
          source: clue?.source,
          importance: clue?.importance
        },
        isKeyMoment: (clue?.importance || 0) >= 4,
        tags: ['线索', clue?.type || ''].filter(Boolean),
        clueId
      })
    })

    gameState.analyzedClues.forEach((clueId, idx) => {
      const clue = caseData?.clues.find(c => c.id === clueId)
      addNode({
        type: 'clue_analysis',
        timestamp: startTime + (idx + 3) * 55000,
        title: clue ? `分析线索：${clue.name}` : `分析线索`,
        description: clue?.analysisResult || '对线索进行了深入分析',
        details: { 
          clueId, 
          result: clue?.analysisResult,
          requiredTool: clue?.requiredToolForAnalysis
        },
        isKeyMoment: true,
        tags: ['分析', '线索'],
        clueId
      })
    })

    gameState.clueConnections.forEach((conn, idx) => {
      const clue1 = caseData?.clues.find(c => c.id === conn.clue1Id)
      const clue2 = caseData?.clues.find(c => c.id === conn.clue2Id)
      addNode({
        type: 'clue_connection',
        timestamp: startTime + (idx + 4) * 60000,
        title: `建立关联：${clue1?.name || conn.clue1Id} ↔ ${clue2?.name || conn.clue2Id}`,
        description: conn.relationship || '两条线索之间存在关联',
        details: { 
          clue1Id: conn.clue1Id,
          clue2Id: conn.clue2Id,
          relationship: conn.relationship,
          confirmed: conn.confirmed
        },
        isKeyMoment: conn.confirmed,
        tags: ['关联', '线索图谱']
      })
    })

    gameState.deductionBranches.forEach((branchId, idx) => {
      addNode({
        type: 'deduction_branch',
        timestamp: startTime + (idx + 5) * 90000,
        title: `解锁推演分支`,
        description: `解锁了新的推演方向：${branchId}`,
        details: { branchId },
        isKeyMoment: true,
        tags: ['推演', '分支']
      })
    })

    gameState.tools.forEach(tool => {
      addNode({
        type: 'tool_use',
        title: `使用工具：${tool.name}`,
        timestamp: startTime + 120000,
        description: `工具耐久度：${tool.durability}/${tool.maxDurability}`,
        details: { 
          toolId: tool.id,
          toolName: tool.name,
          uses: tool.uses,
          maxUses: tool.maxUses,
          durability: tool.durability,
          maxDurability: tool.maxDurability,
          tier: tool.tier
        },
        isKeyMoment: tool.tier >= 3,
        tags: ['工具', tool.type]
      })
    })

    gameState.gameLog.forEach((log: GameLogEntry) => {
      if (log.type === 'sanity_loss' && log.description.includes('理智值下降')) {
        const match = log.description.match(/理智值下降\s+(\d+(?:\.\d+)?)\s*点/)
        const amount = match ? parseFloat(match[1]) : 5
        addNode({
          type: 'sanity_event',
          timestamp: log.timestamp,
          title: '理智受损',
          description: log.description,
          details: { reason: log.description, logId: log.id },
          isKeyMoment: amount >= 15,
          tags: ['理智', '污染'],
          sanityChange: -amount
        })
      }
    })

    nodes.sort((a, b) => a.timestamp - b.timestamp)

    if (caseProgress) {
      const bestRecord = caseProgress.playHistory[caseProgress.playHistory.length - 1]
      if (bestRecord) {
        addNode({
          type: 'conclusion',
          timestamp: lastTimestamp + 60000,
          title: `案件结案：${caseProgress.bestGrade || '未知评级'}`,
          description: `总分数：${caseProgress.bestScore?.totalScore || 0}分 | 耗时：${formatTime(bestRecord.timeUsed)} | 结局：${bestRecord.endingId}`,
          details: {
            endingId: bestRecord.endingId,
            grade: caseProgress.bestGrade,
            score: caseProgress.bestScore?.totalScore,
            scoreBreakdown: caseProgress.bestScore,
            timeUsed: bestRecord.timeUsed,
            branch: bestRecord.branch
          },
          isKeyMoment: true,
          tags: ['结案', '结局']
        })
      }
    }

    return {
      caseId: saveData.caseId,
      caseTitle: caseData?.title || saveData.caseId,
      nodes: nodes.sort((a, b) => a.timestamp - b.timestamp),
      startTime,
      endTime: lastTimestamp,
      totalDuration: (lastTimestamp - startTime) / 1000,
      sourceSaveId: saveData.id,
      createdAt: Date.now(),
      metadata: {
        endingId: caseProgress?.bestEnding,
        grade: caseProgress?.bestGrade,
        totalScore: caseProgress?.bestScore?.totalScore,
        sanityLost: caseProgress?.totalSanityLost,
        playCount: caseProgress?.playCount
      }
    }
  }

  function generateTimelineFromProgress(caseId: string): ReplayTimeline | null {
    const caseData = getCaseById(caseId)
    const caseProgress = progressStore.getProgress(caseId)
    if (!caseData || !caseProgress) return null

    const caseSaves = saveStore.getSavesByCase(caseId)
    if (caseSaves.length > 0) {
      const latestSave = caseSaves[caseSaves.length - 1]
      return generateTimelineFromSave(latestSave, caseProgress)
    }

    const startTime = caseProgress.completedAt || Date.now() - 3600000
    const nodes: ReplayNode[] = []

    const addNode = (node: Omit<ReplayNode, 'id' | 'relativeTime'>) => {
      const relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      nodes.push({
        ...node,
        id: `replay-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        relativeTime
      })
    }

    addNode({
      type: 'scene_visit',
      timestamp: startTime,
      title: '案件开始',
      description: `开始调查案件：${caseData.title}`,
      details: { caseId, difficulty: caseData.difficulty },
      isKeyMoment: true,
      tags: ['开始', '案件']
    })

    caseProgress.discoveredEvidence.forEach((evidenceId, idx) => {
      const evidence = caseData.scenes
        .flatMap(s => s.evidence)
        .find(e => e.id === evidenceId)
      addNode({
        type: 'evidence_discovery',
        timestamp: startTime + idx * 45000,
        title: evidence ? `发现证据：${evidence.name}` : `发现证据`,
        description: evidence?.description || '',
        details: { evidenceId, type: evidence?.type },
        isKeyMoment: !!evidence?.isSpecial,
        tags: ['证据'],
        evidenceId
      })
    })

    caseProgress.discoveredClues.forEach((clueId, idx) => {
      const clue = caseData.clues.find(c => c.id === clueId)
      addNode({
        type: 'clue_discovery',
        timestamp: startTime + (idx + 1) * 50000,
        title: clue ? `获得线索：${clue.name}` : `获得线索`,
        description: clue?.description || '',
        details: { clueId, type: clue?.type },
        isKeyMoment: (clue?.importance || 0) >= 4,
        tags: ['线索'],
        clueId
      })
    })

    caseProgress.unlockedBranches.forEach((branchId, idx) => {
      addNode({
        type: 'deduction_branch',
        timestamp: startTime + (idx + 2) * 80000,
        title: `解锁分支：${branchId}`,
        description: '发现了新的推演方向',
        details: { branchId },
        isKeyMoment: true,
        tags: ['分支', '推演']
      })
    })

    if (caseProgress.completed) {
      const bestRecord = caseProgress.playHistory[caseProgress.playHistory.length - 1]
      addNode({
        type: 'conclusion',
        timestamp: startTime + 1800000,
        title: `案件结案：${caseProgress.bestGrade || '完成'}`,
        description: bestRecord 
          ? `分数：${caseProgress.bestScore?.totalScore || 0}分 | 耗时：${formatTime(bestRecord.timeUsed)}`
          : '案件调查完成',
        details: {
          grade: caseProgress.bestGrade,
          score: caseProgress.bestScore
        },
        isKeyMoment: true,
        tags: ['结案']
      })
    }

    return {
      caseId,
      caseTitle: caseData.title,
      nodes: nodes.sort((a, b) => a.timestamp - b.timestamp),
      startTime,
      endTime: startTime + 1800000,
      totalDuration: 1800,
      createdAt: Date.now(),
      metadata: {
        grade: caseProgress.bestGrade,
        totalScore: caseProgress.bestScore?.totalScore,
        sanityLost: caseProgress.totalSanityLost,
        playCount: caseProgress.playCount
      }
    }
  }

  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    if (mins > 60) {
      const hours = Math.floor(mins / 60)
      const remainMins = mins % 60
      return `${hours}小时${remainMins}分${secs}秒`
    }
    if (mins > 0) {
      return `${mins}分${secs}秒`
    }
    return `${secs}秒`
  }

  function loadTimelineForCase(caseId: string): ReplayTimeline | null {
    const existing = state.value.availableTimelines[caseId]?.[0]
    if (existing) {
      state.value.activeTimeline = existing
      return existing
    }

    const timeline = generateTimelineFromProgress(caseId)
    if (timeline) {
      if (!state.value.availableTimelines[caseId]) {
        state.value.availableTimelines[caseId] = []
      }
      state.value.availableTimelines[caseId].push(timeline)
      saveTimelinesToStorage()
      state.value.activeTimeline = timeline
      return timeline
    }

    return null
  }

  function loadTimelineFromSave(saveId: string): ReplayTimeline | null {
    const saveData = saveStore.getSaveById(saveId)
    if (!saveData) return null

    const caseProgress = progressStore.getProgress(saveData.caseId)
    const timeline = generateTimelineFromSave(saveData, caseProgress)

    if (!state.value.availableTimelines[saveData.caseId]) {
      state.value.availableTimelines[saveData.caseId] = []
    }
    state.value.availableTimelines[saveData.caseId].push(timeline)
    saveTimelinesToStorage()
    state.value.activeTimeline = timeline

    return timeline
  }

  function selectNode(nodeId: string | null) {
    state.value.selectedNodeId = nodeId
    if (nodeId && state.value.activeTimeline) {
      const idx = state.value.activeTimeline.nodes.findIndex(n => n.id === nodeId)
      if (idx >= 0) {
        state.value.playback.currentNodeIndex = idx
      }
    }
  }

  function toggleKeyMoment(nodeId: string) {
    if (!state.value.activeTimeline) return
    const node = state.value.activeTimeline.nodes.find(n => n.id === nodeId)
    if (node) {
      node.isKeyMoment = !node.isKeyMoment
    }
  }

  function addNode(node: Omit<ReplayNode, 'id' | 'relativeTime' | 'timestamp'> & { timestamp?: number }) {
    if (!state.value.activeTimeline) return
    
    const ts = node.timestamp || Date.now()
    const startTime = state.value.activeTimeline.startTime
    
    const newNode: ReplayNode = {
      ...node,
      id: `replay-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: ts,
      relativeTime: Math.max(0, (ts - startTime) / 1000)
    }

    state.value.activeTimeline.nodes.push(newNode)
    state.value.activeTimeline.nodes.sort((a, b) => a.timestamp - b.timestamp)
    saveTimelinesToStorage()
  }

  function removeNode(nodeId: string) {
    if (!state.value.activeTimeline) return
    const idx = state.value.activeTimeline.nodes.findIndex(n => n.id === nodeId)
    if (idx >= 0) {
      state.value.activeTimeline.nodes.splice(idx, 1)
      if (state.value.selectedNodeId === nodeId) {
        state.value.selectedNodeId = null
      }
      saveTimelinesToStorage()
    }
  }

  function updateNode(nodeId: string, updates: Partial<ReplayNode>) {
    if (!state.value.activeTimeline) return
    const node = state.value.activeTimeline.nodes.find(n => n.id === nodeId)
    if (node) {
      Object.assign(node, updates)
      saveTimelinesToStorage()
    }
  }

  function setFilter(filter: Partial<ReplayFilter>) {
    Object.assign(state.value.filter, filter)
  }

  function toggleNodeTypeFilter(type: ReplayNodeType) {
    const idx = state.value.filter.nodeTypes.indexOf(type)
    if (idx >= 0) {
      state.value.filter.nodeTypes.splice(idx, 1)
    } else {
      state.value.filter.nodeTypes.push(type)
    }
  }

  function clearFilter() {
    state.value.filter = {
      nodeTypes: [],
      searchQuery: '',
      keyMomentsOnly: false
    }
  }

  function startPlayback() {
    if (!state.value.activeTimeline || state.value.activeTimeline.nodes.length === 0) return
    state.value.playback.isPlaying = true
    advancePlayback()
  }

  function advancePlayback() {
    if (!state.value.playback.isPlaying || !state.value.activeTimeline) return
    
    const nodes = state.value.filter.keyMomentsOnly 
      ? state.value.activeTimeline.nodes.filter(n => n.isKeyMoment)
      : state.value.activeTimeline.nodes

    if (state.value.playback.currentNodeIndex < nodes.length - 1) {
      state.value.playback.currentNodeIndex++
      const nextNode = nodes[state.value.playback.currentNodeIndex]
      state.value.selectedNodeId = nextNode.id

      const delay = 2000 / state.value.playback.speed
      if (state.value.playback.autoAdvance) {
        setTimeout(advancePlayback, delay)
      } else {
        state.value.playback.isPlaying = false
      }
    } else {
      state.value.playback.isPlaying = false
    }
  }

  function pausePlayback() {
    state.value.playback.isPlaying = false
  }

  function stopPlayback() {
    state.value.playback.isPlaying = false
    state.value.playback.currentNodeIndex = 0
    if (state.value.activeTimeline && state.value.activeTimeline.nodes.length > 0) {
      state.value.selectedNodeId = state.value.activeTimeline.nodes[0].id
    }
  }

  function goToNextNode() {
    if (!state.value.activeTimeline) return
    const nodes = state.value.filter.keyMomentsOnly 
      ? state.value.activeTimeline.nodes.filter(n => n.isKeyMoment)
      : state.value.activeTimeline.nodes

    if (state.value.playback.currentNodeIndex < nodes.length - 1) {
      state.value.playback.currentNodeIndex++
      const node = nodes[state.value.playback.currentNodeIndex]
      state.value.selectedNodeId = node.id
    }
  }

  function goToPrevNode() {
    if (!state.value.activeTimeline) return
    const nodes = state.value.filter.keyMomentsOnly 
      ? state.value.activeTimeline.nodes.filter(n => n.isKeyMoment)
      : state.value.activeTimeline.nodes

    if (state.value.playback.currentNodeIndex > 0) {
      state.value.playback.currentNodeIndex--
      const node = nodes[state.value.playback.currentNodeIndex]
      state.value.selectedNodeId = node.id
    }
  }

  function setPlaybackSpeed(speed: ReplayPlaybackState['speed']) {
    state.value.playback.speed = speed
  }

  function exportTimeline(): ReplayExportData | null {
    if (!state.value.activeTimeline) return null
    
    const timeline = state.value.activeTimeline
    return {
      version: '1.0',
      exportedAt: Date.now(),
      timeline: JSON.parse(JSON.stringify(timeline)),
      summary: {
        totalNodes: timeline.nodes.length,
        keyMoments: timeline.nodes.filter(n => n.isKeyMoment).length,
        evidenceFound: timeline.nodes.filter(n => n.type === 'evidence_discovery').length,
        cluesAnalyzed: timeline.nodes.filter(n => n.type === 'clue_analysis').length,
        branchesUnlocked: timeline.nodes.filter(n => n.type === 'deduction_branch').length
      }
    }
  }

  function exportAsText(): string {
    if (!state.value.activeTimeline) return ''
    
    const t = state.value.activeTimeline
    let text = `=== 案件回放：${t.caseTitle} ===\n`
    text += `案件ID: ${t.caseId}\n`
    text += `生成时间: ${new Date(t.createdAt).toLocaleString('zh-CN')}\n`
    if (t.metadata.grade) text += `评级: ${t.metadata.grade}\n`
    if (t.metadata.totalScore) text += `分数: ${t.metadata.totalScore}\n`
    text += `\n--- 时间轴 ---\n\n`

    t.nodes.forEach((node) => {
      const timeStr = formatTime(node.relativeTime)
      const keyMark = node.isKeyMoment ? '⭐ ' : ''
      text += `[${timeStr}] ${keyMark}${node.title}\n`
      text += `    ${node.description}\n`
      if (node.tags.length > 0) {
        text += `    标签: ${node.tags.join(', ')}\n`
      }
      text += '\n'
    })

    text += `--- 统计 ---\n`
    text += `关键节点: ${stats.value.keyMomentCount}\n`
    text += `证据发现: ${stats.value.totalEvidenceDiscovered}\n`
    text += `线索分析: ${stats.value.totalCluesAnalyzed}\n`
    text += `线索关联: ${stats.value.totalConnections}\n`
    text += `场景探索: ${stats.value.totalScenesVisited}\n`
    if (stats.value.totalSanityLost > 0) {
      text += `理智损失: ${stats.value.totalSanityLost}\n`
    }

    return text
  }

  function downloadExport() {
    const exportData = exportTimeline()
    if (!exportData) return

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `replay-${state.value.activeTimeline?.caseId}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function downloadTextExport() {
    const text = exportAsText()
    if (!text) return

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `replay-${state.value.activeTimeline?.caseId}-${Date.now()}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function shareTimeline() {
    const text = exportAsText()
    if (navigator.share) {
      navigator.share({
        title: `案件回放：${state.value.activeTimeline?.caseTitle}`,
        text: text.substring(0, 1000)
      }).catch(() => {})
    } else {
      navigator.clipboard?.writeText(text).then(() => {
        alert('回放记录已复制到剪贴板')
      })
    }
  }

  function importTimeline(file: File): Promise<ReplayTimeline> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as ReplayExportData
          const timeline = data.timeline
          if (!state.value.availableTimelines[timeline.caseId]) {
            state.value.availableTimelines[timeline.caseId] = []
          }
          state.value.availableTimelines[timeline.caseId].push(timeline)
          saveTimelinesToStorage()
          state.value.activeTimeline = timeline
          resolve(timeline)
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = reject
      reader.readAsText(file)
    })
  }

  function getTimelinesForCase(caseId: string): ReplayTimeline[] {
    return state.value.availableTimelines[caseId] || []
  }

  function deleteTimeline(caseId: string, index: number) {
    if (state.value.availableTimelines[caseId]?.[index]) {
      const deleted = state.value.availableTimelines[caseId].splice(index, 1)[0]
      if (state.value.activeTimeline === deleted) {
        state.value.activeTimeline = null
        state.value.selectedNodeId = null
      }
      saveTimelinesToStorage()
    }
  }

  function setActiveTimeline(timeline: ReplayTimeline) {
    state.value.activeTimeline = timeline
    state.value.playback.currentNodeIndex = 0
    if (timeline.nodes.length > 0) {
      state.value.selectedNodeId = timeline.nodes[0].id
    }
  }

  function toggleEditMode() {
    state.value.isEditing = !state.value.isEditing
  }

  function highlightNode(nodeId: string) {
    if (!state.value.highlightedNodeIds.includes(nodeId)) {
      state.value.highlightedNodeIds.push(nodeId)
    }
  }

  function unhighlightNode(nodeId: string) {
    const idx = state.value.highlightedNodeIds.indexOf(nodeId)
    if (idx >= 0) {
      state.value.highlightedNodeIds.splice(idx, 1)
    }
  }

  function clearHighlights() {
    state.value.highlightedNodeIds = []
  }

  loadTimelinesFromStorage()

  return {
    state,
    activeTimeline,
    selectedNode,
    selectedNodeIndex,
    filteredNodes,
    stats,
    loadTimelineForCase,
    loadTimelineFromSave,
    selectNode,
    toggleKeyMoment,
    addNode,
    removeNode,
    updateNode,
    setFilter,
    toggleNodeTypeFilter,
    clearFilter,
    startPlayback,
    pausePlayback,
    stopPlayback,
    goToNextNode,
    goToPrevNode,
    setPlaybackSpeed,
    exportTimeline,
    exportAsText,
    downloadExport,
    downloadTextExport,
    shareTimeline,
    importTimeline,
    getTimelinesForCase,
    deleteTimeline,
    setActiveTimeline,
    toggleEditMode,
    highlightNode,
    unhighlightNode,
    clearHighlights,
    formatTime
  }
})
