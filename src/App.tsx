import { useState, useEffect, useRef, useCallback } from 'react'

interface Message {
  text: string
  isUser: boolean
  type?: 'text' | 'image' | 'audio'
}

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [token, setToken] = useState('')
  const [model, setModel] = useState('xai/grok-4-1-fast-reasoning')
  const [darkMode, setDarkMode] = useState(false)
  const [connected, setConnected] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedDark = localStorage.getItem('darkMode') === 'true'
    setDarkMode(savedDark)
  }, [])

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString())
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const connect = useCallback(() => {
    if (!token) return alert('Enter token')
    const gateway = 'ws://185.230.63.38:18789'
    const websocket = new WebSocket(`${gateway}?token=${token}`)
    websocket.onopen = () => setConnected(true)
    websocket.onclose = () => setConnected(false)
    websocket.onerror = (e) => {
      console.error('WS error', e)
      setConnected(false)
    }
    websocket.onmessage = (e) => {
      console.log('WS msg', e.data)
      try {
        const data = JSON.parse(e.data)
        const msg: Message = {
          text: data.message || data.content || data.error || JSON.stringify(data),
          isUser: false,
          type: data.media ? data.media.type.split('/')[0] as any : 'text'
        }
        setMessages(prev => [...prev, msg])
      } catch (err) {
        setMessages(prev => [...prev, {text: e.data, isUser: false}])
      }
    }
    setWs(websocket)
  }, [token])

  const send = () => {
    if (!ws || !input.trim() || !connected) return
    const payload = {
      action: "agent",
      sessionKey: "main",
      message: input,
      model
    }
    console.log('Send payload', payload)
    ws.send(JSON.stringify(payload))
    setMessages(prev => [...prev, {text: input, isUser: true}])
    setInput('')
  }

  const toggleDark = () => setDarkMode(!darkMode)

  const models = [
    'xai/grok-4-1-fast-reasoning',
    'deepseek/deepseek-coder',
    'openrouter/meta-llama/llama-3.1-405b-instruct'
  ]
return (
    <div className="min-h-screen p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <header className="mb-6 flex justify-between items-center border-b pb-4">
        <h1 className="text-3xl font-bold">ClawChat PWA</h1>
        <div className="flex items-center space-x-3">
          <button onClick={toggleDark} title="Toggle dark" className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <span className={`text-xl ${connected ? 'text-green-500 animate-pulse' : 'text-red-500'}`} title="WS Status">●</span>
        </div>
      </header>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div className="flex flex-wrap gap-2">
          <input
            placeholder="Gateway token (pbztQN3uHwKGKbLoOyFeBkUM0qJhfRpF)"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white min-w-[250px]"
          />
          <button onClick={connect} disabled={connected} className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition font-medium">
            {connected ? 'Connected' : 'Connect'}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
        <div className="flex flex-wrap gap-2 items-center">
          <label className="text-sm font-medium">Model:</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white">
            {models.map(m => <option key={m}>{m.split('/').slice(-1)[0]}</option>)}
          </select>
          <button onClick={() => send('/status')} className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium">
            Status
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-96 max-h-96 overflow-y-auto border border-gray-300 rounded-xl p-4 mb-6 bg-white dark:bg-gray-800">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md p-4 rounded-2xl ${msg.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              {msg.type === 'image' ? (
                <img src={msg.text} alt="Tool result" className="max-w-full rounded-xl" />
              ) : (
                msg.text.split('\n').map((line, j) => (
                  <div key={j} className="whitespace-pre-wrap">{line}</div>
                ))
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && send()}
          className="flex-1 p-4 border border-gray-300 rounded-l-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
          placeholder="Type message (/status /model=deepseek...) Shift+Enter line, Enter send"
          rows={1}
        />
        <button 
          onClick={send} 
          disabled={!connected || !input.trim()}
          className="px-8 py-4 bg-blue-500 text-white rounded-r-xl hover:bg-blue-600 disabled:bg-gray-400 transition font-bold text-lg"
        >
          Send
        </button>
      </div>
    </div>
  )
}

export default App
