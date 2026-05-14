import * as React from "react"

export type ToastProps = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

const noop = () => ({ id: "", dismiss: () => {}, update: () => {} })

export const toast = Object.assign(noop, {
  dismiss: () => {},
})

export function useToast() {
  return {
    toasts: [] as ToastProps[],
    toast,
    dismiss: () => {},
  }
}
