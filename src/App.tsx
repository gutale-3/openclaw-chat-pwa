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
    const gateway = 'ws://localhost:18789' // Change to VPS IP:18789
    const websocket = new WebSocket(`${gateway}?token=${token}`)
    websocket.onopen = () => setConnected(true)
    websocket.onclose = () => setConnected(false)
    websocket.onerror = () => setConnected(false)
    websocket.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data)
        const msg: Message = {
          text: data.message || data.content || JSON.stringify(data),
          isUser: false,
          type: data.media ? data.media.type.split('/')[0] as any : 'text'
        }
        setMessages(prev => [...prev, msg])
      } catch {
        setMessages(prev => [...prev, {text: e.data, isUser: false}])
      }
    }
    setWs(websocket)
  }, [token])

  const send = () => {
    if (!ws || !input.trim() || !connected) return
    ws.send(input)
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
    <div className="min-h-screen p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <header className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">ClawChat PWA</h1>
        <div className="flex items-center space-x-2">
          <button onClick={toggleDark} className="p-2 rounded bg-gray-200 dark:bg-gray-700">
            {darkMode ? '☀️' : '🌙'}
          </button>
          <span className={connected ? 'text-green-500' : 'text-red-500'}>●</span>
        </div>
      </header>

      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <input
          placeholder="Gateway token (/status for yours)"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="p-2 border rounded mr-2 w-64"
        />
        <button onClick={connect} disabled={connected} className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-400">
          {connected ? 'Connected' : 'Connect'}
        </button>
      </div>

      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded">
        <select value={model} onChange={(e) => setModel(e.target.value)} className="p-2 border rounded mr-2">
          {models.map(m => <option key={m}>{m}</option>)}
        </select>
        <button onClick={() => send('/status')} className="p-2 bg-green-500 text-white rounded">Status</button>
      </div>

      <div className="h-96 overflow-y-auto border rounded p-4 mb-4 bg-white dark:bg-gray-800">
        {messages.map((msg, i) => (
          <div key={i} className={`mb-4 ${msg.isUser ? 'text-right' : 'text-left'}`}>
            <div className={`inline-block p-3 rounded-lg max-w-xs lg:max-w-md ${msg.isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
              {msg.type === 'image' ? (
                <img src={msg.text} alt="tool" className="max-w-full rounded" />
              ) : (
                msg.text.split('\n').map((line, j) => <div key={j}>{line}</div>)
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && send()}
          className="flex-1 p-3 border rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Type message (/status /model=...) or @attach file"
        />
        <button onClick={send} disabled={!connected} className="p-3 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-gray-400">
          Send
        </button>
      </div>
    </div>
  )
}

export default App
