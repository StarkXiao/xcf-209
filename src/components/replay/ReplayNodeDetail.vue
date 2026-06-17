<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useReplayStore } from '@/stores/replay'
import type { ReplayNode, ReplayNodeType } from '@/types'

const replayStore = useReplayStore()

const node = computed(() => replayStore.selectedNode)
const isEditing = computed(() => replayStore.state.isEditing)

const editTitle = ref('')
const editDescription = ref('')
const editTags = ref('')

watch(node, (n) => {
  if (n) {
    editTitle.value = n.title
    editDescription.value = n.description
    editTags.value = n.tags.join(', ')
  }
}, { immediate: true })

const typeConfig: Record<ReplayNodeType, { icon: string; color: string; label: string }> = {
  scene_visit: { icon: '📍', color: '#4a90d9', label: '场景探索' },
  evidence_discovery: { icon: '🔍', color: '#9b59b6', label: '证据发现' },
  clue_discovery: { icon: '💡', color: '#f39c12', label: '线索获得' },
  clue_analysis: { icon: '🧠', color: '#3498db', label: '线索分析' },
  clue_connection: { icon: '🔗', color: '#1abc9c', label: '线索关联' },
  deduction_branch: { icon: '🌿', color: '#27ae60', label: '推演分支' },
  conclusion: { icon: '🏆', color: '#e74c3c', label: '案件结案' },
  sanity_event: { icon: '💔', color: '#c0392b', label: '理智事件' },
  tool_use: { icon: '🔧', color: '#7f8c8d', label: '工具使用' },
  phase_unlock: { icon: '🔓', color: '#d35400', label: '阶段解锁' },
  mail_read: { icon: '📧', color: '#2980b9', label: '邮件阅读' },
  document_read: { icon: '📚', color: '#8e44ad', label: '文书阅读' },
  key_moment: { icon: '⭐', color: '#f1c40f', label: '关键时刻' }
}

function getNodeConfig(n: ReplayNode) {
  return typeConfig[n.type] || typeConfig.key_moment
}

function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatRelativeTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  if (hours > 0) {
    return `${hours}小时${mins}分${secs}秒`
  }
  if (mins > 0) {
    return `${mins}分${secs}秒`
  }
  return `${secs}秒`
}

function saveEdits() {
  if (!node.value) return
  replayStore.updateNode(node.value.id, {
    title: editTitle.value,
    description: editDescription.value,
    tags: editTags.value.split(',').map(t => t.trim()).filter(Boolean)
  })
}

function cancelEdits() {
  if (!node.value) return
  editTitle.value = node.value.title
  editDescription.value = node.value.description
  editTags.value = node.value.tags.join(', ')
}
</script>

