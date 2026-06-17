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
  CaseProgress,
  Case,
  GameState
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

  function extractEventFromLog(
    log: GameLogEntry,
    _startTime: number,
    caseData: Case | undefined,
    gameState: GameState
  ): Omit<ReplayNode, 'id' | 'relativeTime'> | null {
    const baseSnapshot = {
      sanity: gameState.sanity,
      maxSanity: gameState.maxSanity,
      discoveredEvidence: [...gameState.discoveredEvidence],
      discoveredClues: [...gameState.discoveredClues],
      analyzedClues: [...gameState.analyzedClues],
      visitedScenes: [...gameState.visitedScenes],
      deductionBranches: [...gameState.deductionBranches],
      remainingTime: gameState.timerState.remainingSeconds
    }

    const baseNode = {
      timestamp: log.timestamp,
      details: { ...(log.details || {}), logId: log.id },
      isKeyMoment: false,
      tags: [] as string[],
      sourceLogId: log.id,
      sourceLogType: log.type,
      rawEvent: {
        logEntry: log,
        snapshot: baseSnapshot
      }
    }

    switch (log.type) {
      case 'scene_switch': {
        const sceneIdMatch = log.description.match(/场景切换：([^\s，,]+)/)
        const sceneId = (log.details?.sceneId as string) || sceneIdMatch?.[1] || ''
        const scene = caseData?.scenes.find(s => s.id === sceneId)
        const firstVisit = gameState.visitedScenes.indexOf(sceneId)
        return {
          ...baseNode,
          type: 'scene_visit',
          title: scene ? `探索场景：${scene.name}` : `进入场景：${sceneId || '未知'}`,
          description: scene?.description || log.description,
          isKeyMoment: firstVisit === 0,
          tags: ['场景', '探索'],
          sceneId
        }
      }

      case 'discovery': {
        if (log.description.includes('发现新证据') || log.description.includes('发现证据：') || (log.details && log.details.evidenceId)) {
          const evidenceId = (log.details?.evidenceId as string) || 
            log.description.match(/发现(?:新)?证据[：:]\s*(\S+)/)?.[1] || ''
          const evidence = caseData?.scenes
            .flatMap(s => s.evidence)
            .find(e => e.id === evidenceId)
          return {
            ...baseNode,
            type: 'evidence_discovery',
            title: evidence ? `发现证据：${evidence.name}` : `发现证据`,
            description: evidence?.description || log.description,
            isKeyMoment: !!evidence?.isSpecial,
            tags: ['证据', evidence?.type || ''].filter(Boolean),
            evidenceId,
            sanityChange: evidence?.sanityEffect ? -Math.abs(evidence.sanityEffect) : undefined,
            rawEvent: { ...baseNode.rawEvent, context: { evidenceData: evidence || null } }
          }
        }
        if (log.description.includes('获得新线索') || log.description.includes('获得线索：') || (log.details && log.details.clueId)) {
          const clueId = (log.details?.clueId as string) ||
            log.description.match(/获得(?:新)?线索[：:]\s*(\S+)/)?.[1] || ''
          const clue = caseData?.clues.find(c => c.id === clueId)
          return {
            ...baseNode,
            type: 'clue_discovery',
            title: clue ? `获得线索：${clue.name}` : `获得线索`,
            description: clue?.description || log.description,
            isKeyMoment: (clue?.importance || 0) >= 4,
            tags: ['线索', clue?.type || ''].filter(Boolean),
            clueId,
            rawEvent: { ...baseNode.rawEvent, context: { clueData: clue || null } }
          }
        }
        if (log.description.includes('案件开始') || log.description.includes('开始调查案件')) {
          return {
            ...baseNode,
            type: 'scene_visit',
            title: log.description,
            description: `案件开始调查`,
            isKeyMoment: true,
            tags: ['案件', '开始']
          }
        }
        if (log.description.includes('解锁') && (log.description.includes('分支') || log.description.includes('推演'))) {
          const branchId = (log.details?.branchId as string) || log.description
          return {
            ...baseNode,
            type: 'deduction_branch',
            title: log.description,
            description: '解锁了新的推演方向',
            isKeyMoment: true,
            tags: ['推演', '分支'],
            details: { ...baseNode.details, branchId }
          }
        }
        if (log.description.includes('邮件') || (log.details && log.details.mailId)) {
          return {
            ...baseNode,
            type: 'mail_read',
            title: log.description,
            description: log.description,
            tags: ['邮件'],
            isKeyMoment: !!log.details?.isImportant
          }
        }
        if (log.description.includes('文书') || log.description.includes('文档') || log.description.includes('档案') || (log.details && log.details.documentId)) {
          return {
            ...baseNode,
            type: 'document_read',
            title: log.description,
            description: log.description,
            tags: ['文书', '档案'],
            isKeyMoment: !!log.details?.isClassified
          }
        }
        return null
      }

      case 'analysis':
      case 'analysis_start':
      case 'analysis_complete': {
        if (log.type === 'analysis_complete' || log.description.includes('分析') && log.description.includes('完成')) {
          const evidenceId = (log.details?.evidenceId as string) || ''
          const clueId = (log.details?.clueId as string) || ''
          const clue = clueId ? caseData?.clues.find(c => c.id === clueId) : null
          return {
            ...baseNode,
            type: clueId ? 'clue_analysis' : 'clue_analysis',
            title: clue ? `分析完成：${clue.name}` : (log.type === 'analysis_complete' ? '证据分析完成' : '线索分析'),
            description: log.description,
            isKeyMoment: true,
            tags: ['分析', clue?.type || '线索'].filter(Boolean),
            clueId: clueId || undefined,
            evidenceId: evidenceId || undefined,
            rawEvent: {
              ...baseNode.rawEvent,
              context: { findings: log.details?.findings, success: log.details?.success }
            }
          }
        }
        if (log.type === 'analysis_start') {
          return {
            ...baseNode,
            type: 'clue_analysis',
            title: `开始分析`,
            description: log.description,
            tags: ['分析'],
            details: { ...baseNode.details, duration: log.details?.duration }
          }
        }
        const clueIdMatch = log.description.match(/线索[：:]\s*(\S+)/) || log.description.match(/分析[：:]\s*(\S+)/)
        const clueId = (log.details?.clueId as string) || clueIdMatch?.[1] || ''
        const clue = caseData?.clues.find(c => c.id === clueId)
        return {
          ...baseNode,
          type: 'clue_analysis',
          title: clue ? `分析线索：${clue.name}` : '分析线索',
          description: log.description,
          isKeyMoment: true,
          tags: ['分析', '线索'],
          clueId: clueId || undefined
        }
      }

      case 'connection': {
        const c1Match = log.description.match(/([^\s↔]+)\s*[↔←→]\s*([^\s]+)/)
        const clue1Id = (log.details?.clue1Id as string) || c1Match?.[1] || ''
        const clue2Id = (log.details?.clue2Id as string) || c1Match?.[2] || ''
        const clue1 = caseData?.clues.find(c => c.id === clue1Id)
        const clue2 = caseData?.clues.find(c => c.id === clue2Id)
        return {
          ...baseNode,
          type: 'clue_connection',
          title: `建立关联：${clue1?.name || clue1Id} ↔ ${clue2?.name || clue2Id}`,
          description: (log.details?.relationship as string) || log.description,
          isKeyMoment: !!(log.details?.confirmed),
          tags: ['关联', '线索图谱']
        }
      }

      case 'sanity_loss': {
        const match = log.description.match(/(\d+(?:\.\d+)?)\s*点/) || 
                      log.description.match(/\+(\d+(?:\.\d+)?)/) ||
                      log.description.match(/-(\d+(?:\.\d+)?)/)
        const amount = match ? parseFloat(match[1]) : 5
        const isMilestone = log.description.includes('里程碑') || log.description.includes('精神污染里程碑')
        return {
          ...baseNode,
          type: 'sanity_event',
          title: isMilestone ? '精神污染里程碑' : '理智波动',
          description: log.description,
          isKeyMoment: amount >= 15 || isMilestone,
          tags: ['理智', '污染'],
          sanityChange: log.description.includes('恢复') || log.description.includes('平复') ? amount : -amount,
          rawEvent: {
            ...baseNode.rawEvent,
            context: {
              isMilestone,
              pollutionType: log.description.includes('侵蚀') ? 'long_term_erosion' : 
                             log.description.includes('惊吓') ? 'short_term_shock' : 'mixed'
            }
          }
        }
      }

      case 'conclusion': {
        return {
          ...baseNode,
          type: 'conclusion',
          title: '案件结案',
          description: log.description,
          isKeyMoment: true,
          tags: ['结案', '结局'],
          rawEvent: {
            ...baseNode.rawEvent,
            context: {
              conclusionText: log.details?.conclusion,
              sanityLost: log.details?.sanityLost,
              branch: log.details?.branch,
              isCorrect: log.details?.isCorrect
            }
          }
        }
      }

      case 'tool_use':
      case 'tool_repair':
      case 'tool_break': {
        return {
          ...baseNode,
          type: 'tool_use',
          title: log.type === 'tool_repair' ? '修复工具' : 
                 log.type === 'tool_break' ? '工具损坏' : '工具使用',
          description: log.description,
          tags: ['工具', log.type === 'tool_repair' ? '修复' : log.type === 'tool_break' ? '损坏' : '使用'],
          isKeyMoment: log.type === 'tool_break'
        }
      }

      case 'penalty':
      case 'timeout':
      case 'bonus': {
        return {
          ...baseNode,
          type: log.type === 'bonus' ? 'key_moment' : 'sanity_event',
          title: log.type === 'bonus' ? '时间奖励' : 
                 log.type === 'timeout' ? '时间耗尽' : '调查惩罚',
          description: log.description,
          tags: [log.type === 'bonus' ? '奖励' : '惩罚', '时间'],
          isKeyMoment: log.type === 'timeout'
        }
      }

      case 'crafting':
      case 'material_drop': {
        return {
          ...baseNode,
          type: 'tool_use',
          title: log.type === 'crafting' ? '道具制作' : '获得材料',
          description: log.description,
          tags: [log.type === 'crafting' ? '制作' : '材料', '物品']
        }
      }

      case 'recipe_unlock': {
        return {
          ...baseNode,
          type: 'key_moment',
          title: '解锁配方',
          description: log.description,
          tags: ['配方', '解锁'],
          isKeyMoment: true
        }
      }

      default:
        return null
    }
  }

  function inferTimestampForItem(
    itemIndex: number,
    itemId: string,
    gameLog: GameLogEntry[],
    startTime: number,
    type: 'evidence' | 'clue' | 'scene' | 'branch' | 'analysis' | 'connection'
  ): number {
    const searchPatterns: Record<string, string[]> = {
      evidence: [
        `发现证据：${itemId}`,
        `发现新证据：${itemId}`,
        `发现新证据`,
        '发现证据',
        '发现',
        '使用.*成功发现'
      ],
      clue: [
        `获得线索：${itemId}`,
        `获得新线索：${itemId}`,
        '获得新线索',
        '获得线索'
      ],
      scene: [
        `场景切换：${itemId}`,
        '场景切换'
      ],
      branch: [
        '解锁',
        '分支'
      ],
      analysis: [
        '分析线索',
        '分析完成',
        'analysis_complete'
      ],
      connection: [
        '建立线索关联',
        '建立关联',
        '自动建立关联'
      ]
    }

    const patterns = searchPatterns[type] || ['']
    
    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i')
        const matchingLogs = gameLog.filter(l => regex.test(l.description) || l.type === pattern)
        if (matchingLogs.length > 0 && itemIndex < matchingLogs.length) {
          return matchingLogs[itemIndex].timestamp
        }
        if (matchingLogs.length > 0) {
          return matchingLogs[matchingLogs.length - 1].timestamp
        }
      } catch {
        continue
      }
    }

    const typeOffsets: Record<string, number> = {
      evidence: 45000,
      clue: 50000,
      scene: 60000,
      branch: 90000,
      analysis: 55000,
      connection: 60000
    }
    return startTime + (itemIndex + 1) * (typeOffsets[type] || 45000)
  }

  function generateTimelineFromSave(saveData: SaveData, caseProgress?: CaseProgress): ReplayTimeline {
    const caseData = getCaseById(saveData.caseId)
    const gameState = saveData.gameState
    const nodes: ReplayNode[] = []
    const startTime = gameState.startTime
    const gameLog = [...gameState.gameLog].sort((a, b) => a.timestamp - b.timestamp)
    
    let lastTimestamp = startTime
    const processedEvidence = new Set<string>()
    const processedClues = new Set<string>()
    const processedScenes = new Set<string>()

    const createNode = (node: Omit<ReplayNode, 'id' | 'relativeTime'>): ReplayNode => {
      const relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      if (node.timestamp > lastTimestamp) {
        lastTimestamp = node.timestamp
      }
      return {
        ...node,
        id: `replay-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        relativeTime
      }
    }

    gameLog.forEach(log => {
      const eventNode = extractEventFromLog(log, startTime, caseData, gameState)
      if (eventNode) {
        if (eventNode.evidenceId) processedEvidence.add(eventNode.evidenceId)
        if (eventNode.clueId) processedClues.add(eventNode.clueId)
        if (eventNode.sceneId) processedScenes.add(eventNode.sceneId)
        nodes.push(createNode(eventNode))
      }
    })

    gameState.visitedScenes.forEach((sceneId, idx) => {
      if (!processedScenes.has(sceneId)) {
        const scene = caseData?.scenes.find(s => s.id === sceneId)
        const timestamp = inferTimestampForItem(idx, sceneId, gameLog, startTime, 'scene')
        nodes.push(createNode({
          type: 'scene_visit',
          timestamp,
          title: scene ? `探索场景：${scene.name}` : `探索场景：${sceneId}`,
          description: scene?.description || '进入新的调查场景',
          details: { sceneId, isFirstVisit: true, inferred: true },
          isKeyMoment: idx === 0 || idx === gameState.visitedScenes.length - 1,
          tags: ['场景', '探索'],
          sceneId
        }))
      }
    })

    gameState.discoveredEvidence.forEach((evidenceId, idx) => {
      if (!processedEvidence.has(evidenceId)) {
        const evidence = caseData?.scenes
          .flatMap(s => s.evidence)
          .find(e => e.id === evidenceId)
        const timestamp = inferTimestampForItem(idx, evidenceId, gameLog, startTime, 'evidence')
        nodes.push(createNode({
          type: 'evidence_discovery',
          timestamp,
          title: evidence ? `发现证据：${evidence.name}` : `发现证据`,
          description: evidence?.description || '在调查中发现了新的证据',
          details: { 
            evidenceId, 
            type: evidence?.type,
            sanityEffect: evidence?.sanityEffect,
            isSpecial: evidence?.isSpecial,
            isHidden: evidence?.isInitiallyHidden,
            inferred: true
          },
          isKeyMoment: !!evidence?.isSpecial || !!evidence?.sanityEffect,
          tags: ['证据', evidence?.type || ''].filter(Boolean),
          sanityChange: evidence?.sanityEffect ? -Math.abs(evidence.sanityEffect) : undefined,
          evidenceId
        }))
      }
    })

    gameState.discoveredClues.forEach((clueId, idx) => {
      if (!processedClues.has(clueId)) {
        const clue = caseData?.clues.find(c => c.id === clueId)
        const timestamp = inferTimestampForItem(idx, clueId, gameLog, startTime, 'clue')
        nodes.push(createNode({
          type: 'clue_discovery',
          timestamp,
          title: clue ? `获得线索：${clue.name}` : `获得线索`,
          description: clue?.description || '通过调查获得了新的线索',
          details: { 
            clueId, 
            type: clue?.type,
            source: clue?.source,
            importance: clue?.importance,
            inferred: true
          },
          isKeyMoment: (clue?.importance || 0) >= 4,
          tags: ['线索', clue?.type || ''].filter(Boolean),
          clueId
        }))
      }
    })

    gameState.analyzedClues.forEach((clueId, idx) => {
      if (!nodes.some(n => n.type === 'clue_analysis' && n.clueId === clueId)) {
        const clue = caseData?.clues.find(c => c.id === clueId)
        const timestamp = inferTimestampForItem(idx, clueId, gameLog, startTime, 'analysis')
        nodes.push(createNode({
          type: 'clue_analysis',
          timestamp,
          title: clue ? `分析线索：${clue.name}` : `分析线索`,
          description: clue?.analysisResult || '对线索进行了深入分析',
          details: { 
            clueId, 
            result: clue?.analysisResult,
            requiredTool: clue?.requiredToolForAnalysis,
            inferred: true
          },
          isKeyMoment: true,
          tags: ['分析', '线索'],
          clueId
        }))
      }
    })

    gameState.clueConnections.forEach((conn, idx) => {
      if (!nodes.some(n => n.type === 'clue_connection' && 
        n.details?.clue1Id === conn.clue1Id && 
        n.details?.clue2Id === conn.clue2Id)) {
        const clue1 = caseData?.clues.find(c => c.id === conn.clue1Id)
        const clue2 = caseData?.clues.find(c => c.id === conn.clue2Id)
        const timestamp = inferTimestampForItem(idx, `${conn.clue1Id}-${conn.clue2Id}`, gameLog, startTime, 'connection')
        nodes.push(createNode({
          type: 'clue_connection',
          timestamp,
          title: `建立关联：${clue1?.name || conn.clue1Id} ↔ ${clue2?.name || conn.clue2Id}`,
          description: conn.relationship || '两条线索之间存在关联',
          details: { 
            clue1Id: conn.clue1Id,
            clue2Id: conn.clue2Id,
            relationship: conn.relationship,
            confirmed: conn.confirmed,
            inferred: true
          },
          isKeyMoment: conn.confirmed,
          tags: ['关联', '线索图谱']
        }))
      }
    })

    gameState.deductionBranches.forEach((branchId, idx) => {
      if (!nodes.some(n => n.type === 'deduction_branch' && n.details?.branchId === branchId)) {
        const timestamp = inferTimestampForItem(idx, branchId, gameLog, startTime, 'branch')
        nodes.push(createNode({
          type: 'deduction_branch',
          timestamp,
          title: `解锁推演分支`,
          description: `解锁了新的推演方向：${branchId}`,
          details: { branchId, inferred: true },
          isKeyMoment: true,
          tags: ['推演', '分支']
        }))
      }
    })

    const processedTools = new Set<string>()
    nodes.filter(n => n.type === 'tool_use').forEach(n => {
      if (n.details?.toolId) processedTools.add(n.details.toolId as string)
    })
    gameState.tools.forEach(tool => {
      if (!processedTools.has(tool.id)) {
        nodes.push(createNode({
          type: 'tool_use',
          title: `调查工具：${tool.name}`,
          timestamp: startTime + 30000,
          description: `工具耐久度：${tool.durability}/${tool.maxDurability}，等级 T${tool.tier}`,
          details: { 
            toolId: tool.id,
            toolName: tool.name,
            uses: tool.uses,
            maxUses: tool.maxUses,
            durability: tool.durability,
            maxDurability: tool.maxDurability,
            tier: tool.tier,
            inferred: true
          },
          isKeyMoment: tool.tier >= 3,
          tags: ['工具', tool.type]
        }))
      }
    })

    if (caseProgress) {
      const bestRecord = caseProgress.playHistory[caseProgress.playHistory.length - 1]
      if (bestRecord && !nodes.some(n => n.type === 'conclusion')) {
        nodes.push(createNode({
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
        }))
      }
    }

    const sortedNodes = nodes.sort((a, b) => a.timestamp - b.timestamp)
    sortedNodes.forEach((node, idx) => {
      node.relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      if (idx > 0 && node.timestamp <= sortedNodes[idx - 1].timestamp) {
        node.timestamp = sortedNodes[idx - 1].timestamp + 100
        node.relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      }
      if (node.timestamp > lastTimestamp) {
        lastTimestamp = node.timestamp
      }
    })

    return {
      caseId: saveData.caseId,
      caseTitle: caseData?.title || saveData.caseId,
      nodes: sortedNodes,
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

    const startTime = caseProgress.completedAt ? caseProgress.completedAt - (caseProgress.fastestTime || 1800) * 1000 : Date.now() - 3600000
    const nodes: ReplayNode[] = []
    const totalItems = 
      caseProgress.discoveredEvidence.length + 
      caseProgress.discoveredClues.length + 
      caseProgress.unlockedBranches.length + 2
    const avgInterval = Math.max(30000, ((caseProgress.fastestTime || 1800) * 1000) / totalItems)

    let cursor = 0
    const nextTimestamp = () => startTime + (++cursor) * avgInterval

    const addNode = (node: Omit<ReplayNode, 'id' | 'relativeTime'>) => {
      const relativeTime = Math.max(0, (node.timestamp - startTime) / 1000)
      nodes.push({
        ...node,
        id: `replay-node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        relativeTime,
        rawEvent: node.rawEvent || {
          snapshot: {
            discoveredEvidence: [...caseProgress.discoveredEvidence],
            discoveredClues: [...caseProgress.discoveredClues]
          },
          context: { source: 'progress_summary', inferred: true }
        }
      })
    }

    addNode({
      type: 'scene_visit',
      timestamp: startTime,
      title: '案件开始',
      description: `开始调查案件：${caseData.title}`,
      details: { caseId, difficulty: caseData.difficulty, inferred: true },
      isKeyMoment: true,
      tags: ['开始', '案件'],
      rawEvent: {
        snapshot: {
          discoveredEvidence: [],
          discoveredClues: [],
          analyzedClues: [],
          visitedScenes: [],
          deductionBranches: []
        },
        context: { source: 'progress_summary' }
      }
    })

    caseProgress.discoveredEvidence.forEach((evidenceId, idx) => {
      const evidence = caseData.scenes
        .flatMap(s => s.evidence)
        .find(e => e.id === evidenceId)
      addNode({
        type: 'evidence_discovery',
        timestamp: nextTimestamp(),
        title: evidence ? `发现证据：${evidence.name}` : `发现证据`,
        description: evidence?.description || '在调查中发现了新的证据',
        details: { evidenceId, type: evidence?.type, inferred: true },
        isKeyMoment: !!evidence?.isSpecial,
        tags: ['证据', evidence?.type || ''].filter(Boolean),
        evidenceId,
        sanityChange: evidence?.sanityEffect ? -Math.abs(evidence.sanityEffect) : undefined,
        rawEvent: {
          snapshot: {
            discoveredEvidence: caseProgress.discoveredEvidence.slice(0, idx + 1)
          },
          context: { source: 'progress_summary', evidenceData: evidence || null }
        }
      })
    })

    caseProgress.discoveredClues.forEach((clueId, idx) => {
      const clue = caseData.clues.find(c => c.id === clueId)
      addNode({
        type: 'clue_discovery',
        timestamp: nextTimestamp(),
        title: clue ? `获得线索：${clue.name}` : `获得线索`,
        description: clue?.description || '通过调查获得了新的线索',
        details: { clueId, type: clue?.type, inferred: true },
        isKeyMoment: (clue?.importance || 0) >= 4,
        tags: ['线索', clue?.type || ''].filter(Boolean),
        clueId,
        rawEvent: {
          snapshot: {
            discoveredClues: caseProgress.discoveredClues.slice(0, idx + 1)
          },
          context: { source: 'progress_summary', clueData: clue || null }
        }
      })
    })

    caseProgress.unlockedBranches.forEach((branchId, idx) => {
      addNode({
        type: 'deduction_branch',
        timestamp: nextTimestamp(),
        title: `解锁分支：${branchId}`,
        description: '发现了新的推演方向',
        details: { branchId, inferred: true },
        isKeyMoment: true,
        tags: ['分支', '推演'],
        rawEvent: {
          snapshot: {
            deductionBranches: caseProgress.unlockedBranches.slice(0, idx + 1)
          },
          context: { source: 'progress_summary' }
        }
      })
    })

    if (caseProgress.completed) {
      const bestRecord = caseProgress.playHistory[caseProgress.playHistory.length - 1]
      addNode({
        type: 'conclusion',
        timestamp: startTime + (caseProgress.fastestTime || 1800) * 1000,
        title: `案件结案：${caseProgress.bestGrade || '完成'}`,
        description: bestRecord 
          ? `分数：${caseProgress.bestScore?.totalScore || 0}分 | 耗时：${formatTime(bestRecord.timeUsed)} | 结局：${bestRecord.endingId}`
          : '案件调查完成',
        details: {
          grade: caseProgress.bestGrade,
          score: caseProgress.bestScore?.totalScore,
          scoreBreakdown: caseProgress.bestScore,
          endingId: bestRecord?.endingId,
          timeUsed: bestRecord?.timeUsed,
          sanityLost: bestRecord?.sanityLost,
          branch: bestRecord?.branch,
          inferred: true
        },
        isKeyMoment: true,
        tags: ['结案', '结局'],
        rawEvent: {
          snapshot: {
            discoveredEvidence: [...caseProgress.discoveredEvidence],
            discoveredClues: [...caseProgress.discoveredClues],
            deductionBranches: [...caseProgress.unlockedBranches]
          },
          context: { 
            source: 'progress_summary',
            isFinal: true,
            playRecord: bestRecord
          }
        }
      })
    }

    const sortedNodes = nodes.sort((a, b) => a.timestamp - b.timestamp)
    const endTime = sortedNodes.length > 0 ? sortedNodes[sortedNodes.length - 1].timestamp : startTime

    return {
      caseId,
      caseTitle: caseData.title,
      nodes: sortedNodes,
      startTime,
      endTime,
      totalDuration: Math.max(0, (endTime - startTime) / 1000),
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
    const nodesWithLogs = timeline.nodes.filter(n => !!n.sourceLogId).length
    const nodesInferred = timeline.nodes.filter(n => n.details?.inferred).length
    return {
      version: '2.0',
      exportedAt: Date.now(),
      timeline: JSON.parse(JSON.stringify(timeline)),
      summary: {
        totalNodes: timeline.nodes.length,
        keyMoments: timeline.nodes.filter(n => n.isKeyMoment).length,
        evidenceFound: timeline.nodes.filter(n => n.type === 'evidence_discovery').length,
        cluesAnalyzed: timeline.nodes.filter(n => n.type === 'clue_analysis').length,
        branchesUnlocked: timeline.nodes.filter(n => n.type === 'deduction_branch').length,
        realLogNodes: nodesWithLogs,
        inferredNodes: nodesInferred,
        totalDuration: timeline.totalDuration,
        sanityLost: timeline.metadata.sanityLost || 0
      }
    }
  }

  function exportAsText(): string {
    if (!state.value.activeTimeline) return ''
    
    const t = state.value.activeTimeline
    const nodesWithLogs = t.nodes.filter(n => !!n.sourceLogId).length
    const nodesInferred = t.nodes.filter(n => n.details?.inferred).length
    
    let text = `=== 案件回放：${t.caseTitle} ===\n`
    text += `案件ID: ${t.caseId}\n`
    text += `生成时间: ${new Date(t.createdAt).toLocaleString('zh-CN')}\n`
    text += `总耗时: ${formatTime(t.totalDuration)}\n`
    if (t.metadata.grade) text += `评级: ${t.metadata.grade}\n`
    if (t.metadata.totalScore) text += `分数: ${t.metadata.totalScore}\n`
    text += `数据质量: 真实日志 ${nodesWithLogs} 节点 / 推断数据 ${nodesInferred} 节点\n`
    text += `\n--- 时间轴 ---\n\n`

    t.nodes.forEach((node, idx) => {
      const timeStr = formatTime(node.relativeTime)
      const keyMark = node.isKeyMoment ? '⭐ ' : ''
      const dataMark = node.details?.inferred ? '[推断]' : (node.sourceLogId ? '[真实]' : '')
      text += `#${idx + 1} [${timeStr}] ${keyMark}${dataMark} ${node.title}\n`
      text += `    ${node.description}\n`
      if (node.tags.length > 0) {
        text += `    标签: ${node.tags.join(', ')}\n`
      }
      if (node.sanityChange !== undefined) {
        text += `    理智变化: ${node.sanityChange > 0 ? '+' : ''}${node.sanityChange}\n`
      }
      if (node.rawEvent?.logEntry) {
        text += `    原始日志: ${node.rawEvent.logEntry.description}\n`
      }
      if (node.rawEvent?.snapshot) {
        const snap = node.rawEvent.snapshot
        text += `    当时状态: 理智=${snap.sanity}/${snap.maxSanity || '?'}, 证据=${snap.discoveredEvidence?.length || 0}, 线索=${snap.discoveredClues?.length || 0}\n`
      }
      text += '\n'
    })

    text += `--- 统计 ---\n`
    text += `节点总数: ${t.nodes.length}\n`
    text += `关键节点: ${stats.value.keyMomentCount}\n`
    text += `证据发现: ${stats.value.totalEvidenceDiscovered}\n`
    text += `线索分析: ${stats.value.totalCluesAnalyzed}\n`
    text += `线索关联: ${stats.value.totalConnections}\n`
    text += `场景探索: ${stats.value.totalScenesVisited}\n`
    if (stats.value.totalSanityLost > 0) {
      text += `理智损失: ${stats.value.totalSanityLost}\n`
    }
    text += `真实日志节点: ${nodesWithLogs}\n`
    text += `推断数据节点: ${nodesInferred}\n`

    const keyMoments = t.nodes.filter(n => n.isKeyMoment)
    if (keyMoments.length > 0) {
      text += `\n--- 关键节点摘要 ---\n\n`
      keyMoments.forEach((node, idx) => {
        const timeStr = formatTime(node.relativeTime)
        text += `${idx + 1}. [${timeStr}] ${node.title}\n`
        text += `   ${node.description}\n`
        if (node.rawEvent?.logEntry) {
          text += `   原始记录: ${node.rawEvent.logEntry.description}\n`
        }
        text += '\n'
      })
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
