import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import JSZip from 'jszip'
import { FilterBar } from './components/FilterBar'
import { SortDropdown } from './components/SortDropdown'
import { TemplateGrid } from './components/TemplateGrid'
import { useTemplates } from './hooks/useTemplates'
import type { Template } from './types'

async function downloadAsZip(templates: Template[]) {
  const zip = new JSZip()
  for (const t of templates) {
    try {
      const res = await fetch(t.rawUrl)
      const blob = await res.blob()
      zip.file(t.filename, blob)
    } catch {
      // Skip failed fetches
    }
  }
  const blob = await zip.generateAsync({ type: 'blob' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `n8n-templates-${templates.length}.zip`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function App() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tagParam = searchParams.get('tag')

  const {
    index,
    loading,
    error,
    search,
    setSearch,
    selectedTags,
    selectedServiceGroups,
    selectedAgentTags,
    sort,
    setSort,
    filteredTemplates,
    toggleTag,
    toggleServiceGroup,
    toggleAgentTag,
    clearFilters,
    hasActiveFilters,
  } = useTemplates()

  // Deep link: ?tag=slack - apply once when index loads with tag param
  useEffect(() => {
    if (tagParam && index && !selectedTags.includes(tagParam)) {
      toggleTag(tagParam)
      setSearchParams({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tagParam, index != null])

  const handleDownloadZip = useCallback(async () => {
    if (filteredTemplates.length === 0) return
    await downloadAsZip(filteredTemplates)
  }, [filteredTemplates])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-gray-600">Loading templates...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <p className="text-lg text-red-600">Error: {error}</p>
      </div>
    )
  }

  if (!index) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">
            n8n Workflow Templates Browser
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {index.meta.totalTemplates.toLocaleString()} templates ·{' '}
            {index.meta.totalTags.toLocaleString()} tags
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full shrink-0 lg:w-72">
            <FilterBar
              search={search}
              setSearch={setSearch}
              selectedTags={selectedTags}
              selectedServiceGroups={selectedServiceGroups}
              selectedAgentTags={selectedAgentTags}
              toggleTag={toggleTag}
              toggleServiceGroup={toggleServiceGroup}
              toggleAgentTag={toggleAgentTag}
              clearFilters={clearFilters}
              hasActiveFilters={hasActiveFilters}
              tags={index.tags}
            />
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600">
                  {filteredTemplates.length.toLocaleString()} of{' '}
                  {index.meta.totalTemplates.toLocaleString()} templates
                </span>
                <SortDropdown value={sort} onChange={setSort} />
              </div>
              <button
                onClick={handleDownloadZip}
                disabled={filteredTemplates.length === 0}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                Download filtered as ZIP ({filteredTemplates.length})
              </button>
            </div>

            <TemplateGrid templates={filteredTemplates} />
          </div>
        </div>
      </main>
    </div>
  )
}
