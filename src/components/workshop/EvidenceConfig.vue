<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import type { Evidence } from '@/types'

const workshopStore = useWorkshopStore()

const selectedSceneId = ref<string | null>(null)
const selectedEvidenceId = ref<string | null>(null)

const scenes = computed(() => workshopStore.currentCase?.scenes || [])

const currentScene = computed(() => {
  if (!selectedSceneId.value) return scenes.value[0] || null
  return scenes.value.find(s => s.id === selectedSceneId.value) || null
})

const currentEvidence = computed(() => {
  if (!currentScene.value || !selectedEvidenceId.value) return null
  return currentScene.value.evidence.find(e => e.id === selectedEvidenceId.value) || null
})

const evidenceTypeOptions = [
  { value: 'document', label: '📄 文档' },
  { value: 'object', label: '🔍 物品' },
  { value: 'trace', label: '👣 痕迹' },
  { value: 'testimony', label: '💬 证词' },
  { value: 'image', label: '🖼️ 图片' },
  { value: 'text_fragment', label: '📜 文本残页' },
  { value: 'audio', label: '🎙️ 音频' }
]

const textFragmentStyleOptions = [
  { value: 'aged_paper', label: '陈旧纸张' },
  { value: 'burnt_edge', label: '灼烧边缘' },
  { value: 'torn', label: '撕裂残片' },
  { value: 'handwritten', label: '手写字迹' },
  { value: 'typewritten', label: '打字机字体' }
]

function selectScene(sceneId: string) {
  selectedSceneId.value = sceneId
  selectedEvidenceId.value = null
}

function selectEvidence(evidenceId: string) {
  selectedEvidenceId.value = evidenceId
}

function handleAddScene() {
  const newScene = workshopStore.addScene()
  if (newScene) {
    selectedSceneId.value = newScene.id
  }
}

function handleDeleteScene(sceneId: string) {
  if (!confirm('确定要删除这个场景吗？该场景下的所有证据都会被删除。')) return
  workshopStore.deleteScene(sceneId)
  if (selectedSceneId.value === sceneId) {
    selectedSceneId.value = scenes.value[0]?.id || null
    selectedEvidenceId.value = null
  }
}

function handleAddEvidence() {
  if (!currentScene.value) return
  const newEvidence = workshopStore.addEvidence(currentScene.value.id)
  if (newEvidence) {
    selectedEvidenceId.value = newEvidence.id
  }
}

function handleDeleteEvidence(evidenceId: string) {
  if (!currentScene.value) return
  if (!confirm('确定要删除这个证据吗？')) return
  workshopStore.deleteEvidence(currentScene.value.id, evidenceId)
  if (selectedEvidenceId.value === evidenceId) {
    selectedEvidenceId.value = null
  }
}

function updateSceneName(sceneId: string, event: Event) {
  const target = event.target as HTMLInputElement
  workshopStore.updateScene(sceneId, { name: target.value })
}

function updateSceneDesc(sceneId: string, event: Event) {
  const target = event.target as HTMLTextAreaElement
  workshopStore.updateScene(sceneId, { description: target.value })
}

function updateEvidenceField(field: keyof Evidence, value: string | number | boolean | string[] | undefined) {
  if (!currentScene.value || !currentEvidence.value) return
  workshopStore.updateEvidence(currentScene.value.id, currentEvidence.value.id, { [field]: value } as Partial<Evidence>)
}

function updateEvidenceLocation(axis: 'x' | 'y', value: number) {
  if (!currentScene.value || !currentEvidence.value) return
  const newLocation = { ...currentEvidence.value.location, [axis]: value }
  workshopStore.updateEvidence(currentScene.value.id, currentEvidence.value.id, { location: newLocation })
}

function updateEvidenceSize(dimension: 'width' | 'height', value: number) {
  if (!currentScene.value || !currentEvidence.value) return
  const newSize = { ...currentEvidence.value.size, [dimension]: value }
  workshopStore.updateEvidence(currentScene.value.id, currentEvidence.value.id, { size: newSize })
}
</script>

