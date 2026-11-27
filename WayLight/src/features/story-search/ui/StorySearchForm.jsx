import { useEffect, useId, useRef, useState } from 'react'
import { IconButton } from '../../../shared/ui/IconButton/IconButton'
import { ArrowIcon } from '../../../shared/ui/icons/ArrowIcon'
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon'
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon'

export function StorySearchForm({ isReady, onChange, onSubmit, placeholder, value }) {
  const searchId = useId()
  const modeMenuRef = useRef(null)
  const [searchMode, setSearchMode] = useState('classic')
  const [isSearchModeOpen, setIsSearchModeOpen] = useState(false)

  useEffect(() => {
    if (!isSearchModeOpen) return undefined

    const closeSearchModeMenu = (event) => {
      if (!modeMenuRef.current?.contains(event.target)) setIsSearchModeOpen(false)
    }

    document.addEventListener('pointerdown', closeSearchModeMenu)
    return () => document.removeEventListener('pointerdown', closeSearchModeMenu)
  }, [isSearchModeOpen])

  return (
    <form className="search-form" onSubmit={onSubmit}>
      <label className="sr-only" htmlFor={searchId}>Поиск историй</label>
      <div className={`search-mode${isSearchModeOpen ? ' is-open' : ''}`} ref={modeMenuRef}>
        <button
          className="search-mode-trigger"
          type="button"
          aria-label={`Тип поиска: ${searchMode === 'classic' ? 'Классика' : 'AI'}`}
          aria-expanded={isSearchModeOpen}
          onClick={() => setIsSearchModeOpen((open) => !open)}
        >
          <span>{searchMode === 'classic' ? 'Классика' : 'AI'}</span>
          <SearchIcon />
        </button>
        {isSearchModeOpen && (
          <div className="search-mode-menu" role="group" aria-label="Тип поиска">
            {[
              { id: 'classic', label: 'Классика' },
              { id: 'ai', label: 'AI' },
            ].map((mode) => (
              <button
                className="search-mode-option"
                type="button"
                key={mode.id}
                onClick={() => {
                  setSearchMode(mode.id)
                  setIsSearchModeOpen(false)
                }}
              >
                <span>{mode.label}</span>
                <SearchIcon />
                {searchMode === mode.id && <CheckIcon />}
              </button>
            ))}
          </div>
        )}
      </div>
      <input id={searchId} value={value} onChange={onChange} placeholder={placeholder} />
      <IconButton type="submit" disabled={!isReady} ariaLabel="Искать">
        <ArrowIcon />
      </IconButton>
    </form>
  )
}
