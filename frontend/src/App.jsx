
import { useEffect, useState } from 'react'
import axios from 'axios'
import './App.css'

const BASE_API = 'http://localhost:5000/api'
const AUTH_API = `${BASE_API}/auth`
const TASK_API = `${BASE_API}/tasks`

function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem('taskflow_token') || ''
  )
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('taskflow_user')) || null
    } catch {
      return null
    }
  })

  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)

  const [tasks, setTasks] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const api = axios.create({
    baseURL: TASK_API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

  function logout() {
    localStorage.removeItem('taskflow_token')
    localStorage.removeItem('taskflow_user')
    setToken('')
    setUser(null)
    setTasks([])
    setTitle('')
    setDescription('')
    setEditingId(null)
    setError('')
    setNotice('')
  }

  async function handleAuth(e) {
    e.preventDefault()
    setAuthLoading(true)
    setError('')
    setNotice('')

    try {
      const endpoint = mode === 'register' ? '/register' : '/login'
      const payload = mode === 'register'
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password }

      const response = await axios.post(`${AUTH_API}${endpoint}`, payload)

      if (mode === 'register') {
        setMode('login')
        setPassword('')
        setNotice('Registration successful! Please log in.')
      } else {
        localStorage.setItem('taskflow_token', response.data.token)
        localStorage.setItem(
          'taskflow_user',
          JSON.stringify(response.data.user)
        )
        setToken(response.data.token)
        setUser(response.data.user)
        setPassword('')
        setNotice('Welcome to TaskFlow!')
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        'Could not connect. Check that the backend is running.'
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function loadTasks() {
    if (!token) return

    setLoading(true)

    try {
      const response = await api.get('/')
      setTasks(response.data)
      setError('')
    } catch (err) {
      if (err.response?.status === 401) {
        logout()
        setError('Your session expired. Please log in again.')
      } else {
        setError('Could not load tasks. Check the backend server.')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadTasks()
    else setLoading(false)
    // Load tasks when the login token changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!title.trim()) return

    try {
      if (editingId) {
        await api.put(`/${editingId}`, {
          title: title.trim(),
          description
        })
      } else {
        await api.post('/', {
          title: title.trim(),
          description
        })
      }

      setTitle('')
      setDescription('')
      setEditingId(null)
      setError('')
      await loadTasks()
    } catch (err) {
      setError(
        err.response?.data?.message || 'Could not save the task.'
      )
    }
  }

  async function toggleTask(task) {
    try {
      await api.put(`/${task._id}`, {
        completed: !task.completed
      })
      await loadTasks()
    } catch {
      setError('Could not update the task.')
    }
  }

  function startEdit(task) {
    setEditingId(task._id)
    setTitle(task.title)
    setDescription(task.description || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteTask(id) {
    if (!window.confirm('Delete this task?')) return

    try {
      await api.delete(`/${id}`)
      await loadTasks()
    } catch {
      setError('Could not delete the task.')
    }
  }

  const completed = tasks.filter(task => task.completed).length

  return (
    <div className="app">
      <nav className="navbar">
        <h2>TaskFlow</h2>
        <span>Student Task Manager</span>
        {token && (
          <div className="account">
            <span>{user?.name || user?.email}</span>
            <button type="button" onClick={logout}>Logout</button>
          </div>
        )}
      </nav>

      {!token ? (
        <main className="container auth-container">
          <p className="tagline">PLAN BETTER. ACHIEVE MORE.</p>
          <h1>{mode === 'register' ? 'Create Account' : 'Welcome Back'}</h1>
          <p className="subtitle">
            {mode === 'register'
              ? 'Register to start managing your tasks.'
              : 'Log in to manage your academic work.'}
          </p>

          <form className="task-form auth-form" onSubmit={handleAuth}>
            {mode === 'register' && (
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Full name"
                autoComplete="name"
                required
              />
            )}

            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              autoComplete="email"
              required
            />

            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password (minimum 6 characters)"
              autoComplete={
                mode === 'register' ? 'new-password' : 'current-password'
              }
              minLength={6}
              required
            />

            <button type="submit" disabled={authLoading}>
              {authLoading
                ? 'Please wait...'
                : mode === 'register' ? 'Create Account' : 'Login'}
            </button>
          </form>

          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}

          <p className="auth-switch">
            {mode === 'register'
              ? 'Already have an account? '
              : "Don't have an account? "}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'register' ? 'login' : 'register')
                setError('')
                setNotice('')
                setPassword('')
              }}
            >
              {mode === 'register' ? 'Login' : 'Register'}
            </button>
          </p>
        </main>
      ) : (
        <main className="container">
          <p className="tagline">PLAN BETTER. ACHIEVE MORE.</p>
          <h1>Manage Your Tasks</h1>
          <p className="subtitle">
            Organize your academic work in one place.
          </p>

          <form className="task-form" onSubmit={handleSubmit}>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Enter task title..."
              required
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description (optional)"
            />
            <button type="submit">
              {editingId ? 'Save Changes' : '+ Add Task'}
            </button>
            {editingId && (
              <button
                type="button"
                className="delete"
                onClick={() => {
                  setEditingId(null)
                  setTitle('')
                  setDescription('')
                }}
              >
                Cancel
              </button>
            )}
          </form>

          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}

          <div className="stats">
            <div className="stat">
              <h2>{tasks.length}</h2>
              <p>Total Tasks</p>
            </div>
            <div className="stat">
              <h2>{completed}</h2>
              <p>Completed</p>
            </div>
            <div className="stat">
              <h2>{tasks.length - completed}</h2>
              <p>Pending</p>
            </div>
          </div>

          <section className="task-list">
            <h2>My Tasks</h2>

            {loading ? (
              <p>Loading tasks...</p>
            ) : tasks.length === 0 ? (
              <p className="empty">
                No tasks yet. Add your first task above!
              </p>
            ) : (
              tasks.map(task => (
                <div className="task" key={task._id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={task.completed}
                      onChange={() => toggleTask(task)}
                    />
                    <span className={task.completed ? 'done' : ''}>
                      <strong>{task.title}</strong>
                      {task.description && (
                        <small className="description">
                          {task.description}
                        </small>
                      )}
                    </span>
                  </label>

                  <div className="task-actions">
                    <button type="button" onClick={() => startEdit(task)}>
                      Edit
                    </button>
                    <button
                      type="button"
                      className="delete"
                      onClick={() => deleteTask(task._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </section>
        </main>
      )}

      <footer>TaskFlow © 2026 | Student Task Manager</footer>
    </div>
  )
}

export default App
