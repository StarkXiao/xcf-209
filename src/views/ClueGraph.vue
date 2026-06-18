<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useClueGraphStore } from '@/stores/clueGraph'
import { getCaseById } from '@/data/cases'
import { RELATIONSHIP_TYPES } from '@/types'
import type { GraphNode, GraphEdge, RelationshipType } from '@/types'

const router = useRouter()
const route = useRoute()
const clueGraphStore = useClueGraphStore()

const canvasRef = ref<HTMLDivElement | null>(null)
const svgRef = ref<SVGSVGElement | null>(null)
const isDragging = ref(false)
const dragNodeId = ref<string | null>(null)
const dragOffset = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const showRelationshipModal = ref(false)
const connectionTargetId = ref<string | null>(null)
const selectedRelationship = ref<RelationshipType>('related_to')
const showImportModal = ref(false)
const importJson = ref('')

const mousePos = ref({ x: 0, y: 0 })

const caseData = computed(() => {
  const caseId = route.params.caseId as string
  return getCaseById(caseId)
})

const nodes = computed(() => clueGraphStore.nodes)
const edges = computed(() => clueGraphStore.edges)
const selectedNodeId = computed(() => clueGraphStore.selectedNodeId)
const selectedEdgeId = computed(() => clueGraphStore.selectedEdgeId)
const connectingFrom = computed(() => clueGraphStore.connectingFrom)
const errorMessages = computed(() => clueGraphStore.errorMessages)
const validationResult = computed(() => clueGraphStore.validationResult)
const canUndo = computed(() => clueGraphStore.canUndo)
const canRedo = computed(() => clueGraphStore.canRedo)
const zoom = computed(() => clueGraphStore.graphState.zoom)
const pan = computed(() => clueGraphStore.graphState.pan)
const playbackState = computed(() => clueGraphStore.playbackState)

const selectedNode = computed(() => 
  nodes.value.find(n => n.id === selectedNodeId.value) || null
)

const selectedEdge = computed(() => 
  edges.value.find(e => e.id === selectedEdgeId.value) || null
)

const connectingNode = computed(() => 
  connectingFrom.value ? nodes.value.find(n => n.id === connectingFrom.value) : null
)

const connectionPreview = computed(() => clueGraphStore.connectionPreview)
const hoveredNodeId = computed(() => clueGraphStore.hoveredNodeId)

const errors = computed(() => validationResult.value?.errors || [])
const warnings = computed(() => validationResult.value?.warnings || [])

function getStrengthColor(level: string): string {
  const colors: Record<string, string> = {
    'weak': '#9e9e9e',
    'moderate': '#ff9800',
    'strong': '#4caf50',
    'very_strong': '#9c27b0'
  }
  return colors[level] || '#6b4c9a'
}

function getStrengthStrokeWidth(edge: GraphEdge): number {
  if (edge.strength) {
    switch (edge.strength.level) {
      case 'weak': return 1.5
      case 'moderate': return 2.5
      case 'strong': return 3.5
      case 'very_strong': return 4.5
      default: return 2
    }
  }
  return edge.id === selectedEdgeId.value ? 4 : 2
}

function getEdgeColor(edge: GraphEdge): string {
  if (edge.isError) return '#ff4444'
  if (edge.conflicts && edge.conflicts.length > 0) {
    const highConflicts = edge.conflicts.filter(c => c.severity === 'high')
    if (highConflicts.length > 0) return '#f44336'
  }
  if (edge.strength) {
    return getStrengthColor(edge.strength.level)
  }
  if (!edge.confirmed) return '#ff9800'
  if (edge.relationship === 'contradicts') return '#f44336'
  if (edge.relationship === 'supports') return '#4caf50'
  return '#6b4c9a'
}

function getEdgeOpacity(edge: GraphEdge): number {
  if (edge.isError) return 1
  if (edge.conflicts && edge.conflicts.length > 0) return 0.8
  if (edge.strength) {
    switch (edge.strength.level) {
      case 'weak': return 0.6
      case 'moderate': return 0.8
      case 'strong': return 0.9
      case 'very_strong': return 1
      default: return 0.8
    }
  }
  return 0.8
}

function getStrengthLabel(level: string): string {
  const labels: Record<string, string> = {
    'weak': '微弱',
    'moderate': '中等',
    'strong': '较强',
    'very_strong': '极强'
  }
  return labels[level] || ''
}

function handleNodeMouseEnter(nodeId: string) {
  clueGraphStore.updateHoveredNode(nodeId)
}

function handleNodeMouseLeave() {
  clueGraphStore.updateHoveredNode(null)
}

onMounted(() => {
  const caseId = route.params.caseId as string
  if (!caseId || !getCaseById(caseId)) {
    router.push('/cases')
    return
  }

  clueGraphStore.loadGraph(caseId)
  clueGraphStore.startAutoSave()
  
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  clueGraphStore.stopAutoSave()
  clueGraphStore.saveGraph()
  clueGraphStore.stopPlayback()
  window.removeEventListener('keydown', handleKeydown)
})

function handleKeydown(e: KeyboardEvent) {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
    return
  }

  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        clueGraphStore.redo()
      } else {
        clueGraphStore.undo()
      }
    } else if (e.key === 'y') {
      e.preventDefault()
      clueGraphStore.redo()
    } else if (e.key === 's') {
      e.preventDefault()
      clueGraphStore.saveGraph()
      clueGraphStore.addError('图谱已保存', 'warning')
    }
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    if (selectedNodeId.value) {
      e.preventDefault()
      clueGraphStore.removeNode(selectedNodeId.value)
    } else if (selectedEdgeId.value) {
      e.preventDefault()
      clueGraphStore.removeEdge(selectedEdgeId.value)
    }
  }

  if (e.key === 'Escape') {
    clueGraphStore.cancelConnection()
    clueGraphStore.selectNode(null)
    clueGraphStore.selectEdge(null)
    showRelationshipModal.value = false
    showImportModal.value = false
  }
}

function handleCanvasClick(e: MouseEvent) {
  if (e.target === canvasRef.value || e.target === svgRef.value) {
    clueGraphStore.selectNode(null)
    clueGraphStore.selectEdge(null)
  }
}

