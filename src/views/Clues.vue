<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCaseById } from '@/data/cases'
import type { Clue, ClueConnection, ClueAnnotation, AnnotationType, DeductionHint } from '@/types'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const selectedClue = ref<Clue | null>(null)
const connectingFrom = ref<string | null>(null)
const showAnalysis = ref(false)
const analysisResult = ref('')
const analysisBonusInfo = ref<{
  bonusClues: string[]
  autoConnections: string[]
  sanitySaved: number
  extraInsight: string | null
} | null>(null)

const activeTab = ref<'details' | 'annotations' | 'confidence' | 'comparison'>('details')
const newAnnotationContent = ref('')
const newAnnotationType = ref<AnnotationType>('note')
const editingAnnotation = ref<ClueAnnotation | null>(null)
const confidenceValue = ref(50)
const confidenceReasoning = ref('')
const comparisonClue1 = ref<Clue | null>(null)
const comparisonClue2 = ref<Clue | null>(null)
const comparisonSimilarities = ref<string[]>([''])
const comparisonDifferences = ref<string[]>([''])
const comparisonConclusion = ref('')
const comparisonSupportsConnection = ref(false)
const comparisonConfidence = ref(50)
const showComparisonPanel = ref(false)
const showHints = ref(true)
const connectionSuccessRate = ref(0)

const caseData = computed(() => {
  const caseId = route.params.caseId as string
  return getCaseById(caseId)
})

const discoveredClues = computed(() => {
  if (!caseData.value) return []
  const realClues = caseData.value.clues.filter(c => 
    gameStore.gameState.discoveredClues.includes(c.id) && !gameStore.isFakeClue(c.id)
  )
  const fakeClues = gameStore.activeMisleadingClues.map(fake => ({
    id: fake.fakeClueId,
    name: fake.fakeClueName,
    description: fake.fakeClueDescription,
    type: fake.fakeClueType,
    source: '记忆碎片',
    connections: fake.fakeConnections,
    importance: 2,
    discovered: true,
    analyzed: false,
    isFake: true
  }))
  return [...realClues, ...fakeClues]
})

const isFakeClue = (clueId: string) => {
  return gameStore.isFakeClue(clueId)
}

const analyzedClues = computed(() => {
  return discoveredClues.value.filter(c => 
    gameStore.gameState.analyzedClues.includes(c.id)
  )
})

const unanalyzedClues = computed(() => {
  return discoveredClues.value.filter(c => 
    !gameStore.gameState.analyzedClues.includes(c.id)
  )
})

const connections = computed(() => {
  return gameStore.gameState.clueConnections
})

const comparisonMode = computed(() => gameStore.gameState.comparisonMode)
const comparisonSelectedClues = computed(() => gameStore.gameState.comparisonSelectedClues)

const currentClueAnnotations = computed(() => {
  if (!selectedClue.value) return []
  return gameStore.getAnnotationsForClue(selectedClue.value.id)
})

const currentClueConfidence = computed(() => {
  if (!selectedClue.value) return null
  return gameStore.getClueConfidence(selectedClue.value.id)
})

const currentClueComparisons = computed(() => {
  if (!selectedClue.value) return []
  return gameStore.getComparisonsForClue(selectedClue.value.id)
})

const deductionHints = computed(() => {
  return gameStore.getDeductionHints(10)
})

const annotationTypeConfig: Record<AnnotationType, { label: string; icon: string; color: string }> = {
  note: { label: '笔记', icon: '📝', color: '#6b4c9a' },
  question: { label: '疑问', icon: '❓', color: '#ff9800' },
  hypothesis: { label: '假设', icon: '💡', color: '#ffd700' },
  important: { label: '重要', icon: '⭐', color: '#f44336' },
  contradiction: { label: '矛盾', icon: '⚠️', color: '#e91e63' }
}

watch(selectedClue, (newClue) => {
  if (newClue) {
    const conf = gameStore.getClueConfidence(newClue.id)
    if (conf) {
      confidenceValue.value = conf.confidence
      confidenceReasoning.value = conf.reasoning
    } else {
      confidenceValue.value = 50
      confidenceReasoning.value = ''
    }
    
    if (connectingFrom.value) {
      connectionSuccessRate.value = gameStore.getConnectionSuccessRate(
        connectingFrom.value,
        newClue.id
      )
    }
  }
})

watch([connectingFrom, selectedClue], () => {
  if (connectingFrom.value && selectedClue.value && connectingFrom.value !== selectedClue.value.id) {
    connectionSuccessRate.value = gameStore.getConnectionSuccessRate(
      connectingFrom.value,
      selectedClue.value.id
    )
  }
})

onMounted(() => {
  if (!caseData.value) {
    router.push('/cases')
  }
})

function getClueById(clueId: string): Clue | undefined {
  return caseData.value?.clues.find(c => c.id === clueId)
}

function isClueAnalyzed(clueId: string) {
  return gameStore.gameState.analyzedClues.includes(clueId)
}

function handleClueClick(clue: Clue) {
  if (comparisonMode.value) {
    handleClueForComparison(clue)
    return
  }
  
  if (connectingFrom.value) {
    if (connectingFrom.value !== clue.id) {
      completeConnection(clue.id)
    }
    selectedClue.value = clue
  } else {
    selectedClue.value = clue
  }
  showAnalysis.value = false
  analysisResult.value = ''
}

function startConnection(clueId: string) {
  if (connectingFrom.value === clueId) {
    connectingFrom.value = null
  } else {
    connectingFrom.value = clueId
  }
}

function completeConnection(targetClueId: string) {
  if (!connectingFrom.value || connectingFrom.value === targetClueId) return
  
  const exists = gameStore.gameState.clueConnections.some(
    c => (c.clue1Id === connectingFrom.value && c.clue2Id === targetClueId) ||
         (c.clue1Id === targetClueId && c.clue2Id === connectingFrom.value)
  )
  
  if (exists) {
    connectingFrom.value = null
    return
  }
  
  const connection: ClueConnection = {
    clue1Id: connectingFrom.value,
    clue2Id: targetClueId,
    relationship: '',
    confirmed: false
  }
  
  gameStore.addClueConnection(connection)
  connectingFrom.value = null
}

