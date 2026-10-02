import { useLocation } from 'react-router-dom'
import { EpisodeData, PodcastData, SortCriterion } from '..'
import { ReactNode, useEffect, useRef, useState } from 'react'
import * as icons from '../Icons'
import { checkURLScheme, parseXML, toastError } from '../utils/utils'
import EpisodeCard from '../components/EpisodeCard'
import { Checkbox, Switch, SwitchState, TimeInput } from '../components/Inputs'
import { usePodcastSettings } from '../engines/Settings'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import { sanitizeHTML } from '../utils/sanitize'
import { Menu } from '@tauri-apps/api/menu'
import { useSync, useSubscriptions, useHistory, useSubscriptionsEpisodes } from '../ContextProviders'
import { PodcastCover } from '../components/Cover'
import { useModalBanner } from '../components/ModalBanner'

const EPISODE_CARD_HEIGHT = 80 // min height
const PRELOADED_EPISODES = 10 //

function SortButton({
  children,
  podcastUrl,
  criterion,
}: {
  children: ReactNode
  podcastUrl: string
  criterion: SortCriterion['criterion']
}) {
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcastUrl)
  const sort = podcastSettings.sort

  return (
    <button
      className={`bg-primary-9 hover:bg-primary-7 flex min-h-10 items-center justify-center gap-2 rounded-md px-4 py-2 ${sort.criterion === criterion ? 'text-primary-1 ring-accent-5 ring-2' : ''}`}
      onClick={() => {
        if (sort.criterion === criterion) {
          updatePodcastSettings({
            sort: {
              criterion,
              mode: sort.mode === 'asc' ? 'desc' : 'asc',
            },
          })
        } else {
          updatePodcastSettings({ sort: { criterion } })
        }
      }}
    >
      {sort.criterion === criterion && (
        <div className="h-5 w-5">{sort.mode === 'asc' ? icons.upArrow : icons.downArrow}</div>
      )}
      {children}
    </button>
  )
}

