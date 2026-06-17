<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Document, DocumentPage } from '@/types'

const props = defineProps<{
  document: Document
}>()

const emit = defineEmits<{
  close: []
}>()

const gameStore = useGameStore()
const currentPageIndex = ref(0)

const unlockedPages = computed(() => {
  return props.document.pages.filter(p => p.isUnlocked)
})

const currentPage = computed(() => {
  return unlockedPages.value[currentPageIndex.value]
})

const totalPages = computed(() => {
  return unlockedPages.value.length
})

const canGoNext = computed(() => {
  return currentPageIndex.value < totalPages.value - 1
})

const canGoPrev = computed(() => {
  return currentPageIndex.value > 0
})

const lockedPagesCount = computed(() => {
  return props.document.pages.filter(p => !p.isUnlocked).length
})

function nextPage() {
  if (canGoNext.value) {
    currentPageIndex.value++
  }
}

function prevPage() {
  if (canGoPrev.value) {
    currentPageIndex.value--
  }
}

function goToPage(index: number) {
  if (index >= 0 && index < totalPages.value) {
    currentPageIndex.value = index
  }
}

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

function getPageUnlockRequirements(page: DocumentPage): string[] {
  const missing: string[] = []
  
  if (page.requiredEvidence) {
    const caseData = gameStore.currentCase
    page.requiredEvidence.forEach(eid => {
      if (!gameStore.gameState.discoveredEvidence.includes(eid)) {
        const evidence = caseData?.scenes
          .flatMap(s => s.evidence)
          .find(e => e.id === eid)
        missing.push(`需要证据：${evidence?.name || eid}`)
      }
    })
  }
  
  if (page.requiredClues) {
    const caseData = gameStore.currentCase
    page.requiredClues.forEach(cid => {
      if (!gameStore.gameState.discoveredClues.includes(cid)) {
        const clue = caseData?.clues.find(c => c.id === cid)
        missing.push(`需要线索：${clue?.name || cid}`)
      }
    })
  }
  
  if (page.requiredIntelligence) {
    if (gameStore.gameState.intelligenceState.totalIntelligence < page.requiredIntelligence) {
      missing.push(`需要情报值：${page.requiredIntelligence}`)
    }
  }
  
  return missing
}

const formattedDate = computed(() => {
  return props.document.date
})

const contentLines = computed(() => {
  return currentPage.value?.content?.split('\n').filter(line => line.trim()) || []
})
</script>

