<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Mail, MailReplyOption } from '@/types'
import MailDetail from './MailDetail.vue'

const gameStore = useGameStore()

const selectedMailId = ref<string | null>(null)
const showDetail = ref(false)
const filterUnread = ref(false)

const mails = computed(() => {
  let result = gameStore.availableMails
  if (filterUnread.value) {
    result = result.filter(m => !m.isRead)
  }
  return result
})

const selectedMail = computed(() => {
  if (!selectedMailId.value) return null
  return gameStore.getMailById(selectedMailId.value)
})

const newMailNotifications = computed(() => {
  return gameStore.gameState.intelligenceState.mailNotifications
})

watch(newMailNotifications, (newMails) => {
  if (newMails.length > 0) {
    newMails.forEach(mailId => {
      setTimeout(() => {
        gameStore.clearMailNotification(mailId)
      }, 5000)
    })
  }
})

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function selectMail(mail: Mail) {
  selectedMailId.value = mail.id
  showDetail.value = true
  
  if (!mail.isRead) {
    gameStore.readMail(mail.id)
  }
}

function closeDetail() {
  showDetail.value = false
  selectedMailId.value = null
}

function handleReply(replyOption: MailReplyOption) {
  if (!selectedMailId.value) return
  
  const result = gameStore.replyToMail(selectedMailId.value, replyOption)
  if (result.success && result.nextMail) {
    selectedMailId.value = result.nextMail.id
    gameStore.readMail(result.nextMail.id)
  }
}

function getTagColor(tag: string): string {
  const tagColors: Record<string, string> = {
    '紧急': '#ff4444',
    '机密': '#ff9800',
    '案件委托': '#4caf50',
    '背景资料': '#2196f3',
    '历史': '#9c27b0',
    '组织调查': '#f44336',
    '医疗': '#e91e63',
    '警告': '#ff5722',
    '技术分析': '#00bcd4',
    '超自然': '#673ab7',
    '考古': '#795548',
    '神话传说': '#9e9e9e',
    '结案': '#4caf50',
    '总部通知': '#ffc107'
  }
  return tagColors[tag] || '#607d8b'
}
</script>

<template>
  <div class="mail-inbox">
    <div class="inbox-header">
      <h2 class="inbox-title">
        <span class="title-icon">📧</span>
        案件邮件
        <span v-if="gameStore.unreadMailCount > 0" class="unread-badge">
          {{ gameStore.unreadMailCount }}
        </span>
      </h2>
      <div class="inbox-controls">
        <label class="filter-toggle">
          <input type="checkbox" v-model="filterUnread" />
          仅显示未读
        </label>
      </div>
    </div>

    <div v-if="newMailNotifications.length > 0" class="new-mail-alert">
      <span v-for="mailId in newMailNotifications" :key="mailId" class="alert-item">
        📬 收到新邮件！
      </span>
    </div>

    <div class="mail-list">
      <div v-if="mails.length === 0" class="empty-inbox">
        <div class="empty-icon">📭</div>
        <p class="empty-text">暂无邮件</p>
        <p class="empty-hint">继续调查以获取更多情报</p>
      </div>

      <div
        v-for="mail in mails"
        :key="mail.id"
        class="mail-item"
        :class="{
          unread: !mail.isRead,
          important: mail.isImportant,
          selected: selectedMailId === mail.id
        }"
        @click="selectMail(mail)"
      >
        <div class="mail-status">
          <span v-if="!mail.isRead" class="unread-dot"></span>
          <span v-else-if="mail.isImportant" class="star-icon">⭐</span>
        </div>

        <div class="mail-content">
          <div class="mail-header-row">
            <span class="mail-sender">{{ mail.sender }}</span>
            <span class="mail-date">{{ formatDate(mail.sentAt) }}</span>
          </div>
          <div class="mail-subject">
            {{ mail.subject }}
            <span v-if="mail.isImportant" class="important-label">重要</span>
          </div>
          <div class="mail-preview">
            {{ mail.content.substring(0, 60) }}...
          </div>
          <div class="mail-tags">
            <span
              v-for="tag in mail.tags"
              :key="tag"
              class="mail-tag"
              :style="{ backgroundColor: getTagColor(tag) + '33', color: getTagColor(tag) }"
            >
              {{ tag }}
            </span>
          </div>
        </div>

        <div class="mail-intelligence">
          <span class="intel-label">情报</span>
          <span class="intel-value">+{{ mail.intelligenceValue }}</span>
        </div>
      </div>
    </div>

    <div v-if="gameStore.currentPhase" class="phase-info">
      <div class="phase-header">
        <span class="phase-badge">阶段 {{ gameStore.currentPhase.phaseNumber }}</span>
        <span class="phase-name">{{ gameStore.currentPhase.name }}</span>
      </div>
      <div class="phase-description">{{ gameStore.currentPhase.description }}</div>
      <div class="phase-progress">
        <div class="progress-label">阶段情报</div>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${gameStore.currentPhase.intelligenceLevel}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ gameStore.currentPhase.intelligenceLevel }}%</span>
      </div>
    </div>

    <Transition name="modal">
      <MailDetail
        v-if="showDetail && selectedMail"
        :mail="selectedMail"
        @close="closeDetail"
        @reply="handleReply"
      />
    </Transition>
  </div>
