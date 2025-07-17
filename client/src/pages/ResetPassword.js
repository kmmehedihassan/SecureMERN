import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import api from '../api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [password, setPassword] = useState('')
  const [status, setStatus]     = useState(null) // null | 'success' | 'error'

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      await api.post('/auth/reset-password', { token, password })
      setStatus('success')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  if (!token) {
    return (
      <div className="p-8">
        <p>Invalid or missing reset token.</p>
        <Link to="/forgot-password">Back</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <h2 className="text-2xl font-bold mb-4">Reset Password</h2>

        {status === 'success' ? (
          <p className="text-green-600">
            Password reset! <Link to="/login" className="text-indigo-600 hover:underline">Log in</Link> now.
          </p>
        ) : (
          <>
            {status === 'error' && (
              <p className="text-red-600 mb-2">
                Link expired or something went wrong.
              </p>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Reset Password
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
