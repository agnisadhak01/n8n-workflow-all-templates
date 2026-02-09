import type { Template } from '../types'

interface TemplateCardProps {
  template: Template
}

function downloadJson(template: Template) {
  const a = document.createElement('a')
  a.href = template.rawUrl
  a.download = template.filename
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()
}

async function copyRawUrl(url: string) {
  await navigator.clipboard.writeText(url)
}

export function TemplateCard({ template }: TemplateCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-xs font-mono text-gray-500">#{template.id}</span>
        <div className="flex gap-1">
          <button
            onClick={() => downloadJson(template)}
            className="rounded px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50"
            title="Download JSON"
          >
            Download
          </button>
          <button
            onClick={() => copyRawUrl(template.rawUrl)}
            className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            title="Copy raw URL"
          >
            Copy URL
          </button>
        </div>
      </div>
      <h3 className="mb-2 line-clamp-2 text-sm font-medium text-gray-900">
        {template.name}
      </h3>
      <div className="flex flex-wrap gap-1">
        {template.tags.slice(0, 6).map((tag) => (
          <span
            key={tag}
            className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
          >
            {tag}
          </span>
        ))}
        {template.tags.length > 6 && (
          <span className="text-xs text-gray-400">+{template.tags.length - 6}</span>
        )}
      </div>
    </div>
  )
}
