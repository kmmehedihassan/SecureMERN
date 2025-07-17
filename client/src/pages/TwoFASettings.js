import { useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import api from '../api'

export default function TwoFASettings() {
  const [email, setEmail]   = useState('')
  const [twoFAUri, setTwoFAUri] = useState(null)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(false)

  const handleLookup = async e => {
    e.preventDefault()
    setError(null)
    setTwoFAUri(null)
    setLoading(true)
    try {
      const { data } = await api.post('/auth/2fa-uri', { email })
      setTwoFAUri(data.twoFAUri)
    } catch (err) {
      setError(err.response?.data?.message || 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-semibold text-center mb-6">Retrieve Your QR Code</h1>

        {!twoFAUri ? (
          <form onSubmit={handleLookup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Registered Email
              </label>
              <input
                type="email"
                value={email}
                required
                onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="you@example.com"
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {loading ? 'Looking up…' : 'Get QR Code'}
            </button>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <p className="text-gray-700">Scan this QR code with your Authenticator app:</p>
            <div className="inline-block bg-white p-4 rounded-lg shadow">
              <QRCodeCanvas value={twoFAUri} size={200} includeMargin />
            </div>
            <p className="text-sm text-gray-600 break-all">
              Secret: <strong>{ new URL(twoFAUri).searchParams.get('secret') }</strong>
            </p>
            <button
              onClick={() => setTwoFAUri(null)}
              className="mt-4 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
            >
              Lookup another email
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
