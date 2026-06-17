import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '调查员档案' }
  },
  {
    path: '/cases',
    name: 'Cases',
    component: () => import('@/views/Cases.vue'),
    meta: { title: '案件列表' }
  },
  {
    path: '/investigation/:caseId',
    name: 'Investigation',
    component: () => import('@/views/Investigation.vue'),
    meta: { title: '场景搜证' }
  },
  {
    path: '/clues/:caseId',
    name: 'Clues',
    component: () => import('@/views/Clues.vue'),
    meta: { title: '线索拼接' }
  },
  {
    path: '/deduction/:caseId',
    name: 'Deduction',
    component: () => import('@/views/Deduction.vue'),
    meta: { title: '真相推演' }
  },
  {
    path: '/saves',
    name: 'Saves',
    component: () => import('@/views/Saves.vue'),
    meta: { title: '存档回放' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, _from, next) => {
  document.title = `${to.meta.title || '克苏鲁诡秘调查'} - 克苏鲁诡秘调查`
  next()
})

export default router