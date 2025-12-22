'use client'

export const dynamic = 'force-dynamic'

import DashboardLayout from '@/app/components/DashboardLayout'
import { supabase } from '@/lib/supabase'
import type { LucideIcon } from 'lucide-react'
import {
    Activity,
    BarChart2,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Download,
    ExternalLink,
    Eye,
    Heart,
    Instagram,
    LayoutPanelLeft,
    MapPin,
    MessageSquare,
    Music2,
    Search,
    Users,
    X
} from 'lucide-react'
import { ChangeEvent, useCallback, useEffect, useMemo, useState } from 'react'

const PANEL_WIDTH = 720

type RecentPost = Record<string, unknown> | null

type CreatorMetricsHistorySnapshot = {
  scraped_at?: string | null
  average_views?: unknown
  average_likes?: unknown
  followers_count?: unknown
  engagement_rate?: unknown
  buzz_score?: unknown
  [key: string]: unknown
}

type CreatorMetricsHistoryRow = {
  metrics: CreatorMetricsHistorySnapshot[] | null
  updated_at: string | null
  created_at: string | null
  [key: string]: unknown
}

type HistoryMetricKey = 'followersCount' | 'averageViews' | 'averageLikes' | 'engagementRate' | 'buzzScore'

type HistoryPoint = {
  label: string
  iso: string | null
  timestamp: number
  metrics: Record<HistoryMetricKey, number | null>
  changes: Partial<Record<HistoryMetricKey, number | null>>
  changeTypes: Partial<Record<HistoryMetricKey, string | null>>
}

type HistorySeries = {
  key: HistoryMetricKey
  label: string
  color: string
  values: (number | null)[]
  percentChanges: (number | null)[]
  baseValue: number | null
  latestValue: number | null
  latestPercentChange: number | null
  latestRawChange: number | null
  latestChangeType: string | null
  latestDayPercentChange: number | null
  valueFormatter: (value: number | null) => string
  changeFormatter: (value: number | null) => string
}

type HistoricalMetricsResult = {
  labels: string[]
  points: HistoryPoint[]
  series: HistorySeries[]
  percentDomain: { min: number; max: number }
}

type ActionState = 'Action' | 'Replace' | 'Keep' | 'Find more'

type ActionBuckets = {
  replace: string[]
  keep: string[]
  findMore: string[]
}

type HealthWellnessRow = {
  id: string
  handle: string
  display_name: string | null
  profile_url: string | null
  profile_image_url: string | null
  bio: string | null
  platform: string | null
  primary_niche: string | null
  secondary_niche: string | null
  locationRegion: string | null
  followers_count: number | null
  average_views: number | null
  average_comments: number | null
  engagement_rate: number | null
  hashtags: string[] | null
  email: string | null
  past_ad_placements: string[] | null
  created_at: string | null
  average_likes: unknown
  brand_tags: string | null
  bio_links: string | null
  followers_change: number | null
  followers_change_type: string | null
  engagement_rate_change: number | null
  engagement_rate_change_type: string | null
  average_views_change: number | null
  average_views_change_type: string | null
  average_likes_change: number | null
  average_likes_change_type: string | null
  average_comments_change: number | null
  average_comments_change_type: string | null
  buzz_score: number | null
  location: string | null
  updated_at: string | null
  no_of_sponsored: number | null
  recent_post_1: RecentPost
  recent_post_2: RecentPost
  recent_post_3: RecentPost
  recent_post_4: RecentPost
  recent_post_5: RecentPost
  recent_post_6: RecentPost
  recent_post_7: RecentPost
  recent_post_8: RecentPost
  recent_post_9: RecentPost
  recent_post_10: RecentPost
  recent_post_11: RecentPost
  recent_post_12: RecentPost
  metrics_history?: CreatorMetricsHistoryRow[] | CreatorMetricsHistoryRow | null
}


const sanitizeHandle = (value: string | null | undefined): string => {
  if (!value) return ''
  return value.trim()
}

const normalizeHandle = (value: string): string => value.trim().toLowerCase()

const escapeForILike = (value: string): string => value.replace(/[%_\\]/g, char => `\\${char}`)

const ensureUniqueSorted = (items: string[]): string[] => {
  const unique = new Map<string, string>()
  items.forEach(item => {
    const sanitized = sanitizeHandle(item)
    if (!sanitized) return
    const key = normalizeHandle(sanitized)
    if (!unique.has(key)) {
      unique.set(key, sanitized)
    }
  })
  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b))
}

const sanitizeHandlesArray = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return ensureUniqueSorted(
    input
      .map(item => (typeof item === 'string' ? item : null))
      .filter((item): item is string => typeof item === 'string')
  )
}

const createEmptyBuckets = (): ActionBuckets => ({
  replace: [],
  keep: [],
  findMore: []
})

const createHandleSet = (list: string[]): Set<string> => {
  const set = new Set<string>()
  list.forEach(item => {
    const sanitized = sanitizeHandle(item)
    if (!sanitized) return
    set.add(normalizeHandle(sanitized))
  })
  return set
}

const deriveBucketsForHandle = (buckets: ActionBuckets, handle: string, action: ActionState): ActionBuckets => {
  const sanitizedHandle = sanitizeHandle(handle)
  if (!sanitizedHandle) {
    return {
      replace: ensureUniqueSorted([...buckets.replace]),
      keep: ensureUniqueSorted([...buckets.keep]),
      findMore: ensureUniqueSorted([...buckets.findMore])
    }
  }
  const normalized = normalizeHandle(sanitizedHandle)
  const remove = (list: string[]) => list.filter(item => normalizeHandle(item) !== normalized)

  const base = {
    replace: remove(buckets.replace),
    keep: remove(buckets.keep),
    findMore: remove(buckets.findMore)
  }

  switch (action) {
    case 'Replace':
      base.replace.push(sanitizedHandle)
      break
    case 'Keep':
      base.keep.push(sanitizedHandle)
      break
    case 'Find more':
      base.findMore.push(sanitizedHandle)
      break
    default:
      break
  }

  return {
    replace: ensureUniqueSorted(base.replace),
    keep: ensureUniqueSorted(base.keep),
    findMore: ensureUniqueSorted(base.findMore)
  }
}

const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}m`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`
  return `${value}`
}

