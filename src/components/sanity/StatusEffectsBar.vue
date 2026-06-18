<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

interface StatusEffect {
  id: string
  name: string
  icon: string
  value: number
  remaining: string
  color: string
  isDebuff: boolean
}

const activeEffects = computed<StatusEffect[]>(() => {
  const effects: StatusEffect[] = []
  
  const evidencePenalty = gameStore.tempEvidencePenalty
  if (evidencePenalty) {
    effects.push({
      id: 'evidence_penalty',
      name: '搜查效率下降',
      icon: '🔍',
      value: -evidencePenalty.value,
      remaining: `剩余 ${evidencePenalty.remainingSearches} 次搜查`,
      color: '#f44336',
      isDebuff: true
    })
  }
  
  const anomalyRisk = gameStore.tempAnomalyRiskBonus
  if (anomalyRisk) {
    effects.push({
      id: 'anomaly_risk',
      name: '异常感知增强',
      icon: '👁️',
      value: anomalyRisk.value,
      remaining: `剩余 ${Math.floor(anomalyRisk.remainingSeconds || 0)} 秒`,
      color: '#e91e63',
      isDebuff: true
    })
  }
  
  const analysisPenalty = gameStore.tempClueAnalysisPenalty
  if (analysisPenalty) {
    effects.push({
      id: 'clue_analysis_penalty',
      name: '思维阻滞',
      icon: '🧠',
      value: -analysisPenalty.value,
      remaining: `剩余 ${Math.floor(analysisPenalty.remainingSeconds || 0)} 秒`,
      color: '#ff5722',
      isDebuff: true
    })
  }
  
  return effects
})

const hasEffects = computed(() => activeEffects.value.length > 0)
</script>

<template>
  <transition name="slide-down">
    <div v-if="hasEffects" class="status-effects-bar">
      <div class="effects-label">
        <span class="label-icon">⚠️</span>
        <span>临时状态</span>
      </div>
      <div class="effects-list">
        <div 
          v-for="effect in activeEffects" 
          :key="effect.id"
          class="effect-item"
          :class="{ debuff: effect.isDebuff }"
          :style="{ '--effect-color': effect.color }"
        >
          <span class="effect-icon">{{ effect.icon }}</span>
          <div class="effect-info">
            <span class="effect-name">{{ effect.name }}</span>
            <span class="effect-value">{{ effect.value > 0 ? '+' : '' }}{{ effect.value }}%</span>
          </div>
          <span class="effect-remaining">{{ effect.remaining }}</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.status-effects-bar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(180deg, rgba(15, 15, 30, 0.95), rgba(15, 15, 30, 0.8));
  backdrop-filter: blur(8px);
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 100, 100, 0.2);
}

.effects-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #ff9800;
  margin-bottom: 8px;
  font-weight: 500;
}

.label-icon {
  font-size: 14px;
}

.effects-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.effect-item {
  display: flex;
  align-items: center;
  gap: 8px;
  background: color-mix(in srgb, var(--effect-color) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--effect-color) 40%, transparent);
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
}

.effect-icon {
  font-size: 16px;
}

.effect-info {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.effect-name {
  color: #e0e0e0;
  font-size: 12px;
}

.effect-value {
  color: var(--effect-color);
  font-weight: 600;
  font-size: 13px;
}

.effect-remaining {
  color: #888;
  font-size: 11px;
  margin-left: 8px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.3s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-100%);
}
</style>
