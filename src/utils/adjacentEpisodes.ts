import type { EpisodeData } from '..'

// Navigation always follows publication order, independently of list filters or sorting.
export function getAdjacentEpisodes(episodes: EpisodeData[], current: EpisodeData) {
  const unique = new Map(
    episodes.filter((episode) => episode.podcastUrl === current.podcastUrl).map((episode) => [episode.src, episode]),
  )
  unique.set(current.src, current)
  const date = (episode: EpisodeData) => episode.pubDate.getTime() || 0
  const ordered = [...unique.values()].sort((a, b) => date(a) - date(b) || a.src.localeCompare(b.src))
  const index = ordered.findIndex((episode) => episode.src === current.src)
  return { previous: ordered[index - 1], next: ordered[index + 1] }
}
