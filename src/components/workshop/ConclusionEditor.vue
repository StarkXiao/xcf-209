<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import type { ConclusionOption } from '@/types'

const workshopStore = useWorkshopStore()

const selectedOptionId = ref<string | null>(null)
const showEvidenceSelector = ref(false)
const evidenceSelectorType = ref<'required' | 'conclusion'>('conclusion')

const options = computed(() => workshopStore.currentCase?.conclusion.options || [])
const conclusion = computed(() => workshopStore.currentCase?.conclusion)

const allEvidence = computed(() => workshopStore.getAllEvidence())

const selectedOption = computed(() => {
  if (!selectedOptionId.value) return null
  return options.value.find(o => o.id === selectedOptionId.value) || null
})

const conclusionEvidenceNames = computed(() => {
  if (!conclusion.value?.evidence) return []
  return conclusion.value.evidence.map(evId => {
    const ev = allEvidence.value.find(e => e.evidence.id === evId)
    return ev?.evidence.name || evId
  })
})

const optionRequiredEvidenceNames = computed(() => {
  if (!selectedOption.value?.requiredEvidence) return []
  return selectedOption.value.requiredEvidence.map(evId => {
    const ev = allEvidence.value.find(e => e.evidence.id === evId)
    return ev?.evidence.name || evId
  })
})

const branchInfo = computed(() => {
  const branches: Record<string, { name: string; count: number }> = {}
  options.value.forEach(opt => {
    if (opt.branch) {
      if (!branches[opt.branch]) {
        branches[opt.branch] = { name: opt.branch, count: 0 }
      }
      branches[opt.branch].count++
    }
  })
  return Object.values(branches)
})

function handleAddOption() {
  const newOption = workshopStore.addConclusionOption()
  if (newOption) {
    selectedOptionId.value = newOption.id
  }
}

function handleDeleteOption(optionId: string) {
  if (!confirm('确定要删除这个结论选项吗？')) return
  workshopStore.deleteConclusionOption(optionId)
  if (selectedOptionId.value === optionId) {
    selectedOptionId.value = null
  }
}

function selectOption(optionId: string) {
  selectedOptionId.value = optionId
}

function updateOptionField(field: keyof ConclusionOption, value: string | number | boolean | string[]) {
  if (!selectedOption.value) return
  workshopStore.updateConclusionOption(selectedOption.value.id, { [field]: value })
}

function toggleCorrect(optionId: string) {
  const option = options.value.find(o => o.id === optionId)
  if (!option) return
  workshopStore.updateConclusionOption(optionId, { isCorrect: !option.isCorrect })
  if (!option.isCorrect && !conclusion.value?.correctAnswer) {
    workshopStore.updateConclusion({ correctAnswer: optionId })
  }
}

function updateSanityThreshold(value: number) {
  workshopStore.updateConclusion({ sanityThreshold: value })
}

function openEvidenceSelector(type: 'required' | 'conclusion') {
  evidenceSelectorType.value = type
  showEvidenceSelector.value = true
}

function toggleEvidence(evidenceId: string) {
  if (evidenceSelectorType.value === 'conclusion') {
    const current = conclusion.value?.evidence || []
    const newList = current.includes(evidenceId)
      ? current.filter(id => id !== evidenceId)
      : [...current, evidenceId]
    workshopStore.updateConclusion({ evidence: newList })
  } else {
    if (!selectedOption.value) return
    const current = selectedOption.value.requiredEvidence || []
    const newList = current.includes(evidenceId)
      ? current.filter(id => id !== evidenceId)
      : [...current, evidenceId]
    workshopStore.updateConclusionOption(selectedOption.value.id, { requiredEvidence: newList })
  }
}

function isEvidenceSelected(evidenceId: string): boolean {
  if (evidenceSelectorType.value === 'conclusion') {
    return conclusion.value?.evidence?.includes(evidenceId) || false
  } else {
    return selectedOption.value?.requiredEvidence?.includes(evidenceId) || false
  }
}

