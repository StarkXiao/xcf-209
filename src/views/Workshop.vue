<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkshopStore, type WorkshopTab } from '@/stores/workshop'
import BasicInfo from '@/components/workshop/BasicInfo.vue'
import EvidenceConfig from '@/components/workshop/EvidenceConfig.vue'
import CluesEditor from '@/components/workshop/CluesEditor.vue'
import ConclusionEditor from '@/components/workshop/ConclusionEditor.vue'
import CasePreview from '@/components/workshop/CasePreview.vue'

const router = useRouter()
const workshopStore = useWorkshopStore()

const showSaveList = ref(false)
const showExportModal = ref(false)
const showImportModal = ref(false)
const importText = ref('')
const importError = ref('')

const tabs: { id: WorkshopTab; label: string; icon: string }[] = [
  { id: 'basic', label: '基本信息', icon: '📋' },
  { id: 'evidence', label: '证据配置', icon: '🔍' },
  { id: 'clues', label: '线索编辑', icon: '🧩' },
  { id: 'conclusion', label: '推演答案', icon: '💡' },
  { id: 'preview', label: '本地预览', icon: '👁️' }
]

const canSave = computed(() => workshopStore.currentCase && workshopStore.isDirty)

function selectTab(tabId: WorkshopTab) {
  workshopStore.setActiveTab(tabId)
}

function handleNewCase() {
  if (workshopStore.isDirty) {
    if (!confirm('当前有未保存的更改，确定要创建新案件吗？')) {
      return
    }
  }
  workshopStore.createNewCase()
}

function handleSave() {
  if (workshopStore.saveCase()) {
    alert('保存成功！')
  }
}

function handleExport() {
  showExportModal.value = true
}

function copyExport() {
  const json = workshopStore.exportCase()
  navigator.clipboard.writeText(json).then(() => {
    alert('已复制到剪贴板！')
  })
}

function handleImport() {
  showImportModal.value = true
  importText.value = ''
  importError.value = ''
}

function doImport() {
  const success = workshopStore.importCase(importText.value)
  if (success) {
    showImportModal.value = false
    alert('导入成功！')
  } else {
    importError.value = '导入失败，请检查JSON格式是否正确'
  }
}

function handleLoadCase(caseId: string) {
  const caseData = workshopStore.savedCases.find(c => c.id === caseId)
  if (caseData) {
    if (workshopStore.isDirty) {
      if (!confirm('当前有未保存的更改，确定要加载其他案件吗？')) {
        return
      }
    }
    workshopStore.loadCase(caseData)
    showSaveList.value = false
  }
}

function handleDeleteCase(caseId: string) {
  if (!confirm('确定要删除这个案件吗？此操作不可撤销。')) return
  workshopStore.deleteSavedCase(caseId)
}

function goBack() {
  if (workshopStore.isDirty) {
    if (!confirm('当前有未保存的更改，确定要离开吗？')) {
      return
    }
  }
  router.push('/cases')
}

onMounted(() => {
  workshopStore.loadSavedCases()
  if (!workshopStore.currentCase) {
    workshopStore.createNewCase()
  }
})
</script>

