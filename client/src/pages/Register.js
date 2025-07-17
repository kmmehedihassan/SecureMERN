// client/src/pages/Register.js
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { QRCodeCanvas } from 'qrcode.react'
import api from '../api'

export default function Register() {
  const [step, setStep]         = useState('form')      // 'form' or 'qr'
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [twoFAUri, setTwoFAUri] = useState(null)
  const navigate = useNavigate()

  const handleSubmit = async e => {
    e.preventDefault()
    try {
      const { data } = await api.post('/auth/register', { email, password })
      setTwoFAUri(data.twoFAUri)
      setStep('qr')
    } catch (err) {
      console.error(err)
      alert('Registration failed: ' + (err.response?.data?.message || err.message))
    }
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <form onSubmit={handleSubmit} className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 space-y-6">
          <h2 className="text-3xl font-extrabold text-indigo-600 text-center">
            Create Account
          </h2>

          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
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
            className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
          >
            Register &amp; Setup 2FA
          </button>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-sm w-full bg-white rounded-xl shadow-lg p-8 text-center">
        <h2 className="text-2xl font-semibold mb-4">Scan with Google Authenticator</h2>
        <div className="inline-block bg-white p-4 rounded-lg shadow">
          <QRCodeCanvas value={twoFAUri} size={200} includeMargin />
        </div>
        <p className="mt-4 text-sm text-gray-600">
          Open your authenticator app, tap “+” → “Scan a QR code”, and scan this.
        </p>
        <p className="mt-2 text-xs break-all bg-gray-100 p-2 rounded">
          Secret:{' '}
          <strong>
            {new URL(twoFAUri).searchParams.get('secret')}
          </strong>
        </p>
        <button
          onClick={() => navigate('/login')}
          className="mt-6 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
        >
          I’ve Scanned It — Go to Login
        </button>
      </div>
    </div>
  )
}
