import { useCallback, useEffect, useRef, useState } from 'react'
import { useSiteInteraction } from '../../../app/providers/AppProviders'
import { useMobileExperience } from '../../../features/mobile-experience/model/useMobileExperience'
import { useAuthentication } from '../../../features/authentication/model/useAuthentication'
import { AuthenticationDialog } from '../../../features/authentication/ui/AuthenticationDialog'
import { authRequest } from '../../../shared/api/auth'
import { AppFooter } from '../../../widgets/app-footer/ui/AppFooter'
import { AppHeader } from '../../../widgets/app-header/ui/AppHeader'
import { HomeHero } from '../../../widgets/home-hero/ui/HomeHero'
import { ChatWorkspace } from '../../../widgets/chat-workspace/ui/ChatWorkspace'
import { StoryEditor } from '../../../features/stories/ui/StoryEditor'
import { ChatList } from '../../../widgets/chat-list/ui/ChatList'
import { StoryExplorerCard } from '../../../widgets/story-explorer-card/ui/StoryExplorerCard'
import './home-page.css'
import './monochrome-home.css'

export default function HomePage({ user, route, navigate, onAuthenticated, onAccount }) {
  const { preventClipboard } = useSiteInteraction()
  const authentication = useAuthentication(onAuthenticated)
  const mobileExperience = useMobileExperience()
  const [chats, setChats] = useState([])
  const [notice, setNotice] = useState('')
  const [generating, setGenerating] = useState({})
  const inFlight = useRef(new Set())
  const activeChatId = route.startsWith('/chat/') ? route.slice(6) : null
  const activeChat = chats.find((chat) => chat.id === activeChatId)

  const refresh = useCallback(async () => {
    if (!user) return
    try { setChats(await authRequest('/chats')) } catch (error) { setNotice(error.message) }
  }, [user])

  useEffect(() => { if (user) refresh(); else setChats([]) }, [user, refresh])

  const appendMessage = useCallback(async (chatId, text, mode = 'classic', replaceMessageId = null) => {
    if (inFlight.current.has(chatId)) return
    inFlight.current.add(chatId)
    setGenerating((current) => ({ ...current, [chatId]: true }))
    setNotice('')
    const userMessage = { id: crypto.randomUUID(), role: 'user', text }
    const assistantId = crypto.randomUUID()
    setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, messages: [...(replaceMessageId ? chat.messages.slice(0, chat.messages.findIndex((message) => message.id === replaceMessageId)) : chat.messages), ...(replaceMessageId && chat.messages.find((message) => message.id === replaceMessageId)?.role === 'assistant' ? [] : [userMessage]), { id: assistantId, role: 'assistant', text: '' }] } : chat))
    try {
      const response = await fetch(`/api/chats/${chatId}/messages`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, mode, replace_message_id: replaceMessageId }) })
      if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.detail || 'Не удалось отправить сообщение') }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finished = false
      let crisis = false
      while (true) {
        const { value, done } = await reader.read()
        buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (!line) continue
          const event = JSON.parse(line)
          if (event.type === 'status') setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.map((message) => message.id === assistantId ? { ...message, steps: [...(message.steps || []), event.message] } : message) } : chat))
          if (event.type === 'delta') setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.map((message) => message.id === assistantId ? { ...message, text: message.text + event.text } : message) } : chat))
          if (event.type === 'crisis') crisis = true
          if (event.type === 'crisis') setChats((current) => current.map((chat) => chat.id === chatId ? { ...chat, messages: chat.messages.map((message) => message.id === assistantId ? { ...message, text: event.message, crisis: true } : message) } : chat))
          if (event.type === 'error') throw new Error(event.message)
          if (event.type === 'done') finished = true
        }
        if (done) break
      }
      if (!finished) throw new Error('Соединение прервано. Попробуйте ещё раз.')
      if (!crisis) await refresh()
    } catch (error) {
      setNotice(error.message || 'Не удалось получить ответ')
      await refresh()
    } finally {
      inFlight.current.delete(chatId)
      setGenerating((current) => ({ ...current, [chatId]: false }))
    }
  }, [refresh])

  const createChat = useCallback(async (message, mode) => {
    if (!user) { authentication.openSignIn(); return }
    try {
      const chat = await authRequest('/chats', { method: 'POST', body: { title: 'Новый разговор' } })
      setChats((current) => [chat, ...current])
      navigate(`/chat/${chat.id}`)
      await appendMessage(chat.id, message, mode)
    } catch (error) { setNotice(error.message) }
  }, [user, authentication.openSignIn, navigate, appendMessage])

  const selectChat = useCallback((id) => navigate(id ? `/chat/${id}` : '/chats'), [navigate])
  const toggleChatPinned = useCallback(async (id) => {
    const chat = chats.find((item) => item.id === id)
    try { const updated = await authRequest(`/chats/${id}`, { method: 'PATCH', body: { pinned: !chat.isPinned } }); setChats((current) => current.map((item) => item.id === id ? updated : item)) } catch (error) { setNotice(error.message) }
  }, [chats])
  const renameChat = useCallback(async (id, title) => {
    try { const updated = await authRequest(`/chats/${id}`, { method: 'PATCH', body: { title } }); setChats((current) => current.map((chat) => chat.id === id ? updated : chat)) } catch (error) { setNotice(error.message) }
  }, [])
  const deleteChat = useCallback(async (id) => {
    try { await authRequest(`/chats/${id}`, { method: 'DELETE' }); setChats((current) => current.filter((chat) => chat.id !== id)); if (activeChatId === id) navigate('/') } catch (error) { setNotice(error.message) }
  }, [activeChatId, navigate])
  const updateMessage = useCallback((chatId, messageId, text, mode) => appendMessage(chatId, text, mode, messageId), [appendMessage])
  const regenerate = useCallback((chatId, message) => { const chat = chats.find((item) => item.id === chatId); const index = chat?.messages.findIndex((item) => item.id === message.id); const previous = index > 0 ? chat.messages[index - 1] : null; if (previous?.role === 'user') appendMessage(chatId, previous.text, message.mode || previous.mode || 'classic', message.id) }, [chats, appendMessage])

  return <main className="page-shell" onCopy={activeChatId ? undefined : preventClipboard} onCut={activeChatId ? undefined : preventClipboard}>
    {(activeChat || route === '/chats') ? <ChatWorkspace chats={chats} activeChatId={activeChatId} onCreateChat={createChat} onAppendMessage={(id, text, mode) => id ? appendMessage(id, text, mode) : createChat(text, mode)} onUpdateMessage={updateMessage} onRegenerate={regenerate} onToggleChatPinned={toggleChatPinned} onRenameChat={renameChat} onDeleteChat={deleteChat} onSelectChat={selectChat} userName={user?.first_name || user?.name || 'Пользователь'} userAvatar={user?.avatar_url} onProfile={user ? onAccount : authentication.openSignIn} isGenerating={Boolean(generating[activeChatId])} /> : <><AppHeader onLogin={user ? onAccount : authentication.openSignIn} user={user} onStories={() => navigate('/stories')} onHome={() => navigate('/')} onChats={() => navigate('/chats')} onCreate={() => navigate('/create')} route={route} />{route === '/create' ? <StoryEditor user={user} onBack={() => navigate('/')} onLogin={authentication.openSignIn} /> : route === '/chats' ? <ChatList chats={chats} user={user} onOpen={selectChat} onLogin={authentication.openSignIn} onCreate={() => { navigate('/'); requestAnimationFrame(() => document.querySelector('.conversation-card textarea')?.focus()) }} /> : route === '/stories' ? <section className="stories-page" aria-label="Поиск историй"><div className="stories-page-copy"><p className="eyebrow"><span />БИБЛИОТЕКА ВАЙЛАЙТ</p><h1>ИСТОРИИ,<br /><em>КОТОРЫЕ РЯДОМ</em></h1><p>Найдите опыт, который откликнется именно вам.</p></div><StoryExplorerCard onOpenComposer={() => navigate('/')} /></section> : <HomeHero onCreateChat={createChat} mobileExperience={mobileExperience} />}<AppFooter /></>}
    {notice && <div role="alert" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 100, background: '#222', color: '#fff', padding: 16, borderRadius: 12 }}>{notice} <button type="button" onClick={() => setNotice('')}>×</button></div>}
    <AuthenticationDialog authentication={authentication} />
  </main>
}