<template>
  <div class="document-detail-overlay" @click.self="emit('close')">
    <div class="document-detail">
      <div class="detail-header">
        <button class="close-btn" @click="emit('close')">✕</button>
      </div>

      <div class="detail-content">
        <div class="document-header">
          <div class="type-row">
            <span class="type-icon">{{ getTypeIcon(document.type) }}</span>
            <span class="type-label">{{ document.type }}</span>
            <span v-if="document.isClassified" class="classified-tag">
              ⚠️ 机密
            </span>
          </div>

          <h1 class="document-title">{{ document.title }}</h1>
          
          <div class="document-meta">
            <div class="author-info">
              <span class="author-label">作者</span>
              <span class="author-name">{{ document.author }}</span>
            </div>
            <div class="date-info">
              <span class="date-label">日期</span>
              <span class="date-value">{{ formattedDate }}</span>
            </div>
            <div class="source-info" v-if="document.source">
              <span class="source-label">来源</span>
              <span class="source-value">{{ document.source }}</span>
            </div>
          </div>

          <div v-if="document.keywords && document.keywords.length > 0" class="keywords-section">
            <span class="keywords-label">关键词</span>
            <div class="keywords-list">
              <span v-for="keyword in document.keywords" :key="keyword" class="keyword-tag">
                {{ keyword }}
              </span>
            </div>
          </div>
        </div>

        <div class="document-body">
          <div class="page-content">
            <h2 v-if="currentPage?.title" class="page-title">{{ currentPage.title }}</h2>
            
            <div class="page-text">
              <p v-for="(line, index) in contentLines" :key="index" class="body-paragraph">
                {{ line }}
              </p>
            </div>

            <div v-if="currentPage?.notes && currentPage.notes.length > 0" class="notes-section">
              <h4 class="notes-title">📝 笔记</h4>
              <ul class="notes-list">
                <li v-for="(note, index) in currentPage.notes" :key="index" class="note-item">
                  {{ note }}
                </li>
              </ul>
            </div>

            <div v-if="currentPage?.clueReferences && currentPage.clueReferences.length > 0" class="clue-refs">
              <h4 class="refs-title">🔗 相关线索</h4>
              <ul class="refs-list">
                <li v-for="clueId in currentPage.clueReferences" :key="clueId" class="ref-item">
                  {{ gameStore.getClueById(clueId)?.name || clueId }}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div v-if="lockedPagesCount > 0" class="locked-pages-info">
          <div class="locked-icon">🔒</div>
          <div class="locked-text">
            <span class="locked-count">还有 {{ lockedPagesCount }} 页未解锁</span>
            <span class="locked-hint">继续调查以获取更多内容</span>
          </div>
        </div>

        <div v-if="document.pages.some(p => !p.isUnlocked)" class="unlock-hints">
          <h4 class="hints-title">💡 解锁提示</h4>
          <div class="hints-grid">
            <div
              v-for="page in document.pages.filter(p => !p.isUnlocked)"
              :key="page.id"
              class="hint-card"
            >
              <div class="hint-header">
                <span class="page-number">第 {{ document.pages.indexOf(page) + 1 }} 页</span>
                <span v-if="page.title" class="page-title-hint">{{ page.title }}</span>
              </div>
              <ul class="hint-requirements">
                <li v-for="req in getPageUnlockRequirements(page)" :key="req" class="req-item">
                  {{ req }}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div class="detail-footer">
        <div class="page-nav">
          <button
            class="nav-btn prev-btn"
            :disabled="!canGoPrev"
            @click="prevPage"
          >
            ← 上一页
          </button>
          
          <div class="page-indicators">
            <button
              v-for="(page, index) in unlockedPages"
              :key="page.id"
              class="page-dot"
              :class="{ active: currentPageIndex === index }"
              @click="goToPage(index)"
              :title="page.title || `第 ${index + 1} 页`"
            >
              {{ index + 1 }}
            </button>
          </div>
          
          <button
            class="nav-btn next-btn"
            :disabled="!canGoNext"
            @click="nextPage"
          >
            下一页 →
          </button>
        </div>
        
        <div class="page-info">
          第 {{ currentPageIndex + 1 }} / {{ totalPages }} 页
          <span v-if="document.pages.length > unlockedPages.length" class="locked-notice">
            (共 {{ document.pages.length }} 页)
          </span>
        </div>

        <div v-if="document.relatedCases && document.relatedCases.length > 0" class="related-cases">
          <span class="related-label">相关案件</span>
          <span class="related-value">{{ document.relatedCases.join(', ') }}</span>
        </div>

        <div v-if="document.sanityEffect && document.sanityEffect !== 0" class="sanity-effect" :class="document.sanityEffect > 0 ? 'positive' : 'negative'">
          <span class="sanity-icon">🧠</span>
          <span class="sanity-text">
            {{ document.sanityEffect > 0 ? '+' : '' }}{{ document.sanityEffect }} 理智
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.document-detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(5px);
}

.document-detail {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid rgba(107, 76, 154, 0.3);
  border-radius: 12px;
  max-width: 900px;
  max-height: 90vh;
  width: 100%;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(107, 76, 154, 0.3);
}

.detail-header {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-bottom: 1px solid rgba(107, 76, 154, 0.2);
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-text-dim);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.close-btn:hover {
  color: var(--color-danger);
  background: rgba(244, 67, 54, 0.1);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 3rem;
}

.document-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(107, 76, 154, 0.2);
}

.type-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.type-icon {
  font-size: 2rem;
}

