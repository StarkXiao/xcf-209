<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Document } from '@/types'
import DocumentDetail from './DocumentDetail.vue'

const gameStore = useGameStore()

const selectedDocId = ref<string | null>(null)
const showDetail = ref(false)

const documents = computed(() => {
  return gameStore.availableDocuments
})

const selectedDocument = computed(() => {
  if (!selectedDocId.value) return null
  return gameStore.getDocumentById(selectedDocId.value)
})

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    report: '📊',
    newspaper: '📰',
    diary: '📔',
    letter: '✉️',
    official: '📋',
    research: '🔬'
  }
  return icons[type] || '📄'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    report: '调查报告',
    newspaper: '报纸剪报',
    diary: '日记',
    letter: '信件',
    official: '官方文件',
    research: '研究资料'
  }
  return labels[type] || '文档'
}

function selectDocument(doc: Document) {
  if (!gameStore.canReadDocument(doc.id)) {
    return
  }
  selectedDocId.value = doc.id
  showDetail.value = true
  
  if (!doc.isRead) {
    gameStore.readDocument(doc.id)
  }
}

function closeDetail() {
  showDetail.value = false
  selectedDocId.value = null
}

function getClassificationColor(level: number): string {
  const colors: Record<number, string> = {
    1: '#4caf50',
    2: '#ffc107',
    3: '#ff9800',
    4: '#f44336',
    5: '#9c27b0'
  }
  return colors[level] || '#607d8b'
}

function getClassificationLabel(level: number): string {
  const labels: Record<number, string> = {
    1: '公开',
    2: '内部',
    3: '机密',
    4: '绝密',
    5: '深渊级'
  }
  return labels[level] || '未知'
}

function getMissingRequirements(doc: Document): string[] {
  const missing: string[] = []
  
  if (doc.requiredEvidenceToRead) {
    const caseData = gameStore.currentCase
    doc.requiredEvidenceToRead.forEach(eid => {
      if (!gameStore.gameState.discoveredEvidence.includes(eid)) {
        const evidence = caseData?.scenes
          .flatMap(s => s.evidence)
          .find(e => e.id === eid)
        missing.push(`需要证据：${evidence?.name || eid}`)
      }
    })
  }
  
  if (doc.requiredCluesToRead) {
    const caseData = gameStore.currentCase
    doc.requiredCluesToRead.forEach(cid => {
      if (!gameStore.gameState.discoveredClues.includes(cid)) {
        const clue = caseData?.clues.find(c => c.id === cid)
        missing.push(`需要线索：${clue?.name || cid}`)
      }
    })
  }
  
  return missing
}
</script>

<template>
  <div class="document-list">
    <div class="list-header">
      <h2 class="list-title">
        <span class="title-icon">📚</span>
        案件文书
        <span v-if="documents.filter(d => !d.isRead).length > 0" class="unread-badge">
          {{ documents.filter(d => !d.isRead).length }}
        </span>
      </h2>
    </div>

    <div class="documents-grid">
      <div v-if="documents.length === 0" class="empty-docs">
        <div class="empty-icon">📭</div>
        <p class="empty-text">暂无文书</p>
        <p class="empty-hint">继续调查以获取更多资料</p>
      </div>

      <div
        v-for="doc in documents"
        :key="doc.id"
        class="document-card"
        :class="{
          unread: !doc.isRead,
          classified: doc.isClassified,
          locked: !gameStore.canReadDocument(doc.id),
          selected: selectedDocId === doc.id
        }"
        @click="selectDocument(doc)"
      >
        <div class="card-header">
          <span class="type-icon">{{ getTypeIcon(doc.type) }}</span>
          <div class="type-info">
            <span class="type-label">{{ getTypeLabel(doc.type) }}</span>
            <span v-if="doc.isClassified" class="classification-badge" :style="{ backgroundColor: getClassificationColor(doc.classificationLevel || 1) + '33', color: getClassificationColor(doc.classificationLevel || 1) }">
              {{ getClassificationLabel(doc.classificationLevel || 1) }}
            </span>
          </div>
        </div>

        <h3 class="doc-title">{{ doc.title }}</h3>
        
        <div class="doc-meta">
          <span class="doc-author">{{ doc.author }}</span>
          <span class="doc-date">{{ doc.date }}</span>
        </div>

        <div class="doc-preview">
          {{ doc.pages[0]?.content.substring(0, 80) || '暂无内容' }}...
        </div>

        <div v-if="!gameStore.canReadDocument(doc.id)" class="locked-overlay">
          <div class="lock-icon">🔒</div>
          <div class="lock-reasons">
            <p v-for="reason in getMissingRequirements(doc)" :key="reason" class="lock-reason">
              {{ reason }}
            </p>
          </div>
        </div>

        <div class="card-footer">
          <div class="page-count">
            📄 {{ doc.pages.filter(p => p.isUnlocked).length }} / {{ doc.pages.length }} 页
          </div>
          <div class="intel-value">
            💡 +{{ doc.intelligenceValue }}
          </div>
        </div>
      </div>
    </div>

    <div v-if="gameStore.currentPhase" class="phase-progress-card">
      <div class="progress-header">
        <h3 class="progress-title">📊 推演信息完整度</h3>
        <span class="progress-percentage">{{ gameStore.deductionInfoCompleteness }}%</span>
      </div>
      <div class="progress-bar-large">
        <div
          class="progress-fill"
          :style="{ width: `${gameStore.deductionInfoCompleteness}%` }"
        ></div>
      </div>
      <div class="progress-breakdown">
        <div class="breakdown-item">
          <span class="breakdown-label">证据收集</span>
          <span class="breakdown-desc">发现所有物理证据</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">线索分析</span>
          <span class="breakdown-desc">分析所有相关线索</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">邮件阅读</span>
          <span class="breakdown-desc">阅读所有案件邮件</span>
        </div>
        <div class="breakdown-item">
          <span class="breakdown-label">文书研究</span>
          <span class="breakdown-desc">研究所有相关文书</span>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <DocumentDetail
        v-if="showDetail && selectedDocument"
        :document="selectedDocument"
        @close="closeDetail"
      />
    </Transition>
  </div>
