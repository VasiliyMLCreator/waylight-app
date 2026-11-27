import { useEffect, useRef, useState } from 'react'
import { SpaceCompanion } from './SpaceCompanion'
import { MessageText } from './message/MessageText'
import { WorkSteps } from './message/WorkSteps'
import { SidebarSearchInput } from './SidebarSearchInput'
import { useStoryComposer } from '../../../features/story-composer/model/useStoryComposer'
import { StoryComposer } from '../../../features/story-composer/ui/StoryComposer'
import { Brand } from '../../../shared/ui/Brand/Brand'
import { ArrowIcon } from '../../../shared/ui/icons/ArrowIcon'
import { NewChatIcon } from '../../../shared/ui/icons/NewChatIcon'
import { CopyIcon } from '../../../shared/ui/icons/CopyIcon'
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon'
import { EditIcon } from '../../../shared/ui/icons/EditIcon'
import { RegenerateIcon } from '../../../shared/ui/icons/RegenerateIcon'
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon'
import { MoreIcon } from '../../../shared/ui/icons/MoreIcon'
import { PinIcon } from '../../../shared/ui/icons/PinIcon'
import { TrashIcon } from '../../../shared/ui/icons/TrashIcon'
import { MemoryIcon } from '../../../shared/ui/icons/MemoryIcon'
import { InstructionsIcon } from '../../../shared/ui/icons/InstructionsIcon'
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon'
import { LinkIcon } from '../../../shared/ui/icons/LinkIcon'
import { IconButton } from '../../../shared/ui/IconButton/IconButton'
import { siteContent } from '../../../shared/config/site-content'

const memoryCategories = [
  { id: 'memory', label: 'Память', description: 'Пространство для хранения и редактирования значимой информации о Вас', Icon: MemoryIcon },
  { id: 'instructions', label: 'Инструкции', description: 'Меняйте и создавайте сценарии общения AI-ассистента', Icon: InstructionsIcon },
  { id: 'documents', label: 'Документы', description: 'Ваши загруженные и созданные документы', Icon: DocumentIcon },
  { id: 'links', label: 'Ссылки', description: 'AI и Ваши полезные интернет-ресурсы', Icon: LinkIcon },
]