<template>
  <div class="evidence-config">
    <div class="config-header">
      <h2 class="section-title">🔍 证据配置</h2>
      <p class="section-desc">管理案件中的场景和证据</p>
    </div>

    <div class="config-content">
      <div class="scenes-panel card">
        <div class="panel-header">
          <h3>场景列表</h3>
          <button class="add-btn" @click="handleAddScene">+ 添加场景</button>
        </div>
        <div class="scenes-list">
          <div
            v-for="scene in scenes"
            :key="scene.id"
            class="scene-item"
            :class="{ active: selectedSceneId === scene.id || (!selectedSceneId && scenes.indexOf(scene) === 0) }"
            @click="selectScene(scene.id)"
          >
            <div class="scene-info">
              <span class="scene-name">{{ scene.name }}</span>
              <span class="scene-count">{{ scene.evidence.length }} 个证据</span>
            </div>
            <button class="delete-btn" @click.stop="handleDeleteScene(scene.id)" :disabled="scenes.length <= 1">
              ✕
            </button>
          </div>
        </div>
      </div>

      <div class="evidence-panel card">
        <div class="panel-header">
          <h3>{{ currentScene?.name || '证据列表' }}</h3>
          <button class="add-btn" @click="handleAddEvidence" :disabled="!currentScene">+ 添加证据</button>
        </div>
        <div class="evidence-list" v-if="currentScene">
          <div
            v-for="evidence in currentScene.evidence"
            :key="evidence.id"
            class="evidence-item"
            :class="{ active: selectedEvidenceId === evidence.id }"
            @click="selectEvidence(evidence.id)"
          >
            <div class="evidence-icon">
              {{ evidenceTypeOptions.find(t => t.value === evidence.type)?.label?.charAt(0) || '📄' }}
            </div>
            <div class="evidence-info">
              <span class="evidence-name">{{ evidence.name }}</span>
              <span class="evidence-type">{{ evidenceTypeOptions.find(t => t.value === evidence.type)?.label }}</span>
            </div>
            <button class="delete-btn" @click.stop="handleDeleteEvidence(evidence.id)">✕</button>
          </div>
          <div v-if="currentScene.evidence.length === 0" class="empty-state">
            <p>暂无证据</p>
            <p class="hint">点击上方按钮添加证据</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>请先选择一个场景</p>
        </div>
      </div>

      <div class="detail-panel card">
        <div class="panel-header">
          <h3>证据详情</h3>
        </div>
        <div v-if="currentEvidence" class="evidence-detail">
          <div class="form-group" v-if="currentScene">
            <label>场景名称</label>
            <input
              type="text"
              :value="currentScene.name"
              @input="updateSceneName(currentScene.id, $event)"
              placeholder="输入场景名称"
            />
          </div>

          <div class="form-group">
            <label>证据名称</label>
            <input
              type="text"
              :value="currentEvidence.name"
              @input="updateEvidenceField('name', ($event.target as HTMLInputElement).value)"
              placeholder="输入证据名称"
            />
          </div>

          <div class="form-group">
            <label>证据类型</label>
            <select
              :value="currentEvidence.type"
              @change="updateEvidenceField('type', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in evidenceTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>证据描述</label>
            <textarea
              :value="currentEvidence.description"
              @input="updateEvidenceField('description', ($event.target as HTMLTextAreaElement).value)"
              placeholder="输入证据的详细描述"
              rows="4"
            ></textarea>
          </div>

          <div v-if="currentEvidence.type === 'image'" class="type-specific-section">
            <div class="section-divider">
              <span class="divider-label">🖼️ 图片设置</span>
            </div>
            <div class="form-group">
              <label>图片地址</label>
              <input
                type="text"
                :value="currentEvidence.imageUrl || ''"
                @input="updateEvidenceField('imageUrl', ($event.target as HTMLInputElement).value)"
                placeholder="输入图片URL地址"
              />
              <span class="field-hint">图片的网络地址或本地路径</span>
            </div>
            <div class="form-group">
              <label>图片描述</label>
              <input
                type="text"
                :value="currentEvidence.imageAlt || ''"
                @input="updateEvidenceField('imageAlt', ($event.target as HTMLInputElement).value)"
                placeholder="图片的替代文字/说明"
              />
            </div>
          </div>

          <div v-if="currentEvidence.type === 'text_fragment'" class="type-specific-section">
            <div class="section-divider">
              <span class="divider-label">📜 文本残页设置</span>
            </div>
            <div class="form-group">
              <label>残页内容</label>
              <textarea
                :value="currentEvidence.textContent || ''"
                @input="updateEvidenceField('textContent', ($event.target as HTMLTextAreaElement).value)"
                placeholder="输入文本残页的具体内容"
                rows="5"
              ></textarea>
              <span class="field-hint">留空则使用证据描述作为内容</span>
            </div>
            <div class="form-group">
              <label>纸张样式</label>
              <select
                :value="currentEvidence.textFragmentStyle || 'aged_paper'"
                @change="updateEvidenceField('textFragmentStyle', ($event.target as HTMLSelectElement).value)"
              >
                <option v-for="opt in textFragmentStyleOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
            </div>
          </div>

          <div v-if="currentEvidence.type === 'audio'" class="type-specific-section">
            <div class="section-divider">
              <span class="divider-label">🎙️ 音频设置</span>
            </div>
            <div class="form-group">
              <label>音频地址</label>
              <input
                type="text"
                :value="currentEvidence.audioUrl || ''"
                @input="updateEvidenceField('audioUrl', ($event.target as HTMLInputElement).value)"
                placeholder="输入音频URL地址"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>讲述人</label>
                <input
                  type="text"
                  :value="currentEvidence.audioSpeaker || ''"
                  @input="updateEvidenceField('audioSpeaker', ($event.target as HTMLInputElement).value)"
                  placeholder="如：张三"
                />
              </div>
              <div class="form-group">
                <label>时长(秒)</label>
                <input
                  type="number"
                  :value="currentEvidence.audioDuration || ''"
                  @input="updateEvidenceField('audioDuration', Number(($event.target as HTMLInputElement).value) || undefined)"
                  placeholder="如：120"
                  min="0"
                />
              </div>
            </div>
            <div class="form-group">
              <label>文字记录</label>
              <textarea
                :value="currentEvidence.audioTranscript || ''"
                @input="updateEvidenceField('audioTranscript', ($event.target as HTMLTextAreaElement).value)"
                placeholder="音频的文字转写内容"
                rows="4"
              ></textarea>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>理智影响</label>
              <input
                type="number"
                :value="currentEvidence.sanityEffect"
                @input="updateEvidenceField('sanityEffect', Number(($event.target as HTMLInputElement).value))"
              />
              <span class="field-hint">负数表示失去理智</span>
            </div>
            <div class="form-group">
              <label>基础发现率</label>
              <input
                type="number"
                :value="currentEvidence.baseHitRate"
                @input="updateEvidenceField('baseHitRate', Number(($event.target as HTMLInputElement).value))"
                min="0"
                max="100"
              />
              <span class="field-hint">0-100%</span>
            </div>
          </div>

          <div class="form-group">
            <label>位置坐标</label>
            <div class="coord-inputs">
              <div class="coord-input">
                <span>X:</span>
                <input
                  type="number"
                  :value="currentEvidence.location.x"
                  @input="updateEvidenceLocation('x', Number(($event.target as HTMLInputElement).value))"
                  min="0"
                  max="100"
                />
              </div>
              <div class="coord-input">
                <span>Y:</span>
                <input
                  type="number"
                  :value="currentEvidence.location.y"
                  @input="updateEvidenceLocation('y', Number(($event.target as HTMLInputElement).value))"
                  min="0"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>尺寸大小</label>
            <div class="coord-inputs">
              <div class="coord-input">
                <span>宽:</span>
                <input
                  type="number"
                  :value="currentEvidence.size.width"
                  @input="updateEvidenceSize('width', Number(($event.target as HTMLInputElement).value))"
                  min="1"
                  max="100"
                />
              </div>
              <div class="coord-input">
                <span>高:</span>
                <input
                  type="number"
                  :value="currentEvidence.size.height"
                  @input="updateEvidenceSize('height', Number(($event.target as HTMLInputElement).value))"
                  min="1"
                  max="100"
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label>
              <input
                type="checkbox"
                :checked="currentEvidence.isSpecial"
                @change="updateEvidenceField('isSpecial', ($event.target as HTMLInputElement).checked)"
              />
              特殊证据
            </label>
            <span class="field-hint">需要特殊工具才能发现</span>
          </div>

          <div class="form-group" v-if="currentScene">
            <label>场景描述</label>
            <textarea
              :value="currentScene.description"
              @input="updateSceneDesc(currentScene.id, $event)"
              placeholder="输入场景的详细描述"
              rows="3"
            ></textarea>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">📋</div>
          <p>选择一个证据进行编辑</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.evidence-config {
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
  grid-template-columns: 200px 280px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.scenes-panel,
.evidence-panel,
.detail-panel {
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

.add-btn {
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  background: var(--color-accent);
  border: none;
  color: white;
}

.add-btn:hover {
  background: var(--color-accent-light);
}

.add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.scenes-list,
.evidence-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.scene-item,
.evidence-item {
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

.scene-item:hover,
.evidence-item:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.scene-item.active,
.evidence-item.active {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.scene-info,
.evidence-info {
  flex: 1;
  min-width: 0;
}

.scene-name,
.evidence-name {
  display: block;
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.scene-count,
.evidence-type {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.evidence-icon {
  font-size: 1.2rem;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 6px;
  flex-shrink: 0;
}

.delete-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  font-size: 0.75rem;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  border-radius: 4px;
  flex-shrink: 0;
}

.delete-btn:hover {
  background: var(--color-danger);
  color: white;
}

.delete-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
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

.evidence-detail {
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
.form-group select,
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
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.coord-inputs {
  display: flex;
  gap: 1rem;
}

.coord-input {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.coord-input span {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  width: 20px;
}

.coord-input input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-size: 0.85rem;
}

.form-group label:has(input[type="checkbox"]) {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.form-group input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.type-specific-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px dashed var(--color-border);
}

.section-divider {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
}

.divider-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent-light);
  background: rgba(107, 76, 154, 0.1);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

@media (max-width: 1024px) {
  .config-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
}
</style>
