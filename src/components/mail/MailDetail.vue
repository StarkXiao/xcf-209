<script setup lang="ts">
import { computed } from 'vue'
import type { Mail, MailReplyOption } from '@/types'

const props = defineProps<{
  mail: Mail
}>()

const emit = defineEmits<{
  close: []
  reply: [option: MailReplyOption]
}>()

const formattedDate = computed(() => {
  const date = new Date(props.mail.sentAt)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const contentLines = computed(() => {
  return props.mail.content.split('\n').filter(line => line.trim() !== '')
})

function getAttachmentIcon(type: string): string {
  const icons: Record<string, string> = {
    document: '📄',
    image: '🖼️',
    audio: '🎵',
    evidence: '🔍'
  }
  return icons[type] || '📎'
}

function handleReply(option: MailReplyOption) {
  emit('reply', option)
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
  <div class="mail-detail-overlay" @click.self="emit('close')">
    <div class="mail-detail">
      <div class="detail-header">
        <button class="close-btn" @click="emit('close')">
          ✕
        </button>
      </div>

      <div class="detail-content">
        <div class="mail-header">
          <div class="subject-row">
            <h2 class="mail-subject">{{ mail.subject }}</h2>
            <span v-if="mail.isImportant" class="important-badge">⭐ 重要</span>
          </div>

          <div class="mail-meta">
            <div class="sender-info">
              <div class="sender-avatar">
                {{ mail.sender.charAt(0) }}
              </div>
              <div class="sender-details">
                <div class="sender-name">{{ mail.sender }}</div>
                <div class="sender-title">{{ mail.senderTitle }}</div>
              </div>
            </div>
            <div class="date-info">
              {{ formattedDate }}
            </div>
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

        <div class="mail-body">
          <p v-for="(line, index) in contentLines" :key="index" class="body-paragraph">
            {{ line }}
          </p>
        </div>

        <div v-if="mail.attachments && mail.attachments.length > 0" class="attachments-section">
          <h3 class="section-title">📎 附件</h3>
          <div class="attachments-list">
            <div
              v-for="attachment in mail.attachments"
              :key="attachment.id"
              class="attachment-item"
            >
              <span class="attachment-icon">{{ getAttachmentIcon(attachment.type) }}</span>
              <div class="attachment-info">
                <div class="attachment-name">{{ attachment.name }}</div>
                <div class="attachment-desc">{{ attachment.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="mail.replyOptions && mail.replyOptions.length > 0" class="reply-section">
          <h3 class="section-title">💬 回复选项</h3>
          <div class="reply-options">
            <button
              v-for="option in mail.replyOptions"
              :key="option.id"
              class="reply-option-btn"
              @click="handleReply(option)"
            >
              {{ option.text }}
              <div v-if="option.effect" class="reply-effect">
                <span v-if="option.effect.sanity" class="effect-item sanity">
                  理智 {{ option.effect.sanity > 0 ? '+' : '' }}{{ option.effect.sanity }}
                </span>
                <span v-if="option.effect.intelligenceBonus" class="effect-item intel">
                  情报 +{{ option.effect.intelligenceBonus }}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div class="mail-footer">
          <div class="intelligence-info">
            <span class="intel-icon">💡</span>
            <span>阅读此邮件可获得情报 +{{ mail.intelligenceValue }}</span>
          </div>
          <div v-if="mail.sanityEffect && mail.sanityEffect !== 0" class="sanity-info">
            <span class="sanity-icon">🧠</span>
            <span :class="{ 'sanity-negative': mail.sanityEffect < 0 }">
              理智值 {{ mail.sanityEffect > 0 ? '+' : '' }}{{ mail.sanityEffect }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.mail-detail-overlay {
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
  padding: 2rem;
}

.mail-detail {
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 12px;
  border: 1px solid var(--color-border);
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.detail-header {
  display: flex;
  justify-content: flex-end;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.close-btn {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: var(--color-text-dim);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.1rem;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  color: var(--color-text);
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
}

.mail-header {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.subject-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.mail-subject {
  font-size: 1.5rem;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.important-badge {
  background: rgba(255, 193, 7, 0.2);
  color: #ffc107;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: bold;
  white-space: nowrap;
}

.mail-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sender-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sender-avatar {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-weight: bold;
  font-size: 1.25rem;
}

.sender-details {
  display: flex;
  flex-direction: column;
}

.sender-name {
  color: var(--color-text);
  font-weight: bold;
  font-size: 1rem;
}

.sender-title {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.date-info {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.mail-tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.mail-tag {
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.mail-body {
  margin-bottom: 2rem;
}

.body-paragraph {
  color: var(--color-text);
  line-height: 1.8;
  margin-bottom: 1rem;
  font-size: 0.95rem;
}

.attachments-section,
.reply-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.section-title {
  color: var(--color-accent-light);
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.attachment-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 6px;
  border: 1px solid rgba(107, 76, 154, 0.3);
}

.attachment-icon {
  font-size: 1.5rem;
}

.attachment-info {
  flex: 1;
}

.attachment-name {
  color: var(--color-text);
  font-weight: 500;
  font-size: 0.9rem;
  margin-bottom: 0.125rem;
}

.attachment-desc {
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.reply-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reply-option-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: rgba(107, 76, 154, 0.15);
  border: 1px solid rgba(107, 76, 154, 0.4);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.reply-option-btn:hover {
  background: rgba(107, 76, 154, 0.3);
  border-color: var(--color-accent);
  transform: translateX(5px);
}

.reply-effect {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.effect-item {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}

.effect-item.sanity {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.effect-item.sanity.sanity-negative {
  color: #f44336;
}

.effect-item.intel {
  background: rgba(107, 76, 154, 0.3);
  color: var(--color-accent-light);
}

.mail-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.intelligence-info,
.sanity-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.intelligence-info {
  color: var(--color-accent-light);
}

.sanity-info {
  color: var(--color-text-dim);
}

.sanity-negative {
  color: var(--color-danger);
}

.intel-icon,
.sanity-icon {
  font-size: 1.1rem;
}

@media (max-width: 768px) {
  .mail-detail-overlay {
    padding: 1rem;
  }

  .detail-content {
    padding: 1rem;
  }

  .mail-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .subject-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .mail-footer {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}
</style>
