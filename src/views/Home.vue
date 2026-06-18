<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { useGameStore } from '@/stores/game'
import { useProgressStore } from '@/stores/progress'
import { cases, getCaseById } from '@/data/cases'

const router = useRouter()
const characterStore = useCharacterStore()
const gameStore = useGameStore()
const progressStore = useProgressStore()

const activeProfile = computed(() => characterStore.activeProfile)

const statusSummary = computed(() => {
  const summary = {
    in_progress: 0,
    reopened: 0,
    failed: 0,
    abandoned: 0,
    completed: 0,
    available: 0,
    locked: 0
  }
  cases.forEach(c => {
    if (summary[c.status] !== undefined) {
      summary[c.status]++
    }
  })
  return summary
})

const currentCaseInfo = computed(() => {
  const caseId = gameStore.gameState.currentCase
  if (!caseId) return null
  const caseData = cases.find(c => c.id === caseId)
  return caseData ? { id: caseId, title: caseData.title, status: caseData.status } : null
})

const battleStats = computed(() => {
  const completed = progressStore.totalCompleted
  const failed = progressStore.totalFailed
  const abandoned = progressStore.totalAbandoned
  const total = completed + failed + abandoned
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 0

  let bestGrade = '-'
  let totalScore = 0
  let scoreCount = 0
  let fastestTime: number | null = null
  let totalBranches = 0

  Object.values(progressStore.progressMap).forEach(progress => {
    if (progress.bestGrade) {
      if (bestGrade === '-' || gradeRank(progress.bestGrade) < gradeRank(bestGrade)) {
        bestGrade = progress.bestGrade
      }
    }
    if (progress.bestScore) {
      totalScore += progress.bestScore.totalScore
      scoreCount++
    }
    if (progress.fastestTime !== undefined) {
      if (fastestTime === null || progress.fastestTime < fastestTime) {
        fastestTime = progress.fastestTime
      }
    }
    totalBranches += progress.unlockedBranches.length
  })

  const avgScore = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0

  return {
    completed,
    failed,
    abandoned,
    total,
    successRate,
    bestGrade,
    avgScore,
    fastestTime,
    totalBranches
  }
})

function gradeRank(grade: string): number {
  const ranks: Record<string, number> = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4, 'F': 5 }
  return ranks[grade] ?? 99
}

const conclusionPreferences = computed(() => {
  const endingCounts: Record<string, number> = {}
  const endingTypes: Record<string, { name: string; icon: string }> = {
    'truth_seeker': { name: '真相探寻者', icon: '🔍' },
    'survivor': { name: '生存主义者', icon: '🛡️' },
    'deep_truth': { name: '深渊凝视者', icon: '👁️' },
    'cautious': { name: '谨慎派', icon: '⚠️' },
    'standard': { name: '标准调查', icon: '📋' }
  }

  let totalEndings = 0

  Object.values(progressStore.progressMap).forEach(progress => {
    progress.playHistory.forEach(record => {
      const endingId = record.endingId
      let type = 'standard'
      
      if (endingId.includes('deep-truth') || endingId.includes('deep') || endingId.includes('truth')) {
        type = 'deep_truth'
      } else if (endingId.includes('accident') || endingId.includes('escape') || endingId.includes('hallucination')) {
        type = 'cautious'
      } else if (endingId.includes('correct') || endingId.includes('ritual') || endingId.includes('forbidden') || endingId.includes('true')) {
        type = 'truth_seeker'
      } else if (endingId.includes('survive') || endingId.includes('safe')) {
        type = 'survivor'
      }

      endingCounts[type] = (endingCounts[type] || 0) + 1
      totalEndings++
    })
  })

  const sorted = Object.entries(endingCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => ({
      type,
      name: endingTypes[type]?.name || type,
      icon: endingTypes[type]?.icon || '📄',
      count,
      percentage: totalEndings > 0 ? Math.round((count / totalEndings) * 100) : 0
    }))

  const dominantStyle = sorted.length > 0 ? sorted[0] : null

  return {
    preferences: sorted,
    totalEndings,
    dominantStyle
  }
})