<template>
  <div class="node-detail-panel">
    <div v-if="!node" class="empty-detail">
      <div class="empty-icon">👈</div>
      <p class="empty-text">选择一个时间节点查看详情</p>
      <p class="empty-hint">点击时间轴上的节点卡片</p>
    </div>

    <div v-else class="detail-content">
      <div class="detail-header" :style="{ borderColor: getNodeConfig(node).color }">
        <div class="header-icon" :style="{ backgroundColor: getNodeConfig(node).color }">
          {{ getNodeConfig(node).icon }}
        </div>
        <div class="header-info">
          <span class="type-label" :style="{ color: getNodeConfig(node).color }">
            {{ getNodeConfig(node).label }}
          </span>
          <h3 v-if="!isEditing" class="detail-title">{{ node.title }}</h3>
          <input 
            v-else
            v-model="editTitle" 
            class="title-input"
            type="text"
            placeholder="节点标题"
          />
        </div>
        <div v-if="node.isKeyMoment" class="key-badge">
          ⭐ 关键节点
        </div>
      </div>

      <div class="time-info">
        <div class="time-item">
          <span class="time-icon">⏱️</span>
          <div class="time-texts">
            <span class="time-label">相对时间</span>
            <span class="time-value">{{ formatRelativeTime(node.relativeTime) }}</span>
          </div>
        </div>
        <div class="time-item">
          <span class="time-icon">📅</span>
          <div class="time-texts">
            <span class="time-label">记录时间</span>
            <span class="time-value">{{ formatDateTime(node.timestamp) }}</span>
          </div>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="section-title">
          <span class="title-icon">📝</span>
          详情描述
        </h4>
        <p v-if="!isEditing" class="section-text">{{ node.description }}</p>
        <textarea 
          v-else
          v-model="editDescription"
          class="description-input"
          rows="4"
          placeholder="节点描述"
        ></textarea>
      </div>

      <div v-if="node.sanityChange !== undefined" class="detail-section sanity-section">
        <h4 class="section-title">
          <span class="title-icon">🧠</span>
          理智变化
        </h4>
        <div class="sanity-display" :class="{ loss: node.sanityChange < 0, gain: node.sanityChange > 0 }">
          <span class="sanity-icon">{{ node.sanityChange < 0 ? '💔' : '💚' }}</span>
          <span class="sanity-amount">
            {{ node.sanityChange > 0 ? '+' : '' }}{{ node.sanityChange }}
          </span>
          <span class="sanity-label">{{ node.sanityChange < 0 ? '下降' : '恢复' }}</span>
        </div>
      </div>

      <div class="detail-section">
        <h4 class="section-title">
          <span class="title-icon">🏷️</span>
          标签
        </h4>
        <div v-if="!isEditing" class="tags-display">
          <span 
            v-for="tag in node.tags" 
            :key="tag"
            class="tag-badge"
          >
            #{{ tag }}
          </span>
          <span v-if="node.tags.length === 0" class="no-tags">暂无标签</span>
        </div>
        <input
          v-else
          v-model="editTags"
          class="tags-input"
          type="text"
          placeholder="用逗号分隔多个标签，如：证据,重要,恐怖"
        />
      </div>

      <div v-if="Object.keys(node.details).length > 0" class="detail-section">
        <h4 class="section-title">
          <span class="title-icon">📊</span>
          元数据
        </h4>
        <div class="metadata-grid">
          <div 
            v-for="(value, key) in node.details" 
            :key="key"
            class="metadata-item"
          >
            <span class="meta-key">{{ key }}</span>
            <span class="meta-value">
              {{ typeof value === 'object' ? JSON.stringify(value, null, 0) : value }}
            </span>
          </div>
        </div>
      </div>

      <div v-if="node.rawEvent" class="detail-section">
        <h4 class="section-title">
          <span class="title-icon">🔬</span>
          原始事件数据
          <span v-if="node.sourceLogId" class="log-id-badge">
            日志ID: {{ node.sourceLogId.slice(0, 16) }}...
          </span>
        </h4>

        <div v-if="node.sourceLogType" class="source-tag">
          <span class="source-label">来源类型:</span>
          <span class="source-value">{{ node.sourceLogType }}</span>
          <span v-if="node.details?.inferred" class="inferred-badge">⚠️ 推断数据</span>
          <span v-else class="verified-badge">✓ 真实记录</span>
        </div>

        <div v-if="node.rawEvent.logEntry" class="log-entry-section">
          <h5 class="subsection-title">📜 原始日志</h5>
          <div class="log-entry-card">
            <div class="log-entry-time">
              {{ formatDateTime(node.rawEvent.logEntry.timestamp) }}
            </div>
            <div class="log-entry-type">
              类型: <strong>{{ node.rawEvent.logEntry.type }}</strong>
            </div>
            <div class="log-entry-desc">
              {{ node.rawEvent.logEntry.description }}
            </div>
            <div v-if="node.rawEvent.logEntry.details && Object.keys(node.rawEvent.logEntry.details).length > 0" class="log-entry-details">
              <details>
                <summary>详细参数</summary>
                <pre class="details-json">{{ JSON.stringify(node.rawEvent.logEntry.details, null, 2) }}</pre>
              </details>
            </div>
          </div>
        </div>

        <div v-if="node.rawEvent.snapshot" class="snapshot-section">
          <h5 class="subsection-title">📸 状态快照</h5>
          <div class="snapshot-grid">
            <div v-if="node.rawEvent.snapshot.sanity !== undefined" class="snapshot-item">
              <span class="snap-key">🧠 理智值</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.sanity }}/{{ node.rawEvent.snapshot.maxSanity || '?' }}</span>
            </div>
            <div v-if="node.rawEvent.snapshot.remainingTime !== undefined" class="snapshot-item">
              <span class="snap-key">⏱️ 剩余时间</span>
              <span class="snap-value">{{ formatRelativeTime(node.rawEvent.snapshot.remainingTime) }}</span>
            </div>
            <div v-if="node.rawEvent.snapshot.discoveredEvidence" class="snapshot-item">
              <span class="snap-key">🔍 已发现证据</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.discoveredEvidence.length }} 件</span>
            </div>
            <div v-if="node.rawEvent.snapshot.discoveredClues" class="snapshot-item">
              <span class="snap-key">💡 已获得线索</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.discoveredClues.length }} 条</span>
            </div>
            <div v-if="node.rawEvent.snapshot.analyzedClues" class="snapshot-item">
              <span class="snap-key">🧠 已分析线索</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.analyzedClues.length }} 条</span>
            </div>
            <div v-if="node.rawEvent.snapshot.visitedScenes" class="snapshot-item">
              <span class="snap-key">📍 已访问场景</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.visitedScenes.length }} 个</span>
            </div>
            <div v-if="node.rawEvent.snapshot.deductionBranches" class="snapshot-item">
              <span class="snap-key">🌿 推演分支</span>
              <span class="snap-value">{{ node.rawEvent.snapshot.deductionBranches.length }} 个</span>
            </div>
          </div>
        </div>

        <div v-if="node.rawEvent.context && Object.keys(node.rawEvent.context).length > 0" class="context-section">
          <h5 class="subsection-title">🎯 事件上下文</h5>
          <details class="context-details" open>
            <summary>展开查看</summary>
            <pre class="context-json">{{ JSON.stringify(node.rawEvent.context, null, 2) }}</pre>
          </details>
        </div>
      </div>

      <div v-if="isEditing" class="edit-actions">
        <button class="btn btn-cancel" @click="cancelEdits">
          取消
        </button>
        <button class="btn btn-save" @click="saveEdits">
          💾 保存修改
        </button>
      </div>

      <div class="node-actions">
        <button 
          class="action-btn full"
          @click="replayStore.toggleKeyMoment(node.id)"
        >
          {{ node.isKeyMoment ? '⭐ 取消关键标记' : '☆ 标记为关键节点' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-detail-panel {
  height: 100%;
  overflow-y: auto;
  background: rgba(20, 20, 30, 0.95);
  border-left: 1px solid var(--color-border);
}

.empty-detail {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem 2rem;
  text-align: center;
}

.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 1rem;
  opacity: 0.4;
}

.empty-text {
  font-size: 1.1rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  opacity: 0.6;
}

.detail-content {
  padding: 1.5rem;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid var(--color-accent);
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  flex-shrink: 0;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.type-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  display: block;
  margin-bottom: 0.35rem;
}

.detail-title {
  font-size: 1.2rem;
  color: var(--color-text);
  margin: 0;
  line-height: 1.4;
  font-weight: 700;
}

.title-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 1.1rem;
  font-weight: 600;
}