const formatPercent = (value: number | null | undefined): string => {
  if (value === null || value === undefined || isNaN(value)) return 'N/A'
  return `${value.toFixed(1)}%`
}

const HISTORY_SERIES_CONFIG: Array<{
  key: HistoryMetricKey
  label: string
  color: string
  valueFormatter: (value: number | null) => string
  changeFormatter: (value: number | null) => string
  changeKey?: string
  changeTypeKey?: string
}> = [
  {
    key: 'followersCount',
    label: 'Followers',
    color: '#6366f1',
    valueFormatter: formatNumber,
    changeFormatter: formatNumber,
    changeKey: 'followers_change',
    changeTypeKey: 'followers_change_type'
  },
  {
    key: 'averageViews',
    label: 'Avg Views',
    color: '#38bdf8',
    valueFormatter: formatNumber,
    changeFormatter: formatNumber,
    changeKey: 'average_views_change',
    changeTypeKey: 'average_views_change_type'
  },
  {
    key: 'averageLikes',
    label: 'Avg Likes',
    color: '#f97316',
    valueFormatter: formatNumber,
    changeFormatter: formatNumber,
    changeKey: 'average_likes_change',
    changeTypeKey: 'average_likes_change_type'
  },
  {
    key: 'engagementRate',
    label: 'Engagement Rate',
    color: '#10b981',
    valueFormatter: value => (value === null || value === undefined ? 'N/A' : `${value.toFixed(1)}%`),
    changeFormatter: value => (value === null || value === undefined ? 'N/A' : `${value.toFixed(1)} pts`),
    changeKey: 'engagement_rate_change',
    changeTypeKey: 'engagement_rate_change_type'
  },
  {
    key: 'buzzScore',
    label: 'Buzz Score',
    color: '#f59e0b',
    valueFormatter: value => (value === null || value === undefined ? 'N/A' : `${value.toFixed(0)}`),
    changeFormatter: value => (value === null || value === undefined ? 'N/A' : `${value.toFixed(0)} pts`),
    changeKey: 'buzz_score_change',
    changeTypeKey: 'buzz_score_change_type'
  }
]

const extractAverageLikes = (value: unknown): number | null => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? null : parsed
  }
  if (typeof value === 'object') {
    // If it's an object, try to find a numeric value
    if (Array.isArray(value) && value.length > 0) {
      // If it's an array, try to get the first number or average
      const numericValues = (value as unknown[])
        .map(item => {
          if (typeof item === 'number') return item
          if (typeof item === 'string') {
            const parsed = parseFloat(item)
            return Number.isNaN(parsed) ? null : parsed
          }
          return null
        })
        .filter((item): item is number => item !== null)

      if (numericValues.length > 0) {
        const sum = numericValues.reduce((acc, v) => acc + v, 0)
        return sum / numericValues.length
      }
    } else {
      // If it's an object, try common property names (prioritize avg_value)
      const possibleKeys = ['avg_value', 'average', 'avg', 'value', 'count', 'likes', 'average_likes']
      const obj = value as Record<string, unknown>
      for (const key of possibleKeys) {
        const candidate = obj[key]
        if (typeof candidate === 'number') {
          return candidate
        }
        if (typeof candidate === 'string') {
          const parsed = parseFloat(candidate)
          if (!Number.isNaN(parsed)) {
            return parsed
          }
        }
      }
    }
  }
  return null
}

const recentPostsFor = (creator: HealthWellnessRow | null): RecentPost[] => {
  if (!creator) return []
  return [
    creator.recent_post_1,
    creator.recent_post_2,
    creator.recent_post_3,
    creator.recent_post_4,
    creator.recent_post_5,
    creator.recent_post_6,
    creator.recent_post_7,
    creator.recent_post_8,
    creator.recent_post_9,
    creator.recent_post_10,
    creator.recent_post_11,
    creator.recent_post_12
  ]
}

const extractRecentMedia = (creator: HealthWellnessRow | null) => {
  if (!creator) return [] as { src: string; alt: string }[]
  const posts: { src: string; alt: string }[] = []
  recentPostsFor(creator)
    .slice(0, 3)
    .forEach((post, index) => {
      if (post && typeof post === 'object') {
        const record = post as Record<string, unknown>

        const mediaUrls = Array.isArray(record.media_urls)
          ? (record.media_urls.filter((u): u is string => typeof u === 'string' && u.length > 0) as string[])
          : []

        const fallbackSources = [
          record.media_url,
          record.thumbnail_url,
          record.image_url,
          record.permalink_image,
          record.permalink
        ].filter((value): value is string => typeof value === 'string' && value.length > 0)

        const src = [...mediaUrls, ...fallbackSources][0] ?? null

        if (src) {
          const caption = typeof record.caption === 'string' ? record.caption : `${creator.handle} post ${index + 1}`
          posts.push({ src, alt: caption })
        }
      }
    })
  return posts
}

const extractAverageShares = (creator: HealthWellnessRow | null): number | null => {
  if (!creator) return null
  let total = 0
  let count = 0
  recentPostsFor(creator).forEach(post => {
    if (post && typeof post === 'object') {
      const record = post as Record<string, unknown>
      const shareCount = record.share_count ?? record.shares ?? record.shareCount
      if (typeof shareCount === 'number' && !Number.isNaN(shareCount)) {
        total += shareCount
        count += 1
      }
    }
  })
  if (count === 0) return null
  return total / count
}

const MAX_HISTORY_POINTS = 12

const historyDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric'
})

const coerceToNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.-]/g, '')
    if (!cleaned) return null
    const parsed = parseFloat(cleaned)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const deriveHistoryValue = (snapshot: CreatorMetricsHistorySnapshot): number | null => {
  const averageViews = coerceToNumber(snapshot.average_views)
  if (averageViews !== null) return averageViews

  const followers = coerceToNumber(snapshot.followers_count)
  if (followers !== null) return followers

  const averageLikes = extractAverageLikes(snapshot.average_likes ?? null)
  if (averageLikes !== null) return averageLikes

  const engagementRate = coerceToNumber(snapshot.engagement_rate)
  if (engagementRate !== null) return engagementRate

  const buzzScore = coerceToNumber(snapshot.buzz_score)
  if (buzzScore !== null) return buzzScore

  return null
}

