import { useEffect, useRef, useState } from 'react'
import companionImage from '../../../assets/space-companion-feet.png'
import speakingImage from '../../../assets/space-companion-feet-speaking.png'

const greeting = 'Привет! Я Лучик. Я прилетел из далёкого созвездия, чтобы искать светлые истории и быть рядом, когда вам нужен собеседник.'

export function SpaceCompanion({ onOpenChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const [length, setLength] = useState(0)
  const [wave, setWave] = useState(0)
  const [isGreeting, setIsGreeting] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => { onOpenChange(isOpen); return () => onOpenChange(false) }, [isOpen, onOpenChange])

  useEffect(() => {
    if (!isOpen) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setLength(greeting.length)
      return undefined
    }
    setLength(0)
    setIsGreeting(true)
    let timer
    const delay = window.setTimeout(() => {
      setIsGreeting(false)
      timer = window.setInterval(() => setLength((current) => {
        if (current >= greeting.length) {
          window.clearInterval(timer)
          return current
        }
        return current + 1
      }), 35)
    }, 1000)
    return () => { window.clearTimeout(delay); window.clearInterval(timer) }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutside = (event) => {
      if (!rootRef.current?.contains(event.target)) setIsOpen(false)
    }
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className="space-companion" ref={rootRef}>
      {isOpen && length > 0 && <div className="space-companion-bubble" role="status" aria-label={greeting}><span aria-hidden="true">{Array.from(greeting.slice(0, length), (character, index) => <span className="space-companion-letter" key={index}>{character}</span>)}</span></div>}
      <button className="space-companion-button" type="button" aria-label="Знакомьтесь, Лучик" aria-expanded={isOpen} onClick={() => { setWave((value) => value + 1); setIsOpen((value) => !value) }}>
        <span key={wave} className={`space-companion-image${isOpen && isGreeting ? ' is-waving' : ''}${isOpen && !isGreeting && length < greeting.length ? ' is-speaking' : ''}`}>
          <img src={companionImage} alt="" />
          <img className="space-companion-talking-frame" src={speakingImage} alt="" />
        </span>
      </button>
    </div>
  )
}