</template>

<style scoped>
.mail-inbox {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.inbox-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(107, 76, 154, 0.2);
  border-bottom: 1px solid var(--color-border);
}

.inbox-title {
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

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--color-text-dim);
  font-size: 0.9rem;
  cursor: pointer;
}

.new-mail-alert {
  position: sticky;
  top: 0;
  z-index: 10;
  background: linear-gradient(90deg, rgba(107, 76, 154, 0.4), rgba(107, 76, 154, 0.2));
  padding: 0.5rem 1rem;
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    transform: translateY(-100%);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.alert-item {
  color: var(--color-accent-light);
  font-weight: bold;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.mail-list {
  flex: 1;
  overflow-y: auto;
}

.empty-inbox {
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

.mail-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer;
  transition: all 0.2s ease;
}

.mail-item:hover {
  background: rgba(107, 76, 154, 0.1);
}

.mail-item.unread {
  background: rgba(107, 76, 154, 0.15);
}

.mail-item.selected {
  background: rgba(107, 76, 154, 0.3);
  border-left: 3px solid var(--color-accent);
}

.mail-item.important {
  border-left: 3px solid #ffc107;
}

.mail-status {
  width: 20px;
  display: flex;
  justify-content: center;
  padding-top: 0.25rem;
}

.unread-dot {
  width: 10px;
  height: 10px;
  background: var(--color-accent);
  border-radius: 50%;
  animation: blink 2s infinite;
}

@keyframes blink {
  0%, 50%, 100% { opacity: 1; }
  25%, 75% { opacity: 0.5; }
}

.star-icon {
  font-size: 0.9rem;
}

.mail-content {
  flex: 1;
  min-width: 0;
}

.mail-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.mail-sender {
  font-weight: bold;
  color: var(--color-text);
  font-size: 0.95rem;
}

.mail-date {
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.mail-subject {
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.important-label {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.mail-preview {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.mail-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mail-tag {
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 500;
}

.mail-intelligence {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(107, 76, 154, 0.2);
  padding: 0.5rem;
  border-radius: 6px;
  min-width: 50px;
}

.intel-label {
  font-size: 0.65rem;
  color: var(--color-text-dim);
  margin-bottom: 0.125rem;
}

.intel-value {
  font-size: 1rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.phase-info {
  padding: 1rem 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-top: 1px solid var(--color-border);
}

.phase-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.phase-badge {
  background: var(--color-accent);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.phase-name {
  color: var(--color-text);
  font-weight: bold;
  font-size: 0.95rem;
}

.phase-description {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.phase-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-label {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  transition: width 0.3s ease;
}

.progress-text {
  color: var(--color-accent-light);
  font-size: 0.8rem;
  font-weight: bold;
  min-width: 40px;
  text-align: right;
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
  .mail-item {
    padding: 0.75rem 1rem;
  }

  .inbox-header {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }

  .mail-preview {
    display: none;
  }
}
</style>
