import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    // react-hooks/set-state-in-effect false positive: window.innerWidth
    // only exists in the browser, so the initial value can't be derived
    // during render (this hook renders `false` on the server, same as
    // any other browser-only value) — this is the DOM-read exception the
    // rule's own docs describe (react.dev/reference/eslint-plugin-react-hooks/lints/set-state-in-effect).
    // This file is shadcn/ui-generated boilerplate (see components.json,
    // `npx shadcn add sidebar`), left as shipped rather than restructured.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
