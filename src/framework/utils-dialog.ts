/*非侵入式的可配置对话框工具，使用方式
  import { showUtilsDialog } from '@/utils/utils-dialog'

  showUtilsDialog(
    [
      { id: 1, name: '操作一' },
      { id: 2, name: '操作二' },
    ],
    (item) => {
      if (item.id === 1) {
        // 执行操作一逻辑
      }
    },
    { title: '选择操作', columns: 3 }, //title: 弹窗顶部标题, columns: 每行显示的列数
  )
 */
import { createApp, defineComponent, h, onBeforeUnmount, onMounted } from 'vue'
import type { App, CSSProperties } from 'vue'

export type UtilsDialogItem = {
  id: string | number
  name: string
}

export type UtilsDialogClose = () => void

export type UtilsDialogSelectCallback<T extends UtilsDialogItem = UtilsDialogItem> = (
  item: T,
  close: UtilsDialogClose,
) => void

export type UtilsDialogOptions = {
  title?: string
  columns?: number
  emptyText?: string
  closeOnMask?: boolean
  closeOnSelect?: boolean
  className?: string
  onClose?: () => void
}

const STYLE_ID = 'utils-dialog-style'

const injectDialogStyle = () => {
  if (document.getElementById(STYLE_ID)) return

  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
.utils-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(17, 24, 39, 0.46);
}

.utils-dialog-panel {
  width: min(560px, 100%);
  max-height: min(680px, calc(100vh - 48px));
  overflow: hidden;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  background: var(--color-surface, #ffffff);
  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
  color: var(--color-text-main, #111827);
}

.utils-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 18px;
  border-bottom: 1px solid var(--color-border, #e5e7eb);
}

.utils-dialog-title {
  margin: 0;
  font-size: 17px;
  font-weight: 700;
  line-height: 1.4;
}

.utils-dialog-close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--color-text-muted, #6b7280);
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
}

.utils-dialog-close:hover {
  background: var(--color-background, #f3f4f6);
  color: var(--color-text-main, #111827);
}

.utils-dialog-body {
  max-height: calc(min(680px, 100vh - 48px) - 66px);
  overflow: auto;
  padding: 18px;
}

.utils-dialog-grid {
  display: grid;
  grid-template-columns: repeat(var(--utils-dialog-columns, 3), minmax(0, 1fr));
  gap: 12px;
}

.utils-dialog-item {
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-sm, 4px);
  background: #ffffff;
  color: var(--color-text-main, #111827);
  font: inherit;
  font-weight: 600;
  line-height: 1.35;
  text-align: center;
  cursor: pointer;
}

.utils-dialog-item:hover {
  border-color: var(--color-primary, #3b82f6);
  background: rgba(59, 130, 246, 0.08);
  color: var(--color-primary-hover, #2563eb);
}

.utils-dialog-empty {
  margin: 0;
  color: var(--color-text-muted, #6b7280);
  font-size: var(--font-size-small, 14px);
  text-align: center;
}

@media (max-width: 560px) {
  .utils-dialog-overlay {
    align-items: flex-end;
    padding: 12px;
  }
}
`
  document.head.appendChild(style)
}

export const showUtilsDialog = <T extends UtilsDialogItem>(
  items: T[],
  onSelect: UtilsDialogSelectCallback<T>,
  options: UtilsDialogOptions = {},
): UtilsDialogClose => {
  injectDialogStyle()

  const host = document.createElement('div')
  document.body.appendChild(host)

  let app: App<Element> | null = null

  const close = () => {
    if (!app) return
    app?.unmount()
    app = null
    host.remove()
    options.onClose?.()
  }

  const Dialog = defineComponent({
    name: 'UtilsDialog',
    setup() {
      const handleKeydown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') close()
      }

      const handleSelect = (item: T) => {
        onSelect(item, close)

        if (options.closeOnSelect !== false) {
          close()
        }
      }

      onMounted(() => {
        document.addEventListener('keydown', handleKeydown)
      })

      onBeforeUnmount(() => {
        document.removeEventListener('keydown', handleKeydown)
      })

      return () => h(
        'div',
        {
          class: ['utils-dialog-overlay', options.className],
          onClick: () => {
            if (options.closeOnMask !== false) close()
          },
        },
        [
          h(
            'section',
            {
              class: 'utils-dialog-panel',
              role: 'dialog',
              ariaModal: 'true',
              onClick: (event: MouseEvent) => event.stopPropagation(),
            },
            [
              h('header', { class: 'utils-dialog-header' }, [
                h('h2', { class: 'utils-dialog-title' }, options.title || '请选择'),
                h(
                  'button',
                  {
                    class: 'utils-dialog-close',
                    type: 'button',
                    ariaLabel: '关闭',
                    onClick: close,
                  },
                  '×',
                ),
              ]),
              h('div', { class: 'utils-dialog-body' }, [
                items.length
                  ? h(
                    'div',
                    {
                      class: 'utils-dialog-grid',
                      style: {
                        '--utils-dialog-columns': String(options.columns || 3),
                      } as CSSProperties,
                    },
                    items.map((item) => h(
                      'button',
                      {
                        key: item.id,
                        class: 'utils-dialog-item',
                        type: 'button',
                        onClick: () => handleSelect(item),
                      },
                      item.name,
                    )),
                  )
                  : h('p', { class: 'utils-dialog-empty' }, options.emptyText || '暂无可选项'),
              ]),
            ],
          ),
        ],
      )
    },
  })

  app = createApp(Dialog)
  app.mount(host)

  return close
}

export default showUtilsDialog