function handleNodeMouseDown(node: GraphNode, e: MouseEvent) {
  e.stopPropagation()
  
  clueGraphStore.selectNode(node.id)
  
  if (connectingFrom.value && connectingFrom.value !== node.id) {
    connectionTargetId.value = node.id
    showRelationshipModal.value = true
    return
  }
  
  if (connectingFrom.value === node.id) {
    clueGraphStore.cancelConnection()
    return
  }

  isDragging.value = true
  dragNodeId.value = node.id
  
  const rect = canvasRef.value?.getBoundingClientRect()
  if (rect) {
    const x = (e.clientX - rect.left - pan.value.x) / zoom.value
    const y = (e.clientY - rect.top - pan.value.y) / zoom.value
    dragOffset.value = {
      x: x - node.x,
      y: y - node.y
    }
  }
}

function handleCanvasMouseMove(e: MouseEvent) {
  const rect = canvasRef.value?.getBoundingClientRect()
  if (!rect) return

  const x = (e.clientX - rect.left - pan.value.x) / zoom.value
  const y = (e.clientY - rect.top - pan.value.y) / zoom.value
  mousePos.value = { x, y }

  if (isDragging.value && dragNodeId.value) {
    const newX = x - dragOffset.value.x
    const newY = y - dragOffset.value.y
    clueGraphStore.moveNode(dragNodeId.value, newX, newY)
  } else if (isPanning.value) {
    const dx = e.clientX - panStart.value.x
    const dy = e.clientY - panStart.value.y
    clueGraphStore.setPan(pan.value.x + dx, pan.value.y + dy)
    panStart.value = { x: e.clientX, y: e.clientY }
  }
}

function handleCanvasMouseUp() {
  isDragging.value = false
  dragNodeId.value = null
  isPanning.value = false
}

function handleCanvasWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY > 0 ? -0.1 : 0.1
  clueGraphStore.setZoom(zoom.value + delta)
}

function handleCanvasMouseDown(e: MouseEvent) {
  if (e.button === 1 || (e.button === 0 && e.altKey)) {
    e.preventDefault()
    isPanning.value = true
    panStart.value = { x: e.clientX, y: e.clientY }
  }
}

function handleEdgeClick(edge: GraphEdge, e: MouseEvent) {
  e.stopPropagation()
  clueGraphStore.selectEdge(edge.id)
}

function startConnection(node: GraphNode) {
  if (connectingFrom.value === node.id) {
    clueGraphStore.cancelConnection()
  } else {
    clueGraphStore.startConnection(node.id)
  }
}

function confirmConnection() {
  if (connectingFrom.value && connectionTargetId.value) {
    const result = clueGraphStore.completeConnection(
      connectionTargetId.value, 
      selectedRelationship.value
    )
    if (result) {
      clueGraphStore.validateGraph()
    }
  }
  showRelationshipModal.value = false
  connectionTargetId.value = null
  selectedRelationship.value = 'related_to'
}

function cancelConnectionModal() {
  showRelationshipModal.value = false
  connectionTargetId.value = null
  clueGraphStore.cancelConnection()
}

function getEdgePath(edge: GraphEdge): string {
  const sourceNode = nodes.value.find(n => n.id === edge.sourceId)
  const targetNode = nodes.value.find(n => n.id === edge.targetId)
  
  if (!sourceNode || !targetNode) return ''
  
  const sourceX = sourceNode.x + sourceNode.width / 2
  const sourceY = sourceNode.y + sourceNode.height / 2
  const targetX = targetNode.x + targetNode.width / 2
  const targetY = targetNode.y + targetNode.height / 2
  
  const midX = (sourceX + targetX) / 2
  const midY = (sourceY + targetY) / 2
  
  const dx = targetX - sourceX
  const dy = targetY - sourceY
  const len = Math.sqrt(dx * dx + dy * dy)
  const offset = len * 0.2
  
  const ctrlX = midX - (dy / len) * offset
  const ctrlY = midY + (dx / len) * offset
  
  return `M ${sourceX} ${sourceY} Q ${ctrlX} ${ctrlY} ${targetX} ${targetY}`
}

function getEdgeDasharray(edge: GraphEdge): string {
  if (edge.isError) return '5,5'
  if (!edge.confirmed) return '10,5'
  return ''
}

function getRelationshipLabel(rel: string): string {
  return clueGraphStore.relationshipLabels[rel as RelationshipType] || rel
}

function getEdgeLabelPosition(edge: GraphEdge): { x: number; y: number } {
  const sourceNode = nodes.value.find(n => n.id === edge.sourceId)
  const targetNode = nodes.value.find(n => n.id === edge.targetId)
  
  if (!sourceNode || !targetNode) return { x: 0, y: 0 }
  
  return {
    x: (sourceNode.x + targetNode.x) / 2 + 20,
    y: (sourceNode.y + targetNode.y) / 2 - 10
  }
}

function confirmSelectedEdge() {
  if (selectedEdgeId.value) {
    clueGraphStore.confirmEdge(selectedEdgeId.value)
  }
}

function deleteSelectedNode() {
  if (selectedNodeId.value) {
    clueGraphStore.removeNode(selectedNodeId.value)
  }
}

function deleteSelectedEdge() {
  if (selectedEdgeId.value) {
    clueGraphStore.removeEdge(selectedEdgeId.value)
  }
}

function exportGraph() {
  const json = clueGraphStore.exportGraph()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `graph-${caseData.value?.id || 'export'}.json`
  a.click()
  URL.revokeObjectURL(url)
}

function importGraph() {
  if (clueGraphStore.importGraph(importJson.value)) {
    showImportModal.value = false
    importJson.value = ''
  }
}

function goToClues() {
  router.push(`/clues/${caseData.value?.id}`)
}

function goToInvestigation() {
  router.push(`/investigation/${caseData.value?.id}`)
}

function goToDeduction() {
  router.push(`/deduction/${caseData.value?.id}`)
}

function handleExportClick() {
  if (confirm('确定要导出当前图谱吗？')) {
    exportGraph()
  }
}

function handleImportClick() {
  importJson.value = ''
  showImportModal.value = true
}

function handleRefreshClick() {
  clueGraphStore.refreshFromGameState()
}

function handleClearClick() {
  clueGraphStore.clearGraph()
}