function PodcastPreview() {
  const location = useLocation()
  const locationPodcast = location.state.podcast as PodcastData
  const [podcast, setPodcast] = useState<PodcastData>(locationPodcast)

  const [episodes, setEpisodes] = useState<EpisodeData[]>([])
  const [downloading, setDownloading] = useState(false)
  const subscriptions = useSubscriptions()
  const { getCompleted } = useHistory()
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const [podcastSettings, updatePodcastSettings] = usePodcastSettings(podcast.feedUrl)
  const { sync, loggedIn: loggedInSync } = useSync()
  const isSubscribed = subscriptions.includes(podcast.feedUrl)
  const cachedEpisodesRef = useRef<{ feedUrl: string; episodes: EpisodeData[] }>({ feedUrl: '', episodes: [] })

  const [tweakMenu, setTweakMenu] = useState<'sort' | 'filter' | 'settings' | undefined>(undefined)
  const { t } = useTranslation()
  const [showChangeCoverBanner, ChangeCoverBanner] = useModalBanner()

  useEffect(() => {
    if (!tweakMenu) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setTweakMenu(undefined)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [tweakMenu])

  const scrollRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState(() => {
    const savedVisibleItems = sessionStorage.getItem(`visibleItems-${location.key}`)
    if (savedVisibleItems) {
      sessionStorage.removeItem(`visibleItems-${location.key}`)
      return Number(savedVisibleItems)
    } else {
      return 0
    }
  })

  const sortEpisodes = (unsortedEpisodes: EpisodeData[]) => {
    const applyMode = (a: any, b: any) => {
      if (sortCriterion.mode === 'asc') {
        return a - b
      } else {
        return b - a
      }
    }

    let sortedEpisodes: EpisodeData[] = []
    const sortCriterion = podcastSettings.sort

    switch (sortCriterion.criterion) {
      case 'duration':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.duration, b.duration))
        break
      case 'date':
        sortedEpisodes = [...unsortedEpisodes].sort((a, b) => applyMode(a.pubDate, b.pubDate))
        break
    }

    return sortedEpisodes
  }

  async function getAllEpisodes(forceDownload = false) {
    async function downloadEpisodes() {
      setDownloading(true)
      try {
        const [episodes, podcastDetails] = await parseXML(podcast.feedUrl)
        setPodcast((prev) => ({ ...prev, description: podcastDetails.description }))
        setDownloading(false)
        return episodes
      } catch (e) {
        toastError(e as string)
        setDownloading(false)
        return []
      }
    }

    let episodes: EpisodeData[] = []
    if (!isSubscribed || forceDownload) {
      episodes = await downloadEpisodes()
    } else if (isSubscribed) {
      episodes = await subscriptionsEpisodes.getAll({ podcastUrl: podcast.feedUrl })
      if (!episodes.length) {
        setEpisodes([])
        episodes = await downloadEpisodes()
      }
    }

    if (isSubscribed) {
      subscriptionsEpisodes.save(episodes)
    }

    return episodes
  }

  async function loadEpisodes(forceDownload = false) {
    let eps: EpisodeData[]
    if (forceDownload || cachedEpisodesRef.current.feedUrl !== podcast.feedUrl) {
      eps = await getAllEpisodes(forceDownload)
      cachedEpisodesRef.current = { feedUrl: podcast.feedUrl, episodes: eps }
    } else {
      eps = cachedEpisodesRef.current.episodes
    }
    setEpisodes(sortEpisodes(await filterEpisodes(eps)))

    forceDownload && subscriptions.loadLatestEpisodes() // when updating feed from button on podcast page latest episodes are refreshed
  }

  const filterEpisodes = async (unfilteredEpisodes: EpisodeData[]) => {
    const filter = podcastSettings.filter
    let result: EpisodeData[] = []

    // filter completed /uncompleted episodes
    const completedEpisodes = await getCompleted(podcast.feedUrl)

    if (filter.played === SwitchState.True) {
      result = unfilteredEpisodes.filter((ep) => completedEpisodes.includes(ep.src))
    } else if (filter.played === SwitchState.False) {
      result = unfilteredEpisodes.filter((ep) => !completedEpisodes.includes(ep.src))
    } else {
      result = unfilteredEpisodes
    }

    // filter by duration
    if (filter.duration.min > 0) {
      result = result.filter((ep) => ep.duration >= filter.duration.min)
    }

    if (filter.duration.max > 0) {
      result = result.filter((ep) => ep.duration <= filter.duration.max)
    }

    return result
  }

  useEffect(() => {
    loadEpisodes()
  }, [podcast.feedUrl, JSON.stringify(podcastSettings)])

  useEffect(() => {
    setPodcast(locationPodcast)
    setTweakMenu(undefined)

    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: 'instant' })
    }
  }, [locationPodcast.feedUrl])

  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    const observer = new ResizeObserver(() => {
      const elementsOnWindow = Math.floor(el.clientHeight / EPISODE_CARD_HEIGHT) + 1
      setVisibleItems((prev) => Math.max(prev, elementsOnWindow))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    // triggered when episodes are loaded, saved scroll is deleted to avoid triggering after filter / sort
    // scroll is saved when entering to any episode details

    const savedScroll = sessionStorage.getItem(`scroll-${location.key}`)
    if (savedScroll && scrollRef.current && episodes.length) {
      scrollRef.current.scrollTo({ top: Number(savedScroll), behavior: 'instant' })
      sessionStorage.removeItem(`scroll-${location.key}`)
    }
  }, [episodes])

  function copyFeedUrl() {
    navigator.clipboard.writeText(podcast.feedUrl)
    toast.info(t('feed_url_copied'), {
      position: 'top-center',
      autoClose: 3000,
      hideProgressBar: true,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: 'dark',
    })
  }

  useEffect(() => {
    if (!podcast.feedUrl) toastError(t('please_indicate_url'))
  }, [podcast.feedUrl])

  if (!podcast.feedUrl) {
    return <></>
  }

  return (
    <>
      <ChangeCoverBanner
        onSubmit={(e) => {
          const input: HTMLInputElement = e.currentTarget.url

          setPodcast((prev) => ({ ...prev, coverUrl: input.value, coverUrlLarge: input.value }))
          updatePodcastSettings({ coverUrl: input.value })
        }}
      >
        <h1>{t('change_podcast_cover')}</h1>
        <input
          type="url"
          onInput={checkURLScheme}
          name="url"
          placeholder={t('podcast_cover_url')}
          autoFocus
          className="bg-primary-8 w-96 rounded-md px-2 py-1 focus:outline-none"
        />
      </ChangeCoverBanner>

      <div className="relative w-full px-1">
        {/* sticky bar that appears when scrolling */}
        <div className="group border-primary-8 bg-primary-9 absolute top-0 right-1 left-1 z-10 flex cursor-default items-center gap-2 border-b-2 p-1">
          <PodcastCover className="bg-primary-7 aspect-square h-10 rounded-md" podcast={podcast} />

          <h1 className="text-xl group-hover:hidden">{podcast.podcastName}</h1>

          <span
            className="absolute left-1/2 w-10 -translate-x-1/2 cursor-pointer opacity-0 transition-opacity group-hover:opacity-100"
            onClick={() => scrollRef.current && scrollRef.current.scrollTo({ top: 0 })}
          >
            {icons.upArrowSquare}
          </span>
        </div>

        <div
          ref={scrollRef}
          className="relative flex h-full w-full flex-col overflow-y-auto scroll-smooth"
          onScroll={() => {
            if (!scrollRef.current) return
            const scrolledWindows = scrollRef.current.scrollTop / scrollRef.current.clientHeight + 1
            const elementsOnWindow = Math.floor(scrollRef.current.clientHeight / EPISODE_CARD_HEIGHT) + 1

            setVisibleItems((prev) =>
              Math.max(prev, Math.round(scrolledWindows * elementsOnWindow) + PRELOADED_EPISODES),
            )
          }}
        >
          <div className="border-primary-7 bg-primary-9 relative z-10 flex h-48 w-full shrink-0 gap-3 border-b p-4 sm:h-58 sm:gap-5">
            <div className="flex shrink-0 flex-col items-start gap-3">
              <div
                className="aspect-square h-20 cursor-pointer sm:h-40"
                onContextMenu={async () => {
                  const menu = await Menu.new({
                    items: [
                      {
                        text: t('copy_feed_url'),
                        action: copyFeedUrl,
                      },
                      {
                        text: t('change_podcast_cover'),
                        action: () => showChangeCoverBanner(),
                      },
                    ],
                  })

                  menu.popup()
                }}
              >
                <PodcastCover className="bg-primary-7 aspect-square h-20 rounded-md sm:h-40" podcast={podcast} />
              </div>

              {/* #region BUTTONS */}
              <div className="flex gap-2">
                <button
                  className="hover:text-accent-6 w-6"
                  title={t(isSubscribed ? 'remove_from_subscriptions' : 'add_to_subscriptions')}
                  onClick={async () => {
                    if (isSubscribed) {
                      loggedInSync && sync({ remove: [podcast.feedUrl] })
                      await subscriptions.remove(podcast.feedUrl)
                    } else {
                      loggedInSync && sync({ add: [podcast.feedUrl] })
                      const id = await subscriptions.add(podcast)
                      setPodcast((prev) => ({ ...prev, id }))
                      await subscriptionsEpisodes.save(episodes)
                    }
                  }}
                >
                  {isSubscribed ? icons.starFilled : icons.star}
                </button>

                <button
                  className="hover:text-accent-6"
                  title={t('sort_episodes')}
                  aria-expanded={tweakMenu === 'sort'}
                  aria-controls="episode-tools"
                  onClick={() => {
                    setTweakMenu((current) => (current === 'sort' ? undefined : 'sort'))
                  }}
                >
                  {icons.sort}
                </button>
                <button
                  className="hover:text-accent-6"
                  title={t('filter_episodes')}
                  aria-expanded={tweakMenu === 'filter'}
                  aria-controls="episode-tools"
                  onClick={() => {
                    setTweakMenu((current) => (current === 'filter' ? undefined : 'filter'))
                  }}
                >
                  {icons.filter}
                </button>
                <button
                  className="hover:text-accent-6 h-6 w-6"
                  title={t('podcast_settings')}
                  aria-expanded={tweakMenu === 'settings'}
                  aria-controls="episode-tools"
                  onClick={() => {
                    setTweakMenu((current) => (current === 'settings' ? undefined : 'settings'))
                  }}
                >
                  {icons.settings}
                </button>
                <button
                  className={`hover:text-accent-6 w-6 ${downloading && 'animate-[spin_2s_linear_reverse_infinite]'}`}
                  title={t('podcast_refresh')}
                  onClick={async () => {
                    loadEpisodes(true)
                  }}
                >
                  {icons.sync}
                </button>
              </div>
              {/* #endregion */}
            </div>

            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
              <h1 className="line-clamp-2 shrink-0 text-2xl leading-tight font-semibold" title={podcast.podcastName}>
                {podcast.podcastName}
              </h1>
              <h2
                className="text-primary-3 mt-1 mb-4 shrink-0 truncate text-base font-medium"
                title={podcast.artistName}
              >
                {podcast.artistName}
              </h2>

              <div
                className="podcast-description-scroll min-h-0 max-w-[75ch] flex-1 overflow-y-auto overscroll-contain rounded-md px-3 py-2"
                tabIndex={0}
                aria-label={t('episode_description')}
              >
                <div
                  className="podcast-description text-primary-3 text-sm leading-7 break-words whitespace-pre-line"
                  dangerouslySetInnerHTML={{ __html: sanitizeHTML(podcast.description ?? '') }}
                />
              </div>
            </div>
          </div>

          {tweakMenu && (
            <>
              <div
                id="episode-tools"
                className="episode-tools border-primary-7 bg-primary-8 relative z-10 mx-2 my-3 flex shrink-0 flex-col rounded-lg border p-4 shadow-sm"
              >
                <h2 className="mb-3 text-base font-semibold capitalize">
                  {t(
                    tweakMenu === 'sort'
                      ? 'sort_episodes'
                      : tweakMenu === 'filter'
                        ? 'filter_episodes'
                        : 'podcast_settings',
                  )}
                </h2>
                <div className="flex w-full flex-col gap-3">
                  {tweakMenu === 'sort' && (
                    <div className="flex w-full max-w-lg flex-wrap items-center gap-3">
                      <SortButton podcastUrl={podcast.feedUrl} criterion="date">
                        {t('date')}
                      </SortButton>
                      <SortButton podcastUrl={podcast.feedUrl} criterion="duration">
                        {t('duration')}
                      </SortButton>
                    </div>
                  )}

                  {tweakMenu === 'filter' && (
                    <div className="flex w-full flex-wrap items-center gap-6">
                      <Switch
                        state={podcastSettings.filter.played}
                        setState={(value) => {
                          updatePodcastSettings({ filter: { played: value } })
                        }}
                        labels={[t('not_played'), t('played')]}
                      />

                      <div>
                        <label className="flex items-center justify-between gap-2 uppercase">
                          {t('duration_less_than')}:
                          <TimeInput
                            value={podcastSettings.filter.duration.max}
                            onChange={(v) => updatePodcastSettings({ filter: { duration: { max: v } } })}
                          />
                        </label>
                        <label className="flex items-center justify-between gap-2 uppercase">
                          {t('duration_greater_than')}:
                          <TimeInput
                            value={podcastSettings.filter.duration.min}
                            onChange={(v) => updatePodcastSettings({ filter: { duration: { min: v } } })}
                          />
                        </label>
                      </div>
                    </div>
                  )}

                  {tweakMenu === 'settings' && (
                    <div className="flex w-full gap-3">
                      <div className="flex w-full max-w-3xl flex-col gap-3">
                        <label className="flex w-full items-center justify-between gap-4">
                          {t('download_new')}:
                          <Checkbox
                            defaultChecked={podcastSettings.downloadNew}
                            onChange={(value) => updatePodcastSettings({ downloadNew: value })}
                          />
                        </label>

                        <label className="flex w-full items-center justify-between gap-4">
                          {t('queue_new')}:
                          <Checkbox
                            defaultChecked={podcastSettings.queueNew}
                            onChange={(value) => updatePodcastSettings({ queueNew: value })}
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  className="border-primary-7 hover:bg-primary-7 mt-4 flex w-full items-center justify-center rounded-md border-t p-1"
                  title={t('cancel')}
                  onClick={() => setTweakMenu(undefined)}
                >
                  <span className="h-6 w-6">{icons.upArrow}</span>
                </button>
              </div>
            </>
          )}

          <div className="flex flex-col px-1">
            {episodes.slice(0, visibleItems).map((episode) => (
              <EpisodeCard
                key={episode.src}
                episode={{
                  ...episode,
                  podcast: {
                    // not including all vars to save some memory
                    coverUrl: podcast.coverUrl,
                    podcastName: podcast.podcastName,
                    feedUrl: podcast.feedUrl,
                  },
                }}
                className="border-primary-8 hover:bg-primary-8 border-b transition-colors"
                onClick={() => {
                  sessionStorage.setItem(
                    `scroll-${location.key}`,
                    Math.floor(scrollRef.current?.scrollTop ?? 0).toString(),
                  )
                  sessionStorage.setItem(`visibleItems-${location.key}`, visibleItems.toString())
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export default PodcastPreview
