import { useState } from 'react'
import { SERVICE_GROUPS, AGENT_TAGS } from '../data/serviceGroups'
import type { TagCount } from '../types'

const TAG_SHOW_LIMIT = 30

interface FilterBarProps {
  search: string
  setSearch: (v: string) => void
  selectedTags: string[]
  selectedServiceGroups: string[]
  selectedAgentTags: string[]
  toggleTag: (tag: string) => void
  toggleServiceGroup: (group: string) => void
  toggleAgentTag: (tag: string) => void
  clearFilters: () => void
  hasActiveFilters: boolean
  tags: TagCount[]
}

export function FilterBar({
  search,
  setSearch,
  selectedTags,
  selectedServiceGroups,
  selectedAgentTags,
  toggleTag,
  toggleServiceGroup,
  toggleAgentTag,
  clearFilters,
  hasActiveFilters,
  tags,
}: FilterBarProps) {
  const [tagSearch, setTagSearch] = useState('')
  const [showAllTags, setShowAllTags] = useState(false)

  const filteredTags = tagSearch.trim()
    ? tags.filter((t) => t.tag.toLowerCase().includes(tagSearch.toLowerCase()))
    : tags
  const displayedTags = showAllTags ? filteredTags : filteredTags.slice(0, TAG_SHOW_LIMIT)
  const hasMoreTags = filteredTags.length > TAG_SHOW_LIMIT

  return (
    <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      {/* Search */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or tag..."
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Service groups */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Services
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.keys(SERVICE_GROUPS).map((group) => (
            <button
              key={group}
              onClick={() => toggleServiceGroup(group)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedServiceGroups.includes(group)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {/* Agents / Groups */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Agents & Automation
        </label>
        <div className="flex flex-wrap gap-2">
          {AGENT_TAGS.filter((t) => tags.some((tc) => tc.tag === t)).map((tag) => (
            <button
              key={tag}
              onClick={() => toggleAgentTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                selectedAgentTags.includes(tag)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">Tags</label>
        <input
          type="text"
          value={tagSearch}
          onChange={(e) => setTagSearch(e.target.value)}
          placeholder="Filter tags..."
          className="mb-2 w-full rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
        />
        <div className="flex max-h-48 flex-wrap gap-1 overflow-y-auto">
          {displayedTags.map(({ tag, count }) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded px-2 py-0.5 text-xs ${
                selectedTags.includes(tag)
                  ? 'bg-blue-100 font-medium text-blue-800'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
              title={`${count} templates`}
            >
              {tag} ({count})
            </button>
          ))}
        </div>
        {hasMoreTags && (
          <button
            onClick={() => setShowAllTags(!showAllTags)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            {showAllTags ? 'Show less' : `Show all ${filteredTags.length} tags`}
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <button
          onClick={clearFilters}
          className="w-full rounded bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
        >
          Clear all filters
        </button>
      )}
    </div>
  )
}
