import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { showUtilsDialog } from '@/framework/utils-dialog'

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

const lockedPath = new URLSearchParams(window.location.search).get('__lockPath')

if (lockedPath) {
  const confirmNavigation = (targetPath: string) => {
    return new Promise<boolean>((resolve) => {
      showUtilsDialog(
        [
          { id: 'stay', name: '留在当前页' },
          { id: 'go', name: '跳转过去' },
        ],
        (item) => {
          resolve(item.id === 'go')
        },
        {
          title: `是否跳转到 ${targetPath}？`,
          columns: 2,
          onClose: () => resolve(false),
        },
      )
    })
  }

  router.beforeEach(async (to) => {
    if (to.path === lockedPath) return true

    const confirmed = await confirmNavigation(to.fullPath)
    return confirmed
  })
}

export default router
