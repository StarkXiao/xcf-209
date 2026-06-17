<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCaseById } from '@/data/cases'
import type { Clue, ClueConnection } from '@/types'

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
</script>

<template>
  <div class="clues-page page-container">
    <div v-if="!caseData" class="loading">
      <p>加载线索数据...</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">线索拼接</h1>
          <p class="page-subtitle">将相关线索连接起来，揭示隐藏的真相</p>
        </div>
        <div class="header-actions">
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
                  'fake-clue': isFakeClue(clue.id)
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
                  'fake-clue': isFakeClue(clue.id)
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
              <h2 class="detail-title">{{ selectedClue.name }}</h2>
              <div class="detail-meta">
                <span class="meta-item">{{ selectedClue.type }}</span>
                <span 
                  class="meta-item importance"
                  :style="{ backgroundColor: getImportanceColor(selectedClue.importance) }"
                >
                  重要度: {{ selectedClue.importance }}
                </span>
              </div>
            </div>

            <div class="detail-content">
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