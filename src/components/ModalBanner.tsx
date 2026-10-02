import { FormEvent, KeyboardEvent, ReactNode, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

export function useModalBanner(): [typeof showBanner, typeof Banner] {
  const [showDialog, setShowDialog] = useState(false)

  function showBanner(condition = true) {
    setShowDialog(condition)
  }

  function Banner({
    children,
    onSubmit,
    labels = ['ok', 'cancel'],
  }: {
    children: ReactNode
    onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void | 'error'>
    labels?: [string, string]
  }) {
    return ModalBanner({ children, onSubmit: onSubmit, showDialog, setShowDialog, labels })
  }

  return [showBanner, Banner]
}

function ModalBanner({
  children,
  onSubmit,
  showDialog,
  setShowDialog,
  labels,
}: {
  children: ReactNode
  onSubmit: (e: FormEvent<HTMLFormElement>) => void | Promise<void | 'error'>
  showDialog: boolean
  setShowDialog: (value: boolean) => void
  labels?: [string, string]
}) {
  const { t } = useTranslation()
  const formRef = useRef<HTMLFormElement>(null)

  if (!labels) {
    labels = [t('ok'), t('cancel')]
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      setShowDialog(false)
      return
    }

    if (e.key === 'Tab' && formRef.current) {
      const focusable = formRef.current.querySelectorAll<HTMLElement>(
        'input, button, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) {
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }

  return (
    <>
      {showDialog && <div className="fixed inset-0 z-30" onClick={() => setShowDialog(false)} />}
      <form
        ref={formRef}
        className={`border-primary-6 bg-primary-9 shadow-primary-8 fixed top-1/2 left-1/2 z-40 max-w-[70%] min-w-64 -translate-x-1/2 -translate-y-1/2 flex-col justify-between gap-1 rounded-md border-2 px-3 py-1.5 shadow-md transition-all select-none ${showDialog ? 'flex' : 'hidden'} `}
        onKeyDown={handleKeyDown}
        onSubmit={async (e) => {
          e.preventDefault()
          const error = await onSubmit(e)
          if (!error) {
            setShowDialog(false)
          }
        }}
      >
        {children}
        <div className="mt-1 flex justify-center gap-4">
          <button type="submit" className="dialog-button dialog-button-confirm">
            {labels[0]}
          </button>

          <button
            type="button"
            className="dialog-button dialog-button-cancel"
            onClick={() => {
              setShowDialog(false)
            }}
          >
            {labels[1]}
          </button>
        </div>
      </form>
    </>
  )
}
