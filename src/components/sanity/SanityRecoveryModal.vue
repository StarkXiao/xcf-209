<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { SanityRecoveryEvent, SanityRecoveryOption, SanityRecoveryOptionCost } from '@/types'

const gameStore = useGameStore()

defineProps<{
  event: SanityRecoveryEvent
}>()

const emit = defineEmits<{
  selectOption: [optionId: string]
  skip: []
}>()

function getCostIcon(cost: SanityRecoveryOptionCost): string {
  const icons: Record<string, string> = {
    time: '⏱️',
    evidence_penalty: '🔍',
    pollution_erosion: '🕳️',
    tool_durability: '🔧',
    anomaly_risk: '👁️',
    clue_analysis_penalty: '🧠'
  }
  return icons[cost.type] || '⚠️'
}

function getCostColor(cost: SanityRecoveryOptionCost): string {
  const colors: Record<string, string> = {
    time: '#ff9800',
    evidence_penalty: '#f44336',
    pollution_erosion: '#9c27b0',
    tool_durability: '#795548',
    anomaly_risk: '#e91e63',
    clue_analysis_penalty: '#ff5722'
  }
  return colors[cost.type] || '#9e9e9e'
}

function getOptionRiskLevel(option: SanityRecoveryOption): 'low' | 'medium' | 'high' {
  const totalCosts = option.costs.length
  const hasHighImpact = option.costs.some(c => 
    c.type === 'pollution_erosion' || c.type === 'anomaly_risk'
  )
  
  if (totalCosts === 0) return 'low'
  if (totalCosts === 1 && !hasHighImpact) return 'low'
  if (totalCosts >= 3 || hasHighImpact) return 'high'
  return 'medium'
}

const recoveryBonus = computed(() => {
  return gameStore.talentEffects?.sanityRecoveryBonus || 0
})

function calculateEffectiveRecovery(base: number): number {
  const bonus = recoveryBonus.value
  return Math.round(base * (1 + bonus / 100))
}
</script>

<template>
  <div class="sanity-recovery-modal" @click.self="emit('skip')">
    <div class="recovery-card">
      <div class="recovery-header">
        <div class="header-icon">💭</div>
        <h2 class="recovery-title">{{ event.name }}</h2>
      </div>
      
      <div class="recovery-description">
        {{ event.description }}
      </div>

      <div class="recovery-options">
        <div 
          v-for="option in event.options" 
          :key="option.id"
          class="recovery-option"
          :class="`risk-${getOptionRiskLevel(option)}`"
          @click="emit('selectOption', option.id)"
        >
          <div class="option-header">
            <span class="option-text">{{ option.text }}</span>
            <span class="option-recovery">
              <span class="recovery-icon">❤️‍🩹</span>
              +{{ calculateEffectiveRecovery(option.sanityRecovery) }}
            </span>
          </div>
          
          <div v-if="option.costs.length > 0" class="option-costs">
            <div 
              v-for="cost in option.costs" 
              :key="cost.type"
              class="cost-item"
              :style="{ '--cost-color': getCostColor(cost) }"
            >
              <span class="cost-icon">{{ getCostIcon(cost) }}</span>
              <span class="cost-desc">{{ cost.description }}</span>
            </div>
          </div>
          <div v-else class="no-cost">
            <span class="no-cost-text">✓ 无代价</span>
          </div>
        </div>
      </div>

      <div class="recovery-footer">
        <button class="skip-btn" @click="emit('skip')">
          跳过，继续调查
        </button>
      </div>

      <div class="risk-hint">
        <span class="hint-dot low"></span> 低风险
        <span class="hint-dot medium"></span> 中风险
        <span class="hint-dot high"></span> 高风险
      </div>
    </div>
  </div>
</template>

<style scoped>
.sanity-recovery-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.recovery-card {
  background: linear-gradient(145deg, #1a1a2e, #16213e);
  border: 2px solid #4a4a6a;
  border-radius: 16px;
  padding: 32px;
  max-width: 520px;
  width: 90%;
  box-shadow: 
    0 20px 60px rgba(0, 0, 0, 0.6),
    0 0 40px rgba(100, 100, 200, 0.15);
  animation: slideIn 0.4s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.recovery-header {
  text-align: center;
  margin-bottom: 20px;
}

.header-icon {
  font-size: 48px;
  margin-bottom: 12px;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

.recovery-title {
  font-size: 24px;
  color: #e0e0ff;
  margin: 0;
  text-shadow: 0 0 20px rgba(150, 150, 255, 0.5);
}

.recovery-description {
  color: #b0b0c8;
  font-size: 15px;
  line-height: 1.6;
  text-align: center;
  margin-bottom: 28px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border-left: 3px solid #6a6aaa;
}

.recovery-options {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 24px;
}

.recovery-option {
  background: rgba(255, 255, 255, 0.04);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.recovery-option:hover {
  transform: translateX(6px);
  background: rgba(255, 255, 255, 0.08);
}

.recovery-option.risk-low {
  border-color: rgba(76, 175, 80, 0.4);
}
.recovery-option.risk-low:hover {
  border-color: rgba(76, 175, 80, 0.8);
  box-shadow: 0 0 20px rgba(76, 175, 80, 0.2);
}

.recovery-option.risk-medium {
  border-color: rgba(255, 152, 0, 0.4);
}
.recovery-option.risk-medium:hover {
  border-color: rgba(255, 152, 0, 0.8);
  box-shadow: 0 0 20px rgba(255, 152, 0, 0.2);
}

.recovery-option.risk-high {
  border-color: rgba(244, 67, 54, 0.4);
}
.recovery-option.risk-high:hover {
  border-color: rgba(244, 67, 54, 0.8);
  box-shadow: 0 0 20px rgba(244, 67, 54, 0.2);
}

.option-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.option-text {
  font-size: 16px;
  font-weight: 600;
  color: #e0e0ff;
}

.option-recovery {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #4caf50;
  font-weight: 700;
  font-size: 18px;
}

.recovery-icon {
  font-size: 16px;
}

.option-costs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cost-item {
  display: flex;
  align-items: center;
  gap: 5px;
  background: color-mix(in srgb, var(--cost-color) 12%, transparent);
  color: var(--cost-color);
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 13px;
  border: 1px solid color-mix(in srgb, var(--cost-color) 30%, transparent);
}

.cost-icon {
  font-size: 14px;
}

.no-cost {
  color: #4caf50;
  font-size: 14px;
}

.no-cost-text {
  font-weight: 500;
}

.recovery-footer {
  text-align: center;
  margin-bottom: 16px;
}

.skip-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #888;
  padding: 10px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
}

.skip-btn:hover {
  border-color: rgba(255, 255, 255, 0.4);
  color: #bbb;
  background: rgba(255, 255, 255, 0.05);
}

.risk-hint {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #666;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.hint-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-left: 12px;
}
.hint-dot:first-child {
  margin-left: 0;
}

.hint-dot.low { background: #4caf50; }
.hint-dot.medium { background: #ff9800; }
.hint-dot.high { background: #f44336; }
</style>
