import type { RequestOptions } from './client'

export type AssetStatus = 'IN_SERVICE' | 'OUT_OF_SERVICE' | 'RETIRED'
export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type HierarchyType = 'UTILITY' | 'SUBSTATION' | 'FEEDER' | 'TRANSFORMER'

export interface AssetSummary {
  id: string
  assetCode: string
  name: string
  assetType: Exclude<HierarchyType, 'UTILITY'>
  status: AssetStatus
  criticality: Criticality
}

export interface HierarchyEntry {
  id: string
  assetCode: string | null
  name: string
  assetType: HierarchyType
}

export interface AssetDetail extends AssetSummary {
  location: { latitude: number; longitude: number } | null
  manufacturer: string | null
  model: string | null
  serialNumber: string | null
  hierarchy: HierarchyEntry[]
}

/** The `request` function from useAuth(). */
export type AuthedRequest = <T>(path: string, options?: Omit<RequestOptions, 'token' | 'onUnauthorized'>) => Promise<T>

export function searchAssets(request: AuthedRequest, assetId: string): Promise<AssetSummary[]> {
  return request<AssetSummary[]>(`/api/v1/assets?assetId=${encodeURIComponent(assetId)}`)
}

export function getAsset(request: AuthedRequest, id: string): Promise<AssetDetail> {
  return request<AssetDetail>(`/api/v1/assets/${encodeURIComponent(id)}`)
}