</template>

<style scoped>
.document-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.list-header {
  padding: 1rem 1.5rem;
  background: rgba(107, 76, 154, 0.2);
  border-bottom: 1px solid var(--color-border);
}

.list-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  color: var(--color-accent-light);
  margin: 0;
}

.title-icon {
  font-size: 1.5rem;
}

.unread-badge {
  background: var(--color-danger);
  color: white;
  padding: 0.125rem 0.5rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.documents-grid {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.empty-docs {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  color: var(--color-text-dim);
  font-size: 1.1rem;
  margin: 0 0 0.5rem 0;
}

.empty-hint {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin: 0;
  opacity: 0.7;
}

.document-card {
  position: relative;
  background: rgba(30, 30, 45, 0.8);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.document-card:hover:not(.locked) {
  transform: translateY(-3px);
  border-color: var(--color-accent);
  box-shadow: 0 5px 20px rgba(107, 76, 154, 0.3);
}

.document-card.unread {
  border-left: 3px solid var(--color-accent);
}

.document-card.classified {
  border-top: 2px solid #f44336;
}

.document-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.document-card.selected {
  border-color: var(--color-accent-light);
  box-shadow: 0 0 15px rgba(107, 76, 154, 0.4);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.type-icon {
  font-size: 1.75rem;
}

.type-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.type-label {
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.classification-badge {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  width: fit-content;
}

.doc-title {
  color: var(--color-text);
  font-size: 1.05rem;
  margin: 0 0 0.5rem 0;
  line-height: 1.4;
}

.doc-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.doc-preview {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  line-height: 1.5;
  flex: 1;
  margin-bottom: 1rem;
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  backdrop-filter: blur(2px);
  padding: 1rem;
  text-align: center;
}

.lock-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.lock-reasons {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lock-reason {
  color: var(--color-danger);
  font-size: 0.8rem;
  margin: 0;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.8rem;
}

.page-count {
  color: var(--color-text-dim);
}

.intel-value {
  color: var(--color-accent-light);
  font-weight: bold;
}

.phase-progress-card {
  margin: 1.5rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.progress-title {
  color: var(--color-accent-light);
  font-size: 1rem;
  margin: 0;
}

.progress-percentage {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.progress-bar-large {
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.progress-bar-large .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  transition: width 0.5s ease;
}

.progress-breakdown {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.breakdown-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 4px;
}

.breakdown-label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
}

.breakdown-desc {
  color: var(--color-text-dim);
  font-size: 0.75rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
  transform: scale(0.95);
}

@media (max-width: 768px) {
  .documents-grid {
    grid-template-columns: 1fr;
    padding: 1rem;
    gap: 1rem;
  }

  .progress-breakdown {
    grid-template-columns: 1fr;
  }
}
</style>
