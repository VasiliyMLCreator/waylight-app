import { useEffect, useRef } from 'react'
import './ambient-lines.css'

export function AmbientLines() {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)')
    const pointer = { x: -10000, y: -10000 }
    const columns = 8
    const rows = 6
    const points = Array.from({ length: columns * rows }, (_, index) => ({ x: (index % columns + .18 + Math.random() * .64) / columns, y: (Math.floor(index / columns) + .18 + Math.random() * .64) / rows, phase: Math.random() * Math.PI * 2, speed: .003 + Math.random() * .002 }))
    let width = 0
    let height = 0
    let frame = 0
    let animation
    const resize = () => {
      width = window.innerWidth
      height = window.innerHeight
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = width * scale
      canvas.height = height * scale
      context.setTransform(scale, 0, 0, scale, 0, 0)
      if (reduce.matches) draw()
    }
    const move = (event) => { pointer.x = event.clientX; pointer.y = event.clientY; if (reduce.matches) draw() }
    const leave = () => { pointer.x = -10000; pointer.y = -10000; if (reduce.matches) draw() }
    const draw = () => {
      context.clearRect(0, 0, width, height)
      frame += 1
      const coordinates = points.map((point) => {
        const x = point.x * width + Math.sin(frame * point.speed + point.phase) * Math.min(28, width / columns * .2)
        const y = point.y * height + Math.cos(frame * point.speed * .8 + point.phase) * Math.min(28, height / rows * .2)
        const distance = Math.hypot(pointer.x - x, pointer.y - y)
        const pull = Math.max(0, 1 - distance / 230) * .1
        return { x: x + (pointer.x - x) * pull, y: y + (pointer.y - y) * pull, distance }
      })
      coordinates.forEach((point, index) => {
        const column = index % columns
        const row = Math.floor(index / columns)
        const neighbours = []
        if (column < columns - 1) neighbours.push(index + 1)
        if (row < rows - 1) neighbours.push(index + columns)
        if (column < columns - 1 && row < rows - 1 && (column + row) % 2 === 0) neighbours.push(index + columns + 1)
        neighbours.forEach((next) => {
          const other = coordinates[next]
          const highlight = Math.max(0, 1 - Math.min(point.distance, other.distance) / 230)
          context.strokeStyle = `rgba(255,255,255,${.105 + highlight * .27})`
          context.lineWidth = .7
          context.beginPath()
          context.moveTo(point.x, point.y)
          context.lineTo(other.x, other.y)
          context.stroke()
        })
        context.fillStyle = `rgba(255,255,255,${.14 + Math.max(0, 1 - point.distance / 230) * .35})`
        context.beginPath()
        context.arc(point.x, point.y, 1, 0, Math.PI * 2)
        context.fill()
      })
      if (!reduce.matches) animation = requestAnimationFrame(draw)
    }
    resize()
    if (!reduce.matches) draw()
    window.addEventListener('resize', resize)
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('pointerleave', leave)
    return () => { cancelAnimationFrame(animation); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', move); window.removeEventListener('pointerleave', leave) }
  }, [])
  return <canvas ref={canvasRef} className="ambient-lines" aria-hidden="true" />
}
