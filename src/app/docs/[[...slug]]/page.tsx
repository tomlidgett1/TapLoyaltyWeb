import { DocsContent } from '@/components/docs-content'
import { notFound } from 'next/navigation'
import { docsConfig } from '@/config/docs-config'

// Function to check if a slug is valid
function isValidSlug(slug: string): boolean {
  // Check all sections in docsConfig
  return docsConfig.some(section => 
    section.items.some(item => {
      // Remove the /docs/ prefix for comparison
      const itemPath = item.href.replace('/docs/', '')
      return itemPath === slug || (slug === '' && itemPath === '')
    })
  )
}

export default function DocsPage({ params }: { params: { slug?: string[] } }) {
  // Handle the root docs page
  if (!params.slug || params.slug.length === 0) {
    return (
      <div className="py-6">
        <DocsContent slug="introduction" />
      </div>
    )
  }

  // Get the first segment of the slug
  const slug = params.slug[0]
  
  // For debugging
  console.log('Requested slug:', slug)
  
  // Validate the slug
  if (!isValidSlug(slug)) {
    console.log('Invalid slug:', slug)
    return notFound()
  }

  return (
    <div className="py-6">
      <DocsContent slug={slug} />
    </div>
  )
} 