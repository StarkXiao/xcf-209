<script setup lang="ts">
import { computed } from 'vue'
import { useReplayStore } from '@/stores/replay'
import type { ReplayNode, ReplayNodeType } from '@/types'

const replayStore = useReplayStore()

const nodes = computed(() => replayStore.filteredNodes)
const selectedNodeId = computed(() => replayStore.state.selectedNodeId)
const highlightedIds = computed(() => replayStore.state.highlightedNodeIds)
const isEditing = computed(() => replayStore.state.isEditing)

const typeConfig: Record<ReplayNodeType, { icon: string; color: string; label: string }> = {
  scene_visit: { icon: '📍', color: '#4a90d9', label: '场景' },
  evidence_discovery: { icon: '🔍', color: '#9b59b6', label: '证据' },
  clue_discovery: { icon: '💡', color: '#f39c12', label: '线索' },
  clue_analysis: { icon: '🧠', color: '#3498db', label: '分析' },
  clue_connection: { icon: '🔗', color: '#1abc9c', label: '关联' },
  deduction_branch: { icon: '🌿', color: '#27ae60', label: '分支' },
  conclusion: { icon: '🏆', color: '#e74c3c', label: '结案' },
  sanity_event: { icon: '💔', color: '#c0392b', label: '理智' },
  tool_use: { icon: '🔧', color: '#7f8c8d', label: '工具' },
  phase_unlock: { icon: '🔓', color: '#d35400', label: '阶段' },
  mail_read: { icon: '📧', color: '#2980b9', label: '邮件' },
  document_read: { icon: '📚', color: '#8e44ad', label: '文书' },
  key_moment: { icon: '⭐', color: '#f1c40f', label: '关键' }
}

function getNodeConfig(node: ReplayNode) {
  return typeConfig[node.type] || typeConfig.key_moment
}

function handleNodeClick(node: ReplayNode) {
  replayStore.selectNode(node.id)
}

function handleKeyMomentToggle(e: Event, node: ReplayNode) {
  e.stopPropagation()
  replayStore.toggleKeyMoment(node.id)
}

function handleNodeDelete(e: Event, node: ReplayNode) {
  e.stopPropagation()
  if (confirm(`确定删除节点「${node.title}」吗？`)) {
    replayStore.removeNode(node.id)
  }
}

function handleNodeHover(node: ReplayNode, enter: boolean) {
  if (enter) {
    replayStore.highlightNode(node.id)
  } else {
    replayStore.unhighlightNode(node.id)
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  if (mins > 0) {
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return `0:${secs.toString().padStart(2, '0')}`
}

function getProgressPercent(node: ReplayNode): number {
  const timeline = replayStore.activeTimeline
  if (!timeline) return 0
  return (node.relativeTime / Math.max(timeline.totalDuration, 1)) * 100
}
</script>

<template>
  <div class="replay-timeline">
    <div v-if="nodes.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无时间轴数据</p>
      <p class="empty-hint">选择一个案件生成回放时间轴</p>
    </div>

    <div v-else class="timeline-container">
      <div class="timeline-track">
        <div
          v-for="(node, index) in nodes"
          :key="node.id"
          class="timeline-item"
          :class="{
            selected: selectedNodeId === node.id,
            highlighted: highlightedIds.includes(node.id),
            'key-moment': node.isKeyMoment,
            even: index % 2 === 0,
            odd: index % 2 === 1
          }"
          @click="handleNodeClick(node)"
          @mouseenter="handleNodeHover(node, true)"
          @mouseleave="handleNodeHover(node, false)"
        >
          <div class="item-connector">
            <div class="connector-line top" v-if="index > 0"></div>
            <div 
              class="node-dot"
              :style="{ 
                backgroundColor: node.isKeyMoment ? '#f1c40f' : getNodeConfig(node).color,
                boxShadow: node.isKeyMoment ? '0 0 12px rgba(241, 196, 15, 0.6)' : 'none'
              }"
            >
              <span class="dot-icon">{{ getNodeConfig(node).icon }}</span>
              <span v-if="node.isKeyMoment" class="star-badge">⭐</span>
            </div>
            <div class="connector-line bottom" v-if="index < nodes.length - 1"></div>
          </div>

          <div class="item-card" :style="{ borderLeftColor: getNodeConfig(node).color }">
            <div class="card-header">
              <div class="header-left">
                <span class="type-badge" :style="{ backgroundColor: getNodeConfig(node).color + '33', color: getNodeConfig(node).color }">
                  {{ getNodeConfig(node).label }}
                </span>
                <span class="timestamp">{{ formatTime(node.relativeTime) }}</span>
                <span v-if="node.details?.inferred" class="data-badge inferred" title="时间推断得出，非真实记录">
                  ⚠️ 推断
                </span>
                <span v-else-if="node.sourceLogId" class="data-badge verified" title="来自真实操作日志">
                  ✓ 真实
                </span>
              </div>
              <div class="header-right" v-if="isEditing">
                <button 
                  class="action-btn star-btn" 
                  :class="{ active: node.isKeyMoment }"
                  @click="handleKeyMomentToggle($event, node)"
                  :title="node.isKeyMoment ? '取消关键节点' : '标记为关键节点'"
                >
                  {{ node.isKeyMoment ? '⭐' : '☆' }}
                </button>
                <button 
                  class="action-btn delete-btn"
                  @click="handleNodeDelete($event, node)"
                  title="删除节点"
                >
                  🗑️
                </button>
              </div>
            </div>

            <h4 class="node-title">
              <span v-if="node.isKeyMoment" class="key-marker">⭐ </span>
              {{ node.title }}
            </h4>
            
            <p class="node-description">{{ node.description }}</p>

            <div v-if="node.tags.length > 0" class="node-tags">
              <span 
                v-for="tag in node.tags" 
                :key="tag" 
                class="tag-chip"
              >
                #{{ tag }}
              </span>
            </div>

            <div v-if="node.sanityChange !== undefined" class="sanity-change" :class="{ loss: node.sanityChange < 0, gain: node.sanityChange > 0 }">
              <span class="sanity-icon">{{ node.sanityChange < 0 ? '💔' : '💚' }}</span>
              <span class="sanity-value">
                理智 {{ node.sanityChange > 0 ? '+' : '' }}{{ node.sanityChange }}
              </span>
            </div>

            <div class="progress-indicator">
              <div 
                class="progress-fill" 
                :style="{ width: getProgressPercent(node) + '%', backgroundColor: getNodeConfig(node).color }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-timeline {
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 1.25rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.empty-hint {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  opacity: 0.7;
}

