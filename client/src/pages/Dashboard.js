// client/src/pages/Dashboard.js
import React, {
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo
} from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { jwtDecode } from 'jwt-decode'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from 'recharts'
import api from '../api'
import { AuthContext } from '../context/AuthContext'

// Live countdown component
function ExpiryCountdown({ expiry }) {
  const calc = () => Math.max(0, Math.floor((expiry - Date.now()) / 1000))
  const [seconds, setSeconds] = useState(calc())
  useEffect(() => {
    const id = setInterval(() => setSeconds(calc()), 1000)
    return () => clearInterval(id)
  }, [expiry])
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  return (
    <span className="font-mono">
      {minutes}:{secs.toString().padStart(2, '0')}
    </span>
  )
}

export default function Dashboard() {
  const { token, login, logout } = useContext(AuthContext)
  const [me, setMe] = useState(null)
  const [serverDate, setServerDate] = useState(null)
  const [expTime, setExpTime] = useState(null)
  const [history, setHistory] = useState([])
  const [rate, setRate] = useState({ remaining: 0, limit: 100 })

  // Fetch user and server time
  const fetchMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me')
      setMe(res.data)
      setServerDate(new Date(res.headers.date))
      setRate({
        limit: +res.headers['x-ratelimit-limit'] || 100,
        remaining: +res.headers['x-ratelimit-remaining'] || 0
      })
    } catch {
      logout()
    }
  }, [logout])

  // Fetch login history
  const fetchHistory = useCallback(async () => {
    try {
      const res = await api.get('/auth/history')
      setHistory(res.data)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    fetchMe()
    fetchHistory()
  }, [fetchMe, fetchHistory])

  // Decode token expiry
  useEffect(() => {
    if (!token) return
    try {
      const { exp } = jwtDecode(token)
      setExpTime(new Date(exp * 1000))
    } catch {
      setExpTime(null)
    }
  }, [token])

  // Manual token refresh
  const handleRefresh = async () => {
    try {
      const { data } = await api.post('/auth/refresh')
      login(data.accessToken)
      fetchMe()
      alert('Token refreshed!')
    } catch {
      alert('Refresh failed — please log in again.')
      logout()
    }
  }

  // Prepare chart data: count logins per day
  const chartData = useMemo(() => {
    const map = {}
    history.forEach(({ time }) => {
      const date = new Date(time).toLocaleDateString()
      map[date] = (map[date] || 0) + 1
    })
    return Object.entries(map)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  }, [history])

  if (!me) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <p className="text-gray-600">Loading your secure session…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8 space-y-6"
      >
        {/* Welcome */}
        <h1 className="text-2xl font-semibold text-indigo-700">
          Welcome, {me.email}
        </h1>

        {/* Manage 2FA Settings Link */}
        <Link
          to="/settings/2fa"
          className="inline-block mt-2 text-indigo-600 hover:underline"
        >
          🔑 Manage Two-Factor Authentication
        </Link>

        {/* User Info */}
        <div className="grid grid-cols-2 gap-4">
          <p>
            <span className="font-medium">User ID:</span> {me._id}
          </p>
          <p>
            <span className="font-medium">Server Time:</span>{' '}
            {serverDate?.toLocaleString()}
          </p>
          <p>
            <span className="font-medium">Token Expires In:</span>{' '}
            {expTime ? <ExpiryCountdown expiry={expTime.getTime()} /> : '—'}
          </p>
          <p>
            <span className="font-medium">Rate Limit Used:</span>{' '}
            {rate.limit - rate.remaining} / {rate.limit}
          </p>
        </div>

        {/* Rate Limit Bar */}
        <div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-indigo-500 h-4 rounded-full transition-all"
              style={{
                width: `${((rate.limit - rate.remaining) / rate.limit) * 100}%`
              }}
            />
          </div>
        </div>

        {/* Access Token */}
        <div>
          <label className="font-medium">Access Token (JWT):</label>
          <textarea
            readOnly
            value={token}
            rows={3}
            className="w-full mt-1 p-2 text-xs font-mono bg-gray-100 rounded border border-gray-300"
          />
        </div>

        {/* Login History & Chart */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* History List */}
          <div>
            <h2 className="font-semibold mb-2">Recent Logins</h2>
            <ul className="text-sm divide-y divide-gray-200">
              {history.length > 0 ? (
                history.map((h, i) => (
                  <li
                    key={i}
                    className="py-2 flex justify-between text-gray-700"
                  >
                    <span>
                      {new Date(h.time).toLocaleString()}
                    </span>
                    <span className="text-gray-500">{h.ip}</span>
                  </li>
                ))
              ) : (
                <li className="py-2 text-gray-500">
                  No login history.
                </li>
              )}
            </ul>
          </div>

          {/* Chart */}
          <div>
            <h2 className="font-semibold mb-2">Logins Over Time</h2>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid stroke="#eee" strokeDasharray="5 5" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#4F46E5"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-end space-x-4">
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
          >
            Refresh Token
          </button>
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </motion.div>
    </div>
  )
}
