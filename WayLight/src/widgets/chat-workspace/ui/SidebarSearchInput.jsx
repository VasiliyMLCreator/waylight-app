import { useLayoutEffect, useRef } from 'react'

export function SidebarSearchInput({ value, onChange, layoutKey, ...props }) {
  const ref = useRef(null)

  useLayoutEffect(() => {
    const field = ref.current
    const resize = () => {
      if (!field || !field.clientWidth) return
      const form = field.form
      const styles = window.getComputedStyle(field)
      const formStyles = window.getComputedStyle(form)
      const mode = form.querySelector('.chat-search-mode-trigger')
      const submit = form.querySelector('.chat-search-submit')
      const compactWidth = Math.max(1, form.clientWidth - parseFloat(formStyles.paddingLeft) - parseFloat(formStyles.paddingRight) - (mode?.offsetWidth || 0) - (submit?.offsetWidth || 0))
      const measure = document.createElement('textarea')
      Object.assign(measure.style, { position: 'fixed', visibility: 'hidden', left: '-9999px', top: '0', width: `${compactWidth}px`, height: '18px', minHeight: '0', maxHeight: 'none', boxSizing: 'border-box', padding: styles.padding, border: '0', font: styles.font, lineHeight: styles.lineHeight, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', resize: 'none' })
      measure.value = field.value
      document.body.appendChild(measure)
      form.classList.toggle('chat-search--expanded', measure.scrollHeight > 18)
      measure.remove()
      field.style.height = 'auto'
      field.style.height = `${Math.min(field.scrollHeight, 80)}px`
      field.style.overflowY = field.scrollHeight > 80 ? 'auto' : 'hidden'
    }
    resize()
    let previousWidth = field.form.clientWidth
    const observer = new ResizeObserver(() => {
      if (field.form.clientWidth !== previousWidth) {
        previousWidth = field.form.clientWidth
        resize()
      }
    })
    observer.observe(field.form)
    return () => observer.disconnect()
  }, [value, layoutKey, props.placeholder, props.name])

  return <textarea {...props} ref={ref} rows={1} value={value} onChange={onChange} onKeyDown={(event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }} />
}
