import { useEffect, useState } from 'react'
import type { EpisodeData } from '..'
import { useHistory, usePlayer, useSubscriptions, useSubscriptionsEpisodes } from '../ContextProviders'

export function useUnstartedEpisodes() {
  const { getUnstarted } = useSubscriptionsEpisodes()
  const { getSync } = useHistory()
  const { playing, paused } = usePlayer()
  const { latestEpisodes, subscriptions } = useSubscriptions()
  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    getUnstarted(31)
      .then((result) => {
        if (!cancelled) {
          setEpisodes(result)
          setError(false)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [getUnstarted, getSync, playing?.src, paused, latestEpisodes, subscriptions])

  return {
    episodes: episodes
      .filter((episode) => (paused || episode.src !== playing?.src) && !(getSync(episode.src)?.position ?? 0))
      .slice(0, 30),
    loading,
    error,
  }
}