function connectPotential(targetClueId: string) {
  if (!selectedClue.value) return
  if (selectedClue.value.id === targetClueId) return
  
  connectingFrom.value = selectedClue.value.id
  completeConnection(targetClueId)
}

function analyzeClue(clue: Clue) {
  showAnalysis.value = true
  analysisResult.value = clue.description
  analysisBonusInfo.value = null
  
  if (!isClueAnalyzed(clue.id)) {
    const result = gameStore.analyzeClue(clue.id, clue.description)
    if (result.success) {
      analysisBonusInfo.value = {
        bonusClues: result.bonusCluesDiscovered,
        autoConnections: result.autoConnections.map(
          c => c.clue1Id === clue.id ? c.clue2Id : c.clue1Id
        ),
        sanitySaved: result.sanitySaved,
        extraInsight: result.extraInsight
      }
      
      if (result.sanitySaved > 0) {
        gameStore.modifySanity(result.sanitySaved, '高效分析节省理智')
      }
    }
  }
}

function getImportanceColor(importance: number): string {
  if (importance >= 4) return '#8b3a3a'
  if (importance >= 3) return '#8b6b3a'
  return '#3a8b5a'
}

function getConnectionsForClue(clueId: string): ClueConnection[] {
  return connections.value.filter(
    c => c.clue1Id === clueId || c.clue2Id === clueId
  )
}

function goToInvestigation() {
  router.push(`/investigation/${caseData.value?.id}`)
}

function goToDeduction() {
  router.push(`/deduction/${caseData.value?.id}`)
}

function goToGraph() {
  router.push(`/graph/${caseData.value?.id}`)
}

function disproveClue(clueId: string) {
  if (confirm('确定要证伪这条线索吗？如果这是真实的线索，证伪会消耗理智。')) {
    const success = gameStore.disproveMisleadingClue(clueId)
    if (success) {
      selectedClue.value = null
    }
  }
}

function addAnnotation() {
  if (!selectedClue.value || !newAnnotationContent.value.trim()) return
  gameStore.addClueAnnotation(selectedClue.value.id, newAnnotationContent.value, newAnnotationType.value)
  newAnnotationContent.value = ''
  newAnnotationType.value = 'note'
}

function startEditAnnotation(annotation: ClueAnnotation) {
  editingAnnotation.value = { ...annotation }
  newAnnotationContent.value = annotation.content
  newAnnotationType.value = annotation.type
}

function saveEditAnnotation() {
  if (!editingAnnotation.value || !newAnnotationContent.value.trim()) return
  gameStore.updateClueAnnotation(editingAnnotation.value.id, newAnnotationContent.value, newAnnotationType.value)
  cancelEditAnnotation()
}

function cancelEditAnnotation() {
  editingAnnotation.value = null
  newAnnotationContent.value = ''
  newAnnotationType.value = 'note'
}

function deleteAnnotation(annotationId: string) {
  if (confirm('确定要删除这条批注吗？')) {
    gameStore.deleteClueAnnotation(annotationId)
  }
}

function saveConfidence() {
  if (!selectedClue.value) return
  gameStore.setClueConfidence(selectedClue.value.id, confidenceValue.value, confidenceReasoning.value)
}

function toggleCompareMode() {
  gameStore.toggleComparisonMode()
  if (!gameStore.gameState.comparisonMode) {
    comparisonClue1.value = null
    comparisonClue2.value = null
    showComparisonPanel.value = false
  }
}

function handleClueForComparison(clue: Clue) {
  if (!comparisonMode.value) return
  const result = gameStore.toggleComparisonClue(clue.id)
  if (result.length === 1) {
    comparisonClue1.value = clue
    comparisonClue2.value = null
  } else if (result.length === 2) {
    comparisonClue2.value = clue
    openComparisonPanel()
  } else {
    comparisonClue1.value = null
    comparisonClue2.value = null
  }
}

function openComparisonPanel() {
  const clue1Id = comparisonSelectedClues.value[0]
  const clue2Id = comparisonSelectedClues.value[1]
  if (!clue1Id || !clue2Id) return
  
  comparisonClue1.value = getClueById(clue1Id) || null
  comparisonClue2.value = getClueById(clue2Id) || null
  
  const existingComparison = gameStore.getComparisonBetween(clue1Id, clue2Id)
  if (existingComparison) {
    comparisonSimilarities.value = [...existingComparison.similarities]
    comparisonDifferences.value = [...existingComparison.differences]
    comparisonConclusion.value = existingComparison.conclusion
    comparisonSupportsConnection.value = existingComparison.supportsConnection
    comparisonConfidence.value = existingComparison.connectionConfidence
  } else {
    comparisonSimilarities.value = ['']
    comparisonDifferences.value = ['']
    comparisonConclusion.value = ''
    comparisonSupportsConnection.value = false
    comparisonConfidence.value = 50
  }
  
  showComparisonPanel.value = true
}

function addSimilarity() {
  comparisonSimilarities.value.push('')
}

function removeSimilarity(index: number) {
  if (comparisonSimilarities.value.length > 1) {
    comparisonSimilarities.value.splice(index, 1)
  }
}

function addDifference() {
  comparisonDifferences.value.push('')
}

function removeDifference(index: number) {
  if (comparisonDifferences.value.length > 1) {
    comparisonDifferences.value.splice(index, 1)
  }
}

function saveComparison() {
  const clue1Id = comparisonSelectedClues.value[0]
  const clue2Id = comparisonSelectedClues.value[1]
  if (!clue1Id || !clue2Id) return
  
  const similarities = comparisonSimilarities.value.filter(s => s.trim())
  const differences = comparisonDifferences.value.filter(d => d.trim())
  
  gameStore.createClueComparison(
    clue1Id,
    clue2Id,
    similarities,
    differences,
    comparisonConclusion.value,
    comparisonSupportsConnection.value,
    comparisonConfidence.value
  )
  
  showComparisonPanel.value = false
  gameStore.toggleComparisonMode()
}

