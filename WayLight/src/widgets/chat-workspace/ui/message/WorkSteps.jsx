import { useEffect, useState } from 'react'

function Step({ text }) {
  const [length, setLength] = useState(0)
  useEffect(() => {
    setLength(0)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setLength(text.length); return undefined }
    const timer = window.setInterval(() => setLength((current) => {
      if (current >= text.length) { window.clearInterval(timer); return current }
      return current + 1
    }), 22)
    return () => window.clearInterval(timer)
  }, [text])
  return <div><span aria-hidden="true">✦</span><span>{text.slice(0, length)}</span></div>
}

export function WorkSteps({ steps }) {
  return <div className="chat-work-steps" role="status" aria-label="Этапы ответа">{steps.map((step, index) => <Step key={`${index}-${step}`} text={step} />)}</div>
}