<template>
  <div class="workshop-page page-container">
    <div class="workshop-header">
      <div class="header-left">
        <button class="back-btn" @click="goBack">← 返回</button>
        <div class="title-section">
          <h1 class="page-title">🏭 案件工坊</h1>
          <p class="page-subtitle">
            {{ workshopStore.currentCase?.title || '未命名案件' }}
            <span v-if="workshopStore.isDirty" class="dirty-indicator">● 未保存</span>
          </p>
        </div>
      </div>
      <div class="header-actions">
        <button class="action-btn" @click="showSaveList = true">
          📂 我的案件
        </button>
        <button class="action-btn" @click="handleNewCase">
          ✨ 新建
        </button>
        <button class="action-btn" @click="handleImport">
          📥 导入
        </button>
        <button class="action-btn" @click="handleExport" :disabled="!workshopStore.currentCase">
          📤 导出
        </button>
        <button class="action-btn primary save-btn" @click="handleSave" :disabled="!canSave">
          💾 保存
        </button>
      </div>
    </div>

    <div class="workshop-body">
      <div class="tab-sidebar">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="tab-btn"
          :class="{ active: workshopStore.activeTab === tab.id }"
          @click="selectTab(tab.id)"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
        </button>
      </div>

      <div class="tab-content">
        <transition name="fade" mode="out-in">
          <BasicInfo v-if="workshopStore.activeTab === 'basic'" key="basic" />
          <EvidenceConfig v-else-if="workshopStore.activeTab === 'evidence'" key="evidence" />
          <CluesEditor v-else-if="workshopStore.activeTab === 'clues'" key="clues" />
          <ConclusionEditor v-else-if="workshopStore.activeTab === 'conclusion'" key="conclusion" />
          <CasePreview v-else-if="workshopStore.activeTab === 'preview'" key="preview" />
        </transition>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showSaveList" class="modal-overlay" @click.self="showSaveList = false">
        <div class="modal-card card">
          <div class="modal-header">
            <h3>📂 我的案件</h3>
            <button class="close-btn" @click="showSaveList = false">✕</button>
          </div>
          <div class="modal-body">
            <div v-if="workshopStore.savedCases.length === 0" class="empty-state">
              <p>暂无保存的案件</p>
              <p class="hint">创建并保存案件后会显示在这里</p>
            </div>
            <div v-else class="saved-cases-list">
              <div
                v-for="savedCase in workshopStore.savedCases"
                :key="savedCase.id"
                class="saved-case-item"
              >
                <div class="case-info" @click="handleLoadCase(savedCase.id)">
                  <h4>{{ savedCase.title }}</h4>
                  <p class="case-desc">{{ savedCase.description }}</p>
                  <div class="case-meta">
                    <span>{{ savedCase.scenes.length }} 场景</span>
                    <span>{{ savedCase.clues.length }} 线索</span>
                    <span>{{ savedCase.conclusion.options.length }} 结局</span>
                  </div>
                </div>
                <button class="delete-case-btn" @click="handleDeleteCase(savedCase.id)">
                  🗑️
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showExportModal" class="modal-overlay" @click.self="showExportModal = false">
        <div class="modal-card card large">
          <div class="modal-header">
            <h3>📤 导出案件</h3>
            <button class="close-btn" @click="showExportModal = false">✕</button>
          </div>
          <div class="modal-body">
            <textarea
              class="export-textarea"
              readonly
              :value="workshopStore.exportCase()"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button class="copy-btn primary" @click="copyExport">
              📋 复制到剪贴板
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
        <div class="modal-card card large">
          <div class="modal-header">
            <h3>📥 导入案件</h3>
            <button class="close-btn" @click="showImportModal = false">✕</button>
          </div>
          <div class="modal-body">
            <p class="import-hint">粘贴案件JSON数据以导入：</p>
            <textarea
              v-model="importText"
              class="import-textarea"
              placeholder="粘贴JSON数据..."
              rows="15"
            ></textarea>
            <p v-if="importError" class="error-text">{{ importError }}</p>
          </div>
          <div class="modal-footer">
            <button class="import-btn primary" @click="doImport">
              ✅ 导入
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.workshop-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 140px);
  padding-top: 1rem;
}

.workshop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-shrink: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.back-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

.title-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.page-title {
  font-size: 1.8rem;
  color: var(--color-accent-light);
  margin: 0;
}

.page-subtitle {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin: 0;
}

.dirty-indicator {
  color: var(--color-warning);
  font-size: 0.8rem;
  margin-left: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.action-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
}

.save-btn {
  min-width: 100px;
}

.save-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.workshop-body {
  display: flex;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.tab-sidebar {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  font-size: 0.9rem;
}

.tab-btn:hover {
  background: var(--color-bg-hover);
  border-color: var(--color-accent);
  color: var(--color-text);
}

.tab-btn.active {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
  color: var(--color-accent-light);
}

.tab-icon {
  font-size: 1.2rem;
}

.tab-label {
  flex: 1;
}

.tab-content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-card {
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.modal-card.large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.modal-header h3 {
  color: var(--color-text);
  font-size: 1.1rem;
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 1rem;
  border-radius: 6px;
}

.close-btn:hover {
  background: rgba(139, 58, 58, 0.3);
  color: var(--color-danger);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
}

.modal-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-dim);
}

.empty-state .hint {
  font-size: 0.85rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

.saved-cases-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.saved-case-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.saved-case-item:hover {
  border-color: var(--color-accent);
}

.case-info {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.case-info h4 {
  color: var(--color-text);
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.case-desc {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  line-height: 1.4;
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.case-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.delete-case-btn {
  width: 36px;
  height: 36px;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  border-radius: 6px;
  flex-shrink: 0;
}

.delete-case-btn:hover {
  background: rgba(139, 58, 58, 0.3);
}

.export-textarea,
.import-textarea {
  width: 100%;
  height: 400px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-family: monospace;
  font-size: 0.8rem;
  line-height: 1.5;
  resize: none;
}

.import-textarea {
  height: auto;
}

.import-hint {
  color: var(--color-text-dim);
  margin-bottom: 0.75rem;
  font-size: 0.9rem;
}

.error-text {
  color: var(--color-danger);
  font-size: 0.85rem;
  margin-top: 0.5rem;
}

.copy-btn,
.import-btn {
  padding: 0.5rem 1.5rem;
}

@media (max-width: 768px) {
  .workshop-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .header-actions {
    flex-wrap: wrap;
  }

  .workshop-body {
    flex-direction: column;
  }

  .tab-sidebar {
    width: 100%;
    flex-direction: row;
    overflow-x: auto;
  }

  .tab-btn {
    flex-shrink: 0;
  }

  .tab-content {
    padding: 1rem;
  }
}
</style>