export function ChatWorkspace({ activeChatId, chats, onAppendMessage, onDeleteChat, onSelectChat, onToggleChatPinned, onRenameChat, onUpdateMessage, onRegenerate, userName, userAvatar, onProfile, isGenerating }) {
  const [failedAvatar, setFailedAvatar] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isCompanionOpen, setIsCompanionOpen] = useState(false)
  const [isSidebarTransitioning, setIsSidebarTransitioning] = useState(false)
  const [sliderPosition, setSliderPosition] = useState(0)
  const [isLinksSearchOpen, setIsLinksSearchOpen] = useState(false)
  const isMemoryMode = sliderPosition >= 50
  const memoryProgress = sliderPosition / 100
  const memoryCategoryProgress = isLinksSearchOpen ? 0 : memoryProgress
  const linksSearchProgress = isLinksSearchOpen ? memoryProgress : 0
  const [editingMessageId, setEditingMessageId] = useState(null)
  const [copyStatus, setCopyStatus] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState(null)
  const [chatSearch, setChatSearch] = useState('')
  const [submittedAiSearch, setSubmittedAiSearch] = useState('')
  const [searchMode, setSearchMode] = useState('classic')
  const [isSearchModeOpen, setIsSearchModeOpen] = useState(false)
  const [openChatMenuId, setOpenChatMenuId] = useState(null)
  const messagesRef = useRef(null)
  const inputAreaRef = useRef(null)
  const keepAtBottom = useRef(true)
  const copyTimerRef = useRef(null)
  const sidebarTimerRef = useRef(null)
  const activeChat = chats.find((chat) => chat.id === activeChatId) || { messages: [] }
  const submitMessage = (text, mode) => {
    keepAtBottom.current = true
    if (editingMessageId) {
      onUpdateMessage(activeChatId, editingMessageId, text, mode)
      setEditingMessageId(null)
      return
    }
    onAppendMessage(activeChatId, text, mode)
  }
  const composer = useStoryComposer(submitMessage)

  useEffect(() => () => {
    window.clearTimeout(copyTimerRef.current)
    window.clearTimeout(sidebarTimerRef.current)
  }, [])

  const toggleSidebar = () => {
    if (isSidebarTransitioning) return
    setIsSidebarTransitioning(true)
    sidebarTimerRef.current = window.setTimeout(() => {
      setIsSidebarCollapsed((collapsed) => !collapsed)
      sidebarTimerRef.current = window.setTimeout(() => setIsSidebarTransitioning(false), 720)
    }, 200)
  }

  useEffect(() => {
    const closeChatMenu = (event) => {
      const openEntry = document.querySelector('.chat-history-entry.is-menu-open')
      if (openEntry && !openEntry.contains(event.target)) setOpenChatMenuId(null)
    }

    document.addEventListener('pointerdown', closeChatMenu)
    return () => document.removeEventListener('pointerdown', closeChatMenu)
  }, [])

  useEffect(() => {
    if (!isSearchModeOpen) return undefined

    const closeSearchModeMenu = (event) => {
      if (event.target instanceof Element && !event.target.closest('.chat-search')) {
        setIsSearchModeOpen(false)
      }
    }

    document.addEventListener('pointerdown', closeSearchModeMenu)
    return () => document.removeEventListener('pointerdown', closeSearchModeMenu)
  }, [isSearchModeOpen])

  const copyMessage = async (event, messageId) => {
    const text = event.currentTarget.closest('.chat-message-content')?.querySelector('.message-markdown')?.innerText || ''
    try {
      await navigator.clipboard.writeText(text)
      setCopiedMessageId(messageId)
      setCopyStatus('Текст скопирован')
      window.clearTimeout(copyTimerRef.current)
      copyTimerRef.current = window.setTimeout(() => setCopiedMessageId(null), 3000)
    } catch {
      setCopiedMessageId(null)
      setCopyStatus('Не удалось скопировать текст')
    }
  }

  const editMessage = (message) => {
    setEditingMessageId(message.id)
    composer.setValue(message.text)
    requestAnimationFrame(() => composer.textareaRef.current?.focus())
  }

  useEffect(() => {
    const container = messagesRef.current
    if (!container) return
    keepAtBottom.current = true
    container.scrollTop = container.scrollHeight
  }, [activeChatId])

  useEffect(() => {
    const container = messagesRef.current
    if (container && keepAtBottom.current) container.scrollTop = container.scrollHeight
  }, [activeChat.messages, isGenerating])

  useEffect(() => {
    const area = inputAreaRef.current
    const container = messagesRef.current
    if (!area || !container) return undefined
    const observer = new ResizeObserver(() => { container.style.paddingBottom = `${area.offsetHeight + 38}px`; if (keepAtBottom.current) container.scrollTop = container.scrollHeight })
    observer.observe(area)
    return () => observer.disconnect()
  }, [activeChatId])

  const normalizedSearch = (searchMode === 'ai' ? submittedAiSearch : chatSearch.trim()).toLocaleLowerCase('ru')
  const visibleChats = [...chats]
    .filter((chat) => (
      !normalizedSearch || `${chat.title} ${chat.messages.map((message) => message.text).join(' ')}`.toLocaleLowerCase('ru').includes(normalizedSearch)
    ))
    .sort((first, second) => Number(Boolean(second.isPinned)) - Number(Boolean(first.isPinned)))
  const userInitials = userName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toLocaleUpperCase('ru'))
    .join('')

  return (
    <div className={`chat-workspace${isSidebarCollapsed ? ' chat-workspace--collapsed' : ''}${isSidebarTransitioning ? ' chat-workspace--transitioning' : ''}`}>
      <aside className="chat-sidebar" aria-label="История чатов">
        <div className="chat-sidebar-header">
          <Brand label={siteContent.brand} />
          <div className="sidebar-actions">
            <IconButton className="new-chat-button" onClick={() => onSelectChat(null)} ariaLabel="Новый разговор">
              <NewChatIcon />
            </IconButton>
            <IconButton className="sidebar-toggle" onClick={toggleSidebar} ariaLabel={isSidebarCollapsed ? 'Открыть историю чатов' : 'Свернуть историю чатов'}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="4" /><path d="M14 5v14M8 9l3 3-3 3" /></svg>
            </IconButton>
          </div>
        </div>
        <div
          className={`chat-history${isMemoryMode ? ' chat-history--memory' : ''}${isLinksSearchOpen ? ' chat-history--links-search' : ''}`}
          style={{
            '--chat-label-opacity': 1 - memoryProgress,
            '--memory-label-opacity': memoryCategoryProgress,
            '--links-label-opacity': linksSearchProgress,
            '--chat-view-opacity': 1 - memoryProgress,
            '--memory-grid-opacity': memoryCategoryProgress,
            '--links-view-opacity': linksSearchProgress,
          }}
        >
          <p className="chat-history-label">
            <span className="chat-history-label-chats" aria-hidden="true">Чаты</span>
            <span className="chat-history-label-memory" aria-hidden="true">Память</span>
            <span className="chat-history-label-links" aria-hidden="true">Ссылки</span>
            <span className="sr-only">{isLinksSearchOpen ? 'Ссылки' : isMemoryMode ? 'Память' : 'Чаты'}</span>
            {isLinksSearchOpen && (
              <button
                className="memory-links-back"
                type="button"
                aria-label="Вернуться к разделам памяти"
                onClick={() => {
                  setIsLinksSearchOpen(false)
                  setChatSearch('')
                  setSearchMode('classic')
                  setIsSearchModeOpen(false)
                }}
              >
                <ArrowIcon />
              </button>
            )}
          </p>
          <div className="chat-history-views">
            <div className={`chat-history-chat-view${isMemoryMode ? ' is-inactive' : ''}`} aria-hidden={isMemoryMode} inert={isMemoryMode}>
              <form
                className="chat-search"
                onSubmit={(event) => {
                  event.preventDefault()
                  if (searchMode === 'ai') setSubmittedAiSearch(chatSearch.trim())
                }}
              >
                <button
                  className="chat-search-mode-trigger"
                  type="button"
                  aria-label={`Тип поиска: ${searchMode === 'classic' ? 'Классика' : 'AI'}`}
                  aria-expanded={isSearchModeOpen}
                  onClick={() => setIsSearchModeOpen((open) => !open)}
                >
                  <span>{searchMode === 'classic' ? 'Классика' : 'AI'}</span>
                  <SearchIcon />
                </button>
                <SidebarSearchInput
                  layoutKey={searchMode}
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                  placeholder="Поиск по чатам"
                  aria-label="Поиск по истории чатов"
                />
                {searchMode === 'ai' && (
                  <button className="chat-search-submit" type="submit" disabled={!chatSearch.trim()} aria-label="Отправить запрос">
                    <ArrowIcon />
                  </button>
                )}
                {isSearchModeOpen && (
                  <div className="chat-search-mode-menu" role="group" aria-label="Тип поиска">
                    {[
                      { id: 'classic', label: 'Классика' },
                      { id: 'ai', label: 'AI' },
                    ].map((mode) => (
                      <button
                        className="chat-search-mode-option"
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
              </form>
              <div className="chat-history-divider" aria-hidden="true" />
              <div className="chat-history-list">
                {visibleChats.map((chat) => {
                  const isMenuOpen = openChatMenuId === chat.id
                  return (
                    <div className={`chat-history-entry${chat.id === activeChatId ? ' is-active' : ''}${isMenuOpen ? ' is-menu-open' : ''}`} key={chat.id}>
                      <button className="chat-history-item" type="button" onClick={() => onSelectChat(chat.id)}>
                        <span>{chat.title}</span>
                      </button>
                      {chat.isPinned && <PinIcon className="chat-history-pin" />}
                      <button
                        className="chat-history-more"
                        type="button"
                        aria-label={`Действия для чата «${chat.title}»`}
                        aria-expanded={isMenuOpen}
                        onClick={() => setOpenChatMenuId(isMenuOpen ? null : chat.id)}
                      >
                        <MoreIcon />
                      </button>
                      <div className="chat-history-actions">
                        <button className="chat-history-add" type="button" onClick={() => { const title = window.prompt('Название чата', chat.title); if (title?.trim()) onRenameChat(chat.id, title.trim()); setOpenChatMenuId(null) }}>
                          Название
                        </button>
                        <button
                          className={`chat-history-pin-button${chat.isPinned ? ' is-pinned' : ''}`}
                          type="button"
                          aria-label={chat.isPinned ? 'Открепить чат' : 'Закрепить чат'}
                          title={chat.isPinned ? 'Открепить чат' : 'Закрепить чат'}
                          onClick={() => { onToggleChatPinned(chat.id); setOpenChatMenuId(null) }}
                        >
                          <PinIcon />
                        </button>
                        <button
                          className="chat-history-delete"
                          type="button"
                          aria-label="Удалить чат"
                          title="Удалить чат"
                          onClick={() => { onDeleteChat(chat.id); setOpenChatMenuId(null) }}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {visibleChats.length === 0 && <p className="chat-history-empty">Чаты не найдены</p>}
              </div>
            </div>
            <div className={`memory-category-grid${isMemoryMode ? '' : ' is-inactive'}`} aria-hidden={!isMemoryMode} inert={!isMemoryMode}>
              {memoryCategories.map(({ id, label, Icon }) => (
                <button
                  className={`memory-category-card memory-category-card--${id}`}
                  type="button"
                  key={id}
                  onClick={() => {
                    if (id === 'links') {
                      setChatSearch('')
                      setSearchMode('classic')
                      setIsSearchModeOpen(false)
                      setIsLinksSearchOpen(true)
                    }
                  }}
                >
                  <Icon />
                  {id === 'memory' && <span className="memory-category-description">{memoryCategories[0].description}</span>}
                  {id === 'instructions' && <span className="memory-category-description">{memoryCategories[1].description}</span>}
                  {id === 'documents' && <span className="memory-category-description">{memoryCategories[2].description}</span>}
                  {id === 'links' && <span className="memory-category-description">{memoryCategories[3].description}</span>}
                  <span>{label}</span>
                </button>
              ))}
            </div>
            <div className="memory-links-search-view" aria-hidden={!isLinksSearchOpen} inert={!isLinksSearchOpen}>
              <form
                className="chat-search"
                onSubmit={(event) => {
                  if (searchMode === 'web') return
                  event.preventDefault()
                  if (searchMode === 'ai') setSubmittedAiSearch(chatSearch.trim())
                }}
                action={searchMode === 'web' ? 'https://duckduckgo.com/' : undefined}
                method={searchMode === 'web' ? 'get' : undefined}
                target={searchMode === 'web' ? '_blank' : undefined}
              >
                <button
                  className="chat-search-mode-trigger"
                  type="button"
                  aria-label={`Тип поиска: ${searchMode === 'classic' ? 'Классика' : searchMode === 'ai' ? 'AI' : 'Веб'}`}
                  aria-expanded={isSearchModeOpen}
                  onClick={() => setIsSearchModeOpen((open) => !open)}
                >
                  <span>{searchMode === 'classic' ? 'Классика' : searchMode === 'ai' ? 'AI' : 'Веб'}</span>
                  <SearchIcon />
                </button>
                <SidebarSearchInput
                  layoutKey={searchMode}
                  value={chatSearch}
                  onChange={(event) => setChatSearch(event.target.value)}
                  name={searchMode === 'web' ? 'q' : undefined}
                  placeholder={searchMode === 'web' ? 'Какие ссылки ищете?' : 'Поиск по ссылкам'}
                  aria-label={searchMode === 'web' ? 'Что найти в интернете' : 'Поиск по ссылкам'}
                />
                {(searchMode === 'ai' || searchMode === 'web') && (
                  <button className="chat-search-submit" type="submit" disabled={!chatSearch.trim()} aria-label="Отправить запрос">
                    <ArrowIcon />
                  </button>
                )}
                {isSearchModeOpen && (
                  <div className="chat-search-mode-menu" role="group" aria-label="Тип поиска">
                    {[
                      { id: 'classic', label: 'Классика' },
                      { id: 'ai', label: 'AI' },
                      { id: 'web', label: 'Веб' },
                    ].map((mode) => (
                      <button
                        className="chat-search-mode-option"
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
              </form>
              <div className="chat-history-divider" aria-hidden="true" />
              {searchMode === 'web' && <p className="web-search-hint">Опишите, какие интернет-ссылки вы ищете</p>}
            </div>
          </div>
        </div>
        <div className="chat-sidebar-footer">
          <div className="profile-avatar-wrap">
            <button className="profile-avatar" type="button" onClick={onProfile} aria-label={`Профиль: ${userName}`}>
              {userAvatar && failedAvatar !== userAvatar ? <img src={userAvatar} alt="" referrerPolicy="no-referrer" onError={() => setFailedAvatar(userAvatar)} /> : userInitials}
            </button>
            <span className="profile-tooltip" role="tooltip">{userName}</span>
          </div>
          <div className="sidebar-mode-control">
            <label className={`sidebar-mode-switch${isMemoryMode ? ' is-memory' : ''}`}>
              <span className="sr-only">Переключить режим Чаты или Память</span>
              <input
                type="range"
                min="0"
                max="100"
                step="any"
                value={sliderPosition}
                aria-valuetext={isMemoryMode ? 'Память' : 'Чаты'}
                onChange={(event) => {
                  const nextPosition = Number(event.target.value)
                  setSliderPosition(nextPosition)
                  if (nextPosition < 50) {
                    setIsLinksSearchOpen(false)
                    setSearchMode('classic')
                    setIsSearchModeOpen(false)
                  }
                }}
              />
              <span
                className="sidebar-mode-hint"
                style={{ '--thumb-offset': `calc(${sliderPosition}% - ${sliderPosition * 0.34}px + 3px)` }}
              >
                {isMemoryMode ? 'к чатам...' : 'к памяти...'}
              </span>
              <span
                className="sidebar-mode-thumb"
                style={{ left: `calc(${sliderPosition}% - ${sliderPosition * 0.34}px + 3px)` }}
              >
                <ArrowIcon />
              </span>
            </label>
          </div>
        </div>
      </aside>
      <section className="chat-main" aria-label="Чат ВайЛайт">
        {isCompanionOpen && <div className="chat-companion-dim" aria-hidden="true" />}
        <div className="chat-main-header">
          <IconButton className="mobile-sidebar-toggle" onClick={toggleSidebar} ariaLabel="Открыть историю чатов">
            <ArrowIcon />
          </IconButton>
        </div>
        <div className="chat-messages" ref={messagesRef} onScroll={(event) => { const el = event.currentTarget; keepAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100 }}>
          <div className="chat-messages-inner">
            {!activeChatId && <div className="chat-empty"><p className="eyebrow"><span /> ВАШЕ ПРОСТРАНСТВО</p><h1>Начните<br /><em>разговор</em></h1><p>Расскажите о том, что для вас важно.</p></div>}
            {activeChat.messages.map((message, index) => (
              <div className={`chat-message-row chat-message-row--${message.role}`} key={message.id}>
                {message.role === 'assistant' && index === activeChat.messages.map((item) => item.role).lastIndexOf('assistant') && <SpaceCompanion onOpenChange={setIsCompanionOpen} />}
                <div className="chat-message-content">
                  {message.steps?.length > 0 && <WorkSteps steps={message.steps} />}
                  <div className={`chat-message chat-message--${message.role}${message.crisis ? ' chat-message--crisis' : ''}`} role={message.crisis ? 'alert' : undefined}>
                    <MessageText text={message.text} />
                  </div>
                  {(message.role === 'user' || !isGenerating || index !== activeChat.messages.length - 1) && <div className={`chat-message-actions chat-message-actions--${message.role}`}>
                    {message.role === 'user' ? (
                      <>
                        <button type="button" className="chat-action-button" onClick={(event) => copyMessage(event, message.id)} aria-label="Скопировать сообщение" title="Скопировать">
                          {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                        </button>
                        <button type="button" className="chat-action-button" disabled={isGenerating || index < activeChat.messages.length - 2} onClick={() => { if (index === activeChat.messages.length - 1 || window.confirm('Изменение последнего запроса заменит ответ на него. Продолжить?')) editMessage(message) }} aria-label="Редактировать сообщение" title="Редактировать">
                          <EditIcon />
                        </button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="chat-action-button" disabled={isGenerating || index !== activeChat.messages.length - 1} onClick={() => onRegenerate(activeChatId, message)} aria-label="Перегенерировать ответ" title="Перегенерировать ответ">
                          <RegenerateIcon />
                        </button>
                        <button type="button" className="chat-action-button" onClick={(event) => copyMessage(event, message.id)} aria-label="Скопировать сообщение" title="Скопировать">
                          {copiedMessageId === message.id ? <CheckIcon /> : <CopyIcon />}
                        </button>
                      </>
                    )}
                  </div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only" role="status" aria-live="polite">{copyStatus}</span>
        <div className="chat-input-area" ref={inputAreaRef}>
          <StoryComposer
            isReady={composer.isReady && !isGenerating}
            onChange={composer.change}
            onSubmit={composer.submit}
            placeholder="Продолжите разговор..."
            textareaRef={composer.textareaRef}
            value={composer.value}
          />
        </div>
      </section>
    </div>
  )
}
