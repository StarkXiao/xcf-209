<script setup lang="ts">
import { ref, computed } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import type { Clue } from '@/types'

const workshopStore = useWorkshopStore()

const selectedClueId = ref<string | null>(null)
const connectingFrom = ref<string | null>(null)

const clues = computed(() => workshopStore.currentCase?.clues || [])

const selectedClue = computed(() => {
  if (!selectedClueId.value) return null
  return clues.value.find(c => c.id === selectedClueId.value) || null
})

const connections = computed(() => {
  const result: { clue1: Clue; clue2: Clue }[] = []
  const seen = new Set<string>()
  
  clues.value.forEach(clue => {
    clue.connections.forEach(connId => {
      const key = [clue.id, connId].sort().join('-')
      if (!seen.has(key)) {
        seen.add(key)
        const otherClue = clues.value.find(c => c.id === connId)
        if (otherClue) {
          result.push({ clue1: clue, clue2: otherClue })
        }
      }
    })
  })
  
  return result
})

const clueTypeOptions = [
  { value: 'physical', label: '🔍 物证' },
  { value: 'testimonial', label: '💬 证词' },
  { value: 'documentary', label: '📄 文档' },
  { value: 'deduction', label: '💡 推演' }
]

function handleAddClue() {
  const newClue = workshopStore.addClue()
  if (newClue) {
    selectedClueId.value = newClue.id
  }
}

function handleDeleteClue(clueId: string) {
  if (!confirm('确定要删除这个线索吗？相关的连接也会被移除。')) return
  workshopStore.deleteClue(clueId)
  if (selectedClueId.value === clueId) {
    selectedClueId.value = null
  }
}

function selectClue(clueId: string) {
  if (connectingFrom.value) {
    if (connectingFrom.value !== clueId) {
      workshopStore.addClueConnection(connectingFrom.value, clueId)
    }
    connectingFrom.value = null
  }
  selectedClueId.value = clueId
}

function startConnection(clueId: string) {
  if (connectingFrom.value === clueId) {
    connectingFrom.value = null
  } else {
    connectingFrom.value = clueId
  }
}

function removeConnection(clue1Id: string, clue2Id: string) {
  workshopStore.removeClueConnection(clue1Id, clue2Id)
}

function updateClueField(field: keyof Clue, value: string | number | string[]) {
  if (!selectedClue.value) return
  workshopStore.updateClue(selectedClue.value.id, { [field]: value })
}

function getImportanceColor(importance: number): string {
  if (importance >= 4) return '#8b3a3a'
  if (importance >= 3) return '#8b6b3a'
  return '#3a8b5a'
}

function getClueTypeLabel(type: string): string {
  return clueTypeOptions.find(t => t.value === type)?.label || type
}

function canConnectTo(clueId: string): boolean {
  if (!connectingFrom.value || connectingFrom.value === clueId) return false
  const fromClue = clues.value.find(c => c.id === connectingFrom.value)
  return !fromClue?.connections.includes(clueId)
}

function isConnected(clueId: string): boolean {
  if (!connectingFrom.value || connectingFrom.value === clueId) return false
  const fromClue = clues.value.find(c => c.id === connectingFrom.value)
  return fromClue?.connections.includes(clueId) || false
}
</script>

