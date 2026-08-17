import { useEffect } from 'react'

/** Set the document <title> and meta description for a page, restoring the
 * previous values on unmount. Gives each SPA route its own SEO metadata. */
export function useDocumentMeta(title: string, description?: string) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    let metaEl: HTMLMetaElement | null = null
    let prevDesc: string | null = null
    if (description) {
      metaEl = document.querySelector('meta[name="description"]')
      if (metaEl) {
        prevDesc = metaEl.content
        metaEl.content = description
      }
    }

    return () => {
      document.title = prevTitle
      if (metaEl && prevDesc != null) metaEl.content = prevDesc
    }
  }, [title, description])
}
