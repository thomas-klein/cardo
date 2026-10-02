import { useEffect, useRef, useState, useTransition } from 'react'
import { searchPodcast } from '../engines/search/base'
import { EpisodeData, PodcastData } from '..'
import PodcastCard from './PodcastCard'
import { useTranslation } from 'react-i18next'
import { arrowLeft, arrowRight, close, sync, search as searchIcon } from '../Icons'
import { useLocation, useNavigate } from 'react-router-dom'
import EpisodeCard from './EpisodeCard'
import { useSubscriptionsEpisodes, useSubscriptions } from '../ContextProviders'
import { useSettings } from '../engines/Settings'
import { PodcastIndexConfigurationError } from '../engines/search/podcastindex'

function SearchBar() {
  const [results, setResults] = useState<PodcastData[] | EpisodeData[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const subscriptionsEpisodes = useSubscriptionsEpisodes()
  const { subscriptions } = useSubscriptions()
  const [searchMode, setSearchMode_] = useState<'subscriptions' | 'podcasts' | 'current'>(
    subscriptions.length > 0 ? 'subscriptions' : 'podcasts',
  )
  const [noResults, setNoResults] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [isSearchInProgress, startTransition] = useTransition()
  const { t } = useTranslation()

  const [
    {
      search: { engine },
    },
    updateSettings,
  ] = useSettings()
  const timeout = useRef<ReturnType<typeof setInterval>>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const requestId = useRef(0)
  const location = useLocation()

  const navigate = useNavigate()

  const dismissResults = () => {
    clearTimeout(timeout.current ?? 0)
    requestId.current++
    setIsOpen(false)
    setResults([])
    setSearchError('')
    setNoResults(false)
  }

  const searchOnline = async (term: string) => {
    return await searchPodcast(term, engine)
  }

  const setSearchMode = (mode: typeof searchMode) => {
    if (mode !== searchMode) {
      clearTimeout(timeout.current ?? 0)
      requestId.current++
      setResults([])
      setSearchError('')
      setNoResults(false)
      setSearchMode_(mode)
    }
  }

  const searchEngineOptions = ['iTunes', 'PodcastIndex', 'fyyd']

  const search = async () => {
    const term = inputRef.current?.value ?? ''
    if (term.length === 0) return
    const currentRequest = ++requestId.current
    setIsOpen(true)
    setSearchError('')
    setNoResults(false)

    startTransition(async function () {
      let newResults: typeof results = []

      try {
        if (searchMode === 'subscriptions') {
          newResults = await subscriptionsEpisodes.getAll({ searchTerm: term })
        } else if (searchMode === 'podcasts') {
          newResults = await searchOnline(term)
        } else if (searchMode === 'current') {
          newResults = searchOnCurrentPodcast(term)
        }

        if (currentRequest !== requestId.current) return
        startTransition(() => {
          setResults(newResults)
          setNoResults(newResults.length === 0)
        })
      } catch (error) {
        if (currentRequest !== requestId.current) return
        setResults([])
        setNoResults(false)
        setSearchError(
          error instanceof PodcastIndexConfigurationError ? t('podcastindex_configuration_error') : t('search_error'),
        )
        console.error('Search failed:', error)
      }
    })
  }

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) {
      dialog.showModal()
      inputRef.current?.focus()
    } else if (!isOpen && dialog.open) {
      dialog.close()
      inputRef.current?.focus()
    }
  }, [isOpen])

  useEffect(
    () => () => {
      clearTimeout(timeout.current ?? 0)
      requestId.current++
    },
    [],
  )

  useEffect(() => {
    clearTimeout(timeout.current ?? 0)
    if (inputRef.current && inputRef.current.value.length > 3) {
      search()
    }
  }, [searchMode, engine])

  useEffect(() => {
    dismissResults()
    setQuery('')
    if (inputRef.current) {
      inputRef.current.value = ''
    }
    if (location.pathname !== '/preview' && searchMode === 'current') {
      setSearchMode(subscriptions.length > 0 ? 'subscriptions' : 'podcasts')
    }
  }, [location])

  const searchOnCurrentPodcast = (term: string) => {
    const episodes = location.state?.currentPodcastEpisodes as EpisodeData[]
    if (!episodes) return []

    return episodes.filter(
      (episode) =>
        episode.title.toLowerCase().includes(term.toLowerCase()) ||
        episode.description.toLowerCase().includes(term.toLowerCase()),
    )
  }

  const handleChange = async (term: string) => {
    setQuery(term)
    requestId.current++
    clearTimeout(timeout.current ?? 0)
    setResults([])
    setSearchError('')
    setNoResults(false)
    if (term.length > 3) {
      timeout.current = setTimeout(() => search(), 300)
    }
  }

  const searchForm = (
    <form
      className={`flex min-w-0 flex-1 ${isOpen ? 'flex-wrap gap-3' : ''}`}
      onSubmit={(e) => {
        e.preventDefault()
        clearTimeout(timeout.current ?? 0)
        if (inputRef.current) {
          search()
        }
      }}
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        aria-label={t('search_placeholder')}
        placeholder={t('search_placeholder')}
        className={`peer bg-primary-9 min-w-0 flex-1 px-2 py-1 focus:outline-none ${isOpen ? 'border-primary-6 min-h-10 basis-full rounded-lg border' : ''} ${noResults && inputRef.current?.value && 'font-semibold text-red-600'}`}
        onChange={(event) => {
          handleChange(event.target.value)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            dismissResults()
          }
        }}
      />
      <div
        className={`mr-2 items-center gap-2 whitespace-nowrap ${isOpen ? 'flex flex-wrap' : 'hidden peer-focus:flex active:flex'}`}
      >
        <div className={`${isSearchInProgress ? '' : 'hidden'} flex w-6 items-center outline-none`}>
          <span className="w-6 animate-[spin_1.5s_linear_reverse_infinite]">{sync}</span>
        </div>
        {!isSearchInProgress && (
          <button aria-label={t('search_placeholder')} className="outline-button w-5">
            {searchIcon}
          </button>
        )}
        <button
          className={`${searchMode === 'subscriptions' ? 'bg-accent-7' : ''} border-accent-7 flex items-center rounded-md border-2 px-1 py-px text-xs uppercase`}
          type="button"
          onClick={() => {
            setSearchMode('subscriptions')
            inputRef.current?.focus()
          }}
        >
          {t('subscriptions')}
        </button>

        <button
          className={`${searchMode === 'podcasts' ? 'bg-accent-7' : ''} border-accent-7 flex items-center rounded-md border-2 px-1 py-px text-xs uppercase`}
          type="button"
          onClick={() => {
            setSearchMode('podcasts')
            inputRef.current?.focus()
          }}
        >
          {t('podcasts')}
        </button>

        {location.pathname === '/preview' && (
          <button
            className={`${searchMode === 'current' ? 'bg-accent-7' : ''} border-accent-7 flex items-center rounded-md border-2 px-1 py-px text-xs uppercase`}
            type="button"
            onClick={() => {
              setSearchMode('current')
              inputRef.current?.focus()
            }}
          >
            {t('current_podcast')}
          </button>
        )}
      </div>
    </form>
  )

  return (
    <div className="relative flex w-full">
      <div className="text-primary-4 flex h-8 w-fit gap-1 p-1">
        <button
          className={`w-5 ${window.history.state.idx < 1 && results.length === 0 ? 'text-primary-8 cursor-default' : 'hover:text-accent-5'}`}
          onClick={() => {
            if (results.length > 0) {
              dismissResults()
            } else {
              navigate(-1)
            }
          }}
        >
          {arrowLeft}
        </button>
        <button
          className={`w-5 ${window.history.state.idx >= window.history.length - 1 ? 'text-primary-8 cursor-default' : 'hover:text-accent-5'}`}
          onClick={() => navigate(1)}
        >
          {arrowRight}
        </button>
      </div>
      {isOpen ? <div className="text-primary-4 flex-1 px-2 py-1">{query}</div> : searchForm}
      <dialog
        ref={dialogRef}
        className="search-dialog border-primary-7 bg-primary-9"
        aria-label={t('search_placeholder')}
        onCancel={(event) => {
          event.preventDefault()
          dismissResults()
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget) dismissResults()
        }}
      >
        <div className="flex max-h-[80dvh] flex-col" onClick={(event) => event.stopPropagation()}>
          <div className="border-primary-7 border-b p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg">{t('search_placeholder')}</h2>
              <button
                type="button"
                aria-label={t('close_search')}
                className="text-primary-4 hover:bg-primary-8 hover:text-primary-1 flex h-8 w-8 items-center justify-center rounded-lg p-1.5"
                onClick={dismissResults}
              >
                {close}
              </button>
            </div>
            {isOpen && searchForm}
            {searchMode === 'podcasts' && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {searchEngineOptions.map((newEngine) => (
                  <button
                    type="button"
                    key={newEngine}
                    aria-pressed={newEngine === engine}
                    className={`rounded-full px-3 py-1 text-sm ${newEngine === engine ? 'bg-accent-7 text-primary-1' : 'bg-primary-8 text-primary-4 hover:text-primary-1'}`}
                    onClick={() => {
                      if (newEngine === engine) return
                      clearTimeout(timeout.current ?? 0)
                      requestId.current++
                      setResults([])
                      setSearchError('')
                      setNoResults(false)
                      updateSettings({ search: { engine: newEngine } })
                    }}
                  >
                    {newEngine}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="min-h-24 overflow-y-auto overscroll-contain p-3" aria-busy={isSearchInProgress}>
            {searchError && (
              <p role="alert" className="px-3 py-6 text-sm text-red-600">
                {searchError}
              </p>
            )}
            {noResults && (
              <p role="status" className="text-primary-4 px-3 py-8 text-center">
                {t('no_search_results')}
              </p>
            )}
            {isSearchInProgress && results.length === 0 && !searchError && (
              <div
                role="status"
                aria-label={t('search_placeholder')}
                className="text-accent-5 flex justify-center py-8"
              >
                <span className="w-6 animate-spin">{sync}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {results.map((result) =>
                searchMode === 'podcasts' ? (
                  <PodcastCard key={(result as PodcastData).feedUrl} podcast={result as PodcastData} />
                ) : (
                  <EpisodeCard
                    key={result.id}
                    episode={result as EpisodeData}
                    className="border-primary-8 hover:bg-primary-8 rounded-lg border-b transition-colors"
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  )
}

export default SearchBar
