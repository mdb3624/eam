import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError } from '@/api/client'
import { searchAssets } from '@/api/assets'
import { useAuth } from '@/auth/AuthContext'

const BLANK_MESSAGE = 'Enter an Asset ID.'
const ERROR_ID = 'asset-search-error-text'

export default function AssetSearchPage() {
  const { request } = useAuth()
  const navigate = useNavigate()
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [noMatch, setNoMatch] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setNoMatch(null)
    const text = value.trim()
    if (!text) {
      setFieldError(BLANK_MESSAGE)
      return
    }
    setFieldError(null)
    setBusy(true)
    try {
      const matches = await searchAssets(request, text)
      if (matches.length > 0) {
        navigate(`/assets/${matches[0].id}`)
        return
      }
      setNoMatch(`No matching asset for "${text}". Check the Asset ID and try again.`)
    } catch (error) {
      setFieldError(error instanceof ApiRequestError ? error.message : 'Something went wrong. Try again.')
    }
    setBusy(false)
  }

  return (
    <section className="card search-card" data-testid="screen-assets">
      <h1>Asset search</h1>
      <p className="muted">Enter an Asset ID to open its record.</p>
      {noMatch && (
        <div className="banner" role="alert" data-testid="asset-search-no-match">
          {noMatch}
        </div>
      )}
      <form onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="asset-search-input" className="label">
            Asset ID
          </label>
          <div className="search-row">
            <input
              id="asset-search-input"
              data-testid="asset-search-input"
              type="text"
              autoComplete="off"
              autoFocus
              readOnly={busy}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={fieldError ? ERROR_ID : undefined}
            />
            <button type="submit" className="btn btn-primary" data-testid="asset-search-submit" disabled={busy}>
              {busy ? 'Searching...' : 'Search'}
            </button>
          </div>
          {fieldError && (
            <div id={ERROR_ID} className="field-error" role="alert" data-testid="asset-search-error">
              {fieldError}
            </div>
          )}
        </div>
      </form>
    </section>
  )
}
