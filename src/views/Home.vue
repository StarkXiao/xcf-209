<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

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
  }
]

function startGame() {
  router.push('/cases')
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
        <button class="start-button primary" @click="startGame">
          开始调查
        </button>
      </div>
      <div class="hero-decoration">
        <div class="tentacle t1"></div>
        <div class="tentacle t2"></div>
        <div class="tentacle t3"></div>
        <div class="eye-glow"></div>
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

.start-button {
  font-size: 1.2rem;
  padding: 1rem 3rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
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
}
</style>