.type-label {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.classified-tag {
  background: rgba(244, 67, 54, 0.2);
  color: var(--color-danger);
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.document-title {
  color: var(--color-accent-light);
  font-size: 2rem;
  margin: 0 0 1rem 0;
  line-height: 1.3;
}

.document-meta {
  display: flex;
  gap: 2rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.author-info,
.date-info,
.source-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.author-label,
.date-label,
.source-label {
  color: var(--color-text-dim);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.author-name,
.date-value,
.source-value {
  color: var(--color-text);
  font-size: 0.95rem;
}

.keywords-section {
  margin-top: 1rem;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.keywords-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  padding-top: 0.35rem;
}

.keywords-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.keyword-tag {
  background: rgba(107, 76, 154, 0.2);
  color: var(--color-accent-light);
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.document-body {
  margin-bottom: 2rem;
}

.page-content {
  background: rgba(0, 0, 0, 0.2);
  padding: 2rem;
  border-radius: 8px;
  border: 1px solid rgba(107, 76, 154, 0.1);
}

.page-title {
  color: var(--color-accent);
  font-size: 1.35rem;
  margin: 0 0 1.5rem 0;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(107, 76, 154, 0.2);
}

.page-text {
  color: var(--color-text);
  font-size: 1rem;
  line-height: 1.9;
}

.body-paragraph {
  margin: 0 0 1.25rem 0;
  text-indent: 0;
}

.notes-section,
.clue-refs {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(107, 76, 154, 0.2);
}

.notes-title,
.refs-title {
  color: var(--color-accent-light);
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.notes-list,
.refs-list {
  margin: 0;
  padding-left: 1.5rem;
  color: var(--color-text-dim);
}

.note-item,
.ref-item {
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  line-height: 1.6;
}

.locked-pages-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(244, 67, 54, 0.1);
  border: 1px solid rgba(244, 67, 54, 0.3);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.locked-icon {
  font-size: 1.75rem;
}

.locked-text {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.locked-count {
  color: var(--color-danger);
  font-weight: bold;
}

.locked-hint {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.unlock-hints {
  margin-top: 2rem;
  padding: 1.5rem;
  background: rgba(255, 193, 7, 0.05);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 8px;
}

.hints-title {
  color: #ffc107;
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.hints-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.hint-card {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  border: 1px solid rgba(107, 76, 154, 0.2);
}

.hint-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-bottom: 0.75rem;
}

.page-number {
  color: var(--color-accent-light);
  font-size: 0.85rem;
  font-weight: bold;
}

.page-title-hint {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  font-style: italic;
}

.hint-requirements {
  margin: 0;
  padding-left: 1.25rem;
}

.req-item {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin-bottom: 0.25rem;
}

.detail-footer {
  padding: 1.5rem 3rem;
  border-top: 1px solid rgba(107, 76, 154, 0.2);
  background: rgba(0, 0, 0, 0.2);
}

.page-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.nav-btn {
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid rgba(107, 76, 154, 0.3);
  color: var(--color-text);
  padding: 0.65rem 1.5rem;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.nav-btn:hover:not(:disabled) {
  background: rgba(107, 76, 154, 0.4);
  border-color: var(--color-accent);
}

.nav-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-indicators {
  display: flex;
  gap: 0.5rem;
}

.page-dot {
  width: 32px;
  height: 32px;
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid rgba(107, 76, 154, 0.3);
  color: var(--color-text-dim);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s ease;
}

.page-dot:hover {
  background: rgba(107, 76, 154, 0.2);
}

.page-dot.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.page-info {
  text-align: center;
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 1rem;
}

.locked-notice {
  color: var(--color-danger);
  margin-left: 0.5rem;
}

.related-cases {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.related-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.related-value {
  color: var(--color-accent-light);
  font-size: 0.85rem;
}

.sanity-effect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 6px;
  font-weight: bold;
  font-size: 0.9rem;
}

.sanity-effect.positive {
  background: rgba(76, 175, 80, 0.1);
  color: #4caf50;
}

.sanity-effect.negative {
  background: rgba(244, 67, 54, 0.1);
  color: var(--color-danger);
}

@media (max-width: 768px) {
  .document-detail-overlay {
    padding: 1rem;
  }

  .detail-content {
    padding: 1.5rem;
  }

  .detail-footer {
    padding: 1rem 1.5rem;
  }

  .document-title {
    font-size: 1.5rem;
  }

  .page-content {
    padding: 1.5rem;
  }

  .hints-grid {
    grid-template-columns: 1fr;
  }

  .page-nav {
    flex-direction: column;
    gap: 1rem;
  }
}
</style>