const collectMetricsHistorySnapshots = (creator: HealthWellnessRow | null): HistoryPoint[] => {
  if (!creator) return []

  const rawHistory = creator.metrics_history
  const historyArray = Array.isArray(rawHistory) ? rawHistory : rawHistory ? [rawHistory] : []
  const rawPoints: HistoryPoint[] = []

  historyArray.forEach((historyRecord, historyIndex) => {
    if (!historyRecord || typeof historyRecord !== 'object') return
    const entries = Array.isArray(historyRecord.metrics) ? historyRecord.metrics : []

    entries.forEach((entry, entryIndex) => {
      if (!entry || typeof entry !== 'object') return
      const snapshot = entry as CreatorMetricsHistorySnapshot

      const metrics: Record<HistoryMetricKey, number | null> = {
        followersCount: coerceToNumber(snapshot.followers_count),
        averageViews: coerceToNumber(snapshot.average_views),
        averageLikes: extractAverageLikes(snapshot.average_likes ?? null),
        engagementRate: coerceToNumber(snapshot.engagement_rate),
        buzzScore: coerceToNumber(snapshot.buzz_score)
      }

      const hasAnyMetric = Object.values(metrics).some(value => value !== null)
      if (!hasAnyMetric) return

      const candidateDates = [
        typeof snapshot.scraped_at === 'string' ? snapshot.scraped_at : null,
        typeof historyRecord.updated_at === 'string' ? historyRecord.updated_at : null,
        typeof historyRecord.created_at === 'string' ? historyRecord.created_at : null
      ].filter((date): date is string => !!date)

      const parsedTimestamp = candidateDates
        .map(dateString => Date.parse(dateString))
        .find(ts => Number.isFinite(ts))

      const timestamp =
        parsedTimestamp !== undefined && parsedTimestamp !== null && Number.isFinite(parsedTimestamp)
          ? (parsedTimestamp as number)
          : historyIndex * 1000 + entryIndex

      const iso =
        parsedTimestamp !== undefined && parsedTimestamp !== null && Number.isFinite(parsedTimestamp)
          ? new Date(parsedTimestamp as number).toISOString()
          : candidateDates[0] ?? null

      const label =
        parsedTimestamp !== undefined && parsedTimestamp !== null && Number.isFinite(parsedTimestamp)
          ? historyDateFormatter.format(new Date(parsedTimestamp as number))
          : `Entry ${rawPoints.length + 1}`

      const rawChanges =
        snapshot && typeof snapshot === 'object' && 'changes' in snapshot && snapshot.changes
          ? (snapshot.changes as Record<string, unknown>)
          : {}

      const changes: Partial<Record<HistoryMetricKey, number | null>> = {}
      const changeTypes: Partial<Record<HistoryMetricKey, string | null>> = {}

      HISTORY_SERIES_CONFIG.forEach(config => {
        if (config.changeKey) {
          const changeValue = coerceToNumber(rawChanges[config.changeKey])
          if (changeValue !== null) {
            changes[config.key] = changeValue
          }
        }
        if (config.changeTypeKey) {
          const typeValue = rawChanges[config.changeTypeKey]
          changeTypes[config.key] = typeof typeValue === 'string' ? (typeValue as string) : null
        }
      })

      rawPoints.push({
        label,
        iso,
        timestamp,
        metrics,
        changes,
        changeTypes
      })
    })
  })

  if (rawPoints.length === 0) {
    return []
  }

  rawPoints.sort((a, b) => a.timestamp - b.timestamp)

  const byDay = new Map<string, HistoryPoint>()
  rawPoints.forEach(point => {
    const dayKey = point.iso ? point.iso.slice(0, 10) : `synthetic-${point.timestamp}`
    byDay.set(dayKey, point)
  })

  const deduped = Array.from(byDay.values()).sort((a, b) => a.timestamp - b.timestamp)
  const trimmed = deduped.slice(Math.max(0, deduped.length - MAX_HISTORY_POINTS))

  const seenLabels = new Map<string, number>()
  return trimmed.map(point => {
    const occurrences = seenLabels.get(point.label) ?? 0
    seenLabels.set(point.label, occurrences + 1)
    const label = occurrences === 0 ? point.label : `${point.label} (${occurrences + 1})`
    return {
      ...point,
      label
    }
  })
}

