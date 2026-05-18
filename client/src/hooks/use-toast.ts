import * as React from "react"

export type ToastProps = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  action?: React.ReactNode
  duration?: number
}

type ToastState = Required<Pick<ToastProps, "id">> & ToastProps & { open: boolean }

const TOAST_LIMIT = 3
const TOAST_REMOVE_DELAY = 5000

type Listeners = Set<(toasts: ToastState[]) => void>
const listeners: Listeners = new Set()
let toasts: ToastState[] = []
let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return String(count)
}

function emit() {
  listeners.forEach((l) => l([...toasts]))
}

function addToast(props: ToastProps): ToastState {
  const id = props.id ?? genId()
  const duration = props.duration ?? TOAST_REMOVE_DELAY

  const newToast: ToastState = { ...props, id, open: true }

  toasts = [newToast, ...toasts].slice(0, TOAST_LIMIT)
  emit()

  setTimeout(() => {
    dismiss(id)
  }, duration)

  return newToast
}

function dismiss(id?: string) {
  toasts = toasts.map((t) =>
    id === undefined || t.id === id ? { ...t, open: false } : t
  )
  emit()

  setTimeout(() => {
    toasts = id === undefined ? [] : toasts.filter((t) => t.id !== id)
    emit()
  }, 300)
}

export const toast = (props: ToastProps) => {
  return addToast(props)
}

export function useToast() {
  const [state, setState] = React.useState<ToastState[]>([...toasts])

  React.useEffect(() => {
    listeners.add(setState)
    return () => {
      listeners.delete(setState)
    }
  }, [])

  return {
    toasts: state,
    toast,
    dismiss,
  }
}