function handleResetLayoutClick() {
  clueGraphStore.resetLayout()
}

function handleValidateClick() {
  clueGraphStore.validateGraph()
  clueGraphStore.addError('校验完成', 'warning')
}

function handleSaveClick() {
  clueGraphStore.saveGraph()
  clueGraphStore.addError('图谱已保存', 'warning')
}

function handleUndoClick() {
  clueGraphStore.undo()
}

function handleRedoClick() {
  clueGraphStore.redo()
}

function handleZoomIn() {
  clueGraphStore.setZoom(zoom.value + 0.25)
}

function handleZoomOut() {
  clueGraphStore.setZoom(zoom.value - 0.25)
}

function handleZoomReset() {
  clueGraphStore.setZoom(1)
  clueGraphStore.setPan(0, 0)
}

function handlePlaybackStart() {
  clueGraphStore.startPlayback(playbackState.value.speed)
}

function handlePlaybackPause() {
  clueGraphStore.pausePlayback()
}

function handlePlaybackResume() {
  clueGraphStore.resumePlayback()
}

function handlePlaybackStop() {
  clueGraphStore.stopPlayback()
}

function handlePlaybackSpeedChange(e: Event) {
  const target = e.target as HTMLSelectElement
  clueGraphStore.setPlaybackSpeed(parseFloat(target.value))
}

function handleRelationshipChange(edgeId: string, e: Event) {
  const target = e.target as HTMLSelectElement
  clueGraphStore.updateEdge(edgeId, { relationship: target.value })
}

function handleConfidenceChange(edgeId: string, e: Event) {
  const target = e.target as HTMLInputElement
  clueGraphStore.updateEdge(edgeId, { confidence: parseInt(target.value) })
}

function getNodeTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    clue: '线索',
    evidence: '证据',
    character: '角色',
    location: '地点'
  }
  return labels[type] || type
}

function getNodeBorderColor(node: GraphNode): string {
  if (node.id === selectedNodeId.value) return '#ffd700'
  if (node.id === connectingFrom.value) return '#ff9800'
  if (node.id === connectionTargetId.value) return '#4caf50'
  return node.color || '#6b4c9a'
}
</script>