const timeAgo = (iso: string | null | undefined): string => {
  if (!iso) return 'N/A'
  const then = new Date(iso).getTime()
  if (isNaN(then)) return 'N/A'
  const s = Math.floor((Date.now() - then) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} min ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} hours ago`
  const d = Math.floor(h / 24)
  return `about ${d} days ago`
}

export default function CreatorsPage() {
  const [rows, setRows] = useState<HealthWellnessRow[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [page, setPage] = useState<number>(1)
  const [pageSize, setPageSize] = useState<number>(10)
  const [total, setTotal] = useState<number>(0)
  const [searchTerm, setSearchTerm] = useState<string>('')

  const [columnsOpen, setColumnsOpen] = useState<boolean>(false)
  const [openActionMenu, setOpenActionMenu] = useState<string | null>(null)
  const [selectedActions, setSelectedActions] = useState<Record<string, ActionState>>({})
  const [selectedCreator, setSelectedCreator] = useState<HealthWellnessRow | null>(null)
  const [currentUsername, setCurrentUsername] = useState<string | null>(null)
  const [actionBuckets, setActionBuckets] = useState<ActionBuckets>(createEmptyBuckets())
  const [userCreatorHandles, setUserCreatorHandles] = useState<string[]>([])
  type ColumnKey =
    | 'platform'
    | 'followers_count'
    | 'average_views'
    | 'average_comments'
    | 'average_likes'
    | 'engagement_rate'
    | 'location'

  type SchemaColumn = { key: ColumnKey; label: string; width: string; align?: 'left' | 'right'; icon: LucideIcon }

  const getPlatformIcon = (platform: string | null | undefined): LucideIcon => {
    if (!platform) return Instagram
    const platformLower = platform.toLowerCase()
    if (platformLower.includes('tiktok') || platformLower === 'tiktok') {
      return Music2
    }
    if (platformLower.includes('instagram') || platformLower === 'instagram' || platformLower === 'ig') {
      return Instagram
    }
    // Default to Instagram for unknown platforms
    return Instagram
  }

  const schemaColumns = useMemo<SchemaColumn[]>(
    () => [
      { key: 'platform', label: 'Platform', width: '150px', icon: Instagram },
      { key: 'followers_count', label: 'Followers', width: '140px', align: 'right', icon: Users },
      { key: 'average_views', label: 'Avg Views', width: '140px', align: 'right', icon: Eye },
      { key: 'average_likes', label: 'Avg Likes', width: '140px', align: 'right', icon: Heart },
      { key: 'average_comments', label: 'Avg Comments', width: '160px', align: 'right', icon: MessageSquare },
      { key: 'engagement_rate', label: 'Engagement', width: '150px', align: 'right', icon: Activity },
      { key: 'location', label: 'Location', width: '220px', icon: MapPin }
    ],
    []
  )

  const formatChangeLabel = (
    value: number | null,
    type: string | null | undefined,
    options?: { isPercent?: boolean }
  ): string => {
    if (value === null || value === undefined || isNaN(value)) return 'No change'
    const prefix = type === 'decrease' ? '-' : type === 'increase' ? '+' : ''
    if (options?.isPercent) {
      return `${prefix}${Math.abs(value).toFixed(1)}%`
    }
    return `${prefix}${formatNumber(Math.abs(value))}`
  }

  const getChangeColor = (type: string | null | undefined): string => {
    if (type === 'increase') return '#22c55e'
    if (type === 'decrease') return '#ef4444'
    return '#6b7280'
  }

  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(() => {
    const initial: Record<ColumnKey, boolean> = Object.create(null)
    schemaColumns.forEach(c => { initial[c.key] = true })
    return initial
  })

  const fromTo = useMemo(() => {
    const to = page * pageSize
    const from = to - pageSize
    return { from, to: to - 1 }
  }, [page, pageSize])


  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const sanitizedHandles = userCreatorHandles
        .map(handle => sanitizeHandle(handle))
        .filter((handle): handle is string => Boolean(handle))

      if (sanitizedHandles.length === 0) {
        setRows([])
        setTotal(0)
        setLoading(false)
        return
      }

      let query = supabase
        .from('healthwellness')
        .select(
          [
            'id',
            'handle',
            'display_name',
            'profile_url',
            'profile_image_url',
            'bio',
            'platform',
            'primary_niche',
            'secondary_niche',
            'locationRegion',
            'followers_count',
            'average_views',
            'average_comments',
            'engagement_rate',
            'average_likes',
            'hashtags',
            'brand_tags',
            'bio_links',
            'followers_change',
            'followers_change_type',
            'engagement_rate_change',
            'engagement_rate_change_type',
            'average_views_change',
            'average_views_change_type',
            'average_likes_change',
            'average_likes_change_type',
            'average_comments_change',
            'average_comments_change_type',
            'buzz_score',
            'location',
            'updated_at',
            'no_of_sponsored',
            'recent_post_1',
            'recent_post_2',
            'recent_post_3',
            'recent_post_4',
            'recent_post_5',
            'recent_post_6',
            'recent_post_7',
            'recent_post_8',
            'recent_post_9',
            'recent_post_10',
            'recent_post_11',
            'recent_post_12',
            'metrics_history:creator_metrics_history!fk_creator(metrics, updated_at, created_at)'
          ].join(','),
          { count: 'exact' }
        )
        .order('updated_at', { ascending: false, nullsFirst: false })

      query = query.in('handle', sanitizedHandles)

      const normalizedSearch = searchTerm.trim().replace(/^@+/, '')
      if (normalizedSearch) {
        const escapedSearch = escapeForILike(normalizedSearch)
        query = query.ilike('handle', `%${escapedSearch}%`)
      }

      const { data, error, count } = await query.range(fromTo.from, fromTo.to)
      if (error) throw error
      setRows(((data as unknown) as HealthWellnessRow[]) || [])
      setTotal(count || 0)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to load data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [fromTo.from, fromTo.to, searchTerm, userCreatorHandles])

  const fetchUserActionBuckets = useCallback(
    async (username: string) => {
      try {
        console.groupCollapsed('[Creators] fetchUserActionBuckets')
        console.log('Fetching action buckets for username:', username)
        const { data, error } = await supabase
          .from('users')
          .select('replace_creators, keep_creators, find_more_creators, creator_handles')
          .eq('username', username)
          .maybeSingle()

        if (error) {
          // When maybeSingle finds no rows, Supabase returns code PGRST116 without data.
          if ((error as { code?: string }).code === 'PGRST116') {
            console.warn('No existing action buckets found for user; initializing empty buckets.')
            setActionBuckets(createEmptyBuckets())
            setUserCreatorHandles([])
          } else {
            console.error('Error fetching user action buckets:', error)
            setUserCreatorHandles([])
          }
          console.groupEnd()
          return
        }

        const row = (data ?? {}) as {
          replace_creators?: string[] | null
          keep_creators?: string[] | null
          find_more_creators?: string[] | null
          creator_handles?: string[] | null
        }

        const sanitized: ActionBuckets = {
          replace: sanitizeHandlesArray(row.replace_creators ?? []),
          keep: sanitizeHandlesArray(row.keep_creators ?? []),
          findMore: sanitizeHandlesArray(row.find_more_creators ?? [])
        }

        console.log('Fetched and sanitized action buckets:', sanitized)
        setActionBuckets(sanitized)
        setUserCreatorHandles(sanitizeHandlesArray(row.creator_handles ?? []))
      } catch (err) {
        console.error('Unexpected error while fetching user action buckets:', err)
        setUserCreatorHandles([])
      } finally {
        console.groupEnd()
      }
    },
    []
  )

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  useEffect(() => {
    const sessionValue = sessionStorage.getItem('username')
    const localValue = localStorage.getItem('username')

    console.groupCollapsed('[Creators] restore username from storage')
    console.log('sessionStorage username:', sessionValue)
    console.log('localStorage username:', localValue)

    if (sessionValue) {
      setCurrentUsername(sessionValue)
      console.groupEnd()
      return
    }

    if (localValue) {
      console.log('Session storage empty; seeding from localStorage.')
      sessionStorage.setItem('username', localValue)
      setCurrentUsername(localValue)
    } else {
      console.warn('No username found in either sessionStorage or localStorage.')
    }
    console.groupEnd()
  }, [])

  useEffect(() => {
    if (!currentUsername) {
      setActionBuckets(createEmptyBuckets())
      setUserCreatorHandles([])
      return
    }
    fetchUserActionBuckets(currentUsername)
  }, [currentUsername, fetchUserActionBuckets])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openActionMenu && !(event.target as Element).closest('[data-action-menu]')) {
        setOpenActionMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [openActionMenu])

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedActions(prev => (Object.keys(prev).length === 0 ? prev : {}))
      return
    }

    const replaceSet = createHandleSet(actionBuckets.replace)
    const keepSet = createHandleSet(actionBuckets.keep)
    const findMoreSet = createHandleSet(actionBuckets.findMore)

    const next: Record<string, ActionState> = {}

    rows.forEach(row => {
      const handleValue = sanitizeHandle(row.handle)
      if (!handleValue) return
      const normalized = normalizeHandle(handleValue)
      if (replaceSet.has(normalized)) {
        next[row.id] = 'Replace'
      } else if (keepSet.has(normalized)) {
        next[row.id] = 'Keep'
      } else if (findMoreSet.has(normalized)) {
        next[row.id] = 'Find more'
      }
    })

    setSelectedActions(prev => {
      const prevKeys = Object.keys(prev)
      const nextKeys = Object.keys(next)
      if (prevKeys.length === nextKeys.length && nextKeys.every(key => prev[key] === next[key])) {
        return prev
      }
      return next
    })
  }, [rows, actionBuckets])


  const getActionButtonStyle = (action: ActionState | undefined) => {
    const baseStyle = {
      borderRadius: '6px',
      padding: '6px 12px',
      fontSize: '14px',
      color: '#374151',
      fontWeight: 500,
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      cursor: 'pointer',
      width: '100%',
      justifyContent: 'space-between'
    }

    switch (action) {
      case 'Replace':
        return {
          ...baseStyle,
          backgroundColor: '#fef3e2',
          border: 'none'
        }
      case 'Keep':
        return {
          ...baseStyle,
          backgroundColor: '#d1fae5',
          border: 'none'
        }
      case 'Find more':
        return {
          ...baseStyle,
          backgroundColor: '#dbeafe',
          border: 'none'
        }
      default:
        return {
          ...baseStyle,
          backgroundColor: '#ffffff',
          border: '1px solid #d1d5db'
        }
    }
  }

  const handleActionSelection = async (creator: HealthWellnessRow, action: ActionState) => {
    console.groupCollapsed('[Creators] handleActionSelection')
    console.log('Incoming selection payload:', {
      creatorId: creator.id,
      handle: creator.handle,
      action,
      previousSelection: selectedActions[creator.id]
    })

    setOpenActionMenu(null)

    const previousBuckets: ActionBuckets = {
      replace: [...actionBuckets.replace],
      keep: [...actionBuckets.keep],
      findMore: [...actionBuckets.findMore]
    }
    const previousSelection = selectedActions[creator.id]

    setSelectedActions(prev => {
      const next = { ...prev }
      if (action === 'Action') {
        delete next[creator.id]
      } else {
        next[creator.id] = action
      }
      console.log('Derived next selectedActions map:', next)
      return next
    })

    const handleValue = sanitizeHandle(creator.handle)
    if (!handleValue) {
      console.warn('Creator handle missing after sanitization, skipping persistence.')
      console.groupEnd()
      return
    }

    const nextBuckets = deriveBucketsForHandle(previousBuckets, handleValue, action)
    console.log('Derived next action buckets:', nextBuckets)
    setActionBuckets(nextBuckets)

    if (!currentUsername) {
      console.warn('No logged in user found; skipping action persistence.')
      console.groupEnd()
      return
    }

    try {
      console.log('Persisting action buckets to Supabase:', {
        username: currentUsername,
        payload: nextBuckets
      })

      const { data: matchingUsers, error: matchingUserError } = await supabase
        .from('users')
        .select('id, username, replace_creators, keep_creators, find_more_creators')
        .eq('username', currentUsername)
        .limit(5)

      if (matchingUserError) {
        console.error('Failed to read matching user rows before update:', matchingUserError)
      } else {
        console.log('Matching users prior to update:', matchingUsers)
      }

      const { data: updatedRows, error: updateError, status, statusText } = await supabase
        .from('users')
        .update({
          replace_creators: nextBuckets.replace,
          keep_creators: nextBuckets.keep,
          find_more_creators: nextBuckets.findMore
        })
        .eq('username', currentUsername)
        .select('id, username, replace_creators, keep_creators, find_more_creators')

      if (updateError) {
        console.error('Supabase update returned an error response:', updateError, {
          status,
          statusText
        })
        throw updateError
      }

      const rowCount = Array.isArray(updatedRows) ? updatedRows.length : 0
      console.log('Supabase update succeeded for action selection.', {
        status,
        statusText,
        rowCount,
        updatedRows
      })

      if (!rowCount) {
        console.warn(
          'Supabase update reported success but no rows were returned. This usually means the filter did not match any records.',
          {
            username: currentUsername
          }
        )
      }
    } catch (err) {
      console.error('Failed to persist action selection:', err, {
        username: currentUsername,
        creatorId: creator.id,
        handle: handleValue,
        attemptedBuckets: nextBuckets
      })
      setActionBuckets(previousBuckets)
      setSelectedActions(prev => {
        const next = { ...prev }
        if (previousSelection) {
          next[creator.id] = previousSelection
        } else {
          delete next[creator.id]
        }
        return next
      })
    } finally {
      console.groupEnd()
    }
  }

  const buildHistoricalMetrics = (creator: HealthWellnessRow | null): HistoricalMetricsResult => {
    if (!creator) {
      return {
        labels: [] as string[],
        points: [] as HistoryPoint[],
        series: [] as HistorySeries[],
        percentDomain: { min: -0.1, max: 0.1 }
      }
    }

    const historyPoints = collectMetricsHistorySnapshots(creator)
    const hasHistory = historyPoints.length > 0

    if (hasHistory) {
      const labels = historyPoints.map(point => point.label)

      const series = HISTORY_SERIES_CONFIG.map(config => {
        const values = historyPoints.map(point => point.metrics[config.key] ?? null)
        const nonNullValues = values.filter((value): value is number => value !== null && !Number.isNaN(value))
        if (nonNullValues.length === 0) return null

        const baseValue: number | null = nonNullValues.length > 0 ? nonNullValues[0] : null
        if (baseValue === null) return null

        const percentChanges = values.map(value => {
          if (value === null || baseValue === null || baseValue === 0) return null
          return (value - baseValue) / baseValue
        })

        const reversedValues = [...values].reverse()
        const latestValue = reversedValues.find(value => value !== null) ?? null
        const latestPercentChange = [...percentChanges].reverse().find(value => value !== null) ?? null

        const latestPointIndex = reversedValues.findIndex(value => value !== null)
        const latestPoint =
          latestPointIndex >= 0 ? historyPoints[historyPoints.length - 1 - latestPointIndex] : undefined

        let previousValue: number | null = null
        if (latestPointIndex >= 0) {
          const forwardIndex = values.length - 1 - latestPointIndex
          for (let i = forwardIndex - 1; i >= 0; i -= 1) {
            const candidate = values[i]
            if (candidate !== null) {
              previousValue = candidate
              break
            }
          }
        }

        const latestRawChange =
          latestPoint && latestPoint.changes[config.key] !== undefined
            ? latestPoint.changes[config.key] ?? null
            : null

        const latestChangeType =
          latestPoint && latestPoint.changeTypes[config.key] !== undefined
            ? latestPoint.changeTypes[config.key] ?? null
            : null

        let latestDayPercentChange: number | null = null
        if (previousValue !== null && latestValue !== null && previousValue !== 0) {
          latestDayPercentChange = (latestValue - previousValue) / previousValue
        } else if (
          latestValue !== null &&
          latestRawChange !== null &&
          latestValue - latestRawChange !== 0
        ) {
          latestDayPercentChange = latestRawChange / (latestValue - latestRawChange)
        }

        const candidate: HistorySeries = {
          key: config.key,
          label: config.label,
          color: config.color,
          values,
          percentChanges,
          baseValue,
          latestValue,
          latestPercentChange,
          latestRawChange,
          latestChangeType,
          latestDayPercentChange,
          valueFormatter: config.valueFormatter,
          changeFormatter: config.changeFormatter
        }
        return candidate
      }).filter((series): series is HistorySeries => series !== null)

      const allPercentChanges = series.flatMap(currentSeries =>
        currentSeries.percentChanges.filter((value): value is number => value !== null && !Number.isNaN(value))
      )

      const rawMin = allPercentChanges.length ? Math.min(...allPercentChanges) : -0.05
      const rawMax = allPercentChanges.length ? Math.max(...allPercentChanges) : 0.05
      const range = rawMax - rawMin
      const padding = range === 0 ? Math.abs(rawMax || 0.05) * 0.2 : range * 0.1
      const percentDomain = {
        min: rawMin - padding,
        max: rawMax + padding
      }

      return {
        labels,
        points: historyPoints,
        series,
        percentDomain
      }
    }

    return {
      labels: [],
      points: [],
      series: [],
      percentDomain: { min: -0.05, max: 0.05 }
    }
  }

  const handleCreatorClick = (creator: HealthWellnessRow) => {
    setSelectedCreator(creator)
    setOpenActionMenu(null)
  }

  const closePanel = () => {
    setSelectedCreator(null)
  }

  const selectedCreatorData = useMemo(() => {
    if (!selectedCreator) return null

    const averageLikesValue = extractAverageLikes(selectedCreator.average_likes)
    const averageSharesValue = extractAverageShares(selectedCreator)
    const recentMedia = extractRecentMedia(selectedCreator)

    const categories = [selectedCreator.primary_niche, selectedCreator.secondary_niche].filter(Boolean) as string[]
    const hashtagsList: string[] = Array.isArray(selectedCreator.hashtags)
      ? (selectedCreator.hashtags as (string | null | undefined)[])
          .map(tag => (tag ?? '').toString().trim())
          .filter(tag => tag.length > 0)
      : []

    const isTikTokProfile = (selectedCreator.platform || '').toLowerCase().includes('tiktok')
    const profileUrl =
      selectedCreator.profile_url ||
      (isTikTokProfile
        ? `https://www.tiktok.com/@${selectedCreator.handle}`
        : `https://www.instagram.com/${selectedCreator.handle}`)

    const profileButtonLabel = isTikTokProfile ? 'Go to TikTok' : 'Go to Instagram'

    const metricCards = [
      {
        title: 'Followers',
        value: formatNumber(selectedCreator.followers_count),
        icon: Users
      },
      {
        title: 'Avg. Views',
        value: formatNumber(selectedCreator.average_views),
        icon: Eye
      },
      {
        title: 'Avg. Likes',
        value: averageLikesValue !== null ? formatNumber(averageLikesValue) : 'N/A',
        icon: Heart
      },
      {
        title: 'Avg. Comments',
        value: formatNumber(selectedCreator.average_comments),
        icon: MessageSquare
      },
      {
        title: 'Avg. Engagement',
        value: formatPercent(selectedCreator.engagement_rate),
        icon: BarChart2
      }
    ]

    return {
      averageLikesValue,
      averageSharesValue,
      recentMedia,
      categories,
      hashtagsList,
      profileUrl,
      profileButtonLabel,
      metricCards,
      location: selectedCreator.locationRegion || selectedCreator.location || 'N/A',
      bio: selectedCreator.bio || 'No bio available.',
      creator: selectedCreator
    }
  }, [selectedCreator])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenActionMenu(null)
        if (selectedCreatorData) {
          closePanel()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedCreatorData])

  const renderCreatorPanel = () => {
    if (!selectedCreatorData) return null

    const {
      profileButtonLabel,
      profileUrl,
      creator,
      location,
      bio,
      categories,
      hashtagsList,
      recentMedia,
      metricCards
    } = selectedCreatorData

    const cardStyle = {
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    } as const

    const badgeStyle = {
      backgroundColor: '#e0e7ff',
      color: '#4f46e5',
      padding: '6px 10px',
      borderRadius: 9999,
      fontSize: 12,
      fontWeight: 500
    } as const

    const tagStyle = {
      backgroundColor: '#f3f4f6',
      color: '#4b5563',
      padding: '4px 8px',
      borderRadius: 9999,
      fontSize: 11
    } as const

    const displayedHashtags = hashtagsList.slice(0, 6)

    return (
      <aside
          style={{
          position: 'fixed',
            top: 0,
          right: 0,
            height: '100%',
          width: `${PANEL_WIDTH}px`,
            backgroundColor: '#f9fafb',
            boxShadow: '-2px 0 16px rgba(15, 23, 42, 0.15)',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <header
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500,
                textDecoration: 'none'
              }}
            >
              <span>{profileButtonLabel}</span>
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={closePanel}
              style={{
                width: 28,
                height: 28,
                borderRadius: '6px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#6b7280',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>
          </header>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: '20px 24px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', rowGap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <img
                  src={creator.profile_image_url || '/haven-influence-logo.png'}
                  alt={creator.display_name || creator.handle}
                  style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase' }}>Account</span>
                  <span style={{ fontSize: 20, fontWeight: 600, color: '#111827' }}>{creator.handle}</span>
                  <span style={{ fontSize: 14, color: '#6b7280' }}>{creator.display_name || '—'}</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: '#4b5563' }}>
                <MapPin size={16} color="#6b7280" />
                <span>{location}</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: '#4b5563' }}>{bio}</div>
              {categories.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {categories.map(category => (
                    <span key={category} style={badgeStyle}>
                      {category}
                    </span>
                  ))}
                </div>
              ) : null}
              {displayedHashtags.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {displayedHashtags.map(tag => (
                    <span key={tag} style={tagStyle}>
                      {tag.startsWith('#') ? tag : `#${tag}`}
                    </span>
                  ))}
                  {hashtagsList.length > displayedHashtags.length ? (
                    <span style={{ fontSize: 11, color: '#6b7280' }}>+{hashtagsList.length - displayedHashtags.length} more</span>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '16px',
              padding: '20px 24px',
              flexGrow: 1,
              overflowY: 'auto'
            }}
          >
            <section
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
              padding: '18px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '10px',
                gridColumn: '1 / -1'
              }}
            >
              {metricCards.map(card => {
                const Icon = card.icon
                return (
                  <div
                    key={card.title}
                    style={{
                      backgroundColor: '#ffffff',
                      borderRadius: '8px',
                    padding: '12px 14px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      display: 'flex',
                      flexDirection: 'column',
                    gap: 8
                    }}
                  >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ backgroundColor: '#eef2ff', borderRadius: 9999, padding: 5, display: 'inline-flex' }}>
                      <Icon size={14} color="#4f46e5" />
                      </div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.4 }}>{card.title}</div>
                    </div>
                  <div style={{ fontSize: 18, fontWeight: 600, color: '#111827' }}>{card.value}</div>
                  </div>
                )
              })}
            </section>

            {recentMedia.length > 0 && (
              <section style={{ ...cardStyle, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', marginBottom: 16 }}>Recent Content</div>
                <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 10 }}>
                  {recentMedia.map(media => (
                    <img
                      key={media.src}
                      src={media.src}
                      alt={media.alt}
                      style={{ flexShrink: 0, width: 180, height: 280, borderRadius: 8, objectFit: 'cover', backgroundColor: '#e5e7eb' }}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </aside>
    )
  }

  const onChangePageSize = (size: number) => {
    setPageSize(size)
    setPage(1)
  }

  const exportCsv = async () => {
    const header = [
      'display_name',
      'platform',
      'followers_count',
      'average_views',
      'average_likes',
      'average_comments',
      'engagement_rate',
      'location'
    ]
    const lines = [header.join(',')]
    rows.forEach(r => {
      const likesValue = extractAverageLikes(r.average_likes)
      const line = [
        r.display_name ?? '',
        r.platform ?? '',
        r.followers_count ?? '',
        r.average_views ?? '',
        likesValue ?? '',
        r.average_comments ?? '',
        r.engagement_rate ?? '',
        r.location ?? ''
      ]
        .map(v => `${v}`.replaceAll('"', '""'))
        .map(v => /[,\n\r]/.test(v) ? `"${v}"` : v)
        .join(',')
      lines.push(line)
    })
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'creators.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target
    setSearchTerm(value)
    setPage(1)
  }

  const activeColumns = useMemo(
    () => schemaColumns.filter(c => visibleColumns[c.key]),
    [schemaColumns, visibleColumns]
  )
  const gridTemplate = useMemo(() => {
    const base = ['160px', '300px'] // Action button and Creator column (with profile pic and name)
    const rest = activeColumns.map(c => c.width)
    return `${base.concat(rest).join(' ')}`
  }, [activeColumns])

  return (
    <DashboardLayout>
      <div
        style={{
          flex: 1,
          padding: 32,
          paddingRight: selectedCreatorData ? PANEL_WIDTH : 32,
          backgroundColor: '#f9fafb',
          fontFamily: 'Inter, Arial, sans-serif'
        }}
      >
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginBottom: '8px', margin: 0 }}>Creators</h1>
          <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>
          View and analyze performance metrics for your tracked social media creators
        </p>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={16}
                color="#9ca3af"
                style={{ position: 'absolute', top: '50%', left: 12, transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                placeholder="Search handle..."
                aria-label="Search handle"
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px 8px 36px',
                  fontSize: '14px',
                  color: '#111827',
                  width: '220px'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setColumnsOpen(v => !v)}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  color: '#374151',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <LayoutPanelLeft size={16} />
                <span>Toggle Columns</span>
              </button>
              {columnsOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '110%',
                    right: 0,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                    padding: 8,
                    zIndex: 20,
                    minWidth: 260,
                    maxHeight: 320,
                    overflowY: 'auto'
                  }}
                >
                  {schemaColumns.map(item => (
                    <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px' }}>
                      <input
                        type="checkbox"
                        checked={visibleColumns[item.key]}
                        onChange={(e) =>
                          setVisibleColumns(prev => ({ ...prev, [item.key]: e.target.checked }))
                        }
                      />
                      <span style={{ fontSize: 14, color: '#111827' }}>{item.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={exportCsv}
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '14px',
                color: '#374151',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} />
              <span>Export Data</span>
            </button>
          </div>
        </div>

        <div style={{ backgroundColor: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', overflowX: 'auto' }}>
          <div style={{ width: '100%', borderCollapse: 'collapse', whiteSpace: 'nowrap' }}>
            <div style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, alignItems: 'center' }}>
                <div style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Action</div>
                <div style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase' }}>Creator</div>
                {activeColumns.map(col => {
                  const IconComponent = col.icon
                  return (
                    <div key={col.key} style={{ padding: '12px 16px', textAlign: col.align === 'right' ? 'right' : 'left', fontSize: 12, color: '#6b7280', fontWeight: 500, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start' }}>
                      <IconComponent size={14} color="#6b7280" />
                      <span>{col.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div>
              {loading && (
                <div style={{ padding: 16, fontSize: 14, color: '#6b7280' }}>Loading…</div>
              )}
              {error && (
                <div style={{ padding: 16, fontSize: 14, color: '#b91c1c' }}>{error}</div>
              )}
              {!loading && !error && rows.length === 0 && (
                <div style={{ padding: 16, fontSize: 14, color: '#6b7280' }}>No creators found</div>
              )}
              {!loading && !error && rows.map((r) => (
                <div key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', alignItems: 'center', gridTemplateColumns: gridTemplate }}>
                    <div style={{ padding: '16px', position: 'relative' }} data-action-menu>
                      <button
                        onClick={() => setOpenActionMenu(openActionMenu === r.id ? null : r.id)}
                        style={getActionButtonStyle(selectedActions[r.id])}
                      >
                        <span>{selectedActions[r.id] || 'Action'}</span>
                        <ChevronDown size={16} />
                      </button>
                      {openActionMenu === r.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            marginTop: '4px',
                            background: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '6px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)',
                            padding: '4px',
                            zIndex: 30,
                            minWidth: '140px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleActionSelection(r, 'Action')}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#f9fafb'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ffffff'
                            }}
                            style={{
                              backgroundColor: '#ffffff',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <span>Action</span>
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => handleActionSelection(r, 'Replace')}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fde68a'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef3e2'
                            }}
                            style={{
                              backgroundColor: '#fef3e2',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <span>Replace</span>
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => handleActionSelection(r, 'Keep')}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#a7f3d0'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#d1fae5'
                            }}
                            style={{
                              backgroundColor: '#d1fae5',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <span>Keep</span>
                            <ChevronDown size={14} />
                          </button>
                          <button
                            onClick={() => handleActionSelection(r, 'Find more')}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#bfdbfe'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#dbeafe'
                            }}
                            style={{
                              backgroundColor: '#dbeafe',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '8px 12px',
                              fontSize: '14px',
                              color: '#374151',
                              fontWeight: 500,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              cursor: 'pointer',
                              width: '100%',
                              textAlign: 'left',
                              transition: 'background-color 0.2s ease'
                            }}
                          >
                            <span>Find more</span>
                            <ChevronDown size={14} />
                          </button>
                        </div>
                      )}
                    </div>

                    <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img
                        src={r.profile_image_url || '/haven-influence-logo.png'}
                        alt={r.display_name || r.handle}
                        style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                      />
                      <button
                        type="button"
                        onClick={() => handleCreatorClick(r)}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 2,
                          minWidth: 0,
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: 500, color: '#111827', lineHeight: '20px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.display_name || r.handle || '—'}</span>
                        <span style={{ fontSize: 12, color: '#6b7280', lineHeight: '16px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{r.handle || '—'}</span>
                      </button>
                    </div>

                    {activeColumns.map(col => {
                      const IconComponent = col.key === 'platform' ? getPlatformIcon(r.platform) : col.icon
                      let content = 'N/A'
                      
                      if (col.key === 'platform') {
                        content = r.platform || 'N/A'
                      } else if (col.key === 'followers_count') {
                        content = formatNumber(r.followers_count)
                      } else if (col.key === 'average_views') {
                        content = formatNumber(r.average_views)
                      } else if (col.key === 'average_comments') {
                        content = formatNumber(r.average_comments)
                      } else if (col.key === 'average_likes') {
                        const likesValue = extractAverageLikes(r.average_likes)
                        content = likesValue !== null ? formatNumber(likesValue) : 'N/A'
                      } else if (col.key === 'engagement_rate') {
                        content = formatPercent(r.engagement_rate)
                      } else if (col.key === 'location') {
                        content = r.location || 'N/A'
                      } else {
                        content = 'N/A'
                      }

                      return (
                        <div key={col.key} style={{ padding: '16px', fontSize: 14, color: '#111827', display: 'flex', alignItems: 'center', gap: 8, justifyContent: col.align === 'right' ? 'flex-end' : 'flex-start', minWidth: 0 }}>
                          {col.key === 'platform' || col.key === 'location' ? (
                            <>
                              <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                                <IconComponent size={16} color="#6b7280" />
                              </span>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content}</span>
                            </>
                          ) : (
                            <>
                              {content !== 'N/A' && (
                                <span style={{ flexShrink: 0, display: 'inline-flex' }}>
                                  <IconComponent size={16} color="#6b7280" />
                                </span>
                              )}
                              <span style={{ fontVariantNumeric: col.align === 'right' ? 'tabular-nums' : 'normal', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{content}</span>
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 16,
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#ffffff'
            }}
          >
            <div style={{ fontSize: 14, color: '#374151' }}>{total} items</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, color: '#374151' }}>Items per page</span>
                <select
                  value={pageSize}
                  onChange={(e) => onChangePageSize(parseInt(e.target.value, 10))}
                  style={{
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                    padding: '6px 24px 6px 8px',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  {[10, 25, 50].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div style={{ fontSize: 14, color: '#374151' }}>
                Page {total === 0 ? 0 : page} of {Math.max(1, Math.ceil(total / pageSize))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: page <= 1 ? '#9ca3af' : '#374151',
                    cursor: page <= 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronLeft />
                </button>
                <button
                  onClick={() => setPage(p => (p < Math.ceil(total / pageSize) ? p + 1 : p))}
                  disabled={page >= Math.ceil(total / pageSize)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: page >= Math.ceil(total / pageSize) ? '#9ca3af' : '#374151',
                    cursor: page >= Math.ceil(total / pageSize) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          </div>
        </div>
        {renderCreatorPanel()}
      </div>
    </DashboardLayout>
  )
}

