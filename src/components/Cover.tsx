import { useState } from 'react'
import { EpisodeData, PodcastData } from '..'
import { getColor, usePodcastSettings, useSettings } from '../engines/Settings'
import colors from 'tailwindcss/colors'

export function proxyUrl(url: string | undefined): string | undefined {
  if (!url) return url
  if (url.startsWith('https://')) return url.replace('https://', 'imgproxy://')
  if (url.startsWith('http://')) return url.replace('http://', 'imgproxy://')
  return url
}

interface PodcastCoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  podcast: Partial<PodcastData>
}

interface EpisodeCoverProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  episode: EpisodeData
}

function CoverImage({
  src,
  name,
  style,
  onError,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { name: string }) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const [{ colors: theme }] = useSettings()
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? []
  const initials = (
    words.length > 1
      ? words
          .slice(0, 2)
          .map((word) => Array.from(word)[0])
          .join('')
      : Array.from(words[0] ?? '?')
          .slice(0, 2)
          .join('')
  ).toLocaleUpperCase()
  const [base, shade] = getColor(theme.primary)[2].split('-')
  const foreground = (colors as unknown as Record<string, Record<string, string>>)[base][shade]
  const fallback = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text x="50" y="52" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-size="38" font-weight="600" fill="${foreground}">${initials}</text></svg>`)}`

  return (
    <img
      {...props}
      className={`aspect-square max-h-full max-w-full ${props.className ?? ''}`}
      src={!src || failedSrc === src ? fallback : proxyUrl(src)}
      alt={props.alt ?? ''}
      loading="lazy"
      decoding="async"
      style={{ backgroundColor: 'var(--color-primary-8)', objectFit: 'cover', ...style }}
      onError={(event) => {
        setFailedSrc(src)
        onError?.(event)
      }}
    />
  )
}

export function PodcastCover({ podcast, ...props }: PodcastCoverProps) {
  const [podcastSettings] = usePodcastSettings(podcast.feedUrl ?? '')
  const coverUrl = podcastSettings.coverUrl || podcast.coverUrlLarge || podcast.coverUrl
  return <CoverImage src={coverUrl} name={podcast.podcastName ?? ''} {...props} />
}

export function EpisodeCover({ episode, ...props }: EpisodeCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string>()

  if (!episode.coverUrl || failedSrc === episode.coverUrl)
    return <PodcastCover podcast={episode.podcast ?? {}} {...props} />

  return (
    <div className="flip">
      <div className="front">
        <img
          src={proxyUrl(episode.coverUrl)}
          alt=""
          loading="lazy"
          decoding="async"
          {...props}
          onError={() => setFailedSrc(episode.coverUrl)}
        />
      </div>
      <div className="back">
        {episode.podcast?.coverUrl ? (
          <PodcastCover podcast={episode.podcast!} {...props} />
        ) : (
          <img
            src={proxyUrl(episode.coverUrl)}
            alt=""
            loading="lazy"
            decoding="async"
            onError={() => setFailedSrc(episode.coverUrl)}
            {...props}
          />
        )}
      </div>
    </div>
  )
}
