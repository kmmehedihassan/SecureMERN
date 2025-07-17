// client/src/pages/Login.js
import { useState, useContext } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../api'
import { AuthContext } from '../context/AuthContext'

export default function Login() {
  const { login } = useContext(AuthContext)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode]         = useState('')
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const { data } = await api.post('/auth/login', {
        email,
        password,
        twoFactorCode: code
      })
      login(data.accessToken)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      alert('Login failed: ' + (err.response?.data?.message || err.message))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-3xl font-extrabold text-center text-indigo-600 mb-6">
          Welcome Back
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500"
              placeholder="you@example.com"
              value={email}
              required
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500"
              placeholder="••••••••"
              value={password}
              required
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {/* Forgot-password link
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-600 hover:underline"
            >
              Forgot password?
            </Link>
          </div> */}

          {/* 2FA Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              2FA Code
            </label>
            <input
              type="text"
              className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500"
              placeholder="123456"
              maxLength={6}
              value={code}
              required
              onChange={e => setCode(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Log In
          </button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Don’t have an account?{' '}
            <Link to="/register" className="text-indigo-600 hover:underline">
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
