import { DocsContent } from '@/components/docs-content'

export default function DocsPage() {
  return (
    <div className="py-6 lg:py-8">
      <div className="prose prose-blue max-w-4xl">
        <DocsContent slug="introduction" />
      </div>
    </div>
  )
} 