<template>
  <div class="clue-graph-page page-container">
    <div v-if="!caseData" class="loading">
      <p>加载图谱数据...</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">线索关系图谱</h1>
          <p class="page-subtitle">{{ caseData.title }} - 拖拽节点，建立关系，揭示真相</p>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="goToInvestigation">
            <span>🔍</span> 搜证
          </button>
          <button class="action-btn" @click="goToClues">
            <span>🧩</span> 线索
          </button>
          <button class="action-btn" @click="goToDeduction">
            <span>💡</span> 推演
          </button>
        </div>
      </div>

      <div class="graph-content">
        <div class="graph-toolbar card">
          <div class="toolbar-group">
            <button class="toolbar-btn" @click="handleUndoClick" :disabled="!canUndo" title="撤销 (Ctrl+Z)">
              ↩️
            </button>
            <button class="toolbar-btn" @click="handleRedoClick" :disabled="!canRedo" title="重做 (Ctrl+Y)">
              ↪️
            </button>
          </div>
          
          <div class="toolbar-group">
            <button class="toolbar-btn" @click="handleZoomOut" title="缩小">
              🔍-
            </button>
            <span class="zoom-label">{{ Math.round(zoom * 100) }}%</span>
            <button class="toolbar-btn" @click="handleZoomIn" title="放大">
              🔍+
            </button>
            <button class="toolbar-btn" @click="handleZoomReset" title="重置视图">
              🎯
            </button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" @click="handleResetLayoutClick" title="重置布局">
              🔄
            </button>
            <button class="toolbar-btn" @click="handleRefreshClick" title="刷新节点">
              ⟳
            </button>
            <button class="toolbar-btn" @click="handleValidateClick" title="校验图谱">
              ✓
            </button>
          </div>

          <div class="toolbar-group">
            <button class="toolbar-btn" @click="handleSaveClick" title="保存 (Ctrl+S)">
              💾
            </button>
            <button class="toolbar-btn" @click="handleExportClick" title="导出">
              📤
            </button>
            <button class="toolbar-btn" @click="handleImportClick" title="导入">
              📥
            </button>
            <button class="toolbar-btn danger" @click="handleClearClick" title="清空">
              🗑️
            </button>
          </div>
        </div>

        <div 
          ref="canvasRef"
          class="graph-canvas"
          @click="handleCanvasClick"
          @mousedown="handleCanvasMouseDown"
          @mousemove="handleCanvasMouseMove"
          @mouseup="handleCanvasMouseUp"
          @mouseleave="handleCanvasMouseUp"
          @wheel="handleCanvasWheel"
        >
          <div 
            class="graph-transform"
            :style="{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
            }"
          >
            <svg 
              ref="svgRef"
              class="edges-svg"
              :style="{
                width: '3000px',
                height: '2000px',
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none'
              }"
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b4c9a" />
                </marker>
                <marker
                  id="arrowhead-error"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#ff4444" />
                </marker>
              </defs>

              <g v-for="edge in edges" :key="edge.id">
                <path
                  :d="getEdgePath(edge)"
                  :stroke="getEdgeColor(edge)"
                  :stroke-width="getStrengthStrokeWidth(edge)"
                  :stroke-dasharray="getEdgeDasharray(edge)"
                  :stroke-opacity="getEdgeOpacity(edge)"
                  fill="none"
                  style="pointer-events: stroke; cursor: pointer;"
                  :class="{ 
                    'edge-selected': edge.id === selectedEdgeId,
                    'edge-conflict': edge.conflicts && edge.conflicts.length > 0,
                    'edge-weak': edge.strength?.level === 'weak',
                    'edge-strong': edge.strength?.level === 'strong' || edge.strength?.level === 'very_strong'
                  }"
                  @click.stop="handleEdgeClick(edge, $event)"
                  :marker-end="edge.isError ? 'url(#arrowhead-error)' : 'url(#arrowhead)'"
                />
                <text
                  :x="getEdgeLabelPosition(edge).x"
                  :y="getEdgeLabelPosition(edge).y"
                  :fill="edge.isError ? '#ff4444' : getEdgeColor(edge)"
                  font-size="12"
                  text-anchor="middle"
                  style="pointer-events: none;"
                  font-weight="500"
                >
                  {{ getRelationshipLabel(edge.relationship) }}
                  <tspan 
                    v-if="edge.strength" 
                    :x="getEdgeLabelPosition(edge).x" 
                    dy="16"
                    :fill="getStrengthColor(edge.strength.level)"
                    font-size="10"
                  >
                    {{ getStrengthLabel(edge.strength.level) }} ({{ edge.strength.score }}分)
                  </tspan>
                  <tspan 
                    v-if="edge.conflicts && edge.conflicts.length > 0" 
                    :x="getEdgeLabelPosition(edge).x" 
                    dy="32"
                    fill="#f44336"
                    font-size="10"
                  >
                    ⚠️ {{ edge.conflicts.length }}个冲突
                  </tspan>
                  <tspan v-if="edge.isError" x="getEdgeLabelPosition(edge).x" dy="16">⚠️ {{ edge.errorMessage }}</tspan>
                </text>
              </g>

              <line
                v-if="connectingNode"
                :x1="connectingNode.x + connectingNode.width / 2"
                :y1="connectingNode.y + connectingNode.height / 2"
                :x2="mousePos.x"
                :y2="mousePos.y"
                stroke="#ff9800"
                stroke-width="2"
                stroke-dasharray="5,5"
              />
            </svg>

            <div
              v-for="node in nodes"
              :key="node.id"
              class="graph-node"
              :class="{
                'node-selected': node.id === selectedNodeId,
                'node-connecting': node.id === connectingFrom,
                'node-target': node.id === connectionTargetId,
                'node-dragging': dragNodeId === node.id,
                'node-error': edges.some(e => (e.sourceId === node.id || e.targetId === node.id) && e.isError),
                'node-hovered': node.id === hoveredNodeId,
                'node-preview-target': connectingFrom && node.id !== connectingFrom && node.id === hoveredNodeId
              }"
              :style="{
                left: node.x + 'px',
                top: node.y + 'px',
                width: node.width + 'px',
                height: node.height + 'px',
                borderColor: getNodeBorderColor(node),
                backgroundColor: node.color + '20'
              }"
              @mousedown="handleNodeMouseDown(node, $event)"
              @mouseenter="handleNodeMouseEnter(node.id)"
              @mouseleave="handleNodeMouseLeave"
            >
              <div class="node-header" :style="{ backgroundColor: node.color }">
                <span class="node-type">{{ getNodeTypeLabel(node.type) }}</span>
                <span v-if="node.importance" class="node-importance">{{ node.importance }}</span>
              </div>
              <div class="node-body">
                <div class="node-title">{{ node.label }}</div>
              </div>
              <div class="node-actions">
                <button 
                  class="node-action-btn connect-btn"
                  @click.stop="startConnection(node)"
                  :title="connectingFrom === node.id ? '取消连接' : '建立连接'"
                >
                  {{ connectingFrom === node.id ? '✕' : '🔗' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="graph-sidebar">
          <div class="sidebar-section card">
            <h3 class="section-title">📊 图谱统计</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-label">节点数</span>
                <span class="stat-value">{{ nodes.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">连接数</span>
                <span class="stat-value">{{ edges.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">错误</span>
                <span class="stat-value error">{{ errors.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">警告</span>
                <span class="stat-value warning">{{ warnings.length }}</span>
              </div>
            </div>
          </div>

          <div class="sidebar-section card">
            <h3 class="section-title">🎬 回放复盘</h3>
            <div class="playback-controls">
              <div class="playback-progress">
                <span>步骤: {{ playbackState.currentStep }} / {{ playbackState.totalSteps }}</span>
                <div class="progress-bar">
                  <div 
                    class="progress-fill" 
                    :style="{ width: playbackState.totalSteps > 0 ? `${(playbackState.currentStep / playbackState.totalSteps) * 100}%` : '0%' }"
                  ></div>
                </div>
              </div>
              
              <div class="playback-buttons">
                <select 
                  v-if="!playbackState.isPlaying"
                  class="speed-select"
                  :value="playbackState.speed"
                  @change="handlePlaybackSpeedChange"
                >
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                  <option value="4">4x</option>
                </select>
                
                <button 
                  v-if="!playbackState.isPlaying"
                  class="playback-btn primary"
                  @click="handlePlaybackStart"
                  :disabled="edges.length === 0 && nodes.length === 0"
                >
                  ▶️ 开始回放
                </button>
                
                <template v-else>
                  <button 
                    v-if="playbackState.isPaused"
                    class="playback-btn primary"
                    @click="handlePlaybackResume"
                  >
                    ▶️ 继续
                  </button>
                  <button 
                    v-else
                    class="playback-btn"
                    @click="handlePlaybackPause"
                  >
                    ⏸️ 暂停
                  </button>
                  <button 
                    class="playback-btn danger"
                    @click="handlePlaybackStop"
                  >
                    ⏹️ 停止
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div v-if="selectedNode" class="sidebar-section card">
            <h3 class="section-title">📌 节点详情</h3>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">名称</span>
                <span class="detail-value">{{ selectedNode.label }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">类型</span>
                <span class="detail-value" :style="{ color: selectedNode.color }">
                  {{ getNodeTypeLabel(selectedNode.type) }}
                </span>
              </div>
              <div v-if="selectedNode.importance" class="detail-row">
                <span class="detail-label">重要度</span>
                <span class="detail-value">{{ selectedNode.importance }} / 5</span>
              </div>
              <div v-if="selectedNode.description" class="detail-row full">
                <span class="detail-label">描述</span>
                <p class="detail-description">{{ selectedNode.description }}</p>
              </div>
              <div class="detail-actions">
                <button class="detail-btn danger" @click="deleteSelectedNode">
                  🗑️ 删除节点
                </button>
              </div>
            </div>
          </div>

          <div v-else-if="selectedEdge" class="sidebar-section card">
            <h3 class="section-title">🔗 连接详情</h3>
            <div class="detail-content">
              <div class="detail-row">
                <span class="detail-label">源节点</span>
                <span class="detail-value">{{ nodes.find(n => n.id === selectedEdge?.sourceId)?.label }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">目标节点</span>
                <span class="detail-value">{{ nodes.find(n => n.id === selectedEdge?.targetId)?.label }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">关系类型</span>
                <select 
                  class="detail-select"
                  :value="selectedEdge?.relationship"
                  @change="handleRelationshipChange(selectedEdge?.id, $event)"
                >
                  <option v-for="rel in RELATIONSHIP_TYPES" :key="rel" :value="rel">
                    {{ getRelationshipLabel(rel) }}
                  </option>
                </select>
              </div>
              <div class="detail-row">
                <span class="detail-label">置信度</span>
                <div class="confidence-slider">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    :value="selectedEdge?.confidence"
                    @change="handleConfidenceChange(selectedEdge?.id, $event)"
                  />
                  <span>{{ selectedEdge?.confidence }}%</span>
                </div>
              </div>
              
              <div v-if="selectedEdge?.strength" class="detail-row">
                <span class="detail-label">关系强度</span>
                <span 
                  class="detail-value" 
                  :style="{ color: getStrengthColor(selectedEdge.strength.level) }"
                  font-weight="600"
                >
                  {{ getStrengthLabel(selectedEdge.strength.level) }} ({{ selectedEdge.strength.score }}分)
                </span>
              </div>

              <div v-if="selectedEdge?.strength?.factors && selectedEdge.strength.factors.length > 0" class="detail-row full">
                <span class="detail-label">强度构成</span>
                <ul class="strength-factors">
                  <li 
                    v-for="(factor, index) in selectedEdge.strength.factors" 
                    :key="index"
                    :class="factor.contribution >= 0 ? 'positive' : 'negative'"
                  >
                    <span class="factor-value">{{ factor.contribution >= 0 ? '+' : '' }}{{ factor.contribution }}</span>
                    <span class="factor-desc">{{ factor.description }}</span>
                  </li>
                </ul>
              </div>

              <div v-if="selectedEdge?.conflicts && selectedEdge.conflicts.length > 0" class="detail-row full">
                <span class="detail-label error">⚠️ 冲突检测</span>
                <div class="conflict-list">
                  <div 
                    v-for="(conflict, index) in selectedEdge.conflicts" 
                    :key="index"
                    class="conflict-item"
                    :class="conflict.severity"
                  >
                    <span class="conflict-icon">{{ conflict.severity === 'high' ? '🔴' : '🟡' }}</span>
                    <span class="conflict-desc">{{ conflict.description }}</span>
                  </div>
                </div>
              </div>

              <div v-if="selectedEdge?.feedbackMessage" class="detail-row full">
                <span class="detail-label">系统反馈</span>
                <p class="feedback-message">{{ selectedEdge.feedbackMessage }}</p>
              </div>

              <div v-if="selectedEdge?.improvementTips && selectedEdge.improvementTips.length > 0" class="detail-row full">
                <span class="detail-label">💡 改进建议</span>
                <ul class="improvement-tips">
                  <li v-for="(tip, index) in selectedEdge.improvementTips.slice(0, 4)" :key="index">
                    {{ tip }}
                  </li>
                </ul>
              </div>

              <div class="detail-row">
                <span class="detail-label">状态</span>
                <span class="detail-value" :class="selectedEdge?.confirmed ? 'confirmed' : 'unconfirmed'">
                  {{ selectedEdge?.confirmed ? '✓ 已确认' : '⏳ 待确认' }}
                </span>
              </div>
              <div v-if="selectedEdge?.isError" class="detail-row full">
                <span class="detail-label error">错误</span>
                <p class="error-message">{{ selectedEdge?.errorMessage }}</p>
              </div>
              <div class="detail-actions">
                <button 
                  v-if="!selectedEdge?.confirmed"
                  class="detail-btn primary" 
                  @click="confirmSelectedEdge"
                >
                  ✓ 确认关系
                </button>
                <button class="detail-btn danger" @click="deleteSelectedEdge">
                  🗑️ 删除连接
                </button>
              </div>
            </div>
          </div>

          <div v-if="errors.length > 0 || warnings.length > 0" class="sidebar-section card">
            <h3 class="section-title">⚠️ 校验结果</h3>
            <div class="validation-list">
              <div 
                v-for="error in errors" 
                :key="error.edgeId"
                class="validation-item error"
              >
                <span class="validation-icon">❌</span>
                <span class="validation-text">{{ error.message }}</span>
              </div>
              <div 
                v-for="warning in warnings" 
                :key="warning.edgeId || warning.nodeId"
                class="validation-item warning"
              >
                <span class="validation-icon">⚠️</span>
                <span class="validation-text">{{ warning.message }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="error-notifications">
        <transition-group name="notification">
          <div 
            v-for="msg in errorMessages" 
            :key="msg.id"
            class="notification"
            :class="msg.type"
          >
            <span class="notification-icon">{{ msg.type === 'error' ? '❌' : '⚠️' }}</span>
            <span class="notification-text">{{ msg.message }}</span>
          </div>
        </transition-group>
      </div>

      <div v-if="connectingFrom && !showRelationshipModal" class="connecting-hint">
        <p>🔗 点击另一个节点建立连接</p>
        <button @click="clueGraphStore.cancelConnection()">取消</button>
      </div>

      <div v-if="connectionPreview && !showRelationshipModal" class="connection-preview card">
        <div class="preview-header">
          <h4>🔍 连接预览</h4>
          <span class="preview-strength" :style="{ color: getStrengthColor(connectionPreview?.estimatedStrength?.level || 'weak') }">
            {{ getStrengthLabel(connectionPreview?.estimatedStrength?.level || 'weak') }} ({{ connectionPreview?.estimatedStrength?.score || 0 }}分)
          </span>
        </div>
        
        <div class="preview-content">
          <div class="preview-nodes">
            <span class="preview-node">{{ nodes.find(n => n.id === connectionPreview?.sourceId)?.label }}</span>
            <span class="preview-arrow">→</span>
            <span class="preview-node">{{ nodes.find(n => n.id === connectionPreview?.targetId)?.label }}</span>
          </div>
          
          <div class="preview-confidence">
            <span class="preview-label">预估匹配度：</span>
            <span 
              :class="connectionPreview?.estimatedConfidence >= 60 ? 'high' : 'low'">
              {{ connectionPreview?.estimatedConfidence }}%
            </span>
          </div>

          <div v-if="connectionPreview?.suggestedRelationships && connectionPreview.suggestedRelationships.length > 0" class="preview-suggestions">
            <span class="preview-label">推荐关系：</span>
            <div class="suggestion-list">
              <span 
                v-for="rel in connectionPreview?.suggestedRelationships?.slice(0, 3)" 
                :key="rel.type"
                class="suggestion-item"
                :class="{ 'high-confidence': rel.confidence >= 60 }"
              >
                {{ getRelationshipIcon(rel.type) }} {{ rel.label }} ({{ rel.confidence }}%)
              </span>
            </div>
          </div>

          <div v-if="connectionPreview?.estimatedStrength?.factors && connectionPreview.estimatedStrength.factors.length > 0" class="preview-factors">
            <span class="preview-label">强度构成：</span>
            <ul class="factor-list">
              <li 
                v-for="(factor, index) in connectionPreview?.estimatedStrength?.factors" 
                :key="index"
                :class="factor.contribution >= 0 ? 'positive' : 'negative'"
              >
                  {{ factor.contribution >= 0 ? '+' : '' }}{{ factor.contribution }} - {{ factor.description }}
              </li>
            </ul>
          </div>

          <div v-if="connectionPreview?.potentialConflicts && connectionPreview.potentialConflicts.length > 0" class="preview-conflicts">
            <div class="conflict-header">
              <span class="conflict-icon">⚠️</span>
              <span>检测到 {{ connectionPreview?.potentialConflicts?.length }} 个潜在冲突</span>
            </div>
            <ul class="conflict-list">
              <li 
                v-for="(conflict, index) in connectionPreview?.potentialConflicts" 
                :key="index"
                :class="conflict.severity"
              >
                {{ conflict.description }}
              </li>
            </ul>
          </div>

          <div v-if="connectionPreview?.warnings && connectionPreview.warnings.length > 0" class="preview-warnings">
            <div class="warning-item" v-for="(warning, index) in connectionPreview?.warnings" :key="index">
              ⚠️ {{ warning }}
            </div>
          </div>

          <div v-if="connectionPreview?.suggestions && connectionPreview.suggestions.length > 0" class="preview-tips">
            <div class="tip-item" v-for="(tip, index) in connectionPreview?.suggestions" :key="index">
              💡 {{ tip }}
            </div>
          </div>
        </div>
      </div>

      <div v-if="playbackState.isPlaying" class="playback-overlay">
        <div class="playback-indicator">
          <span class="pulse">●</span>
          <span>回放中... {{ playbackState.currentStep }}/{{ playbackState.totalSteps }}</span>
        </div>
      </div>
    </template>

    <div v-if="showRelationshipModal" class="modal-overlay" @click="cancelConnectionModal">
      <div class="modal card" @click.stop>
        <h3 class="modal-title">选择关系类型</h3>
        <p class="modal-subtitle">
          {{ nodes.find(n => n.id === connectingFrom)?.label }} → {{ nodes.find(n => n.id === connectionTargetId)?.label }}
        </p>

        <div v-if="connectingFrom && connectionTargetId" class="modal-preview">
          <div class="preview-strength-info">
            <span class="preview-label">预估强度：</span>
            <span 
              class="preview-strength-value"
              :style="{ color: getStrengthColor(
                clueGraphStore.calculateRelationshipStrength(connectingFrom, connectionTargetId, selectedRelationship).level
              )}"
            >
              {{ getStrengthLabel(
                clueGraphStore.calculateRelationshipStrength(connectingFrom, connectionTargetId, selectedRelationship).level
              ) }} 
              ({{ clueGraphStore.calculateRelationshipStrength(connectingFrom, connectionTargetId, selectedRelationship).score }}分)
            </span>
          </div>
          <div class="preview-conflicts-info">
            <span 
              v-if="clueGraphStore.detectConflicts(connectingFrom, connectionTargetId, selectedRelationship).length > 0"
              class="conflict-warning"
            >
              ⚠️ 检测到 {{ clueGraphStore.detectConflicts(connectingFrom, connectionTargetId, selectedRelationship).length }} 个潜在冲突
            </span>
          </div>
        </div>
        
        <div class="relationship-options">
          <div 
            v-for="rel in RELATIONSHIP_TYPES" 
            :key="rel"
            class="relationship-option"
            :class="{ 
              selected: selectedRelationship === rel,
              'has-conflict': connectingFrom && connectionTargetId && 
                clueGraphStore.detectConflicts(connectingFrom, connectionTargetId, rel).length > 0
            }"
            @click="selectedRelationship = rel"
          >
            <span class="option-icon">{{ getRelationshipIcon(rel) }}</span>
            <span class="option-label">{{ getRelationshipLabel(rel) }}</span>
            <span 
              v-if="connectingFrom && connectionTargetId"
              class="option-score"
              :style="{ color: getStrengthColor(
                clueGraphStore.calculateRelationshipStrength(connectingFrom, connectionTargetId, rel).level
              )}"
            >
              {{ clueGraphStore.calculateRelationshipStrength(connectingFrom, connectionTargetId, rel).score }}分
            </span>
          </div>
        </div>

        <div class="modal-actions">
          <button class="modal-btn" @click="cancelConnectionModal">取消</button>
          <button class="modal-btn primary" @click="confirmConnection">确认连接</button>
        </div>
      </div>
    </div>

    <div v-if="showImportModal" class="modal-overlay" @click="showImportModal = false">
      <div class="modal card" @click.stop>
        <h3 class="modal-title">导入图谱</h3>
        <p class="modal-subtitle">粘贴 JSON 数据</p>
        
        <textarea 
          v-model="importJson"
          class="import-textarea"
          placeholder='{"caseId": "case-001", "nodes": [], "edges": []}'
          rows="10"
        ></textarea>

        <div class="modal-actions">
          <button class="modal-btn" @click="showImportModal = false">取消</button>
          <button class="modal-btn primary" @click="importGraph">导入</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
function getRelationshipIcon(rel: string): string {
  const icons: Record<string, string> = {
    'causes': '⚡',
    'implies': '💭',
    'supports': '✅',
    'contradicts': '❌',
    'related_to': '🔗',
    'provides_evidence_for': '📋',
    'leads_to': '➡️',
    'is_part_of': '🧩',
    'is_member_of': '👤',
    'is_located_at': '📍'
  }
  return icons[rel] || '🔗'
}
</script>

<style scoped>
.clue-graph-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  overflow: hidden;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--color-text-dim);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.graph-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 1rem;
  min-height: 0;
}

.graph-toolbar {
  grid-column: 1 / -1;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding-right: 1rem;
  border-right: 1px solid var(--color-border);
}

.toolbar-group:last-child {
  border-right: none;
  padding-right: 0;
}

.toolbar-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.toolbar-btn:hover:not(:disabled) {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.toolbar-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toolbar-btn.danger:hover:not(:disabled) {
  background: var(--color-danger);
  border-color: var(--color-danger);
}

.zoom-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  min-width: 50px;
  text-align: center;
}

.graph-canvas {
  position: relative;
  background: 
    radial-gradient(circle at 1px 1px, rgba(107, 76, 154, 0.1) 1px, transparent 0),
    rgba(0, 0, 0, 0.1);
  background-size: 30px 30px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  cursor: grab;
}

.graph-canvas:active {
  cursor: grabbing;
}

.graph-transform {
  position: absolute;
  top: 0;
  left: 0;
  width: 3000px;
  height: 2000px;
  transform-origin: 0 0;
}

.edges-svg {
  z-index: 1;
}

.edge-selected {
  filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.8));
}

.graph-node {
  position: absolute;
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  overflow: hidden;
  cursor: move;
  transition: box-shadow 0.2s ease, transform 0.1s ease;
  z-index: 2;
  user-select: none;
}

.graph-node:hover {
  box-shadow: 0 4px 20px rgba(107, 76, 154, 0.4);
}

.graph-node.node-selected {
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  z-index: 10;
}

.graph-node.node-connecting {
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.6);
  animation: pulse-connect 1.5s infinite;
  z-index: 10;
}

.graph-node.node-target {
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.6);
}

.graph-node.node-dragging {
  transition: none;
  z-index: 100;
  opacity: 0.9;
}

.graph-node.node-error {
  border-color: var(--color-danger) !important;
  animation: error-pulse 2s infinite;
}

@keyframes pulse-connect {
  0%, 100% { box-shadow: 0 0 20px rgba(255, 152, 0, 0.6); }
  50% { box-shadow: 0 0 30px rgba(255, 152, 0, 0.9); }
}

@keyframes error-pulse {
  0%, 100% { box-shadow: 0 0 10px rgba(255, 68, 68, 0.4); }
  50% { box-shadow: 0 0 20px rgba(255, 68, 68, 0.7); }
}

.node-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.25rem 0.5rem;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
}