const caseCompletionProfile = computed(() => {
  const allProgress = Object.values(progressStore.progressMap)
  const completedCount = allProgress.filter(p => p.completed).length
  const totalCases = cases.length

  let totalEvidenceDiscovered = 0
  let totalEvidencePossible = 0
  let totalCluesDiscovered = 0
  let totalCluesPossible = 0
  let totalSanityLost = 0
  let totalPlayTime = 0
  let playCount = 0

  allProgress.forEach(progress => {
    const caseData = getCaseById(progress.caseId)
    if (caseData) {
      totalEvidenceDiscovered += progress.discoveredEvidence.length
      let evidenceCount = 0
      caseData.scenes.forEach(scene => {
        evidenceCount += scene.evidence.length
      })
      totalEvidencePossible += evidenceCount
      totalCluesDiscovered += progress.discoveredClues.length
      totalCluesPossible += caseData.clues.length
    }
    totalSanityLost += progress.totalSanityLost
    playCount += progress.playCount

    if (progress.fastestTime) {
      totalPlayTime += progress.fastestTime
    }
  })

  const evidenceRate = totalEvidencePossible > 0 
    ? Math.round((totalEvidenceDiscovered / totalEvidencePossible) * 100) 
    : 0
  const clueRate = totalCluesPossible > 0 
    ? Math.round((totalCluesDiscovered / totalCluesPossible) * 100) 
    : 0
  const avgSanityPerCase = completedCount > 0 
    ? Math.round(totalSanityLost / completedCount) 
    : 0
  const avgPlayTime = completedCount > 0 
    ? Math.round(totalPlayTime / completedCount) 
    : 0

  const tags = []
  if (evidenceRate >= 80) tags.push({ name: '证据猎手', icon: '🔎', color: '#4a90d9' })
  if (clueRate >= 70) tags.push({ name: '线索大师', icon: '🧩', color: '#6b4c9a' })
  if (battleStats.value.successRate >= 80) tags.push({ name: '常胜侦探', icon: '🏆', color: '#ffd700' })
  if (avgSanityPerCase <= 10) tags.push({ name: '钢铁意志', icon: '🧠', color: '#3a8b5a' })
  if (battleStats.value.totalBranches >= 3) tags.push({ name: '探索者', icon: '🌟', color: '#8b3a8b' })
  if (battleStats.value.bestGrade === 'S') tags.push({ name: 'S级调查员', icon: '⭐', color: '#ffd700' })
  if (tags.length === 0) tags.push({ name: '初出茅庐', icon: '🌱', color: '#8b8b8b' })

  return {
    completionRate: totalCases > 0 ? Math.round((completedCount / totalCases) * 100) : 0,
    completedCount,
    totalCases,
    evidenceRate,
    clueRate,
    avgSanityPerCase,
    avgPlayTime,
    playCount,
    tags
  }
})

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
}

const features = [
  {
    icon: '🔍',
    title: '场景搜证',
    description: '深入诡异现场，搜集隐藏的证据，但要小心——某些真相会侵蚀你的理智。'
  },
  {
    icon: '🧩',
    title: '线索拼接',
    description: '将零散的线索关联起来，揭示隐藏在表象之下的恐怖真相。'
  },
  {
    icon: '🧠',
    title: '理智系统',
    description: '你的精神状态会影响调查进程。理智值过低时，你将看到...不该看到的东西。'
  },
  {
    icon: '💡',
    title: '真相推演',
    description: '根据收集的证据做出最终判断，但记住——真相往往比谎言更可怕。'
  },
  {
    icon: '👤',
    title: '角色档案',
    description: '创建专属调查员，解锁独特天赋，影响理智消耗、线索分析和事件触发。'
  },
  {
    icon: '🌟',
    title: '天赋系统',
    description: '不同天赋带来独特优势，选择最适合你调查风格的能力组合。'
  },
  {
    icon: '🏭',
    title: '案件工坊',
    description: '创建属于你自己的案件，配置证据、线索和多结局，体验创作的乐趣。'
  },
  {
    icon: '📖',
    title: '调查员图鉴',
    description: '收录你在调查中遭遇的超自然生物、禁忌物品和神秘组织，追踪你的发现之旅。'
  },
  {
    icon: '📜',
    title: '委托大厅',
    description: '接受来自各方的调查委托，获取声望、材料和特殊工具奖励，提升你的调查员等级。'
  }
]

