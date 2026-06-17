<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'

const router = useRouter()
const gameStore = useGameStore()

const sanityColor = computed(() => {
  const percentage = gameStore.sanityPercentage
  if (percentage > 60) return '#3a8b5a'
  if (percentage > 30) return '#8b6b3a'
  return '#8b3a3a'
})

const sanityText = computed(() => {
  const percentage = gameStore.sanityPercentage
  if (percentage > 80) return '精神稳定'
  if (percentage > 60) return '轻微不安'
  if (percentage > 40) return '焦虑不安'
  if (percentage > 20) return '精神恍惚'
  return '濒临崩溃'
})
</script>

<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1 class="game-title" @click="router.push('/')">
          <span class="title-icon">🐙</span>
          克苏鲁诡秘调查
        </h1>
        <nav class="nav-links">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/cases" class="nav-link">案件</router-link>
          <router-link to="/saves" class="nav-link">存档</router-link>
        </nav>
      </div>
      <div v-if="gameStore.currentCase" class="sanity-bar">
        <div class="sanity-label">
          <span>理智值</span>
          <span class="sanity-status">{{ sanityText }}</span>
        </div>
        <div class="sanity-track">
          <div 
            class="sanity-fill" 
            :style="{ 
              width: `${gameStore.sanityPercentage}%`,
              backgroundColor: sanityColor
            }"
          ></div>
        </div>
        <span class="sanity-value">{{ gameStore.gameState.sanity }}/{{ gameStore.gameState.maxSanity }}</span>
      </div>
    </header>
    
    <main class="app-main">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <footer class="app-footer">
      <p class="footer-text">
        <span class="warning-text">⚠️ 警告：本游戏包含克苏鲁神话元素，可能引起不适</span>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #0a0a0f 0%, #15151f 50%, #0a0a0f 100%);
}

.app-header {
  background: rgba(21, 21, 31, 0.95);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 2rem;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.game-title {
  font-size: 1.5rem;
  color: var(--color-accent-light);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.game-title:hover {
  color: var(--color-text);
  text-shadow: 0 0 20px var(--color-accent);
}

.title-icon {
  font-size: 1.8rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: var(--color-text-dim);
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: -4px;
  left: 0;
  width: 0;
  height: 2px;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.nav-link:hover,
.nav-link.router-link-active {
  color: var(--color-text);
}

.nav-link:hover::after,
.nav-link.router-link-active::after {
  width: 100%;
}

.sanity-bar {
  max-width: 1200px;
  margin: 1rem auto 0;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sanity-label {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 80px;
}

.sanity-label span:first-child {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.sanity-status {
  font-size: 0.75rem;
  color: var(--color-warning);
}

.sanity-track {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.sanity-fill {
  height: 100%;
  transition: all 0.5s ease;
  border-radius: 4px;
}

.sanity-value {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  min-width: 50px;
  text-align: right;
}

.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-footer {
  background: rgba(21, 21, 31, 0.95);
  border-top: 1px solid var(--color-border);
  padding: 1rem 2rem;
  text-align: center;
}

.footer-text {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.warning-text {
  color: var(--color-warning);
  opacity: 0.8;
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-links {
    gap: 1rem;
  }
}
</style>