import * as React from "react"

export type ToastProps = {
  id?: string
  title?: React.ReactNode
  description?: React.ReactNode
  variant?: "default" | "destructive"
  action?: React.ReactNode
}

// Silent no-op toast — keeps the same hook structure as the original so
// hook counts per component stay identical (no Rules-of-Hooks violation).
export const toast = (_props?: ToastProps) => ({
  id: "",
  dismiss: () => {},
  update: () => {},
})

export function useToast() {
  // Preserve the original useState + useEffect pair so hook order is unchanged
  const [, setState] = React.useState<ToastProps[]>([])

  React.useEffect(() => {
    // no-op — just keeps hook count stable
  }, [setState])

  return {
    toasts: [] as ToastProps[],
    toast,
    dismiss: () => {},
  }
}
