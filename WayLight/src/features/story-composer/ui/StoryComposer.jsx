import { useEffect, useId, useRef, useState } from 'react'
import { IconButton } from '../../../shared/ui/IconButton/IconButton'
import { ArrowIcon } from '../../../shared/ui/icons/ArrowIcon'
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon'

const composerModes = [
  { id: 'classic', label: 'Классический', description: 'Поиск только по внутренней базе' },
  { id: 'sources', label: 'Источники', description: 'Материалы специалистов пока недоступны' },
  { id: 'web', label: 'Веб', description: 'Поиск в интернете: запрос может содержать детали диалога' },
]

export function StoryComposer({ isReady, onChange, onSubmit, placeholder, textareaRef, value }) {
  const messageId = useId()
  const fileInputId = useId()
  const glassFilterId = `story-glass-${useId().replaceAll(':', '')}`
  const fileInputRef = useRef(null)
  const modeMenuRef = useRef(null)
  const [files, setFiles] = useState([])
  const [composerMode, setComposerMode] = useState('classic')
  const [isModeMenuOpen, setIsModeMenuOpen] = useState(false)

  useEffect(() => {
    if (!isModeMenuOpen) return undefined

    const closeModeMenu = (event) => {
      if (!modeMenuRef.current?.contains(event.target)) setIsModeMenuOpen(false)
    }

    document.addEventListener('pointerdown', closeModeMenu)
    return () => document.removeEventListener('pointerdown', closeModeMenu)
  }, [isModeMenuOpen])

  const addFiles = (event) => {
    const selectedFiles = Array.from(event.target.files || [])
    setFiles((currentFiles) => {
      const nextFiles = selectedFiles.filter((file) => (
        !currentFiles.some((currentFile) => (
          currentFile.name === file.name
          && currentFile.size === file.size
          && currentFile.lastModified === file.lastModified
        ))
      ))
      return [...currentFiles, ...nextFiles].slice(0, 5)
    })
    event.target.value = ''
  }

  const removeFile = (fileToRemove) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file !== fileToRemove))
  }

  const formatFileName = (fileName) => {
    const extension = fileName.includes('.') ? fileName.split('.').pop() : ''
    const baseName = extension ? fileName.slice(0, -(extension.length + 1)) : fileName
    return `${baseName.slice(0, 10)}.${extension}`
  }

  return (
    <form className="chat-composer" data-mode={composerMode} onSubmit={(event) => onSubmit(event, composerMode)} style={{ '--story-glass-filter': `url("#${glassFilterId}")` }}>
      <svg className="story-glass-filter" aria-hidden="true" focusable="false" width="0" height="0">
        <filter id={glassFilterId} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.012 0.025" numOctaves="2" seed="8" result="ripples" />
          <feGaussianBlur in="ripples" stdDeviation="1" result="soft-ripples" />
          <feDisplacementMap in="SourceGraphic" in2="soft-ripples" scale="12" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <label className="sr-only" htmlFor={messageId}>Опишите своё состояние</label>
      <input
        ref={fileInputRef}
        id={fileInputId}
        className="file-input"
        type="file"
        accept=".doc,.docx,.pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        multiple
        onChange={addFiles}
      />
      {files.length > 0 && (
        <div className="composer-files">
          {files.map((file) => (
            <span className="composer-file" key={`${file.name}-${file.lastModified}`}>
              <span>{formatFileName(file.name)}</span>
              <button type="button" onClick={() => removeFile(file)} aria-label={`Удалить файл ${file.name}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <textarea
        id={messageId}
        ref={textareaRef}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows="2"
      />
      <div className="composer-footer">
        <div className="composer-footer-start">
          <button type="button" className="attach-button" onClick={() => fileInputRef.current?.click()} aria-label="Добавить файл">+</button>
          <div className={`composer-mode${isModeMenuOpen ? ' is-open' : ''}`} ref={modeMenuRef}>
            <button
              type="button"
              className="composer-mode-trigger"
              aria-label={`Режим поиска: ${composerModes.find((mode) => mode.id === composerMode).label}`}
              aria-expanded={isModeMenuOpen}
              onClick={() => setIsModeMenuOpen((open) => !open)}
            >
              <span>{composerModes.find((mode) => mode.id === composerMode).label}</span>
            </button>
            {isModeMenuOpen && (
              <div className="composer-mode-menu" role="group" aria-label="Режим поиска">
                {composerModes.map((mode) => (
                  <button
                    type="button"
                    className={`composer-mode-option${composerMode === mode.id ? ' is-selected' : ''}`}
                    key={mode.id}
                    onClick={() => {
                      setComposerMode(mode.id)
                      setIsModeMenuOpen(false)
                    }}
                  >
                    <span className="composer-mode-option-copy">
                      <span>{mode.label}</span>
                      <span className="composer-mode-description">{mode.description}</span>
                    </span>
                    {composerMode === mode.id && <CheckIcon />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <IconButton type="submit" className="send-button" disabled={!isReady} ariaLabel="Подобрать истории">
          <ArrowIcon />
        </IconButton>
      </div>
    </form>
  )
}