function startGame() {
  router.push('/cases')
}

function goToCharacter() {
  router.push('/character')
}

function goToSaves() {
  router.push('/saves')
}

function goToWorkshop() {
  router.push('/workshop')
}

function goToBestiary() {
  router.push('/bestiary')
}

function goToCommissionHall() {
  router.push('/commission-hall')
}
</script>

<template>
  <div class="home-page">
    <div class="hero-section">
      <div class="hero-content">
        <div class="cultist-symbol">⌘</div>
        <h1 class="hero-title">
          <span class="title-line">在深渊的边缘</span>
          <span class="title-line accent">真相等待着你</span>
        </h1>
        <p class="hero-subtitle">
          作为一名调查员，你将面对超越人类认知的恐怖存在。<br/>
          每一个案件都是一场与理智的博弈，每一次发现都可能让你更接近疯狂...
        </p>
        
        <div v-if="activeProfile" class="current-character card">
          <div class="char-display">
            <span class="char-avatar">{{ activeProfile.avatar }}</span>
            <div class="char-info">
              <span class="char-name">{{ activeProfile.name }}</span>
              <span class="char-title">{{ activeProfile.title }}</span>
            </div>
          </div>
          <div class="char-talents">
            <span v-for="talentId in activeProfile.talents.slice(0, 3)" :key="talentId" class="talent-badge">
              {{ talentId }}
            </span>
          </div>
        </div>

        <div class="hero-buttons">
          <button class="start-button primary" @click="startGame">
            开始调查
          </button>
          <button class="secondary-button" @click="goToCharacter">
            角色档案
          </button>
          <button class="secondary-button" @click="goToSaves">
            存档回放
          </button>
          <button class="secondary-button" @click="goToWorkshop">
            案件工坊
          </button>
          <button class="secondary-button" @click="goToBestiary">
            调查员图鉴
          </button>
          <button class="secondary-button" @click="goToCommissionHall">
            委托大厅
          </button>
        </div>
      </div>
      <div class="hero-decoration">
        <div class="tentacle t1"></div>
        <div class="tentacle t2"></div>
        <div class="tentacle t3"></div>
        <div class="eye-glow"></div>
      </div>
    </div>

    <div class="status-overview-section">
      <h2 class="section-title">案件进展</h2>
      <div class="status-overview-grid">
        <div class="status-card card in-progress-card" @click="router.push('/cases')">
          <div class="status-icon">⏳</div>
          <div class="status-count">{{ statusSummary.in_progress + statusSummary.reopened }}</div>
          <div class="status-label">进行中</div>
        </div>
        <div class="status-card card failed-card" @click="router.push('/cases')">
          <div class="status-icon">❌</div>
          <div class="status-count">{{ statusSummary.failed }}</div>
          <div class="status-label">调查失败</div>
        </div>
        <div class="status-card card abandoned-card" @click="router.push('/cases')">
          <div class="status-icon">⏸️</div>
          <div class="status-count">{{ statusSummary.abandoned }}</div>
          <div class="status-label">已搁置</div>
        </div>
        <div class="status-card card completed-card" @click="router.push('/cases')">
          <div class="status-icon">✓</div>
          <div class="status-count">{{ statusSummary.completed }}</div>
          <div class="status-label">已结案</div>
        </div>
        <div class="status-card card available-card" @click="router.push('/cases')">
          <div class="status-icon">🔍</div>
          <div class="status-count">{{ statusSummary.available }}</div>
          <div class="status-label">可调查</div>
        </div>
      </div>

      <div v-if="currentCaseInfo" class="current-case-card card" @click="router.push(`/investigation/${currentCaseInfo.id}`)">
        <div class="current-case-label">当前案件</div>
        <div class="current-case-title">{{ currentCaseInfo.title }}</div>
        <div class="current-case-status">{{ currentCaseInfo.status === 'in_progress' ? '⏳ 调查中' : '🔄 重新调查' }}</div>
        <div class="current-case-action">点击继续 →</div>
      </div>
    </div>

    <div v-if="activeProfile" class="profile-growth-section">
      <h2 class="section-title">调查员成长档案</h2>
      
      <div class="growth-grid">
        <div class="growth-card card battle-stats-card">
          <div class="growth-card-header">
            <span class="growth-card-icon">⚔️</span>
            <h3 class="growth-card-title">历史战绩</h3>
          </div>
          <div class="battle-stats-grid">
            <div class="battle-stat-item">
              <span class="battle-stat-value success">{{ battleStats.completed }}</span>
              <span class="battle-stat-label">已完成</span>
            </div>
            <div class="battle-stat-item">
              <span class="battle-stat-value danger">{{ battleStats.failed }}</span>
              <span class="battle-stat-label">失败</span>
            </div>
            <div class="battle-stat-item">
              <span class="battle-stat-value warning">{{ battleStats.abandoned }}</span>
              <span class="battle-stat-label">搁置</span>
            </div>
            <div class="battle-stat-item">
              <span class="battle-stat-value accent">{{ battleStats.successRate }}%</span>
              <span class="battle-stat-label">成功率</span>
            </div>
          </div>
          <div class="battle-stats-detail">
            <div class="detail-row">
              <span class="detail-label">最佳评级</span>
              <span class="detail-value grade">{{ battleStats.bestGrade }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">平均得分</span>
              <span class="detail-value">{{ battleStats.avgScore }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">最快通关</span>
              <span class="detail-value">{{ battleStats.fastestTime ? formatTime(battleStats.fastestTime) : '-' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">解锁分支</span>
              <span class="detail-value">{{ battleStats.totalBranches }}</span>
            </div>
          </div>
        </div>

        <div class="growth-card card conclusion-prefs-card">
          <div class="growth-card-header">
            <span class="growth-card-icon">🎯</span>
            <h3 class="growth-card-title">结论偏好</h3>
          </div>
          <div v-if="conclusionPreferences.totalEndings > 0" class="conclusion-prefs-content">
            <div v-if="conclusionPreferences.dominantStyle" class="dominant-style">
              <span class="dominant-icon">{{ conclusionPreferences.dominantStyle.icon }}</span>
              <div class="dominant-info">
                <span class="dominant-label">主导风格</span>
                <span class="dominant-name">{{ conclusionPreferences.dominantStyle.name }}</span>
              </div>
            </div>
            <div class="prefs-list">
              <div 
                v-for="pref in conclusionPreferences.preferences" 
                :key="pref.type" 
                class="pref-item"
              >
                <div class="pref-header">
                  <span class="pref-icon">{{ pref.icon }}</span>
                  <span class="pref-name">{{ pref.name }}</span>
                  <span class="pref-count">{{ pref.count }}次</span>
                </div>
                <div class="pref-bar">
                  <div 
                    class="pref-bar-fill" 
                    :style="{ width: pref.percentage + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="no-data">
            <span class="no-data-icon">📊</span>
            <p>完成案件后显示结论偏好分析</p>
          </div>
        </div>

        <div class="growth-card card completion-profile-card">
          <div class="growth-card-header">
            <span class="growth-card-icon">🖼️</span>
            <h3 class="growth-card-title">案件画像</h3>
          </div>
          <div class="profile-tags">
            <span 
              v-for="tag in caseCompletionProfile.tags" 
              :key="tag.name" 
              class="profile-tag"
              :style="{ borderColor: tag.color, color: tag.color }"
            >
              {{ tag.icon }} {{ tag.name }}
            </span>
          </div>
          <div class="profile-stats">
            <div class="profile-stat-item">
              <div class="profile-stat-header">
                <span class="profile-stat-label">案件完成率</span>
                <span class="profile-stat-value">{{ caseCompletionProfile.completionRate }}%</span>
              </div>
              <div class="profile-stat-bar">
                <div 
                  class="profile-stat-fill completion" 
                  :style="{ width: caseCompletionProfile.completionRate + '%' }"
                ></div>
              </div>
            </div>
            <div class="profile-stat-item">
              <div class="profile-stat-header">
                <span class="profile-stat-label">证据发现率</span>
                <span class="profile-stat-value">{{ caseCompletionProfile.evidenceRate }}%</span>
              </div>
              <div class="profile-stat-bar">
                <div 
                  class="profile-stat-fill evidence" 
                  :style="{ width: caseCompletionProfile.evidenceRate + '%' }"
                ></div>
              </div>
            </div>
            <div class="profile-stat-item">
              <div class="profile-stat-header">
                <span class="profile-stat-label">线索发现率</span>
                <span class="profile-stat-value">{{ caseCompletionProfile.clueRate }}%</span>
              </div>
              <div class="profile-stat-bar">
                <div 
                  class="profile-stat-fill clue" 
                  :style="{ width: caseCompletionProfile.clueRate + '%' }"
                ></div>
              </div>
            </div>
          </div>
          <div class="profile-meta">
            <div class="meta-item">
              <span class="meta-label">总游玩次数</span>
              <span class="meta-value">{{ caseCompletionProfile.playCount }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">平均失智</span>
              <span class="meta-value danger">{{ caseCompletionProfile.avgSanityPerCase }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="features-section">
      <h2 class="section-title">调查机制</h2>
      <div class="features-grid">
        <div v-for="feature in features" :key="feature.title" class="feature-card card">
          <div class="feature-icon">{{ feature.icon }}</div>
          <h3 class="feature-title">{{ feature.title }}</h3>
          <p class="feature-description">{{ feature.description }}</p>
        </div>
      </div>
    </div>

    <div class="warning-section">
      <div class="warning-content card">
        <h3 class="warning-title">⚠️ 调查员须知</h3>
        <ul class="warning-list">
          <li>本游戏包含克苏鲁神话元素，部分内容可能引起心理不适</li>
          <li>理智值是核心机制，请谨慎对待每一次调查选择</li>
          <li>建议在安静的环境下进行游戏，以获得最佳体验</li>
          <li>存档功能可随时保存你的调查进度</li>
        </ul>
      </div>
    </div>

    <div class="quote-section">
      <blockquote class="lovecraft-quote">
        "人类最古老而强烈的情感是恐惧，而最古老最强烈的恐惧则是对未知的恐惧。"
        <cite>— H.P. Lovecraft</cite>
      </blockquote>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hero-section {
  position: relative;
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  overflow: hidden;
}

.hero-content {
  text-align: center;
  z-index: 2;
  max-width: 800px;
}

.cultist-symbol {
  font-size: 4rem;
  color: var(--color-accent);
  margin-bottom: 2rem;
  animation: pulse 3s infinite;
  text-shadow: 0 0 30px var(--color-accent);
}

.hero-title {
  font-size: 3rem;
  margin-bottom: 1.5rem;
  line-height: 1.3;
}

.title-line {
  display: block;
  color: var(--color-text);
}

.title-line.accent {
  color: var(--color-accent-light);
  text-shadow: 0 0 20px var(--color-accent);
}

.hero-subtitle {
  font-size: 1.1rem;
  color: var(--color-text-dim);
  margin-bottom: 2.5rem;
  line-height: 1.8;
}

.current-character {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  margin-bottom: 2rem;
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
  max-width: 400px;
  margin-left: auto;
  margin-right: auto;
}

.char-display {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.char-avatar {
  font-size: 2.5rem;
}

.char-info {
  display: flex;
  flex-direction: column;
  text-align: left;
}

.char-name {
  font-weight: bold;
  color: var(--color-text);
  font-size: 1.1rem;
}

.char-title {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.char-talents {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.talent-badge {
  font-size: 0.7rem;
  padding: 0.25rem 0.5rem;
  background: rgba(107, 76, 154, 0.3);
  border-radius: 10px;
  color: var(--color-accent-light);
}

.hero-buttons {
  display: flex;
  gap: 1rem;
  justify-content: center;
  flex-wrap: wrap;
}

.start-button {
  font-size: 1.2rem;
  padding: 1rem 3rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.secondary-button {
  font-size: 1rem;
  padding: 1rem 2rem;
  background: transparent;
  border: 2px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.secondary-button:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.hero-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.tentacle {
  position: absolute;
  width: 3px;
  height: 200px;
  background: linear-gradient(180deg, transparent, var(--color-accent), transparent);
  opacity: 0.3;
  animation: tentacle-move 8s infinite ease-in-out;
}

.t1 { left: 10%; top: -50px; animation-delay: 0s; }
.t2 { left: 30%; top: -30px; animation-delay: 2s; }
.t3 { right: 20%; top: -70px; animation-delay: 4s; }

@keyframes tentacle-move {
  0%, 100% { transform: rotate(-5deg) scaleY(1); }
  50% { transform: rotate(5deg) scaleY(1.2); }
}

.eye-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
  opacity: 0.1;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: eye-pulse 5s infinite;
}

@keyframes eye-pulse {
  0%, 100% { opacity: 0.1; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 0.2; transform: translate(-50%, -50%) scale(1.1); }
}

.features-section {
  padding: 4rem 2rem;
  background: rgba(0, 0, 0, 0.2);
}

.status-overview-section {
  padding: 3rem 2rem;
  background: rgba(0, 0, 0, 0.1);
}

.status-overview-grid {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 1rem;
}

.status-card {
  text-align: center;
  padding: 1.25rem 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.status-card:hover {
  transform: translateY(-3px);
}

.status-icon {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.status-count {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.status-label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.in-progress-card {
  border-color: #6b4c9a;
}

.in-progress-card:hover {
  box-shadow: 0 8px 25px rgba(107, 76, 154, 0.3);
}

.in-progress-card .status-count {
  color: #6b4c9a;
}

.failed-card {
  border-color: #8b3a3a;
}

.failed-card:hover {
  box-shadow: 0 8px 25px rgba(139, 58, 58, 0.3);
}

.failed-card .status-count {
  color: #8b3a3a;
}

.abandoned-card {
  border-color: #8b6b3a;
}

.abandoned-card:hover {
  box-shadow: 0 8px 25px rgba(139, 107, 58, 0.3);
}

.abandoned-card .status-count {
  color: #8b6b3a;
}

.completed-card {
  border-color: #3a8b5a;
}

.completed-card:hover {
  box-shadow: 0 8px 25px rgba(58, 139, 90, 0.3);
}

.completed-card .status-count {
  color: #3a8b5a;
}

.available-card {
  border-color: #4a90d9;
}

.available-card:hover {
  box-shadow: 0 8px 25px rgba(74, 144, 217, 0.3);
}

.available-card .status-count {
  color: #4a90d9;
}

.current-case-card {
  max-width: 500px;
  margin: 1.5rem auto 0;
  padding: 1.25rem 1.5rem;
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
  cursor: pointer;
  transition: all 0.3s ease;
}

.current-case-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(107, 76, 154, 0.4);
}

.current-case-label {
  font-size: 0.75rem;
  color: var(--color-accent-light);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 0.25rem;
}

.current-case-title {
  font-size: 1.2rem;
  color: var(--color-text);
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.current-case-status {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.current-case-action {
  font-size: 0.9rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.section-title {
  text-align: center;
  font-size: 2rem;
  color: var(--color-accent-light);
  margin-bottom: 3rem;
}

.features-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 2rem;
}

.feature-card {
  text-align: center;
  padding: 2rem;
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-title {
  font-size: 1.3rem;
  color: var(--color-text);
  margin-bottom: 1rem;
}

.feature-description {
  color: var(--color-text-dim);
  line-height: 1.6;
}

.warning-section {
  padding: 4rem 2rem;
}

.warning-content {
  max-width: 700px;
  margin: 0 auto;
  border-color: var(--color-warning);
  background: rgba(139, 107, 58, 0.1);
}

.warning-title {
  color: var(--color-warning);
  font-size: 1.3rem;
  margin-bottom: 1.5rem;
}

.warning-list {
  list-style: none;
  padding: 0;
}

.warning-list li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--color-text-dim);
}

.warning-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-warning);
}

.quote-section {
  padding: 4rem 2rem;
  text-align: center;
  background: rgba(107, 76, 154, 0.1);
}

.lovecraft-quote {
  font-style: italic;
  font-size: 1.2rem;
  color: var(--color-text-dim);
  max-width: 600px;
  margin: 0 auto;
  line-height: 1.8;
}

.lovecraft-quote cite {
  display: block;
  margin-top: 1rem;
  color: var(--color-accent-light);
  font-style: normal;
}

.profile-growth-section {
  padding: 4rem 2rem;
  background: rgba(107, 76, 154, 0.08);
}

.growth-grid {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.growth-card {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.growth-card-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.growth-card-icon {
  font-size: 1.75rem;
}

.growth-card-title {
  font-size: 1.25rem;
  color: var(--color-accent-light);
  margin: 0;
}

.battle-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.75rem;
}

.battle-stat-item {
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.battle-stat-value {
  display: block;
  font-size: 1.75rem;
  font-weight: bold;
  margin-bottom: 0.25rem;
}

.battle-stat-value.success {
  color: #3a8b5a;
}

.battle-stat-value.danger {
  color: #8b3a3a;
}

.battle-stat-value.warning {
  color: #8b6b3a;
}

.battle-stat-value.accent {
  color: var(--color-accent-light);
}

.battle-stat-label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.battle-stats-detail {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 4px;
}

.detail-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.detail-value {
  font-weight: bold;
  color: var(--color-text);
}

.detail-value.grade {
  font-size: 1.25rem;
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
}

.conclusion-prefs-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.dominant-style {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 8px;
  border: 1px solid var(--color-accent);
}

.dominant-icon {
  font-size: 2.5rem;
}

.dominant-info {
  display: flex;
  flex-direction: column;
}

.dominant-label {
  font-size: 0.75rem;
  color: var(--color-accent-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.25rem;
}

.dominant-name {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-text);
}

.prefs-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pref-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.pref-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pref-icon {
  font-size: 1rem;
}

.pref-name {
  flex: 1;
  font-size: 0.9rem;
  color: var(--color-text);
}

.pref-count {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.pref-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.pref-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  border-radius: 3px;
  transition: width 0.5s ease;
}

.no-data {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
}

.no-data-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.no-data p {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin: 0;
}

.profile-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.profile-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.35rem 0.75rem;
  border: 1px solid;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  background: rgba(0, 0, 0, 0.2);
}

.profile-stats {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.profile-stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.profile-stat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.profile-stat-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.profile-stat-value {
  font-weight: bold;
  color: var(--color-text);
  font-size: 0.9rem;
}

.profile-stat-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.profile-stat-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

.profile-stat-fill.completion {
  background: linear-gradient(90deg, #3a8b5a, #5aab7a);
}

.profile-stat-fill.evidence {
  background: linear-gradient(90deg, #4a90d9, #6ab0f9);
}

.profile-stat-fill.clue {
  background: linear-gradient(90deg, #6b4c9a, #8b6cba);
}

.profile-meta {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  padding-top: 0.5rem;
  border-top: 1px solid var(--color-border);
}

.meta-item {
  text-align: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.15);
  border-radius: 6px;
}

.meta-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.meta-value {
  font-size: 1.25rem;
  font-weight: bold;
  color: var(--color-text);
}

.meta-value.danger {
  color: #8b3a3a;
}

@media (max-width: 768px) {
  .hero-title {
    font-size: 2rem;
  }
  
  .hero-subtitle {
    font-size: 1rem;
  }
  
  .section-title {
    font-size: 1.5rem;
  }

  .growth-grid {
    grid-template-columns: 1fr;
  }
}
</style>