function quickCompareWith(targetClue: Clue) {
  if (!selectedClue.value || selectedClue.value.id === targetClue.id) return
  
  gameStore.toggleComparisonMode()
  gameStore.toggleComparisonClue(selectedClue.value.id)
  gameStore.toggleComparisonClue(targetClue.id)
  openComparisonPanel()
}

function dismissHint(hintId: string) {
  gameStore.dismissDeductionHint(hintId)
}

function getHintIcon(type: DeductionHint['type']): string {
  const icons: Record<string, string> = {
    suggestion: '💡',
    warning: '⚠️',
    insight: '🔍',
    contradiction: '❌'
  }
  return icons[type] || '📌'
}

function getHintColor(type: DeductionHint['type']): string {
  const colors: Record<string, string> = {
    suggestion: '#6b4c9a',
    warning: '#ff9800',
    insight: '#3a8b5a',
    contradiction: '#f44336'
  }
  return colors[type] || '#888'
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getConfidenceLevel(value: number): string {
  if (value >= 70) return 'high'
  if (value >= 40) return 'medium'
  return 'low'
}
</script>

<template>
  <div class="clues-page page-container">
    <div v-if="!caseData" class="loading">
      <p>加载线索数据...</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">线索分析</h1>
          <p class="page-subtitle">批注、比对、标记可信度，揭示隐藏的真相</p>
        </div>
        <div class="header-actions">
          <button 
            class="action-btn" 
            :class="{ active: comparisonMode }"
            @click="toggleCompareMode"
          >
            <span>⚖️</span> {{ comparisonMode ? '退出比对' : '线索比对' }}
          </button>
          <button 
            class="action-btn"
            :class="{ active: showHints }"
            @click="showHints = !showHints"
          >
            <span>💡</span> 推演提示
          </button>
          <button class="action-btn" @click="goToInvestigation">
            <span>🔍</span> 继续搜证
          </button>
          <button class="action-btn" @click="goToGraph">
            <span>🕸️</span> 关系图谱
          </button>
          <button class="action-btn primary" @click="goToDeduction">
            <span>💡</span> 真相推演
          </button>
        </div>
      </div>
      
      <transition name="fade">
        <div v-if="comparisonMode" class="comparison-mode-banner">
          <span>⚖️ 比对模式已启用</span>
          <span class="hint">选择两条线索进行比对（已选 {{ comparisonSelectedClues.length }}/2）</span>
          <button v-if="comparisonSelectedClues.length === 0" @click="toggleCompareMode" class="cancel-btn">取消</button>
        </div>
      </transition>
      
      <transition name="slide">
        <div v-if="showHints && deductionHints.length > 0" class="hints-panel">
          <div class="hints-header">
            <h4>🔍 推演提示</h4>
            <button class="close-btn" @click="showHints = false">×</button>
          </div>
          <div class="hints-list">
            <div 
              v-for="hint in deductionHints" 
              :key="hint.id"
              class="hint-item"
              :style="{ borderLeftColor: getHintColor(hint.type) }"
            >
              <span class="hint-icon">{{ getHintIcon(hint.type) }}</span>
              <span class="hint-content">{{ hint.content }}</span>
              <button class="dismiss-btn" @click="dismissHint(hint.id)">×</button>
            </div>
          </div>
        </div>
      </transition>

      <div class="clues-content">
        <div class="clues-sidebar">
          <div class="sidebar-section">
            <h3 class="section-title">待分析 ({{ unanalyzedClues.length }})</h3>
            <div class="clues-list">
              <div
                v-for="clue in unanalyzedClues"
                :key="clue.id"
                class="clue-item"
                :class="{ 
                  selected: selectedClue?.id === clue.id,
                  connecting: connectingFrom === clue.id,
                  'can-connect': connectingFrom && connectingFrom !== clue.id,
                  'fake-clue': isFakeClue(clue.id),
                  'comparison-selected': comparisonSelectedClues.includes(clue.id),
                  'comparison-selectable': comparisonMode && !comparisonSelectedClues.includes(clue.id)
                }"
                @click="handleClueClick(clue)"
              >
                <div class="clue-header">
                  <span class="clue-name">{{ clue.name }}</span>
                  <span v-if="isFakeClue(clue.id)" class="fake-badge">👻 幻觉</span>
                  <span v-else 
                    class="importance-badge"
                    :style="{ backgroundColor: getImportanceColor(clue.importance) }"
                  >
                    {{ clue.importance }}
                  </span>
                </div>
                <div class="clue-type">{{ clue.type }}</div>
              </div>
            </div>
          </div>

          <div class="sidebar-section">
            <h3 class="section-title">已分析 ({{ analyzedClues.length }})</h3>
            <div class="clues-list">
              <div
                v-for="clue in analyzedClues"
                :key="clue.id"
                class="clue-item analyzed"
                :class="{ 
                  selected: selectedClue?.id === clue.id,
                  connecting: connectingFrom === clue.id,
                  'can-connect': connectingFrom && connectingFrom !== clue.id,
                  'fake-clue': isFakeClue(clue.id),
                  'comparison-selected': comparisonSelectedClues.includes(clue.id),
                  'comparison-selectable': comparisonMode && !comparisonSelectedClues.includes(clue.id)
                }"
                @click="handleClueClick(clue)"
              >
                <div class="clue-header">
                  <span class="clue-name">{{ clue.name }}</span>
                  <span v-if="isFakeClue(clue.id)" class="fake-badge">👻 幻觉</span>
                  <span v-else class="analyzed-badge">✓</span>
                </div>
                <div class="clue-type">{{ clue.type }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="clues-main">
          <div v-if="selectedClue" class="clue-detail card">
            <div class="detail-header">
              <div class="header-top">
                <h2 class="detail-title">{{ selectedClue.name }}</h2>
                <div v-if="currentClueConfidence" class="confidence-badge" :class="getConfidenceLevel(currentClueConfidence.confidence)">
                  可信度: {{ currentClueConfidence.confidence }}%
                </div>
              </div>
              <div class="detail-meta">
                <span class="meta-item">{{ selectedClue.type }}</span>
                <span 
                  class="meta-item importance"
                  :style="{ backgroundColor: getImportanceColor(selectedClue.importance) }"
                >
                  重要度: {{ selectedClue.importance }}
                </span>
                <span v-if="currentClueAnnotations.length > 0" class="meta-item annotation-count">
                  📝 {{ currentClueAnnotations.length }} 条批注
                </span>
              </div>
            </div>

            <div class="detail-tabs">
              <button 
                v-for="tab in [{id: 'details', label: '详情', icon: '📋'}, {id: 'annotations', label: '批注', icon: '📝'}, {id: 'confidence', label: '可信度', icon: '🎯'}, {id: 'comparison', label: '比对', icon: '⚖️'}]"
                :key="tab.id"
                class="tab-btn"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id as any"
              >
                <span class="tab-icon">{{ tab.icon }}</span>
                {{ tab.label }}
                <span v-if="tab.id === 'annotations' && currentClueAnnotations.length > 0" class="tab-badge">
                  {{ currentClueAnnotations.length }}
                </span>
              </button>
            </div>

            <div class="detail-content">
              <div v-show="activeTab === 'details'">
                <div class="detail-section">
                  <h4>线索描述</h4>
                  <p>{{ selectedClue.description }}</p>
                </div>

                <div class="detail-section">
                  <h4>来源</h4>
                  <p class="source-text">{{ selectedClue.source }}</p>
                </div>

                <div v-if="selectedClue.connections.length > 0" class="detail-section">
                  <h4>潜在关联 <span class="hint">(点击快速建立关联)</span></h4>
                  <div class="potential-connections">
                    <div 
                      v-for="connId in selectedClue.connections" 
                      :key="connId"
                      class="potential-conn clickable"
                      @click="connectPotential(connId)"
                    >
                      <span class="conn-icon">🔗</span>
                      {{ getClueById(connId)?.name || connId }}
                      <button class="quick-compare-btn" @click.stop="quickCompareWith(getClueById(connId)!)" title="快速比对">
                        ⚖️
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="getConnectionsForClue(selectedClue.id).length > 0" class="detail-section">
                  <h4>已建立关联</h4>
                  <div class="established-connections">
                    <div 
                      v-for="conn in getConnectionsForClue(selectedClue.id)" 
                      :key="`${conn.clue1Id}-${conn.clue2Id}`"
                      class="established-conn"
                    >
                      <span class="conn-icon">🔗</span>
                      <span>{{ getClueById(conn.clue1Id === selectedClue.id ? conn.clue2Id : conn.clue1Id)?.name }}</span>
                      <span v-if="conn.confidence" class="conn-confidence" :class="getConfidenceLevel(conn.confidence)">
                        {{ conn.confidence }}%
                      </span>
                    </div>
                  </div>
                </div>

                <div v-if="connectingFrom && connectingFrom !== selectedClue.id" class="detail-section connection-rate-section">
                  <h4>连接成功率预测</h4>
                  <div class="connection-rate-display">
                    <div class="rate-bar">
                      <div 
                        class="rate-fill" 
                        :style="{ width: `${connectionSuccessRate}%` }"
                        :class="getConfidenceLevel(connectionSuccessRate)"
                      ></div>
                    </div>
                    <span class="rate-value">{{ connectionSuccessRate }}%</span>
                  </div>
                  <p class="rate-hint">基于批注数量、可信度标记、线索类型匹配度等因素计算</p>
                </div>
              </div>

              <div v-show="activeTab === 'annotations'" class="annotations-tab">
                <div class="annotation-form">
                  <div class="form-row">
                    <select v-model="newAnnotationType" class="type-select">
                      <option v-for="(config, type) in annotationTypeConfig" :key="type" :value="type">
                        {{ config.icon }} {{ config.label }}
                      </option>
                    </select>
                  </div>
                  <textarea 
                    v-model="newAnnotationContent"
                    class="annotation-input"
                    placeholder="写下你对这条线索的看法、疑问或假设..."
                    rows="3"
                  ></textarea>
                  <div class="form-actions">
                    <button v-if="editingAnnotation" class="cancel-btn" @click="cancelEditAnnotation">取消</button>
                    <button 
                      class="primary-btn"
                      :disabled="!newAnnotationContent.trim()"
                      @click="editingAnnotation ? saveEditAnnotation() : addAnnotation()"
                    >
                      {{ editingAnnotation ? '保存修改' : '添加批注' }}
                    </button>
                  </div>
                </div>

                <div class="annotations-list" v-if="currentClueAnnotations.length > 0">
                  <div 
                    v-for="annotation in currentClueAnnotations" 
                    :key="annotation.id"
                    class="annotation-item"
                    :style="{ borderLeftColor: annotationTypeConfig[annotation.type].color }"
                  >
                    <div class="annotation-header">
                      <span class="annotation-type" :style="{ color: annotationTypeConfig[annotation.type].color }">
                        {{ annotationTypeConfig[annotation.type].icon }} {{ annotationTypeConfig[annotation.type].label }}
                      </span>
                      <span class="annotation-date">{{ formatDate(annotation.createdAt) }}</span>
                    </div>
                    <p class="annotation-content">{{ annotation.content }}</p>
                    <div class="annotation-actions">
                      <button class="edit-btn" @click="startEditAnnotation(annotation)">编辑</button>
                      <button class="delete-btn" @click="deleteAnnotation(annotation.id)">删除</button>
                    </div>
                  </div>
                </div>
                <div v-else class="no-annotations">
                  <p>还没有批注，添加你的第一条批注吧！</p>
                </div>
              </div>

              <div v-show="activeTab === 'confidence'" class="confidence-tab">
                <div class="confidence-section">
                  <h4>可信度评估</h4>
                  <p class="section-hint">标记这条线索的可信度，这将影响连线成功率和推演提示</p>
                  
                  <div class="confidence-slider-section">
                    <div class="slider-header">
                      <span>可信度</span>
                      <span class="confidence-value" :class="getConfidenceLevel(confidenceValue)">
                        {{ confidenceValue }}%
                      </span>
                    </div>
                    <input 
                      type="range" 
                      v-model.number="confidenceValue" 
                      min="0" 
                      max="100" 
                      step="5"
                      class="confidence-slider"
                    >
                    <div class="slider-labels">
                      <span>0% 存疑</span>
                      <span>50% 中立</span>
                      <span>100% 确信</span>
                    </div>
                  </div>

                  <div class="confidence-reasoning">
                    <label>评估理由</label>
                    <textarea 
                      v-model="confidenceReasoning"
                      placeholder="为什么你给出这个可信度评分？有什么证据支持或质疑？"
                      rows="3"
                    ></textarea>
                  </div>

                  <button class="save-btn primary" @click="saveConfidence">
                    保存可信度标记
                  </button>

                  <div v-if="currentClueComparisons.length > 0" class="related-comparisons">
                    <h5>相关比对记录</h5>
                    <div 
                      v-for="comp in currentClueComparisons" 
                      :key="comp.id"
                      class="comparison-summary"
                    >
                      <div class="comparison-title">
                        ⚖️ 与 {{ getClueById(comp.clue1Id === selectedClue.id ? comp.clue2Id : comp.clue1Id)?.name }} 的比对
                      </div>
                      <div class="comparison-meta">
                        <span :class="comp.supportsConnection ? 'supports' : 'does-not-support'">
                          {{ comp.supportsConnection ? '✓ 支持关联' : '✗ 不支持关联' }}
                        </span>
                        <span>可信度: {{ comp.connectionConfidence }}%</span>
                      </div>
                      <p v-if="comp.conclusion" class="comparison-conclusion">{{ comp.conclusion }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div v-show="activeTab === 'comparison'" class="comparison-tab">
                <div class="comparison-section">
                  <h4>线索比对</h4>
                  <p class="section-hint">将这条线索与其他线索进行比对，分析异同点</p>
                  
                  <div class="comparison-targets">
                    <h5>选择比对目标</h5>
                    <div class="target-list">
                      <div 
                        v-for="clue in discoveredClues.filter(c => c.id !== selectedClue?.id)"
                        :key="clue.id"
                        class="target-item clickable"
                        @click="quickCompareWith(clue)"
                      >
                        <span class="target-name">{{ clue.name }}</span>
                        <span class="target-type">{{ clue.type }}</span>
                      </div>
                    </div>
                  </div>

                  <div v-if="currentClueComparisons.length > 0" class="existing-comparisons">
                    <h5>已有比对记录</h5>
                    <div 
                      v-for="comp in currentClueComparisons" 
                      :key="comp.id"
                      class="existing-comparison-item"
                    >
                      <div class="comp-header">
                        <span class="comp-title">
                          ⚖️ {{ getClueById(comp.clue1Id === selectedClue.id ? comp.clue2Id : comp.clue1Id)?.name }}
                        </span>
                        <span class="comp-confidence" :class="getConfidenceLevel(comp.connectionConfidence)">
                          {{ comp.connectionConfidence }}%
                        </span>
                      </div>
                      <div class="comp-result">
                        <span :class="comp.supportsConnection ? 'supports' : 'does-not-support'">
                          {{ comp.supportsConnection ? '✓ 支持关联' : '✗ 不支持关联' }}
                        </span>
                      </div>
                      <p v-if="comp.conclusion" class="comp-conclusion">{{ comp.conclusion }}</p>
                      <div class="comp-meta">
                        <span>相似点: {{ comp.similarities.length }}</span>
                        <span>差异点: {{ comp.differences.length }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="detail-actions">
              <button 
                v-if="!isClueAnalyzed(selectedClue.id) && !isFakeClue(selectedClue.id)"
                class="analyze-btn primary"
                @click="analyzeClue(selectedClue)"
              >
                🔬 分析线索
              </button>
              <button 
                v-if="isFakeClue(selectedClue.id)"
                class="disprove-btn warning"
                @click="disproveClue(selectedClue.id)"
              >
                🚫 证伪线索
              </button>
              <button 
                v-if="!isFakeClue(selectedClue.id)"
                class="connect-btn"
                :class="{ active: connectingFrom === selectedClue.id }"
                @click="startConnection(selectedClue.id)"
              >
                {{ connectingFrom === selectedClue.id ? '取消连接' : '🔗 建立关联' }}
              </button>
            </div>
          </div>

          <div v-else class="no-selection card">
            <div class="no-selection-icon">🧩</div>
            <p>从左侧选择一个线索开始分析</p>
            <p class="hint">点击"建立关联"可以将相关线索连接起来</p>
          </div>

          <transition name="fade">
            <div v-if="showAnalysis" class="analysis-panel card">
              <h3>分析结果</h3>
              <p class="analysis-text">{{ analysisResult }}</p>
              
              <div v-if="analysisBonusInfo" class="analysis-bonuses">
                <div v-if="analysisBonusInfo.extraInsight" class="bonus-item insight">
                  <span class="bonus-icon">💡</span>
                  <span class="bonus-text">{{ analysisBonusInfo.extraInsight }}</span>
                </div>
                
                <div v-if="analysisBonusInfo.sanitySaved > 0" class="bonus-item sanity">
                  <span class="bonus-icon">🧠</span>
                  <span class="bonus-text">高效分析节省了 {{ analysisBonusInfo.sanitySaved }} 点理智</span>
                </div>
                
                <div v-if="analysisBonusInfo.bonusClues.length > 0" class="bonus-item clue">
                  <span class="bonus-icon">🔍</span>
                  <span class="bonus-text">
                    额外发现线索：
                    <span v-for="(clueId, idx) in analysisBonusInfo.bonusClues" :key="clueId">
                      {{ getClueById(clueId)?.name || clueId }}
                      <span v-if="idx < analysisBonusInfo.bonusClues.length - 1">、</span>
                    </span>
                  </span>
                </div>
                
                <div v-if="analysisBonusInfo.autoConnections.length > 0" class="bonus-item connection">
                  <span class="bonus-icon">🔗</span>
                  <span class="bonus-text">
                    自动建立关联：
                    <span v-for="(connId, idx) in analysisBonusInfo.autoConnections" :key="connId">
                      {{ getClueById(connId)?.name || connId }}
                      <span v-if="idx < analysisBonusInfo.autoConnections.length - 1">、</span>
                    </span>
                  </span>
                </div>
              </div>
              
              <button class="close-analysis" @click="showAnalysis = false">关闭</button>
            </div>
          </transition>
        </div>

        <div class="connections-panel">
          <h3 class="panel-title">关联图谱</h3>
          <div class="connections-list">
            <div v-if="connections.length === 0" class="no-connections">
              <p>尚未建立任何关联</p>
              <p class="hint">选择线索后点击"建立关联"</p>
            </div>
            <div 
              v-for="conn in connections" 
              :key="`${conn.clue1Id}-${conn.clue2Id}`"
              class="connection-item"
            >
              <span class="conn-node">{{ getClueById(conn.clue1Id)?.name }}</span>
              <span class="conn-link">↔</span>
              <span class="conn-node">{{ getClueById(conn.clue2Id)?.name }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-if="connectingFrom" class="connecting-hint">
        <p>点击另一个线索完成连接</p>
        <button @click="connectingFrom = null">取消</button>
      </div>

      <transition name="fade">
        <div v-if="showComparisonPanel" class="comparison-modal-overlay" @click.self="showComparisonPanel = false">
          <div class="comparison-modal">
            <div class="modal-header">
              <h3>⚖️ 线索比对</h3>
              <button class="close-btn" @click="showComparisonPanel = false">×</button>
            </div>
            
            <div class="comparison-content">
              <div class="comparison-clues">
                <div class="comparison-clue">
                  <h4>{{ comparisonClue1?.name }}</h4>
                  <p class="clue-type">{{ comparisonClue1?.type }}</p>
                  <p class="clue-desc">{{ comparisonClue1?.description }}</p>
                </div>
                <div class="vs-divider">VS</div>
                <div class="comparison-clue">
                  <h4>{{ comparisonClue2?.name }}</h4>
                  <p class="clue-type">{{ comparisonClue2?.type }}</p>
                  <p class="clue-desc">{{ comparisonClue2?.description }}</p>
                </div>
              </div>

              <div class="comparison-sections">
                <div class="comparison-section">
                  <h4>✨ 相似点</h4>
                  <div class="comparison-items">
                    <div 
                      v-for="(_, index) in comparisonSimilarities" 
                      :key="`sim-${index}`"
                      class="comparison-item-row"
                    >
                      <input 
                        v-model="comparisonSimilarities[index]"
                        type="text"
                        class="comparison-input"
                        placeholder="输入相似点..."
                      >
                      <button 
                        v-if="comparisonSimilarities.length > 1"
                        class="remove-btn"
                        @click="removeSimilarity(index)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <button class="add-btn" @click="addSimilarity">+ 添加相似点</button>
                </div>

                <div class="comparison-section">
                  <h4>🔄 差异点</h4>
                  <div class="comparison-items">
                    <div 
                      v-for="(_, index) in comparisonDifferences" 
                      :key="`diff-${index}`"
                      class="comparison-item-row"
                    >
                      <input 
                        v-model="comparisonDifferences[index]"
                        type="text"
                        class="comparison-input"
                        placeholder="输入差异点..."
                      >
                      <button 
                        v-if="comparisonDifferences.length > 1"
                        class="remove-btn"
                        @click="removeDifference(index)"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <button class="add-btn" @click="addDifference">+ 添加差异点</button>
                </div>
              </div>

              <div class="comparison-conclusion-section">
                <h4>📝 比对结论</h4>
                <textarea 
                  v-model="comparisonConclusion"
                  class="conclusion-input"
                  placeholder="总结比对结论..."
                  rows="2"
                ></textarea>
              </div>

              <div class="comparison-connection-section">
                <label class="support-checkbox">
                  <input 
                    type="checkbox"
                    v-model="comparisonSupportsConnection"
                  >
                  <span>此比对支持两条线索之间存在关联</span>
                </label>
                
                <div class="connection-confidence-section">
                  <div class="confidence-label">
                    <span>关联可信度</span>
                    <span class="confidence-value" :class="getConfidenceLevel(comparisonConfidence)">
                      {{ comparisonConfidence }}%
                    </span>
                  </div>
                  <input 
                    type="range"
                    v-model.number="comparisonConfidence"
                    min="0"
                    max="100"
                    step="5"
                    class="confidence-slider"
                  >
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button class="cancel-btn" @click="showComparisonPanel = false">取消</button>
              <button class="save-btn primary" @click="saveComparison">保存比对</button>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<style scoped>
.clues-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
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
  margin-bottom: 1.5rem;
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

.clues-content {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 250px;
  gap: 1.5rem;
  min-height: 0;
}

.clues-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow-y: auto;
}

.sidebar-section {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
}

.section-title {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.clues-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.clue-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.clue-item:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.clue-item.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.clue-item.connecting {
  border-color: var(--color-warning);
  box-shadow: 0 0 10px rgba(139, 107, 58, 0.3);
}

.clue-item.can-connect {
  border-color: var(--color-success);
  animation: pulse-border 1.5s infinite;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 5px rgba(58, 139, 90, 0.3); }
  50% { box-shadow: 0 0 15px rgba(58, 139, 90, 0.6); }
}

.clue-item.analyzed {
  opacity: 0.8;
}

.clue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.clue-name {
  font-size: 0.95rem;
  color: var(--color-text);
}

.importance-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  color: white;
}

.analyzed-badge {
  color: var(--color-success);
}

.clue-type {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  text-transform: capitalize;
}

.clues-main {
  display: flex;
  flex-direction: column;
  position: relative;
}

.clue-detail {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.detail-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.detail-title {
  font-size: 1.5rem;
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
}

.detail-meta {
  display: flex;
  gap: 0.75rem;
}

.meta-item {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 12px;
  color: var(--color-text-dim);
}

.meta-item.importance {
  color: white;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h4 {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-section h4 .hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-weight: normal;
}

.detail-section p {
  color: var(--color-text-dim);
  line-height: 1.6;
}

.source-text {
  font-style: italic;
  color: var(--color-accent-light) !important;
}

.potential-connections,
.established-connections {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.potential-conn {
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px dashed var(--color-accent);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--color-text-dim);
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.potential-conn.clickable {
  cursor: pointer;
  transition: all 0.3s ease;
}

.potential-conn.clickable:hover {
  background: rgba(107, 76, 154, 0.4);
  border-color: var(--color-accent-light);
  color: var(--color-text);
  transform: translateY(-1px);
}

.established-conn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-size: 0.85rem;
  color: var(--color-text);
}

.conn-icon {
  font-size: 0.9rem;
}

.detail-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.analyze-btn,
.connect-btn {
  flex: 1;
  padding: 0.75rem;
}

.connect-btn.active {
  background: var(--color-warning);
  border-color: var(--color-warning);
}

.no-selection {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.no-selection-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-selection p {
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.no-selection .hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.analysis-panel {
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  background: rgba(21, 21, 31, 0.95);
  border-color: var(--color-accent);
  z-index: 10;
}

.analysis-panel h3 {
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
}

.analysis-text {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.close-analysis {
  padding: 0.5rem 1rem;
  background: var(--color-accent);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
}

.analysis-bonuses {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.bonus-item {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(107, 76, 154, 0.15);
  border-radius: 6px;
  animation: bonusAppear 0.5s ease-out;
}

@keyframes bonusAppear {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.bonus-item.insight {
  background: rgba(255, 215, 0, 0.15);
  border-left: 3px solid #ffd700;
}

.bonus-item.sanity {
  background: rgba(58, 139, 90, 0.15);
  border-left: 3px solid var(--color-success);
}

.bonus-item.clue {
  background: rgba(107, 76, 154, 0.2);
  border-left: 3px solid var(--color-accent);
}

.bonus-item.connection {
  background: rgba(139, 107, 58, 0.15);
  border-left: 3px solid var(--color-warning);
}

.bonus-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.bonus-text {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.4;
}

.connections-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.connections-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.no-connections {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
}

.no-connections .hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 0.85rem;
}

.conn-node {
  flex: 1;
  color: var(--color-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conn-link {
  color: var(--color-accent);
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
}

.connecting-hint button {
  padding: 0.25rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 0.85rem;
}

.clue-item.fake-clue {
  border-style: dashed;
  border-color: #9c27b0;
  background: rgba(156, 39, 176, 0.1);
  animation: fakeCluePulse 3s ease-in-out infinite;
}

@keyframes fakeCluePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.fake-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: linear-gradient(135deg, #9c27b0, #673ab7);
  border-radius: 10px;
  color: white;
  font-weight: bold;
}

.disprove-btn {
  flex: 1;
  padding: 0.75rem;
  background: var(--color-warning);
  border: 1px solid var(--color-warning);
  border-radius: 6px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.disprove-btn:hover {
  background: #e65100;
  border-color: #e65100;
}

.disprove-btn.warning {
  background: linear-gradient(135deg, #ff5722, #e64a19);
}

.clue-detail .fake-clue-warning {
  padding: 0.75rem;
  background: rgba(156, 39, 176, 0.15);
  border: 1px dashed #9c27b0;
  border-radius: 6px;
  margin-bottom: 1rem;
  color: #ce93d8;
  font-size: 0.9rem;
  font-style: italic;
}

.comparison-mode-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
  background: linear-gradient(135deg, rgba(107, 76, 154, 0.3), rgba(58, 139, 90, 0.3));
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  margin-bottom: 1rem;
  font-weight: 500;
}

.comparison-mode-banner .hint {
  flex: 1;
  color: var(--color-text-dim);
  font-size: 0.9rem;
  font-weight: normal;
}

.comparison-mode-banner .cancel-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.hints-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin-bottom: 1rem;
  overflow: hidden;
}

.hints-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(58, 139, 90, 0.1);
  border-bottom: 1px solid var(--color-border);
}

.hints-header h4 {
  margin: 0;
  color: var(--color-text);
  font-size: 0.95rem;
}

.hints-header .close-btn {
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.hints-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

.hint-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid var(--color-accent);
  border-radius: 4px;
}

.hint-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.hint-content {
  flex: 1;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.4;
}

.dismiss-btn {
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.dismiss-btn:hover {
  color: var(--color-text);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.confidence-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: white;
}

.confidence-badge.high {
  background: linear-gradient(135deg, #3a8b5a, #4caf50);
}

.confidence-badge.medium {
  background: linear-gradient(135deg, #ff9800, #ffb74d);
}

.confidence-badge.low {
  background: linear-gradient(135deg, #f44336, #e57373);
}

.annotation-count {
  background: rgba(107, 76, 154, 0.3) !important;
  color: var(--color-accent-light) !important;
}

.detail-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid var(--color-border);
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  color: var(--color-text-dim);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn:hover {
  color: var(--color-text);
  background: rgba(255, 255, 255, 0.05);
}

.tab-btn.active {
  color: var(--color-accent-light);
  border-bottom-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.tab-icon {
  font-size: 1rem;
}

.tab-badge {
  background: var(--color-accent);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.quick-compare-btn {
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  padding: 0.1rem 0.4rem;
  font-size: 0.7rem;
  cursor: pointer;
  margin-left: 0.5rem;
  transition: all 0.2s ease;
}

.quick-compare-btn:hover {
  background: var(--color-accent);
  color: white;
}

.conn-confidence {
  padding: 0.1rem 0.4rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.conn-confidence.high {
  background: #3a8b5a;
}

.conn-confidence.medium {
  background: #ff9800;
}

.conn-confidence.low {
  background: #f44336;
}

.connection-rate-section {
  padding: 1rem;
  background: rgba(58, 139, 90, 0.1);
  border: 1px solid rgba(58, 139, 90, 0.3);
  border-radius: 8px;
}

.connection-rate-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.75rem 0;
}

.rate-bar {
  flex: 1;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
}

.rate-fill {
  height: 100%;
  border-radius: 6px;
  transition: width 0.5s ease;
}

.rate-fill.high {
  background: linear-gradient(90deg, #3a8b5a, #4caf50);
}

.rate-fill.medium {
  background: linear-gradient(90deg, #ff9800, #ffb74d);
}

.rate-fill.low {
  background: linear-gradient(90deg, #f44336, #e57373);
}

.rate-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  min-width: 60px;
  text-align: right;
}

.rate-hint {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin: 0;
}

.annotation-form {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.form-row {
  margin-bottom: 0.75rem;
}

.type-select {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
}

.annotation-input {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 0.75rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.primary-btn {
  padding: 0.5rem 1.25rem;
  background: var(--color-accent);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  color: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn:hover:not(:disabled) {
  background: var(--color-accent-light);
}

.primary-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 0.5rem 1.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.5);
}

.annotations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.annotation-item {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-left: 3px solid var(--color-accent);
  border-radius: 0 6px 6px 0;
}

.annotation-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.annotation-type {
  font-weight: 600;
  font-size: 0.85rem;
}

.annotation-date {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.annotation-content {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 0.75rem;
}

.annotation-actions {
  display: flex;
  gap: 0.5rem;
}

.edit-btn,
.delete-btn {
  padding: 0.25rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text-dim);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: rgba(58, 139, 90, 0.3);
  color: var(--color-success);
  border-color: var(--color-success);
}

.delete-btn:hover {
  background: rgba(244, 67, 54, 0.3);
  color: #f44336;
  border-color: #f44336;
}

.no-annotations {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-dim);
}

.confidence-section,
.comparison-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.section-hint {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin: -0.5rem 0 0 0;
}

.confidence-slider-section {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.slider-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.confidence-value {
  font-size: 1.5rem;
  font-weight: 700;
}

.confidence-value.high {
  color: #4caf50;
}

.confidence-value.medium {
  color: #ffb74d;
}

.confidence-value.low {
  color: #e57373;
}

.confidence-slider {
  width: 100%;
  height: 6px;
  margin-bottom: 0.5rem;
  -webkit-appearance: none;
  appearance: none;
  background: var(--color-bg-input);
  border-radius: 3px;
  outline: none;
}

.confidence-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
}

.confidence-slider::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--color-accent);
  cursor: pointer;
  border: none;
}

.slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.confidence-reasoning {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.confidence-reasoning label {
  font-size: 0.9rem;
  color: var(--color-text);
}

.confidence-reasoning textarea {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.save-btn {
  padding: 0.75rem;
  font-size: 0.95rem;
}

.related-comparisons,
.existing-comparisons,
.comparison-targets {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.related-comparisons h5,
.existing-comparisons h5,
.comparison-targets h5 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.comparison-summary,
.existing-comparison-item {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 0.75rem;
}

.comparison-title,
.comp-title {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.comparison-meta,
.comp-result,
.comp-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
}

.comparison-meta .supports,
.comp-result .supports {
  color: var(--color-success);
}

.comparison-meta .does-not-support,
.comp-result .does-not-support {
  color: #f44336;
}

.comparison-conclusion,
.comp-conclusion {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin: 0.5rem 0 0 0;
  line-height: 1.5;
}

.comp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.comp-confidence {
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.comp-confidence.high {
  background: #3a8b5a;
}

.comp-confidence.medium {
  background: #ff9800;
}

.comp-confidence.low {
  background: #f44336;
}

.target-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.target-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.target-item:hover {
  background: rgba(107, 76, 154, 0.2);
}

.target-name {
  color: var(--color-text);
  font-size: 0.9rem;
}

.target-type {
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.clue-item.comparison-selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.3);
  box-shadow: 0 0 10px rgba(107, 76, 154, 0.5);
}

.clue-item.comparison-selectable {
  cursor: crosshair;
}

.clue-item.comparison-selectable:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.15);
}

.action-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.comparison-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.comparison-modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  width: 100%;
  max-width: 800px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-text);
  font-size: 1.25rem;
}

.modal-header .close-btn {
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.8rem;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.comparison-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.comparison-clues {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  gap: 1rem;
  align-items: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.comparison-clue {
  text-align: center;
}

.comparison-clue h4 {
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
}

.comparison-clue .clue-type {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.comparison-clue .clue-desc {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.vs-divider {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-accent);
  text-align: center;
}

.comparison-sections {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.comparison-section h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.comparison-items {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.comparison-item-row {
  display: flex;
  gap: 0.5rem;
}

.comparison-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
}

.remove-btn {
  width: 32px;
  height: 32px;
  background: rgba(244, 67, 54, 0.2);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 4px;
  color: #f44336;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.remove-btn:hover {
  background: rgba(244, 67, 54, 0.4);
}

.add-btn {
  padding: 0.5rem 1rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid rgba(58, 139, 90, 0.3);
  border-radius: 6px;
  color: var(--color-success);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-btn:hover {
  background: rgba(58, 139, 90, 0.4);
}

.comparison-conclusion-section {
  margin-bottom: 1.5rem;
}

.comparison-conclusion-section h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.conclusion-input {
  width: 100%;
  padding: 0.75rem;
  background: var(--color-bg-input);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  font-family: inherit;
  resize: vertical;
}

.comparison-connection-section {
  padding: 1rem;
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid rgba(107, 76, 154, 0.3);
  border-radius: 8px;
}

.support-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 1rem;
}

.support-checkbox input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.support-checkbox span {
  color: var(--color-text);
  font-size: 0.9rem;
}

.connection-confidence-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.confidence-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.confidence-label span:first-child {
  color: var(--color-text);
  font-size: 0.9rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

@media (max-width: 1024px) {
  .clues-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
  }
}
</style>