.timeline-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.timeline-track {
  position: relative;
  max-width: 900px;
  margin: 0 auto;
}

.timeline-item {
  display: flex;
  gap: 1.5rem;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  padding: 0.5rem 0;
}

.timeline-item:hover {
  transform: translateX(5px);
}

.timeline-item.selected .item-card {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(107, 76, 154, 0.3);
  background: rgba(107, 76, 154, 0.15);
}

.timeline-item.highlighted .item-card {
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.timeline-item.key-moment .item-card {
  background: rgba(241, 196, 15, 0.05);
}

.item-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
  flex-shrink: 0;
  position: relative;
}

.connector-line {
  width: 2px;
  flex: 1;
  background: linear-gradient(180deg, rgba(107, 76, 154, 0.3), rgba(107, 76, 154, 0.1));
  min-height: 20px;
}

.node-dot {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid rgba(255, 255, 255, 0.1);
  position: relative;
  flex-shrink: 0;
  transition: all 0.3s ease;
  z-index: 1;
}

.timeline-item:hover .node-dot {
  transform: scale(1.1);
}

.timeline-item.selected .node-dot {
  transform: scale(1.15);
  border-color: var(--color-accent);
}

.dot-icon {
  font-size: 1.35rem;
}

.star-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 1rem;
  filter: drop-shadow(0 0 4px rgba(241, 196, 15, 0.8));
}

.item-card {
  flex: 1;
  background: rgba(30, 30, 45, 0.85);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  border-left: 4px solid var(--color-accent);
  transition: all 0.3s ease;
  backdrop-filter: blur(8px);
}

.timeline-item:hover .item-card {
  border-color: rgba(255, 255, 255, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
  gap: 0.75rem;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.type-badge {
  padding: 0.2rem 0.65rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.timestamp {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  background: rgba(0, 0, 0, 0.3);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
}

.data-badge {
  font-size: 0.65rem;
  font-weight: 700;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  letter-spacing: 0.2px;
}

.data-badge.inferred {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
  border: 1px solid rgba(231, 76, 60, 0.3);
}

.data-badge.verified {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
  border: 1px solid rgba(46, 204, 113, 0.3);
}

.header-right {
  display: flex;
  gap: 0.35rem;
}

.action-btn {
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: rgba(0, 0, 0, 0.5);
  transform: translateY(-1px);
}

.star-btn.active {
  background: rgba(241, 196, 15, 0.2);
  color: #f1c40f;
}

.delete-btn:hover {
  background: rgba(231, 76, 60, 0.3);
}

.node-title {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0 0 0.5rem 0;
  font-weight: 600;
  line-height: 1.4;
}

.key-marker {
  color: #f1c40f;
}

.node-description {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.6;
  margin: 0 0 0.75rem 0;
}

.node-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.75rem;
}

.tag-chip {
  font-size: 0.7rem;
  padding: 0.15rem 0.55rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid rgba(107, 76, 154, 0.4);
  border-radius: 10px;
  color: var(--color-accent-light);
}

.sanity-change {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
}

.sanity-change.loss {
  background: rgba(231, 76, 60, 0.15);
  color: #e74c3c;
}

.sanity-change.gain {
  background: rgba(46, 204, 113, 0.15);
  color: #2ecc71;
}

.progress-indicator {
  height: 3px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 0.25rem;
}

.progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.5s ease;
  opacity: 0.5;
}

@media (max-width: 768px) {
  .timeline-container {
    padding: 1rem 0.75rem;
  }

  .timeline-item {
    gap: 0.75rem;
  }

  .item-connector {
    width: 40px;
  }

  .node-dot {
    width: 40px;
    height: 40px;
  }

  .dot-icon {
    font-size: 1.05rem;
  }

  .item-card {
    padding: 0.75rem 1rem;
  }

  .node-title {
    font-size: 0.9rem;
  }

  .card-header {
    flex-wrap: wrap;
  }
}
</style>