function getBranchStyle(branch: string): { bg: string; border: string } {
  const styles: Record<string, { bg: string; border: string }> = {
    'standard': { bg: 'rgba(58, 139, 90, 0.2)', border: '#3a8b5a' },
    'deep-truth': { bg: 'rgba(255, 215, 0, 0.2)', border: '#ffd700' },
    'bad': { bg: 'rgba(139, 58, 58, 0.2)', border: '#8b3a3a' },
    'neutral': { bg: 'rgba(139, 107, 58, 0.2)', border: '#8b6b3a' }
  }
  return styles[branch] || { bg: 'rgba(107, 76, 154, 0.2)', border: '#6b4c9a' }
}
</script>

<template>
  <div class="conclusion-config">
    <div class="config-header">
      <h2 class="section-title">💡 推演答案编排</h2>
      <p class="section-desc">设置多结局推演选项和条件</p>
    </div>

    <div class="config-content">
      <div class="conclusion-settings card">
        <div class="panel-header">
          <h3>推演设置</h3>
        </div>
        <div class="settings-content">
          <div class="form-group">
            <label>理智值阈值</label>
            <div class="threshold-input">
              <input
                type="range"
                min="0"
                max="100"
                :value="conclusion?.sanityThreshold || 30"
                @input="updateSanityThreshold(Number(($event.target as HTMLInputElement).value))"
              />
              <span class="threshold-value">{{ conclusion?.sanityThreshold || 30 }}+</span>
            </div>
            <span class="field-hint">玩家需要达到此理智值才能进行推演</span>
          </div>

          <div class="form-group">
            <label>关键证据 ({{ conclusion?.evidence?.length || 0 }})</label>
            <button class="select-btn" @click="openEvidenceSelector('conclusion')">
              选择证据
            </button>
            <div class="evidence-tags" v-if="conclusionEvidenceNames.length > 0">
              <span
                v-for="(name, index) in conclusionEvidenceNames"
                :key="index"
                class="evidence-tag"
              >
                📎 {{ name }}
              </span>
            </div>
            <span class="field-hint">收集所有关键证据后才能进行推演</span>
          </div>

          <div class="stats-summary">
            <div class="stat-item">
              <span class="stat-label">总选项数</span>
              <span class="stat-value">{{ options.length }}</span>
            </div>
            <div class="stat-item correct">
              <span class="stat-label">正确结局</span>
              <span class="stat-value">{{ workshopStore.correctEndingCount }}</span>
            </div>
            <div class="stat-item branch">
              <span class="stat-label">分支数</span>
              <span class="stat-value">{{ branchInfo.length }}</span>
            </div>
          </div>

          <div class="branches-list" v-if="branchInfo.length > 0">
            <h4>分支列表</h4>
            <div class="branch-tags">
              <span
                v-for="branch in branchInfo"
                :key="branch.name"
                class="branch-tag"
                :style="{
                  background: getBranchStyle(branch.name).bg,
                  borderColor: getBranchStyle(branch.name).border
                }"
              >
                🌿 {{ branch.name }} ({{ branch.count }})
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="options-panel card">
        <div class="panel-header">
          <h3>结论选项</h3>
          <button class="add-btn" @click="handleAddOption">+ 添加选项</button>
        </div>
        <div class="options-list">
          <div
            v-for="(option, index) in options"
            :key="option.id"
            class="option-item"
            :class="{
              selected: selectedOptionId === option.id,
              correct: option.isCorrect,
              'has-branch': option.branch
            }"
            @click="selectOption(option.id)"
          >
            <div class="option-header">
              <span class="option-number">{{ index + 1 }}</span>
              <span class="option-text">{{ option.text }}</span>
            </div>
            <div class="option-meta">
              <span class="meta-item sanity" :class="{ negative: option.sanityCost > 0 }">
                {{ option.sanityCost > 0 ? '-' : '+' }}{{ Math.abs(option.sanityCost) }} 理智
              </span>
              <span v-if="option.isCorrect" class="meta-item correct-badge">✓ 正确</span>
              <span v-if="option.branch" class="meta-item branch-tag-mini">
                🌿 {{ option.branch }}
              </span>
            </div>
            <button class="delete-btn" @click.stop="handleDeleteOption(option.id)">✕</button>
          </div>
          <div v-if="options.length === 0" class="empty-state">
            <p>暂无结论选项</p>
            <p class="hint">点击上方按钮添加</p>
          </div>
        </div>
      </div>

      <div class="option-detail card">
        <div class="panel-header">
          <h3>选项详情</h3>
          <label v-if="selectedOption" class="correct-toggle">
            <input
              type="checkbox"
              :checked="selectedOption.isCorrect"
              @change="toggleCorrect(selectedOption.id)"
            />
            <span>正确结局</span>
          </label>
        </div>
        <div v-if="selectedOption" class="detail-content">
          <div class="form-group">
            <label>结论文本</label>
            <textarea
              :value="selectedOption.text"
              @input="updateOptionField('text', ($event.target as HTMLTextAreaElement).value)"
              placeholder="输入结论描述"
              rows="3"
            ></textarea>
          </div>

          <div class="form-group">
            <label>反馈信息</label>
            <textarea
              :value="selectedOption.feedback"
              @input="updateOptionField('feedback', ($event.target as HTMLTextAreaElement).value)"
              placeholder="玩家选择此结论后显示的反馈"
              rows="3"
            ></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>理智消耗</label>
              <input
                type="number"
                :value="selectedOption.sanityCost"
                @input="updateOptionField('sanityCost', Number(($event.target as HTMLInputElement).value))"
                min="0"
              />
              <span class="field-hint">选择此结论后失去的理智值</span>
            </div>
            <div class="form-group">
              <label>分支标识</label>
              <input
                type="text"
                :value="selectedOption.branch || ''"
                @input="updateOptionField('branch', ($event.target as HTMLInputElement).value)"
                placeholder="如: standard"
              />
              <span class="field-hint">用于标识不同结局分支</span>
            </div>
          </div>

          <div class="form-group">
            <label>所需特殊证据</label>
            <button class="select-btn" @click="openEvidenceSelector('required')">
              选择证据
            </button>
            <div class="evidence-tags" v-if="optionRequiredEvidenceNames.length > 0">
              <span
                v-for="(name, index) in optionRequiredEvidenceNames"
                :key="index"
                class="evidence-tag special"
              >
                🔮 {{ name }}
              </span>
            </div>
            <span class="field-hint">需要收集这些证据才能选择此结论（可选）</span>
          </div>

          <div class="form-group">
            <label>所需工具 (逗号分隔)</label>
            <input
              type="text"
              :value="(selectedOption.requiredTools || []).join(', ')"
              @input="updateOptionField('requiredTools', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
              placeholder="tool-id-1, tool-id-2"
            />
            <span class="field-hint">需要拥有这些工具才能选择此结论（可选）</span>
          </div>

          <div class="option-preview" v-if="selectedOption.feedback">
            <h4>预览效果</h4>
            <div class="preview-card" :class="{ correct: selectedOption.isCorrect }">
              <div class="preview-icon">
                {{ selectedOption.isCorrect ? '✓' : '?' }}
              </div>
              <p class="preview-feedback">{{ selectedOption.feedback }}</p>
              <div class="preview-meta">
                <span>理智消耗: {{ selectedOption.sanityCost }}</span>
                <span v-if="selectedOption.branch">分支: {{ selectedOption.branch }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">💡</div>
          <p>选择一个结论选项进行编辑</p>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showEvidenceSelector" class="modal-overlay" @click.self="showEvidenceSelector = false">
        <div class="modal-card card">
          <div class="modal-header">
            <h3>选择证据</h3>
            <button class="close-btn" @click="showEvidenceSelector = false">✕</button>
          </div>
          <div class="modal-body">
            <div class="evidence-selector-list">
              <div
                v-for="item in allEvidence"
                :key="item.evidence.id"
                class="evidence-select-item"
                :class="{ selected: isEvidenceSelected(item.evidence.id) }"
                @click="toggleEvidence(item.evidence.id)"
              >
                <div class="select-checkbox">
                  {{ isEvidenceSelected(item.evidence.id) ? '✓' : '' }}
                </div>
                <div class="evidence-info">
                  <span class="evidence-name">{{ item.evidence.name }}</span>
                  <span class="evidence-scene">来自: {{ item.scene.name }}</span>
                </div>
              </div>
              <div v-if="allEvidence.length === 0" class="empty-state">
                <p>暂无证据</p>
                <p class="hint">请先在证据配置中添加证据</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="confirm-btn primary" @click="showEvidenceSelector = false">
              确定
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.conclusion-config {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.config-header {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 1.5rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.section-desc {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.config-content {
  display: grid;
  grid-template-columns: 250px 1fr 320px;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.conclusion-settings,
.options-panel,
.option-detail {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-header h3 {
  color: var(--color-text);
  font-size: 1rem;
}

.add-btn,
.select-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  background: var(--color-accent);
  border: none;
  color: white;
}

.add-btn:hover,
.select-btn:hover {
  background: var(--color-accent-light);
}

.settings-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.threshold-input {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.threshold-input input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.threshold-value {
  font-weight: bold;
  color: var(--color-accent-light);
  min-width: 40px;
  text-align: center;
}

.evidence-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.evidence-tag {
  padding: 0.2rem 0.5rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 10px;
  font-size: 0.75rem;
  color: var(--color-text);
}

.evidence-tag.special {
  background: rgba(255, 215, 0, 0.15);
  border-color: #ffd700;
  color: #ffd700;
}

.stats-summary {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.stat-item {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: bold;
}

.stat-item.correct .stat-value {
  color: var(--color-success);
}

.stat-item.branch .stat-value {
  color: #ffd700;
}

.branches-list h4 {
  color: var(--color-text);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
}

.branch-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.branch-tag {
  padding: 0.25rem 0.6rem;
  border: 1px solid;
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--color-text);
}

.options-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  position: relative;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  padding-right: 2rem;
}

.option-item:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.option-item.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
  box-shadow: 0 0 10px rgba(107, 76, 154, 0.3);
}

.option-item.correct {
  border-left: 4px solid var(--color-success);
}

.option-item.has-branch {
  border-left: 4px solid #ffd700;
}

.option-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.option-number {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border-radius: 50%;
  color: white;
  font-size: 0.8rem;
  font-weight: bold;
  flex-shrink: 0;
}

.option-text {
  flex: 1;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.4;
}

.option-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.meta-item {
  font-size: 0.75rem;
  padding: 0.15rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  color: var(--color-text-dim);
}

.meta-item.sanity.negative {
  color: var(--color-danger);
}

.meta-item.correct-badge {
  background: rgba(58, 139, 90, 0.3);
  color: var(--color-success);
}

.meta-item.branch-tag-mini {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
}

.delete-btn {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  border-radius: 4px;
}

.delete-btn:hover {
  background: var(--color-danger);
  color: white;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
  text-align: center;
  padding: 2rem;
}

.empty-state .empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state .hint {
  font-size: 0.8rem;
  opacity: 0.7;
  margin-top: 0.5rem;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.correct-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text);
  cursor: pointer;
}

.correct-toggle input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.option-preview {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.option-preview h4 {
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.preview-card {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  text-align: center;
}

.preview-card.correct {
  border-color: var(--color-success);
  background: rgba(58, 139, 90, 0.1);
}

.preview-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  color: var(--color-text-dim);
}

.preview-card.correct .preview-icon {
  color: var(--color-success);
}

.preview-feedback {
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.preview-meta {
  display: flex;
  justify-content: center;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--color-text-dim);
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

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  color: var(--color-text);
  font-size: 1.1rem;
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  font-size: 1rem;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
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

.evidence-selector-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.evidence-select-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.evidence-select-item:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.evidence-select-item.selected {
  border-color: var(--color-success);
  background: rgba(58, 139, 90, 0.15);
}

.select-checkbox {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-success);
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.evidence-select-item.selected .select-checkbox {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.evidence-info {
  flex: 1;
  min-width: 0;
}

.evidence-name {
  display: block;
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.evidence-scene {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.modal-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
}

.confirm-btn {
  padding: 0.5rem 1.5rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .config-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
}
</style>