.title-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.key-badge {
  background: linear-gradient(135deg, rgba(241, 196, 15, 0.2), rgba(255, 140, 0, 0.2));
  border: 1px solid rgba(241, 196, 15, 0.5);
  color: #f1c40f;
  padding: 0.3rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
}

.time-info {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.time-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.time-icon {
  font-size: 1.15rem;
}

.time-texts {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.time-label {
  font-size: 0.65rem;
  color: var(--color-text-dim);
  opacity: 0.7;
}

.time-value {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.section-title {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.section-text {
  font-size: 0.9rem;
  color: var(--color-text);
  line-height: 1.7;
  margin: 0;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border-left: 3px solid var(--color-accent);
}

.description-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.9rem;
  line-height: 1.6;
  resize: vertical;
  min-height: 100px;
}

.description-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.sanity-section .sanity-display {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-radius: 10px;
  background: rgba(46, 204, 113, 0.1);
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.sanity-display.loss {
  background: rgba(231, 76, 60, 0.1);
  border-color: rgba(231, 76, 60, 0.3);
}

.sanity-icon {
  font-size: 1.75rem;
}

.sanity-amount {
  font-size: 1.6rem;
  font-weight: 800;
  color: #2ecc71;
}

.sanity-display.loss .sanity-amount {
  color: #e74c3c;
}

.sanity-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.tags-display {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-badge {
  padding: 0.25rem 0.7rem;
  background: rgba(107, 76, 154, 0.25);
  border: 1px solid rgba(107, 76, 154, 0.5);
  color: var(--color-accent-light);
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
}

.no-tags {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  opacity: 0.5;
  font-style: italic;
}

.tags-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.85rem;
}

.tags-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.metadata-grid {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 200px;
  overflow-y: auto;
  padding: 0.25rem;
}

.metadata-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 0.8rem;
}

.meta-key {
  color: var(--color-text-dim);
  font-weight: 600;
  flex-shrink: 0;
  max-width: 40%;
}

.meta-value {
  color: var(--color-accent-light);
  word-break: break-all;
  text-align: right;
}

.edit-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.btn {
  padding: 0.6rem 1.25rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-save {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
  flex: 1;
}

.btn-save:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 76, 154, 0.4);
}

.btn-cancel {
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-text-dim);
  border: 1px solid var(--color-border);
}

.btn-cancel:hover {
  background: rgba(0, 0, 0, 0.5);
}

.node-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-btn.full {
  width: 100%;
  padding: 0.75rem;
  background: rgba(241, 196, 15, 0.1);
  border: 1px solid rgba(241, 196, 15, 0.3);
  color: #f1c40f;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.action-btn.full:hover {
  background: rgba(241, 196, 15, 0.2);
  transform: translateY(-1px);
}

.section-title {
  position: relative;
}

.log-id-badge {
  font-size: 0.65rem;
  font-weight: 500;
  color: var(--color-text-dim);
  background: rgba(255, 255, 255, 0.05);
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  margin-left: auto;
  font-family: 'Courier New', monospace;
}

.source-tag {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 0.8rem;
  flex-wrap: wrap;
}

.source-label {
  color: var(--color-text-dim);
  font-weight: 600;
}

.source-value {
  color: var(--color-accent-light);
  font-weight: 700;
  font-family: 'Courier New', monospace;
}

.inferred-badge {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}

.verified-badge {
  margin-left: auto;
  padding: 0.15rem 0.5rem;
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 600;
}

.subsection-title {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  letter-spacing: 0.3px;
  opacity: 0.85;
}

.log-entry-section,
.snapshot-section,
.context-section {
  margin-bottom: 1rem;
}

.log-entry-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  border-left: 3px solid var(--color-accent);
}