.node-importance {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.35rem;
  border-radius: 8px;
  font-size: 0.65rem;
}

.node-body {
  padding: 0.5rem;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.node-title {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 500;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.node-actions {
  position: absolute;
  bottom: 0.25rem;
  right: 0.25rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.graph-node:hover .node-actions,
.graph-node.node-selected .node-actions {
  opacity: 1;
}

.node-action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.node-action-btn:hover {
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.connect-btn {
  background: rgba(255, 152, 0, 0.6);
  border-color: #ff9800;
}

.connect-btn:hover {
  background: #ff9800;
}

.graph-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.sidebar-section {
  padding: 1rem;
}

.section-title {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  text-align: center;
}

.stat-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.stat-value {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--color-text);
}

.stat-value.error {
  color: var(--color-danger);
}

.stat-value.warning {
  color: #ff9800;
}

.playback-controls {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.playback-progress {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.playback-progress span {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.playback-buttons {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.speed-select {
  padding: 0.4rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.85rem;
}

.playback-btn {
  flex: 1;
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
}

.playback-btn.primary {
  flex: 2;
}

.detail-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.detail-row.full {
  flex-direction: column;
  align-items: flex-start;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.detail-value {
  font-size: 0.9rem;
  color: var(--color-text);
  text-align: right;
}

.detail-value.confirmed {
  color: var(--color-success);
}

.detail-value.unconfirmed {
  color: #ff9800;
}

.detail-description {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.5;
  margin-top: 0.25rem;
}

.detail-select {
  padding: 0.35rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.85rem;
}

.confidence-slider {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.confidence-slider input {
  flex: 1;
  cursor: pointer;
}

.confidence-slider span {
  font-size: 0.85rem;
  color: var(--color-text);
  min-width: 40px;
  text-align: right;
}

.detail-label.error {
  color: var(--color-danger);
}

.error-message {
  font-size: 0.85rem;
  color: var(--color-danger);
  margin-top: 0.25rem;
  padding: 0.5rem;
  background: rgba(255, 68, 68, 0.1);
  border-radius: 4px;
}

.detail-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.detail-btn {
  flex: 1;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.validation-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
}

.validation-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
}

.validation-item.error {
  background: rgba(255, 68, 68, 0.1);
  border-left: 3px solid var(--color-danger);
}

.validation-item.warning {
  background: rgba(255, 152, 0, 0.1);
  border-left: 3px solid #ff9800;
}

.validation-icon {
  flex-shrink: 0;
}

.validation-text {
  color: var(--color-text);
  line-height: 1.4;
}

.error-notifications {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 100;
}

.notification {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease;
}

.notification.error {
  background: rgba(255, 68, 68, 0.9);
  color: white;
}

.notification.warning {
  background: rgba(255, 152, 0, 0.9);
  color: white;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.notification-enter-active,
.notification-leave-active {
  transition: all 0.3s ease;
}

.notification-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

.connecting-hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 1rem 2rem;
  background: var(--color-warning);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.connecting-hint p {
  color: white;
  margin: 0;
  font-weight: 500;
}

.connecting-hint button {
  padding: 0.4rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
}

.playback-overlay {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
  pointer-events: none;
}

.playback-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(107, 76, 154, 0.9);
  border-radius: 20px;
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.pulse {
  animation: pulse-animation 1.5s infinite;
  color: #ff4444;
}

@keyframes pulse-animation {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  backdrop-filter: blur(4px);
}

.modal {
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-title {
  font-size: 1.3rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.modal-subtitle {
  color: var(--color-text-dim);
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.relationship-options {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.relationship-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.relationship-option:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.relationship-option.selected {
  border-color: var(--color-accent-light);
  background: rgba(107, 76, 154, 0.3);
  box-shadow: 0 0 15px rgba(107, 76, 154, 0.3);
}

.option-icon {
  font-size: 1.2rem;
}

.option-label {
  font-size: 0.9rem;
  color: var(--color-text);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.modal-btn {
  padding: 0.6rem 1.25rem;
  font-size: 0.9rem;
}

.import-textarea {
  width: 100%;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-family: monospace;
  font-size: 0.85rem;
  resize: vertical;
}

.import-textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

@media (max-width: 1200px) {
  .graph-content {
    grid-template-columns: 1fr;
  }
  
  .graph-sidebar {
    max-height: 300px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .graph-toolbar {
    overflow-x: auto;
    flex-wrap: nowrap;
  }
  
  .relationship-options {
    grid-template-columns: 1fr;
  }
}

.node-hovered {
  box-shadow: 0 0 20px rgba(107, 76, 154, 0.6);
}

.node-preview-target {
  box-shadow: 0 0 25px rgba(76, 175, 80, 0.8);
  border-color: #4caf50 !important;
  animation: preview-pulse 1s infinite;
}

@keyframes preview-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
}

.edge-conflict {
  animation: conflict-pulse 2s infinite;
}

@keyframes conflict-pulse {
  0%, 100% { stroke-opacity: 0.8; }
  50% { stroke-opacity: 1; }
}

.edge-weak {
  filter: drop-shadow(0 0 2px rgba(158, 158, 158, 0.5));
}

.edge-strong {
  filter: drop-shadow(0 0 4px rgba(156, 39, 176, 0.4));
}

.connection-preview {
  position: fixed;
  top: 50%;
  right: 360px;
  transform: translateY(-50%);
  width: 300px;
  max-height: 70vh;
  overflow-y: auto;
  z-index: 50;
  animation: slideInFromRight 0.3s ease;
}

@keyframes slideInFromRight {
  from {
    opacity: 0;
    transform: translateY(-50%) translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateY(-50%) translateX(0);
  }
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.preview-header h4 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-accent-light);
}

.preview-strength {
  font-weight: 600;
  font-size: 0.9rem;
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-nodes {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.preview-node {
  font-weight: 500;
  color: var(--color-text);
}

.preview-arrow {
  color: var(--color-accent);
  font-size: 1.2rem;
}

.preview-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.preview-confidence {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-confidence .high {
  color: #4caf50;
  font-weight: 600;
}

.preview-confidence .low {
  color: #ff9800;
  font-weight: 600;
}

.preview-suggestions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.suggestion-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.suggestion-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.suggestion-item.high-confidence {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.preview-factors {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.factor-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.factor-list li {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
}

.factor-list li.positive {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.factor-list li.negative {
  background: rgba(255, 152, 0, 0.1);
  color: #ff9800;
}

.preview-conflicts {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 6px;
  padding: 0.5rem;
}

.conflict-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #f44336;
  font-weight: 500;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.conflict-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.conflict-list li {
  font-size: 0.75rem;
  padding: 0.35rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  line-height: 1.4;
}

.conflict-list li.high {
  border-left: 3px solid #f44336;
  color: #ff6b6b;
}

.conflict-list li.medium {
  border-left: 3px solid #ff9800;
  color: #ffb74d;
}

.conflict-list li.low {
  border-left: 3px solid #ffeb3b;
  color: #fff176;
}

.preview-warnings {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.warning-item {
  font-size: 0.8rem;
  padding: 0.5rem;
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
  border-radius: 4px;
  color: #ffb74d;
  line-height: 1.4;
}

.preview-tips {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.tip-item {
  font-size: 0.8rem;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid rgba(107, 76, 154, 0.3);
  border-radius: 4px;
  color: var(--color-text);
  line-height: 1.4;
}

.strength-factors {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.strength-factors li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  padding: 0.35rem 0.5rem;
  border-radius: 4px;
}

.strength-factors li.positive {
  background: rgba(76, 175, 80, 0.1);
}

.strength-factors li.negative {
  background: rgba(255, 152, 0, 0.1);
}

.factor-value {
  font-weight: 600;
  min-width: 40px;
}

.strength-factors li.positive .factor-value {
  color: #4caf50;
}

.strength-factors li.negative .factor-value {
  color: #ff9800;
}

.factor-desc {
  color: var(--color-text);
  flex: 1;
}

.conflict-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.conflict-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  line-height: 1.4;
}

.conflict-item.high {
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
}

.conflict-item.medium {
  background: rgba(255, 152, 0, 0.1);
  border: 1px solid rgba(255, 152, 0, 0.3);
}

.conflict-item.low {
  background: rgba(255, 235, 59, 0.1);
  border: 1px solid rgba(255, 235, 59, 0.3);
}

.conflict-icon {
  flex-shrink: 0;
  font-size: 1rem;
}

.conflict-desc {
  color: var(--color-text);
}

.feedback-message {
  margin: 0;
  padding: 0.75rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.5;
}

.improvement-tips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.improvement-tips li {
  font-size: 0.8rem;
  padding: 0.5rem;
  background: rgba(76, 175, 80, 0.1);
  border-radius: 4px;
  color: var(--color-text);
  line-height: 1.4;
  border-left: 3px solid #4caf50;
}

.modal-preview {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.preview-strength-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.preview-strength-value {
  font-weight: 600;
  font-size: 1rem;
}

.preview-conflicts-info {
  margin-top: 0.5rem;
}

.conflict-warning {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
  border-radius: 4px;
  font-size: 0.8rem;
}

.relationship-option.has-conflict {
  border-color: rgba(244, 67, 54, 0.5);
  background: rgba(244, 67, 54, 0.05);
}

.option-score {
  margin-left: auto;
  font-size: 0.8rem;
  font-weight: 600;
}

@media (max-width: 1200px) {
  .connection-preview {
    right: 1rem;
    width: 280px;
  }
}

@media (max-width: 768px) {
  .connection-preview {
    position: fixed;
    top: auto;
    bottom: 6rem;
    right: 1rem;
    left: 1rem;
    transform: none;
    width: auto;
    max-height: 50vh;
  }
}
</style>
