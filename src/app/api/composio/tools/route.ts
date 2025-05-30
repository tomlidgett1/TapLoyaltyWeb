import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  console.log('🔧 [Composio Tools API] Starting request...')
  
  try {
    const { searchParams } = new URL(request.url)
    console.log('🔧 [Composio Tools API] Request URL:', request.url)
    console.log('🔧 [Composio Tools API] Search params:', Object.fromEntries(searchParams.entries()))
    
    // Get query parameters
    const merchantId = searchParams.get('merchantId')
    const search = searchParams.get('search')

    console.log('🔧 [Composio Tools API] Parsed parameters:', {
      merchantId,
      search
    })

    if (!merchantId) {
      console.log('❌ [Composio Tools API] Missing merchantId')
      return NextResponse.json(
        { error: 'merchantId is required' },
        { status: 400 }
      )
    }

    // Use the same API key as the Gmail Composio integration
    const apiKey = 'smwbexfl2lqlcy3wb0cq3'
    console.log('🔧 [Composio Tools API] API Key available:', !!apiKey)

    if (!apiKey) {
      console.log('❌ [Composio Tools API] Composio API key not configured')
      return NextResponse.json(
        { error: 'Composio API key not configured' },
        { status: 500 }
      )
    }

    // Step 1: Use SDK to get tools for connected apps (filtered by entityId)
    console.log('🔧 [Composio Tools API] Step 1: Getting connected apps and tools using SDK...')
    const { OpenAIToolSet } = await import('composio-core')
    const toolset = new OpenAIToolSet({
      apiKey: apiKey,
      entityId: merchantId
    })
    console.log('✅ [Composio Tools API] OpenAIToolSet initialised successfully')

    // Get entity and connections
    console.log('👤 [Composio Tools API] Getting entity and connections...')
    const entity = toolset.client.getEntity(merchantId)
    const connections = await entity.getConnections()
    console.log(`✅ [Composio Tools API] Found ${connections.length} connections for entity ${merchantId}`)
    
    // Extract connected apps
    const connectedApps = [...new Set(connections.map(conn => conn.appName))]
    const alwaysIncludeApps = ['composio_search']
    const allApps = [...new Set([...connectedApps, ...alwaysIncludeApps])]
    console.log(`📱 [Composio Tools API] All available apps: ${allApps.join(', ')}`)
    
    if (allApps.length === 1 && allApps[0] === 'composio_search') {
      console.log('ℹ️ [Composio Tools API] No connected apps found, only composio_search available')
      return NextResponse.json({
        items: [],
        total_pages: 0,
        next_cursor: null,
        connectedApps: [],
        message: 'No connected apps found. Please connect some integrations first.'
      })
    }

    // Get tools for connected apps
    console.log('🔧 [Composio Tools API] Getting tools for connected apps using SDK...')
    const tools = await toolset.getTools({ apps: allApps })
    console.log(`✅ [Composio Tools API] Retrieved ${tools.length} tools for connected apps`)

    // Extract tool slugs for the API call
    const toolSlugs = tools.map(tool => tool.function?.name).filter(Boolean)
    console.log(`🔧 [Composio Tools API] Extracted ${toolSlugs.length} tool slugs:`, toolSlugs.slice(0, 5).join(', ') + (toolSlugs.length > 5 ? '...' : ''))

    // Step 2: Use API endpoint to get detailed tool info with logos
    console.log('🔧 [Composio Tools API] Step 2: Fetching detailed tool info with logos from API...')
    
    let allFilteredTools: any[] = []
    
    if (search && search.trim()) {
      // If user provided search, use it
      const composioApiUrl = new URL('https://backend.composio.dev/api/v3/tools')
      composioApiUrl.searchParams.set('search', search.trim())
      composioApiUrl.searchParams.set('limit', '100')
      
      console.log('🔍 [Composio Tools API] Using user search term:', search.trim())
      console.log('🔧 [Composio Tools API] Fetching from:', composioApiUrl.toString())
      
      const response = await fetch(composioApiUrl.toString(), {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.log('❌ [Composio Tools API] Composio API returned error:', response.status, response.statusText)
        
        let errorBody = ''
        try {
          errorBody = await response.text()
          console.log('❌ [Composio Tools API] Error response body:', errorBody)
        } catch (e) {
          console.log('❌ [Composio Tools API] Could not read error response body:', e)
        }
        
        return NextResponse.json(
          { error: `Composio API error: ${response.status} ${response.statusText}`, details: errorBody },
          { status: response.status }
        )
      }

      const apiData = await response.json()
      console.log('✅ [Composio Tools API] Successfully fetched tools with user search')
      allFilteredTools = apiData.items || []
      
    } else {
      // If no search provided, fetch tools for each connected app
      console.log('🔧 [Composio Tools API] No search provided, fetching tools for each connected app...')
      
      for (const appName of connectedApps) {
        try {
          const composioApiUrl = new URL('https://backend.composio.dev/api/v3/tools')
          composioApiUrl.searchParams.set('search', appName)
          composioApiUrl.searchParams.set('limit', '50')
          
          console.log(`🔧 [Composio Tools API] Fetching tools for app: ${appName}`)
          
          const response = await fetch(composioApiUrl.toString(), {
            method: 'GET',
            headers: {
              'x-api-key': apiKey,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const apiData = await response.json()
            const appTools = (apiData.items || []).filter((tool: any) => 
              tool.toolkit?.slug === appName
            )
            console.log(`✅ [Composio Tools API] Found ${appTools.length} tools for ${appName}`)
            allFilteredTools.push(...appTools)
          } else {
            console.log(`⚠️ [Composio Tools API] Failed to fetch tools for ${appName}:`, response.status)
          }
        } catch (error) {
          console.log(`⚠️ [Composio Tools API] Error fetching tools for ${appName}:`, error)
        }
      }
      
      // Remove duplicates based on slug
      const uniqueTools = new Map()
      allFilteredTools.forEach((tool: any) => {
        if (!uniqueTools.has(tool.slug)) {
          uniqueTools.set(tool.slug, tool)
        }
      })
      allFilteredTools = Array.from(uniqueTools.values())
      
      console.log(`✅ [Composio Tools API] Total unique tools found: ${allFilteredTools.length}`)
    }

    // Step 3: Filter API results to only include tools from connected apps
    console.log('🔧 [Composio Tools API] Connected apps for filtering:', connectedApps)
    console.log('🔧 [Composio Tools API] Total API response items:', (allFilteredTools || []).length)
    
    let filteredTools = (allFilteredTools || []).filter((tool: any) => {
      // Check if toolkit matches connected apps (primary filter)
      const toolkitSlug = tool.toolkit?.slug
      const matchesConnectedApp = connectedApps.includes(toolkitSlug)
      
      // Also check for common variations and exact tool slug matches
      const availableToolSlugs = new Set(toolSlugs)
      const matchesToolSlug = availableToolSlugs.has(tool.slug)
      
      // Include composio_search for all users
      const isComposioSearch = toolkitSlug === 'composio_search' || tool.slug.includes('composio_search')
      
      if (matchesConnectedApp || matchesToolSlug || isComposioSearch) {
        console.log(`✅ [Composio Tools API] Including tool: ${tool.slug} (toolkit: ${toolkitSlug}) - connected: ${matchesConnectedApp}, toolSlug: ${matchesToolSlug}, search: ${isComposioSearch}`)
        return true
      }
      
      return false
    })

    console.log(`🔧 [Composio Tools API] Filtered to ${filteredTools.length} tools from connected apps`)

    const responseData = {
      items: filteredTools,
      total_pages: Math.ceil(filteredTools.length / 50), // Recalculate based on filtered results
      next_cursor: null, // We're showing all results for now
      connectedApps: connectedApps,
      totalTools: filteredTools.length,
      searchApplied: !!search,
      availableApps: allApps
    }

    console.log('🔧 [Composio Tools API] Final response summary:', {
      itemsCount: responseData.items.length,
      connectedApps: connectedApps,
      totalApps: allApps.length,
      searchApplied: responseData.searchApplied
    })

    console.log('✅ [Composio Tools API] Request completed successfully')
    return NextResponse.json(responseData)
    
  } catch (error) {
    console.error('❌ [Composio Tools API] Error occurred:', error)
    console.error('❌ [Composio Tools API] Error name:', error instanceof Error ? error.name : typeof error)
    console.error('❌ [Composio Tools API] Error message:', error instanceof Error ? error.message : String(error))
    console.error('❌ [Composio Tools API] Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch tools from Composio API',
        details: error instanceof Error ? error.message : 'Unknown error',
        type: error instanceof Error ? error.name : typeof error,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
} 