<template>
  <div class="clues-config">
    <div class="config-header">
      <h2 class="section-title">🧩 线索关系编辑</h2>
      <p class="section-desc">管理线索及其相互关系</p>
    </div>

    <div class="config-content">
      <div class="clues-list-panel card">
        <div class="panel-header">
          <h3>线索列表</h3>
          <button class="add-btn" @click="handleAddClue">+ 添加线索</button>
        </div>
        <div class="clues-list">
          <div
            v-for="clue in clues"
            :key="clue.id"
            class="clue-item"
            :class="{
              selected: selectedClueId === clue.id,
              connecting: connectingFrom === clue.id,
              'can-connect': canConnectTo(clue.id),
              'already-connected': isConnected(clue.id)
            }"
            @click="selectClue(clue.id)"
          >
            <div class="clue-icon">
              {{ getClueTypeLabel(clue.type).charAt(0) }}
            </div>
            <div class="clue-info">
              <span class="clue-name">{{ clue.name }}</span>
              <span class="clue-type">{{ getClueTypeLabel(clue.type) }}</span>
            </div>
            <div class="clue-importance" :style="{ backgroundColor: getImportanceColor(clue.importance) }">
              {{ clue.importance }}
            </div>
            <button class="delete-btn" @click.stop="handleDeleteClue(clue.id)">✕</button>
          </div>
          <div v-if="clues.length === 0" class="empty-state">
            <p>暂无线索</p>
            <p class="hint">点击上方按钮添加线索</p>
          </div>
        </div>
      </div>

      <div class="clue-detail-panel card">
        <div class="panel-header">
          <h3>线索详情</h3>
          <button
            v-if="selectedClue"
            class="connect-btn"
            :class="{ active: connectingFrom === selectedClue.id }"
            @click="startConnection(selectedClue.id)"
          >
            {{ connectingFrom === selectedClue.id ? '取消连接' : '🔗 建立关联' }}
          </button>
        </div>
        <div v-if="selectedClue" class="clue-detail">
          <div class="form-group">
            <label>线索名称</label>
            <input
              type="text"
              :value="selectedClue.name"
              @input="updateClueField('name', ($event.target as HTMLInputElement).value)"
              placeholder="输入线索名称"
            />
          </div>

          <div class="form-group">
            <label>线索类型</label>
            <select
              :value="selectedClue.type"
              @change="updateClueField('type', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in clueTypeOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>重要度</label>
            <div class="importance-slider">
              <input
                type="range"
                min="1"
                max="5"
                :value="selectedClue.importance"
                @input="updateClueField('importance', Number(($event.target as HTMLInputElement).value))"
              />
              <span class="importance-value" :style="{ color: getImportanceColor(selectedClue.importance) }">
                {{ selectedClue.importance }} / 5
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>线索描述</label>
            <textarea
              :value="selectedClue.description"
              @input="updateClueField('description', ($event.target as HTMLTextAreaElement).value)"
              placeholder="输入线索的详细描述"
              rows="4"
            ></textarea>
          </div>

          <div class="form-group">
            <label>来源</label>
            <input
              type="text"
              :value="selectedClue.source"
              @input="updateClueField('source', ($event.target as HTMLInputElement).value)"
              placeholder="输入线索来源"
            />
          </div>

          <div class="form-group">
            <label>分析所需工具</label>
            <input
              type="text"
              :value="selectedClue.requiredToolForAnalysis || ''"
              @input="updateClueField('requiredToolForAnalysis', ($event.target as HTMLInputElement).value)"
              placeholder="输入工具ID（可选）"
            />
            <span class="field-hint">留空表示无需特殊工具即可分析</span>
          </div>

          <div class="form-group">
            <label>已建立关联 ({{ selectedClue.connections.length }})</label>
            <div class="connections-tags">
              <div
                v-for="connId in selectedClue.connections"
                :key="connId"
                class="connection-tag"
              >
                <span class="conn-icon">🔗</span>
                <span>{{ clues.find(c => c.id === connId)?.name || connId }}</span>
                <button class="remove-conn-btn" @click="removeConnection(selectedClue.id, connId)">✕</button>
              </div>
              <div v-if="selectedClue.connections.length === 0" class="no-connections">
                <span class="hint">暂无关联，点击上方"建立关联"按钮添加</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <div class="empty-icon">🧩</div>
          <p>选择一个线索进行编辑</p>
        </div>
      </div>

      <div class="connections-panel card">
        <div class="panel-header">
          <h3>关联图谱</h3>
          <span class="connection-count">{{ connections.length }} 个连接</span>
        </div>
        <div class="connections-graph">
          <div class="connections-list">
            <div
              v-for="(conn, index) in connections"
              :key="`${conn.clue1.id}-${conn.clue2.id}-${index}`"
              class="connection-item"
            >
              <div class="conn-node" :title="conn.clue1.name">
                {{ conn.clue1.name }}
              </div>
              <div class="conn-line">
                <span class="conn-icon">🔗</span>
              </div>
              <div class="conn-node" :title="conn.clue2.name">
                {{ conn.clue2.name }}
              </div>
              <button class="remove-btn" @click="removeConnection(conn.clue1.id, conn.clue2.id)">
                移除
              </button>
            </div>
            <div v-if="connections.length === 0" class="empty-state">
              <p>尚无任何关联</p>
              <p class="hint">选择线索后点击"建立关联"</p>
            </div>
          </div>
        </div>

        <div class="clue-network">
          <h4 class="network-title">线索网络</h4>
          <div class="network-stats">
            <div class="stat">
              <span class="stat-label">总线索</span>
              <span class="stat-value">{{ clues.length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">连接数</span>
              <span class="stat-value">{{ connections.length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">平均连接</span>
              <span class="stat-value">
                {{ clues.length > 0 ? (connections.length * 2 / clues.length).toFixed(1) : '0' }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="connectingFrom" class="connecting-hint">
      <p>🔗 点击另一个线索完成连接</p>
      <button @click="connectingFrom = null">取消</button>
    </div>
  </div>
</template>

<style scoped>
.clues-config {
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
  grid-template-columns: 280px 1fr 300px;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.clues-list-panel,
.clue-detail-panel,
.connections-panel {
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
.connect-btn {
  padding: 0.3rem 0.75rem;
  font-size: 0.8rem;
  background: var(--color-accent);
  border: none;
  color: white;
}

.add-btn:hover,
.connect-btn:hover {
  background: var(--color-accent-light);
}

.connect-btn.active {
  background: var(--color-warning);
}

.connection-count {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.clues-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.clue-item {
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

.clue-item.already-connected {
  opacity: 0.6;
}

@keyframes pulse-border {
  0%, 100% { box-shadow: 0 0 5px rgba(58, 139, 90, 0.3); }
  50% { box-shadow: 0 0 15px rgba(58, 139, 90, 0.6); }
}

.clue-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 6px;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.clue-info {
  flex: 1;
  min-width: 0;
}

.clue-name {
  display: block;
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.clue-type {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.clue-importance {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: white;
  font-size: 0.75rem;
  font-weight: bold;
  flex-shrink: 0;
}

.delete-btn,
.remove-conn-btn,
.remove-btn {
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.75rem;
  border-radius: 4px;
  flex-shrink: 0;
}

.delete-btn {
  width: 24px;
  height: 24px;
}

.remove-conn-btn {
  width: 18px;
  height: 18px;
  font-size: 0.65rem;
}

.delete-btn:hover,
.remove-conn-btn:hover,
.remove-btn:hover {
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

.clue-detail {
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

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.importance-slider {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.importance-slider input[type="range"] {
  flex: 1;
  cursor: pointer;
}

.importance-value {
  font-weight: bold;
  font-size: 0.9rem;
  min-width: 50px;
  text-align: center;
}

.connections-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.connection-tag {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.6rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--color-text);
}

.conn-icon {
  font-size: 0.75rem;
}

.no-connections {
  width: 100%;
  text-align: center;
  padding: 1rem;
  color: var(--color-text-dim);
}

.no-connections .hint {
  font-size: 0.8rem;
}

.connections-graph {
  flex: 1;
  overflow-y: auto;
}

.connections-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.conn-node {
  flex: 1;
  padding: 0.4rem 0.6rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
  font-size: 0.8rem;
  color: var(--color-text);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conn-line {
  flex-shrink: 0;
  color: var(--color-accent);
}

.clue-network {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.network-title {
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.network-stats {
  display: flex;
  gap: 0.75rem;
}

.stat {
  flex: 1;
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.2rem;
  color: var(--color-accent-light);
  font-weight: bold;
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

@media (max-width: 1024px) {
  .config-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }
}
</style>
