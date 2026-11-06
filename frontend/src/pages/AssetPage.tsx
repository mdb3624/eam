import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiRequestError } from '@/api/client'
import { getAsset, type AssetDetail, type AssetStatus, type Criticality, type HierarchyType } from '@/api/assets'
import { useAuth } from '@/auth/AuthContext'
import { Loading } from './Screens'

type Tone = 'ok' | 'major' | 'minor' | 'critical' | 'muted'

const NOT_RECORDED = 'Not recorded'

const STATUS: Record<AssetStatus, { word: string; tone: Tone }> = {
  IN_SERVICE: { word: 'In service', tone: 'ok' },
  OUT_OF_SERVICE: { word: 'Out of service', tone: 'major' },
  RETIRED: { word: 'Retired', tone: 'muted' },
}

const CRITICALITY: Record<Criticality, { word: string; tone: Tone }> = {
  LOW: { word: 'Low', tone: 'minor' },
  MEDIUM: { word: 'Medium', tone: 'minor' },
  HIGH: { word: 'High', tone: 'major' },
  CRITICAL: { word: 'Critical', tone: 'critical' },
}

const TYPE_LABEL: Record<HierarchyType, string> = {
  UTILITY: 'Utility',
  SUBSTATION: 'Substation',
  FEEDER: 'Feeder',
  TRANSFORMER: 'Transformer',
}

/** Shape per tone so severity is never colour alone (style guide, severity chip). */
function ChipShape({ tone }: { tone: Tone }) {
  const shape = {
    ok: <circle cx="6" cy="6" r="4.5" />,
    major: <path d="M6 1.5l5 9H1z" />,
    minor: <rect x="2" y="2" width="8" height="8" rx="2" />,
    critical: <path d="M6 0.5l5.5 5.5L6 11.5 0.5 6z" />,
    muted: <path d="M2 6h8" strokeWidth="2" />,
  }[tone]
  return (
    <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true" fill="currentColor" stroke="currentColor">
      {shape}
    </svg>
  )
}

function Chip({ tone, word, testId }: { tone: Tone; word: string; testId: string }) {
  return (
    <span className={`chip chip-${tone}`} data-testid={testId}>
      <ChipShape tone={tone} />
      {word}
    </span>
  )
}

function formatLocation(location: AssetDetail['location']): string {
  return location ? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}` : NOT_RECORDED
}

function orNotRecorded(value: string | null): string {
  return value ?? NOT_RECORDED
}

type View = { kind: 'loading' } | { kind: 'ready'; asset: AssetDetail } | { kind: 'not-found' } | { kind: 'error'; message: string }

export default function AssetPage() {
  const { id = '' } = useParams()
  const { request } = useAuth()
  const [view, setView] = useState<View>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    setView({ kind: 'loading' })
    getAsset(request, id)
      .then((asset) => !cancelled && setView({ kind: 'ready', asset }))
      .catch((error: unknown) => {
        if (cancelled) {
          return
        }
        if (error instanceof ApiRequestError && (error.status === 404 || error.status === 400)) {
          setView({ kind: 'not-found' })
        } else {
          setView({ kind: 'error', message: error instanceof ApiRequestError ? error.message : 'Something went wrong. Try again.' })
        }
      })
    return () => {
      cancelled = true
    }
  }, [id, request])

  if (view.kind === 'loading') {
    return <Loading />
  }
  if (view.kind === 'not-found') {
    return (
      <section className="placeholder" data-testid="asset-not-found">
        <h1>Asset not found</h1>
        <p>No matching asset.</p>
        <Link to="/assets" data-testid="asset-not-found-back">
          Back to asset search
        </Link>
      </section>
    )
  }
  if (view.kind === 'error') {
    return (
      <div className="banner" role="alert">
        <b>Error:</b> {view.message}
      </div>
    )
  }

  const { asset } = view
  const status = STATUS[asset.status]
  const criticality = CRITICALITY[asset.criticality]
  return (
    <div className="asset-360">
      <Link to="/assets" className="back-link" data-testid="asset-back-link">
        &lt; Asset search
      </Link>
      <section className="card" aria-labelledby="asset-title">
        <div className="asset-head">
          <h1 id="asset-title" className="mono" data-testid="asset-header-code">
            {asset.assetCode}
          </h1>
          <div className="chips">
            <Chip tone={status.tone} word={status.word} testId="asset-status" />
            <Chip tone={criticality.tone} word={criticality.word} testId="asset-criticality" />
          </div>
        </div>
        <p className="asset-name" data-testid="asset-header-name">
          {asset.name}
        </p>
        <p>
          <span className="label">Location</span>{' '}
          <span className={asset.location ? 'mono' : 'muted'} data-testid="asset-location">
            {formatLocation(asset.location)}
          </span>
        </p>
      </section>

      <section className="card">
        <h2>Hierarchy</h2>
        <nav aria-label="Asset hierarchy" data-testid="asset-hierarchy">
          <ol className="hierarchy">
            {asset.hierarchy.map((entry, index) => {
              const current = index === asset.hierarchy.length - 1
              const text = entry.assetCode ?? entry.name
              return (
                <li
                  key={entry.id}
                  data-testid="asset-hierarchy-item"
                  aria-current={current ? 'page' : undefined}
                  className={current ? 'current' : undefined}
                >
                  <span className="type-label">{TYPE_LABEL[entry.assetType]}</span>
                  {current || entry.assetType === 'UTILITY' ? (
                    <span className="mono">{text}</span>
                  ) : (
                    <Link
                      to={`/assets/${entry.id}`}
                      className="mono"
                      data-testid={`asset-hierarchy-link-${entry.assetType.toLowerCase()}`}
                    >
                      {text}
                    </Link>
                  )}
                </li>
              )
            })}
          </ol>
        </nav>
      </section>

      <section className="card">
        <h2>Details</h2>
        <dl className="details">
          <div>
            <dt>Manufacturer</dt>
            <dd data-testid="asset-manufacturer">{orNotRecorded(asset.manufacturer)}</dd>
          </div>
          <div>
            <dt>Model</dt>
            <dd data-testid="asset-model">{orNotRecorded(asset.model)}</dd>
          </div>
          <div>
            <dt>Serial number</dt>
            <dd data-testid="asset-serial">{orNotRecorded(asset.serialNumber)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