.log-entry-time {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  margin-bottom: 0.35rem;
  font-family: 'Courier New', monospace;
}

.log-entry-type {
  font-size: 0.8rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.log-entry-desc {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.6;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 4px;
  margin-bottom: 0.5rem;
}

.log-entry-details details,
.context-details {
  font-size: 0.75rem;
}

.log-entry-details summary,
.context-details summary {
  cursor: pointer;
  color: var(--color-accent-light);
  padding: 0.25rem 0;
  user-select: none;
}

.log-entry-details summary:hover,
.context-details summary:hover {
  color: var(--color-accent);
}

.details-json,
.context-json {
  background: rgba(0, 0, 0, 0.4);
  padding: 0.75rem;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 0.7rem;
  color: var(--color-accent-light);
  overflow-x: auto;
  margin-top: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}

.snapshot-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.4rem;
}

.snapshot-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem 0.6rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.03);
}

.snap-key {
  font-size: 0.65rem;
  color: var(--color-text-dim);
  opacity: 0.75;
}

.snap-value {
  font-size: 0.85rem;
  color: var(--color-accent-light);
  font-weight: 700;
}

@media (max-width: 1024px) {
  .detail-content {
    padding: 1rem;
  }
  
  .time-info {
    grid-template-columns: 1fr;
  }
  
  .snapshot-grid {
    grid-template-columns: 1fr;
  }
}
</style>
