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
  RelationshipType
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
    confidence: number = 50
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

    const newEdge: GraphEdge = {
      id: generateId(),
      sourceId,
      targetId,
      relationship,
      confidence,
      confirmed: false,
      createdAt: Date.now()
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

    validateGraph()
  }

  function removeEdge(edgeId: string) {
    const edge = graphState.value.edges.find(e => e.id === edgeId)
    if (!edge) return

    const beforeState = { edges: [...graphState.value.edges] }
    graphState.value.edges = graphState.value.edges.filter(e => e.id !== edgeId)
    const afterState = { edges: [...graphState.value.edges] }

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

      if (checkConflictingRelationship(edge)) {
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
    
    const result = addEdge(connectingFrom.value, targetNodeId, relationship)
    connectingFrom.value = null
    return result
  }

  function cancelConnection() {
    connectingFrom.value = null
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

  function confirmEdge(edgeId: string) {
    updateEdge(edgeId, { confirmed: true, confidence: 100 })
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
    addError
  }
})
