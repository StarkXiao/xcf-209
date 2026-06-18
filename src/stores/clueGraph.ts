import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  GraphNode, 
  GraphEdge, 
  GraphState, 
  GraphAction,
  GraphValidationResult,
  GraphValidationError,
  GraphValidationWarning,
  GraphPlaybackState,
  RelationshipType,
  RelationshipStrength,
  RelationshipStrengthLevel,
  ConflictInfo,
  ConnectionPreview
} from '@/types'
import { RELATIONSHIP_TYPES } from '@/types'
import { getCaseById } from '@/data/cases'
import { useGameStore } from './game'

const STORAGE_PREFIX = 'cthulhu-graph-'
const AUTO_SAVE_INTERVAL = 5000

export const useClueGraphStore = defineStore('clueGraph', () => {
  const gameStore = useGameStore()

  const graphState = ref<GraphState>({
    caseId: '',
    nodes: [],
    edges: [],
    actionHistory: [],
    currentHistoryIndex: -1,
    zoom: 1,
    pan: { x: 0, y: 0 },
    lastSavedAt: 0,
    lastAutoSavedAt: 0
  })

  const playbackState = ref<GraphPlaybackState>({
    isPlaying: false,
    currentStep: 0,
    totalSteps: 0,
    speed: 1,
    isPaused: false,
    intervalId: null
  })

  const selectedNodeId = ref<string | null>(null)
  const selectedEdgeId = ref<string | null>(null)
  const connectingFrom = ref<string | null>(null)
  const validationResult = ref<GraphValidationResult | null>(null)
  const errorMessages = ref<{ id: string; message: string; type: 'error' | 'warning' }[]>([])
  const autoSaveTimer = ref<number | null>(null)
  const connectionPreview = ref<ConnectionPreview | null>(null)
  const hoveredNodeId = ref<string | null>(null)

  const nodes = computed(() => graphState.value.nodes)
  const edges = computed(() => graphState.value.edges)
  const canUndo = computed(() => graphState.value.currentHistoryIndex > 0)
  const canRedo = computed(() => graphState.value.currentHistoryIndex < graphState.value.actionHistory.length - 1)

  const relationshipLabels: Record<RelationshipType, string> = {
    'causes': '导致',
    'implies': '暗示',
    'supports': '支持',
    'contradicts': '矛盾',
    'related_to': '相关',
    'provides_evidence_for': '为...提供证据',
    'leads_to': '导向',
    'is_part_of': '是...的一部分',
    'is_member_of': '是...的成员',
    'is_located_at': '位于'
  }

  const nodeColors: Record<string, string> = {
    clue: '#6b4c9a',
    evidence: '#3a8b5a',
    character: '#8b6b3a',
    location: '#3a5a8b'
  }

  function generateId(): string {
    return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  function getStorageKey(caseId: string): string {
    return `${STORAGE_PREFIX}${caseId}`
  }

  function loadGraph(caseId: string): boolean {
    try {
      const key = getStorageKey(caseId)
      const data = localStorage.getItem(key)
      
      if (data) {
        const parsed = JSON.parse(data)
        graphState.value = parsed
        return true
      }
      
      initializeGraph(caseId)
      return true
    } catch (error) {
      console.error('Failed to load graph:', error)
      initializeGraph(caseId)
      return false
    }
  }

  function initializeGraph(caseId: string) {
    const caseData = getCaseById(caseId)
    if (!caseData) return

    const discoveredClues = gameStore.gameState.discoveredClues
    const discoveredEvidence = gameStore.gameState.discoveredEvidence

    const newNodes: GraphNode[] = []
    let xOffset = 100
    let yOffset = 100

    caseData.clues.forEach((clue, index) => {
      if (discoveredClues.includes(clue.id)) {
        newNodes.push({
          id: clue.id,
          type: 'clue',
          label: clue.name,
          description: clue.description,
          x: xOffset + (index % 4) * 200,
          y: yOffset + Math.floor(index / 4) * 120,
          width: 160,
          height: 80,
          importance: clue.importance,
          color: nodeColors.clue
        })
      }
    })

    yOffset += Math.ceil(caseData.clues.length / 4) * 120 + 50

    let evidenceIndex = 0
    caseData.scenes.forEach(scene => {
      scene.evidence.forEach(evidence => {
        if (discoveredEvidence.includes(evidence.id)) {
          newNodes.push({
            id: evidence.id,
            type: 'evidence',
            label: evidence.name,
            description: evidence.description,
            x: xOffset + (evidenceIndex % 4) * 200,
            y: yOffset + Math.floor(evidenceIndex / 4) * 120,
            width: 160,
            height: 80,
            importance: evidence.isSpecial ? 5 : 3,
            color: nodeColors.evidence
          })
          evidenceIndex++
        }
      })
    })

    graphState.value = {
      caseId,
      nodes: newNodes,
      edges: [],
      actionHistory: [],
      currentHistoryIndex: -1,
      zoom: 1,
      pan: { x: 0, y: 0 },
      lastSavedAt: Date.now(),
      lastAutoSavedAt: Date.now()
    }

    addAction({
      type: 'node_add',
      data: { nodes: [...newNodes] }
    })

    validateGraph()
  }

  function saveGraph(): boolean {
    try {
      const key = getStorageKey(graphState.value.caseId)
      graphState.value.lastSavedAt = Date.now()
      localStorage.setItem(key, JSON.stringify(graphState.value))
      return true
    } catch (error) {
      console.error('Failed to save graph:', error)
      return false
    }
  }

  function autoSave() {
    graphState.value.lastAutoSavedAt = Date.now()
    saveGraph()
  }

  function startAutoSave() {
    stopAutoSave()
    autoSaveTimer.value = window.setInterval(() => {
      autoSave()
    }, AUTO_SAVE_INTERVAL)
  }

  function stopAutoSave() {
    if (autoSaveTimer.value) {
      clearInterval(autoSaveTimer.value)
      autoSaveTimer.value = null
    }
  }

  function addAction(action: Omit<GraphAction, 'timestamp'>) {
    const fullAction: GraphAction = {
      ...action,
      timestamp: Date.now()
    } as GraphAction

    if (graphState.value.currentHistoryIndex < graphState.value.actionHistory.length - 1) {
      graphState.value.actionHistory = graphState.value.actionHistory.slice(0, graphState.value.currentHistoryIndex + 1)
    }

    graphState.value.actionHistory.push(fullAction)
    graphState.value.currentHistoryIndex = graphState.value.actionHistory.length - 1
  }

  function undo() {
    if (!canUndo.value) return

    graphState.value.currentHistoryIndex--
    applyStateAtHistory(graphState.value.currentHistoryIndex)
    validateGraph()
  }

  function redo() {
    if (!canRedo.value) return

    graphState.value.currentHistoryIndex++
    applyStateAtHistory(graphState.value.currentHistoryIndex)
    validateGraph()
  }

  function applyStateAtHistory(index: number) {
    graphState.value.nodes = []
    graphState.value.edges = []

    for (let i = 0; i <= index; i++) {
      const action = graphState.value.actionHistory[i]
      applyAction(action)
    }
  }

  function applyAction(action: GraphAction) {
    switch (action.type) {
      case 'node_add':
        if (action.data.nodes) {
          graphState.value.nodes.push(...(action.data.nodes as GraphNode[]))
        }
        break
      case 'node_move':
        if (action.data.nodeId && action.data.x !== undefined && action.data.y !== undefined) {
          const node = graphState.value.nodes.find(n => n.id === action.data.nodeId)
          if (node) {
            node.x = action.data.x as number
            node.y = action.data.y as number
          }
        }
        break
      case 'node_remove':
        if (action.data.nodeId) {
          graphState.value.nodes = graphState.value.nodes.filter(n => n.id !== action.data.nodeId)
          graphState.value.edges = graphState.value.edges.filter(
            e => e.sourceId !== action.data.nodeId && e.targetId !== action.data.nodeId
          )
        }
        break
      case 'edge_add':
        if (action.data.edge) {
          graphState.value.edges.push(action.data.edge as GraphEdge)
        }
        break
      case 'edge_remove':
        if (action.data.edgeId) {
          graphState.value.edges = graphState.value.edges.filter(e => e.id !== action.data.edgeId)
        }
        break
      case 'edge_update':
        if (action.data.edgeId && action.data.updates) {
          const edge = graphState.value.edges.find(e => e.id === action.data.edgeId)
          if (edge) {
            Object.assign(edge, action.data.updates)
          }
        }
        break
      case 'layout_reset':
        if (action.data.nodes) {
          graphState.value.nodes = action.data.nodes as GraphNode[]
        }
        break
    }
  }

  function addNode(node: Omit<GraphNode, 'id' | 'width' | 'height'>): GraphNode {
    const newNode: GraphNode = {
      ...node,
      id: generateId(),
      width: 160,
      height: 80,
      color: node.color || nodeColors[node.type]
    }

    const beforeState = { nodes: [...graphState.value.nodes] }
    graphState.value.nodes.push(newNode)
    const afterState = { nodes: [...graphState.value.nodes] }

    addAction({
      type: 'node_add',
      data: { nodes: [newNode] },
      beforeState,
      afterState
    })

    validateGraph()
    return newNode
  }

  function moveNode(nodeId: string, x: number, y: number) {
    const node = graphState.value.nodes.find(n => n.id === nodeId)
    if (!node) return

    const beforeState = { x: node.x, y: node.y }
    node.x = x
    node.y = y
    const afterState = { x, y }

    addAction({
      type: 'node_move',
      data: { nodeId, x, y },
      beforeState,
      afterState
    })
  }

  function removeNode(nodeId: string) {
    const node = graphState.value.nodes.find(n => n.id === nodeId)
    if (!node) return

    const beforeState = { 
      nodes: [...graphState.value.nodes],
      edges: [...graphState.value.edges]
    }

    graphState.value.nodes = graphState.value.nodes.filter(n => n.id !== nodeId)
    const removedEdges = graphState.value.edges.filter(
      e => e.sourceId === nodeId || e.targetId === nodeId
    )
    graphState.value.edges = graphState.value.edges.filter(
      e => e.sourceId !== nodeId && e.targetId !== nodeId
    )

    const afterState = {
      nodes: [...graphState.value.nodes],
      edges: [...graphState.value.edges]
    }

    addAction({
      type: 'node_remove',
      data: { nodeId, removedEdges },
      beforeState,
      afterState
    })

    if (selectedNodeId.value === nodeId) {
      selectedNodeId.value = null
    }

    validateGraph()
  }

  function addEdge(
    sourceId: string, 
    targetId: string, 
    relationship: string,
    confidence?: number
  ): GraphEdge | null {
    if (sourceId === targetId) {
      addError('不能连接到自己', 'error')
      return null
    }

    const exists = graphState.value.edges.some(
      e => (e.sourceId === sourceId && e.targetId === targetId) ||
           (e.sourceId === targetId && e.targetId === sourceId)
    )

    if (exists) {
      addError('此连接已存在', 'error')
      return null
    }

    const sourceNode = graphState.value.nodes.find(n => n.id === sourceId)
    const targetNode = graphState.value.nodes.find(n => n.id === targetId)

    if (!sourceNode || !targetNode) {
      addError('节点不存在', 'error')
      return null
    }

    let actualConfidence = confidence
    if (actualConfidence === undefined) {
      actualConfidence = gameStore.getConnectionSuccessRate(sourceId, targetId)
    }

    const strength = calculateRelationshipStrength(sourceId, targetId, relationship as RelationshipType)
    const conflicts = detectConflicts(sourceId, targetId, relationship as RelationshipType)
    const improvementTips = getImprovementTips(sourceId, targetId)

    let feedbackMessage = ''
    if (strength.level === 'very_strong') {
      feedbackMessage = `✨ 关联强度极强！推理逻辑非常清晰`
    } else if (strength.level === 'strong') {
      feedbackMessage = `👍 关联强度较强，有充分的推理依据`
    } else if (strength.level === 'moderate') {
      feedbackMessage = `🤔 关联强度中等，建议补充更多证据`
    } else {
      feedbackMessage = `⚠️ 关联强度较弱，需要更多证据支持`
    }

    const newEdge: GraphEdge = {
      id: generateId(),
      sourceId,
      targetId,
      relationship,
      confidence: actualConfidence,
      confirmed: false,
      createdAt: Date.now(),
      strength,
      conflicts,
      feedbackMessage,
      improvementTips
    }

    const beforeState = { edges: [...graphState.value.edges] }
    graphState.value.edges.push(newEdge)
    const afterState = { edges: [...graphState.value.edges] }

    addAction({
      type: 'edge_add',
      data: { edge: newEdge },
      beforeState,
      afterState
    })

    gameStore.addClueConnection({
      clue1Id: sourceId,
      clue2Id: targetId,
      relationship,
      confirmed: false,
      confidence: actualConfidence,
      supportedBy: [],
      createdAt: Date.now()
    })

    if (conflicts.length > 0) {
      const highSeverityConflicts = conflicts.filter(c => c.severity === 'high')
      if (highSeverityConflicts.length > 0) {
        addError(`⚠️ 检测到 ${highSeverityConflicts.length} 个严重冲突，请检查推理逻辑`, 'error')
      } else {
        addError(`⚠️ 检测到 ${conflicts.length} 个潜在冲突，请注意`, 'warning')
      }
    }

    validateGraph()
    return newEdge
  }

  function updateEdge(edgeId: string, updates: Partial<GraphEdge>) {
    const edge = graphState.value.edges.find(e => e.id === edgeId)
    if (!edge) return

    const beforeState = { ...edge }
    Object.assign(edge, updates)
    const afterState = { ...edge }

    addAction({
      type: 'edge_update',
      data: { edgeId, updates },
      beforeState,
      afterState
    })

    const gameConnIndex = gameStore.gameState.clueConnections.findIndex(
      c => (c.clue1Id === edge.sourceId && c.clue2Id === edge.targetId) ||
           (c.clue1Id === edge.targetId && c.clue2Id === edge.sourceId)
    )
    if (gameConnIndex !== -1) {
      const gameConn = gameStore.gameState.clueConnections[gameConnIndex]
      if (updates.confidence !== undefined) gameConn.confidence = updates.confidence
      if (updates.confirmed !== undefined) gameConn.confirmed = updates.confirmed
      if (updates.relationship !== undefined) gameConn.relationship = updates.relationship
    }

    validateGraph()
  }

  function removeEdge(edgeId: string) {
    const edge = graphState.value.edges.find(e => e.id === edgeId)
    if (!edge) return

    const beforeState = { edges: [...graphState.value.edges] }
    graphState.value.edges = graphState.value.edges.filter(e => e.id !== edgeId)
    const afterState = { edges: [...graphState.value.edges] }

    gameStore.gameState.clueConnections = gameStore.gameState.clueConnections.filter(
      c => !((c.clue1Id === edge.sourceId && c.clue2Id === edge.targetId) ||
             (c.clue1Id === edge.targetId && c.clue2Id === edge.sourceId))
    )

    addAction({
      type: 'edge_remove',
      data: { edgeId, removedEdge: edge },
      beforeState,
      afterState
    })

    if (selectedEdgeId.value === edgeId) {
      selectedEdgeId.value = null
    }

    validateGraph()
  }

  function getStrengthLevel(score: number): RelationshipStrengthLevel {
    if (score >= 80) return 'very_strong'
    if (score >= 60) return 'strong'
    if (score >= 40) return 'moderate'
    return 'weak'
  }

  function getStrengthLabel(level: RelationshipStrengthLevel): string {
    const labels: Record<RelationshipStrengthLevel, string> = {
      'weak': '微弱',
      'moderate': '中等',
      'strong': '较强',
      'very_strong': '极强'
    }
    return labels[level]
  }

  function calculateRelationshipStrength(
    sourceId: string, 
    targetId: string, 
    relationship: RelationshipType
  ): RelationshipStrength {
    const factors: RelationshipStrength['factors'] = []
    let totalScore = 0

    const comparison = gameStore.getComparisonBetween(sourceId, targetId)
    if (comparison) {
      const contribution = comparison.supportsConnection 
        ? Math.min(comparison.connectionConfidence * 0.3, 25)
        : -Math.min((100 - comparison.connectionConfidence) * 0.2, 15)
      factors.push({
        type: 'comparison',
        description: comparison.supportsConnection 
          ? `线索比对支持此关联（${comparison.similarities.length}个相似点）`
          : `线索比对存在疑问（${comparison.differences.length}个差异点）`,
        contribution
      })
      totalScore += contribution
    }

    const avgConfidence = gameStore.getAverageConfidenceForClues([sourceId, targetId])
    const confidenceContribution = (avgConfidence - 50) * 0.4
    factors.push({
      type: 'confidence',
      description: `线索可信度加权（平均${avgConfidence}%）`,
      contribution: Math.round(confidenceContribution * 10) / 10
    })
    totalScore += confidenceContribution

    const clue1 = gameStore.getClueById(sourceId)
    const clue2 = gameStore.getClueById(targetId)
    if (clue1 && clue2) {
      if (clue1.connections.includes(targetId) || clue2.connections.includes(sourceId)) {
        factors.push({
          type: 'canonical',
          description: '案件数据隐含此关联',
          contribution: 20
        })
        totalScore += 20
      }
      if (clue1.type === clue2.type) {
        factors.push({
          type: 'type_match',
          description: `同类型线索（${clue1.type}）`,
          contribution: 10
        })
        totalScore += 10
      }
    }

    const annotations1 = gameStore.getAnnotationsForClue(sourceId)
    const annotations2 = gameStore.getAnnotationsForClue(targetId)
    const relevantAnnotations = [...annotations1, ...annotations2].filter(a => 
      a.type === 'important' || a.type === 'hypothesis' || a.type === 'contradiction'
    )
    const annotationContribution = Math.min(relevantAnnotations.length * 5, 20)
    if (annotationContribution > 0) {
      factors.push({
        type: 'annotation',
        description: `${relevantAnnotations.length}条相关批注支持推理`,
        contribution: annotationContribution
      })
      totalScore += annotationContribution
    }

    if (relationship === 'contradicts') {
      const contradictionAnnotations = [...annotations1, ...annotations2].filter(a => 
        a.type === 'contradiction'
      )
      if (contradictionAnnotations.length > 0) {
        const contradictionBonus = Math.min(contradictionAnnotations.length * 8, 15)
        factors.push({
          type: 'evidence',
          description: `${contradictionAnnotations.length}条矛盾批注支持「矛盾」关系`,
          contribution: contradictionBonus
        })
        totalScore += contradictionBonus
      }
    } else if (relationship === 'supports' || relationship === 'causes' || relationship === 'implies') {
      const hypothesisAnnotations = [...annotations1, ...annotations2].filter(a => 
        a.type === 'hypothesis'
      )
      if (hypothesisAnnotations.length > 0) {
        const hypothesisBonus = Math.min(hypothesisAnnotations.length * 6, 12)
        factors.push({
          type: 'evidence',
          description: `${hypothesisAnnotations.length}条假设批注支持「${relationshipLabels[relationship]}」关系`,
          contribution: hypothesisBonus
        })
        totalScore += hypothesisBonus
      }
    }

    const baseScore = 30
    totalScore += baseScore
    totalScore = Math.max(5, Math.min(100, totalScore))

    return {
      level: getStrengthLevel(totalScore),
      score: Math.round(totalScore * 10) / 10,
      factors
    }
  }

  function detectConflicts(
    sourceId: string, 
    targetId: string, 
    relationship: RelationshipType,
    excludeEdgeId?: string
  ): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    if (relationship === 'contradicts') {
      const supportingEdge = graphState.value.edges.find(e =>
        e.id !== excludeEdgeId &&
        ((e.sourceId === sourceId && e.targetId === targetId) ||
         (e.sourceId === targetId && e.targetId === sourceId)) &&
        (e.relationship === 'supports' || e.relationship === 'causes' || e.relationship === 'implies')
      )
      if (supportingEdge) {
        const sourceLabel = graphState.value.nodes.find(n => n.id === sourceId)?.label || sourceId
        const targetLabel = graphState.value.nodes.find(n => n.id === targetId)?.label || targetId
        conflicts.push({
          hasConflict: true,
          conflictType: 'direct_contradiction',
          conflictingEdgeId: supportingEdge.id,
          conflictingEdgeLabel: relationshipLabels[supportingEdge.relationship as RelationshipType] || supportingEdge.relationship,
          description: `「${sourceLabel}」与「${targetLabel}」已存在「${relationshipLabels[supportingEdge.relationship as RelationshipType]}」关系，与「矛盾」关系直接冲突`,
          severity: 'high'
        })
      }
    }

    if (relationship === 'supports' || relationship === 'causes' || relationship === 'implies') {
      const contradictingEdge = graphState.value.edges.find(e =>
        e.id !== excludeEdgeId &&
        ((e.sourceId === sourceId && e.targetId === targetId) ||
         (e.sourceId === targetId && e.targetId === sourceId)) &&
        e.relationship === 'contradicts'
      )
      if (contradictingEdge) {
        const sourceLabel = graphState.value.nodes.find(n => n.id === sourceId)?.label || sourceId
        const targetLabel = graphState.value.nodes.find(n => n.id === targetId)?.label || targetId
        conflicts.push({
          hasConflict: true,
          conflictType: 'direct_contradiction',
          conflictingEdgeId: contradictingEdge.id,
          conflictingEdgeLabel: '矛盾',
          description: `「${sourceLabel}」与「${targetLabel}」已存在「矛盾」关系，与「${relationshipLabels[relationship]}」关系直接冲突`,
          severity: 'high'
        })
      }
    }

    const sourceIncoming = graphState.value.edges.filter(e => 
      e.targetId === sourceId && e.id !== excludeEdgeId
    )
    sourceIncoming.forEach(inEdge => {
      if (relationship === 'contradicts' && inEdge.relationship === 'supports') {
        const transitiveTarget = graphState.value.nodes.find(n => n.id === inEdge.sourceId)?.label || inEdge.sourceId
        const sourceLabel = graphState.value.nodes.find(n => n.id === sourceId)?.label || sourceId
        const targetLabel = graphState.value.nodes.find(n => n.id === targetId)?.label || targetId
        conflicts.push({
          hasConflict: true,
          conflictType: 'transitive_conflict',
          conflictingEdgeId: inEdge.id,
          conflictingEdgeLabel: '支持',
          description: `「${transitiveTarget}」支持「${sourceLabel}」，但「${sourceLabel}」与「${targetLabel}」矛盾，可能存在推理冲突`,
          severity: 'medium'
        })
      }
    })

    return conflicts
  }

  function suggestRelationshipTypes(sourceId: string, targetId: string): {
    type: RelationshipType
    label: string
    confidence: number
  }[] {
    const suggestions: { type: RelationshipType; label: string; confidence: number }[] = []
    const baseRate = gameStore.getConnectionSuccessRate(sourceId, targetId)

    const clue1 = gameStore.getClueById(sourceId)
    const clue2 = gameStore.getClueById(targetId)

    if (clue1 && clue2) {
      if (clue1.connections.includes(targetId) || clue2.connections.includes(sourceId)) {
        suggestions.push({
          type: 'related_to',
          label: '相关',
          confidence: Math.min(100, baseRate + 15)
        })
        suggestions.push({
          type: 'supports',
          label: '支持',
          confidence: Math.min(100, baseRate + 10)
        })
      } else {
        suggestions.push({
          type: 'related_to',
          label: '相关',
          confidence: baseRate
        })
        suggestions.push({
          type: 'implies',
          label: '暗示',
          confidence: Math.max(20, baseRate - 10)
        })
        suggestions.push({
          type: 'supports',
          label: '支持',
          confidence: Math.max(20, baseRate - 5)
        })
        suggestions.push({
          type: 'contradicts',
          label: '矛盾',
          confidence: Math.max(10, baseRate - 20)
        })
      }
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  function getConnectionPreview(sourceId: string, targetId: string): ConnectionPreview | null {
    if (sourceId === targetId) return null

    const sourceNode = graphState.value.nodes.find(n => n.id === sourceId)
    const targetNode = graphState.value.nodes.find(n => n.id === targetId)
    if (!sourceNode || !targetNode) return null

    const estimatedConfidence = gameStore.getConnectionSuccessRate(sourceId, targetId)
    const suggestedRelationships = suggestRelationshipTypes(sourceId, targetId)
    const primaryRelationship = suggestedRelationships[0]?.type || 'related_to'
    const estimatedStrength = calculateRelationshipStrength(sourceId, targetId, primaryRelationship)
    const potentialConflicts = detectConflicts(sourceId, targetId, primaryRelationship)

    const warnings: string[] = []
    const suggestions: string[] = []

    if (estimatedConfidence < 50) {
      warnings.push(`当前匹配度较低（${estimatedConfidence}%），建议先收集更多证据`)
    }

    if (estimatedStrength.level === 'weak') {
      warnings.push('此关联强度较弱，建议先进行线索比对或添加批注')
    }

    const comparison = gameStore.getComparisonBetween(sourceId, targetId)
    if (!comparison) {
      suggestions.push('💡 进行线索比对可以显著提高关联准确性')
    }

    const annotations1 = gameStore.getAnnotationsForClue(sourceId)
    const annotations2 = gameStore.getAnnotationsForClue(targetId)
    if (annotations1.length === 0 && annotations2.length === 0) {
      suggestions.push('📝 为线索添加批注可以帮助强化推理逻辑')
    }

    const confidence1 = gameStore.getClueConfidence(sourceId)
    const confidence2 = gameStore.getClueConfidence(targetId)
    if (!confidence1 || !confidence2) {
      suggestions.push('🎯 标记线索可信度可以帮助系统更好地评估关联')
    }

    if (potentialConflicts.length > 0) {
      warnings.push(`检测到 ${potentialConflicts.length} 个潜在冲突，请谨慎判断`)
    }

    return {
      sourceId,
      targetId,
      estimatedStrength,
      estimatedConfidence,
      potentialConflicts,
      suggestedRelationships,
      warnings,
      suggestions
    }
  }

  function getImprovementTips(sourceId: string, targetId: string): string[] {
    const tips: string[] = []
    const comparison = gameStore.getComparisonBetween(sourceId, targetId)
    
    if (!comparison) {
      tips.push('🔍 进行线索比对：分析两条线索的异同点，系统会根据比对结果调整置信度')
    } else if (!comparison.supportsConnection) {
      tips.push('⚠️  当前比对结果不支持此关联，建议重新审视两条线索的关系')
      tips.push('📝 添加批注：记录你的推理过程，标记重要的关联点或疑点')
    }

    const confidence1 = gameStore.getClueConfidence(sourceId)
    const confidence2 = gameStore.getClueConfidence(targetId)
    if (!confidence1 || confidence1.confidence < 60) {
      tips.push(`🎯 提高「${gameStore.getClueById(sourceId)?.name || sourceId}」的可信度标记`)
    }
    if (!confidence2 || confidence2.confidence < 60) {
      tips.push(`🎯 提高「${gameStore.getClueById(targetId)?.name || targetId}」的可信度标记`)
    }

    const annotations1 = gameStore.getAnnotationsForClue(sourceId)
    const annotations2 = gameStore.getAnnotationsForClue(targetId)
    const hypothesisCount = [...annotations1, ...annotations2].filter(a => a.type === 'hypothesis').length
    if (hypothesisCount === 0) {
      tips.push('💭 添加假设性批注：记录你对这条关联的推理假设')
    }

    tips.push('🔗 尝试建立中间关联：通过第三条线索间接连接可能更可靠')
    tips.push('📖 回顾案情：重新阅读相关场景的描述，寻找遗漏的细节')

    return tips
  }

  function updateHoveredNode(nodeId: string | null) {
    hoveredNodeId.value = nodeId
    if (connectingFrom.value && nodeId && connectingFrom.value !== nodeId) {
      connectionPreview.value = getConnectionPreview(connectingFrom.value, nodeId)
    } else {
      connectionPreview.value = null
    }
  }

  function validateGraph(): GraphValidationResult {
    const errors: GraphValidationError[] = []
    const warnings: GraphValidationWarning[] = []

    graphState.value.edges.forEach(edge => {
      const sourceNode = graphState.value.nodes.find(n => n.id === edge.sourceId)
      const targetNode = graphState.value.nodes.find(n => n.id === edge.targetId)

      if (!sourceNode || !targetNode) {
        errors.push({
          edgeId: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          message: '连接引用了不存在的节点',
          type: 'missing_data'
        })
        edge.isError = true
        edge.errorMessage = '节点不存在'
        return
      }

      if (!RELATIONSHIP_TYPES.includes(edge.relationship as RelationshipType)) {
        errors.push({
          edgeId: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          message: `无效的关系类型: ${edge.relationship}`,
          type: 'invalid_connection'
        })
        edge.isError = true
        edge.errorMessage = '无效的关系类型'
        return
      }

      if (checkCircularReference(edge.sourceId, edge.targetId)) {
        errors.push({
          edgeId: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          message: '检测到循环引用',
          type: 'circular_reference'
        })
        edge.isError = true
        edge.errorMessage = '循环引用'
        return
      }

      const conflicts = detectConflicts(edge.sourceId, edge.targetId, edge.relationship as RelationshipType, edge.id)
      edge.conflicts = conflicts

      if (!edge.strength) {
        edge.strength = calculateRelationshipStrength(edge.sourceId, edge.targetId, edge.relationship as RelationshipType)
      }

      if (checkConflictingRelationship(edge) || conflicts.some(c => c.severity === 'high')) {
        errors.push({
          edgeId: edge.id,
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          message: '存在冲突的关系',
          type: 'conflicting_relationship'
        })
        edge.isError = true
        edge.errorMessage = '关系冲突'
        return
      }

      edge.isError = false
      edge.errorMessage = undefined

      if (conflicts.length > 0) {
        const mediumConflicts = conflicts.filter(c => c.severity === 'medium')
        const lowConflicts = conflicts.filter(c => c.severity === 'low')
        
        if (mediumConflicts.length > 0) {
          warnings.push({
            edgeId: edge.id,
            message: `⚠️ 检测到 ${mediumConflicts.length} 个潜在冲突：${mediumConflicts[0].description}`,
            type: 'relationship_conflict',
            severity: 'medium'
          })
        }
        if (lowConflicts.length > 0) {
          warnings.push({
            edgeId: edge.id,
            message: `🔍 存在 ${lowConflicts.length} 个轻微冲突点，请注意`,
            type: 'relationship_conflict',
            severity: 'low'
          })
        }
      }

      if (!edge.confirmed) {
        warnings.push({
          edgeId: edge.id,
          message: '此关系尚未确认',
          type: 'unconfirmed'
        })
      }

      if (edge.confidence < 30) {
        warnings.push({
          edgeId: edge.id,
          message: '置信度较低',
          type: 'low_confidence'
        })
      }

      if (edge.strength && edge.strength.level === 'weak' && !edge.confirmed) {
        warnings.push({
          edgeId: edge.id,
          message: `💪 关联强度较弱（${edge.strength.score}分），建议补充证据或进行比对`,
          type: 'weak_connection',
          severity: 'low'
        })
      }
    })

    graphState.value.nodes.forEach(node => {
      const connectedEdges = graphState.value.edges.filter(
        e => e.sourceId === node.id || e.targetId === node.id
      )
      if (connectedEdges.length === 0) {
        warnings.push({
          nodeId: node.id,
          message: `节点 "${node.label}" 没有任何连接`,
          type: 'isolated_node'
        })
      }
    })

    findPotentialConnections().forEach(potential => {
      warnings.push(potential)
    })

    const result: GraphValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings
    }

    validationResult.value = result
    updateErrorMessages(result)

    return result
  }

  function checkCircularReference(sourceId: string, targetId: string): boolean {
    const visited = new Set<string>()
    const stack = [targetId]

    while (stack.length > 0) {
      const current = stack.pop()!
      if (current === sourceId) return true
      if (visited.has(current)) continue
      visited.add(current)

      graphState.value.edges
        .filter(e => e.sourceId === current)
        .forEach(e => stack.push(e.targetId))
    }

    return false
  }

  function checkConflictingRelationship(edge: GraphEdge): boolean {
    const conflictingTypes: [RelationshipType, RelationshipType][] = [
      ['supports', 'contradicts']
    ]

    return conflictingTypes.some(([type1, type2]) => {
      return graphState.value.edges.some(e => 
        e.id !== edge.id &&
        ((e.sourceId === edge.sourceId && e.targetId === edge.targetId) ||
         (e.sourceId === edge.targetId && e.targetId === edge.sourceId)) &&
        ((e.relationship === type1 && edge.relationship === type2) ||
         (e.relationship === type2 && edge.relationship === type1))
      )
    })
  }

  function findPotentialConnections(): GraphValidationWarning[] {
    const warnings: GraphValidationWarning[] = []
    const discoveredClues = gameStore.gameState.discoveredClues
    const caseData = getCaseById(graphState.value.caseId)

    if (!caseData) return warnings

    caseData.clues.forEach(clue => {
      if (discoveredClues.includes(clue.id)) {
        clue.connections.forEach(connId => {
          if (discoveredClues.includes(connId)) {
            const exists = graphState.value.edges.some(
              e => (e.sourceId === clue.id && e.targetId === connId) ||
                   (e.sourceId === connId && e.targetId === clue.id)
            )

            if (!exists) {
              const sourceNode = graphState.value.nodes.find(n => n.id === clue.id)
              const targetNode = graphState.value.nodes.find(n => n.id === connId)
              
              if (sourceNode && targetNode) {
                warnings.push({
                  message: `潜在关联: "${sourceNode.label}" ↔ "${targetNode.label}"`,
                  type: 'potential_connection'
                })
              }
            }
          }
        })
      }
    })

    return warnings
  }

  function updateErrorMessages(result: GraphValidationResult) {
    errorMessages.value = [
      ...result.errors.map(e => ({
        id: e.edgeId,
        message: e.message,
        type: 'error' as const
      })),
      ...result.warnings.map(w => ({
        id: w.edgeId || w.nodeId || `warning-${Date.now()}`,
        message: w.message,
        type: 'warning' as const
      }))
    ]
  }

  function addError(message: string, type: 'error' | 'warning') {
    const id = `msg-${Date.now()}`
    errorMessages.value.push({ id, message, type })
    
    setTimeout(() => {
      errorMessages.value = errorMessages.value.filter(e => e.id !== id)
    }, 5000)
  }

  function selectNode(nodeId: string | null) {
    selectedNodeId.value = nodeId
    selectedEdgeId.value = null
  }

  function selectEdge(edgeId: string | null) {
    selectedEdgeId.value = edgeId
    selectedNodeId.value = null
  }

  function startConnection(nodeId: string) {
    connectingFrom.value = nodeId
  }

  function completeConnection(targetNodeId: string, relationship: string): GraphEdge | null {
    if (!connectingFrom.value) return null
    
    const sourceId = connectingFrom.value
    connectingFrom.value = null
    connectionPreview.value = null

    const successRate = gameStore.getConnectionSuccessRate(sourceId, targetNodeId)
    const strength = calculateRelationshipStrength(sourceId, targetNodeId, relationship as RelationshipType)
    const conflicts = detectConflicts(sourceId, targetNodeId, relationship as RelationshipType)
    const roll = Math.random() * 100
    const isInitiallyCorrect = roll < successRate

    const sourceLabel = graphState.value.nodes.find(n => n.id === sourceId)?.label || sourceId
    const targetLabel = graphState.value.nodes.find(n => n.id === targetNodeId)?.label || targetNodeId
    const strengthLabel = getStrengthLabel(strength.level)
    const relLabel = relationshipLabels[relationship as RelationshipType] || relationship

    const result = addEdge(sourceId, targetNodeId, relationship, successRate)
    
    if (result) {
      let feedback = ''
      if (conflicts.length > 0) {
        const highConflicts = conflicts.filter(c => c.severity === 'high')
        if (highConflicts.length > 0) {
          feedback = `⚠️ 关联已建立，但检测到 ${highConflicts.length} 个严重冲突！「${sourceLabel}」${relLabel}「${targetLabel}」（强度：${strengthLabel}，${strength.score}分）`
        } else {
          feedback = `⚠️ 关联已建立，存在 ${conflicts.length} 个潜在冲突。「${sourceLabel}」${relLabel}「${targetLabel}」（强度：${strengthLabel}，${strength.score}分）`
        }
      } else if (isInitiallyCorrect) {
        if (strength.level === 'very_strong' || strength.level === 'strong') {
          feedback = `✨ 精彩推理！「${sourceLabel}」${relLabel}「${targetLabel}」关联建立成功！（强度：${strengthLabel}，${strength.score}分，匹配度 ${successRate}%）`
        } else {
          feedback = `✅ 关联建立成功！「${sourceLabel}」${relLabel}「${targetLabel}」（强度：${strengthLabel}，${strength.score}分，匹配度 ${successRate}%）`
        }
      } else {
        if (strength.level === 'weak') {
          feedback = `🤔 关联已建立，但强度较弱，建议补充证据。「${sourceLabel}」${relLabel}「${targetLabel}」（强度：${strengthLabel}，${strength.score}分，匹配度 ${successRate}%）`
        } else {
          feedback = `🔍 关联已建立，需要进一步验证。「${sourceLabel}」${relLabel}「${targetLabel}」（强度：${strengthLabel}，${strength.score}分，匹配度 ${successRate}%）`
        }
      }
      
      addError(feedback, strength.level === 'weak' ? 'warning' : 'warning')
      gameStore.addLog('connection', `建立线索关联：${sourceLabel} ↔ ${targetLabel}，关系：${relLabel}，强度：${strengthLabel}(${strength.score}分)，匹配度 ${successRate}%${isInitiallyCorrect ? '，初步验证通过' : '，需要确认'}`)
    }
    
    return result
  }

  function cancelConnection() {
    connectingFrom.value = null
    connectionPreview.value = null
    hoveredNodeId.value = null
  }

  function setZoom(zoom: number) {
    graphState.value.zoom = Math.max(0.25, Math.min(3, zoom))
  }

  function setPan(x: number, y: number) {
    graphState.value.pan = { x, y }
  }

  function resetLayout() {
    const nodes = [...graphState.value.nodes]
    const beforeState = { nodes: nodes.map(n => ({ ...n })) }

    nodes.forEach((node, index) => {
      node.x = 100 + (index % 4) * 200
      node.y = 100 + Math.floor(index / 4) * 120
    })

    const afterState = { nodes: nodes.map(n => ({ ...n })) }

    addAction({
      type: 'layout_reset',
      data: { nodes: [...nodes] },
      beforeState,
      afterState
    })

    validateGraph()
  }

  function confirmEdge(edgeId: string): { success: boolean; finalConfidence: number } {
    const edge = graphState.value.edges.find(e => e.id === edgeId)
    if (!edge) return { success: false, finalConfidence: 0 }

    const currentConfidence = edge.confidence
    const successRate = gameStore.getConnectionSuccessRate(edge.sourceId, edge.targetId)
    const strength = edge.strength || calculateRelationshipStrength(edge.sourceId, edge.targetId, edge.relationship as RelationshipType)
    const finalRate = Math.max(currentConfidence, successRate)

    const roll = Math.random() * 100
    const success = roll < finalRate

    const sourceLabel = graphState.value.nodes.find(n => n.id === edge.sourceId)?.label || edge.sourceId
    const targetLabel = graphState.value.nodes.find(n => n.id === edge.targetId)?.label || edge.targetId
    const strengthLabel = getStrengthLabel(strength.level)
    const improvementTips = getImprovementTips(edge.sourceId, edge.targetId)

    const updatedStrength = calculateRelationshipStrength(edge.sourceId, edge.targetId, edge.relationship as RelationshipType)
    const conflicts = detectConflicts(edge.sourceId, edge.targetId, edge.relationship as RelationshipType, edgeId)

    if (success) {
      const bonusConfidence = Math.min(100, finalRate + 15)
      updateEdge(edgeId, { 
        confirmed: true, 
        confidence: bonusConfidence,
        strength: updatedStrength,
        conflicts,
        feedbackMessage: `✅ 推理正确！「${sourceLabel}」与「${targetLabel}」的${relationshipLabels[edge.relationship as RelationshipType] || edge.relationship}关系已验证`,
        improvementTips
      })
      
      let successMsg = ''
      if (strength.level === 'very_strong') {
        successMsg = `🎉 完美推理！「${sourceLabel}」与「${targetLabel}」的关系已完全验证（置信度 ${bonusConfidence}%，强度：${strengthLabel}）`
      } else if (strength.level === 'strong') {
        successMsg = `✨ 出色的推理！「${sourceLabel}」与「${targetLabel}」的关系已验证（置信度 ${bonusConfidence}%，强度：${strengthLabel}）`
      } else {
        successMsg = `✅ 关系确认成功！「${sourceLabel}」与「${targetLabel}」的关系已验证（置信度 ${bonusConfidence}%）`
      }
      
      addError(successMsg, 'warning')
      gameStore.addLog('connection', `确认线索关联成功：${sourceLabel} ↔ ${targetLabel}，关系：${relationshipLabels[edge.relationship as RelationshipType] || edge.relationship}，强度：${strengthLabel}，最终置信度 ${bonusConfidence}%`)
      gameStore.generateDeductionHints()
      return { success: true, finalConfidence: bonusConfidence }
    } else {
      const penaltyAmount = strength.level === 'strong' || strength.level === 'very_strong' ? 10 : 15
      const sanityPenalty = strength.level === 'weak' || strength.level === 'moderate' ? -1 : -1
      const penaltyConfidence = Math.max(15, finalRate - penaltyAmount)
      
      updateEdge(edgeId, { 
        confirmed: false, 
        confidence: penaltyConfidence,
        strength: updatedStrength,
        conflicts,
        feedbackMessage: `🤔 此关联的证据尚不充分，建议：${improvementTips[0] || '补充更多证据'}`,
        improvementTips
      })
      
      let failureMsg = ''
      if (conflicts.length > 0) {
        const highConflicts = conflicts.filter(c => c.severity === 'high')
        if (highConflicts.length > 0) {
          failureMsg = `⚠️ 验证失败！检测到 ${highConflicts.length} 个冲突。「${sourceLabel}」与「${targetLabel}」的关联可能存在推理错误（置信度：${penaltyConfidence}%）`
        } else {
          failureMsg = `🔍 验证失败，存在 ${conflicts.length} 个潜在冲突。建议重新审视「${sourceLabel}」与「${targetLabel}」的关系（置信度：${penaltyConfidence}%）`
        }
      } else if (strength.level === 'weak') {
        failureMsg = `💡 验证失败，但这很正常！「${sourceLabel}」与「${targetLabel}」的关联本身较弱。建议：${improvementTips[0] || '先进行线索比对'}`
      } else {
        failureMsg = `🤔 验证失败，证据尚不充分。「${sourceLabel}」与「${targetLabel}」的关联需要更多支持（置信度：${penaltyConfidence}%，强度：${strengthLabel}）`
      }
      
      addError(failureMsg, 'warning')
      gameStore.addLog('connection', `确认线索关联：${sourceLabel} ↔ ${targetLabel}，验证暂未通过，置信度调整为 ${penaltyConfidence}%。建议：${improvementTips.slice(0, 2).join('；')}`)
      
      if (sanityPenalty < 0) {
        gameStore.modifySanity(sanityPenalty, '线索关联验证未通过')
      }
      
      gameStore.generateDeductionHints()
      return { success: false, finalConfidence: penaltyConfidence }
    }
  }

  function startPlayback(speed: number = 1) {
    if (graphState.value.actionHistory.length === 0) return

    stopPlayback()
    
    playbackState.value = {
      isPlaying: true,
      currentStep: 0,
      totalSteps: graphState.value.actionHistory.length,
      speed,
      isPaused: false,
      intervalId: null
    }

    graphState.value.nodes = []
    graphState.value.edges = []
    graphState.value.currentHistoryIndex = -1

    playNextStep()
  }

  function playNextStep() {
    if (!playbackState.value.isPlaying || playbackState.value.isPaused) return
    if (playbackState.value.currentStep >= playbackState.value.totalSteps) {
      stopPlayback()
      return
    }

    const action = graphState.value.actionHistory[playbackState.value.currentStep]
    applyAction(action)
    graphState.value.currentHistoryIndex = playbackState.value.currentStep
    
    playbackState.value.currentStep++

    playbackState.value.intervalId = window.setTimeout(() => {
      playNextStep()
    }, 1000 / playbackState.value.speed)
  }

  function pausePlayback() {
    playbackState.value.isPaused = true
    if (playbackState.value.intervalId) {
      clearTimeout(playbackState.value.intervalId)
      playbackState.value.intervalId = null
    }
  }

  function resumePlayback() {
    playbackState.value.isPaused = false
    playNextStep()
  }

  function stopPlayback() {
    playbackState.value.isPlaying = false
    playbackState.value.isPaused = false
    if (playbackState.value.intervalId) {
      clearTimeout(playbackState.value.intervalId)
      playbackState.value.intervalId = null
    }
  }

  function setPlaybackSpeed(speed: number) {
    playbackState.value.speed = Math.max(0.25, Math.min(4, speed))
  }

  function clearGraph() {
    if (!confirm('确定要清空当前图谱吗？此操作可以撤销。')) return

    graphState.value.nodes.forEach(node => {
      removeNode(node.id)
    })
  }

  function exportGraph(): string {
    return JSON.stringify(graphState.value, null, 2)
  }

  function importGraph(json: string): boolean {
    try {
      const parsed = JSON.parse(json) as GraphState
      if (!parsed.nodes || !parsed.edges) {
        throw new Error('Invalid graph data')
      }
      
      graphState.value = parsed
      validateGraph()
      saveGraph()
      return true
    } catch (error) {
      console.error('Failed to import graph:', error)
      addError('导入失败: 无效的数据格式', 'error')
      return false
    }
  }

  function refreshFromGameState() {
    const caseData = getCaseById(graphState.value.caseId)
    if (!caseData) return

    const discoveredClues = gameStore.gameState.discoveredClues
    const discoveredEvidence = gameStore.gameState.discoveredEvidence
    const existingNodeIds = new Set(graphState.value.nodes.map(n => n.id))

    let maxY = Math.max(...graphState.value.nodes.map(n => n.y), 0)
    let newNodesCount = 0

    caseData.clues.forEach((clue) => {
      if (discoveredClues.includes(clue.id) && !existingNodeIds.has(clue.id)) {
        const newNode: GraphNode = {
          id: clue.id,
          type: 'clue',
          label: clue.name,
          description: clue.description,
          x: 100 + (newNodesCount % 4) * 200,
          y: maxY + 120 + Math.floor(newNodesCount / 4) * 120,
          width: 160,
          height: 80,
          importance: clue.importance,
          color: nodeColors.clue
        }
        graphState.value.nodes.push(newNode)
        addAction({
          type: 'node_add',
          data: { nodes: [newNode] }
        })
        newNodesCount++
      }
    })

    maxY = Math.max(...graphState.value.nodes.map(n => n.y), 0)

    caseData.scenes.forEach(scene => {
      scene.evidence.forEach(evidence => {
        if (discoveredEvidence.includes(evidence.id) && !existingNodeIds.has(evidence.id)) {
          const newNode: GraphNode = {
            id: evidence.id,
            type: 'evidence',
            label: evidence.name,
            description: evidence.description,
            x: 100 + (newNodesCount % 4) * 200,
            y: maxY + 120 + Math.floor(newNodesCount / 4) * 120,
            width: 160,
            height: 80,
            importance: evidence.isSpecial ? 5 : 3,
            color: nodeColors.evidence
          }
          graphState.value.nodes.push(newNode)
          addAction({
            type: 'node_add',
            data: { nodes: [newNode] }
          })
          newNodesCount++
        }
      })
    })

    if (newNodesCount > 0) {
      addError(`新增了 ${newNodesCount} 个节点`, 'warning')
      validateGraph()
    }
  }

  return {
    graphState,
    playbackState,
    selectedNodeId,
    selectedEdgeId,
    connectingFrom,
    validationResult,
    errorMessages,
    connectionPreview,
    hoveredNodeId,
    nodes,
    edges,
    canUndo,
    canRedo,
    relationshipLabels,
    nodeColors,
    loadGraph,
    initializeGraph,
    saveGraph,
    autoSave,
    startAutoSave,
    stopAutoSave,
    addNode,
    moveNode,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
    validateGraph,
    selectNode,
    selectEdge,
    startConnection,
    completeConnection,
    cancelConnection,
    setZoom,
    setPan,
    resetLayout,
    confirmEdge,
    undo,
    redo,
    startPlayback,
    pausePlayback,
    resumePlayback,
    stopPlayback,
    setPlaybackSpeed,
    clearGraph,
    exportGraph,
    importGraph,
    refreshFromGameState,
    addError,
    getStrengthLevel,
    getStrengthLabel,
    calculateRelationshipStrength,
    detectConflicts,
    getConnectionPreview,
    getImprovementTips,
    updateHoveredNode,
    suggestRelationshipTypes
  }
})
