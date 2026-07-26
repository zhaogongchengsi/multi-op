import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

/**
 * WebContentsView is a native view layer — no DOM element can paint
 * above it.  When the app opens a React dialog / popover / dropdown
 * that overlaps the web-content area, the caller must temporarily
 * hide the native view so the overlay renders on top.
 *
 * Quick usage (auto-managed):
 *   useDialogOverlay(isDialogOpen)
 *
 * Manual usage:
 *   const { show, hide } = useWebContentOverlay()
 *   useEffect(() => { show(); return hide }, [show, hide])
 */

interface OverlayContextValue {
  hidden: boolean
  show: () => void
  hide: () => void
}

const Ctx = createContext<OverlayContextValue>({
  hidden: false,
  show: () => {},
  hide: () => {},
})

export function WebContentOverlayProvider({ children }: { children: React.ReactNode }) {
  const [overlayCount, setOverlayCount] = useState(0)
  const ref = useRef(0)

  const show = useCallback(() => {
    ref.current += 1
    setOverlayCount(ref.current)
  }, [])

  const hide = useCallback(() => {
    ref.current = Math.max(0, ref.current - 1)
    setOverlayCount(ref.current)
  }, [])

  return (
    <Ctx.Provider value={{ hidden: overlayCount > 0, show, hide }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWebContentOverlay() {
  return useContext(Ctx)
}

/** Convenience: auto-manages show/hide based on a boolean.
 *  Usage: useDialogOverlay(isOpen) */
export function useDialogOverlay(isOpen: boolean) {
  const { show, hide } = useContext(Ctx)

  useEffect(() => {
    if (isOpen) {
      show()
      return hide
    }
  }, [isOpen, show, hide])
}
