import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const pagesConfig = import.meta.glob('../pages/**/*.vue')

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/pages/index',
  },
]

for (const path in pagesConfig) {
  const name = path.match(/\.\.\/pages\/(.*)\.vue$/)?.[1]
  if (name) {
    routes.push({
      path: `/pages/${name}`,
      name: `Page-${name}`,
      component: pagesConfig[path],
    })
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
