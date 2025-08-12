import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const merchantId = searchParams.get('merchantId')

    if (!merchantId) {
      return NextResponse.json({ error: 'Merchant ID is required' }, { status: 400 })
    }

    // Get Square access token from Firestore
    const squareDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square'))
    const squareComposioDoc = await getDoc(doc(db, 'merchants', merchantId, 'integrations', 'square_composio'))

    let accessToken = null
    if (squareDoc.exists() && squareDoc.data()?.accessToken) {
      accessToken = squareDoc.data().accessToken
    } else if (squareComposioDoc.exists() && squareComposioDoc.data()?.accessToken) {
      accessToken = squareComposioDoc.data().accessToken
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Square integration not found or not connected' }, { status: 404 })
    }

    // Fetch catalog from Square API
    const response = await fetch('https://connect.squareup.com/v2/catalog/list', {
      method: 'GET',
      headers: {
        'Square-Version': '2025-07-16',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Square API error:', errorData)
      return NextResponse.json({ 
        error: 'Failed to fetch catalog from Square',
        details: errorData
      }, { status: response.status })
    }

    const data = await response.json()
    
    // Filter only ITEM objects and transform the data
    const items = data.objects?.filter((obj: any) => obj.type === 'ITEM') || []
    
    const transformedItems = items.map((item: any) => ({
      id: item.id,
      name: item.item_data?.name || 'Unnamed Item',
      description: item.item_data?.description || '',
      descriptionPlaintext: item.item_data?.description_plaintext || '',
      descriptionHtml: item.item_data?.description_html || '',
      productType: item.item_data?.product_type || 'REGULAR',
      isTaxable: item.item_data?.is_taxable || false,
      isArchived: item.item_data?.is_archived || false,
      isAlcoholic: item.item_data?.is_alcoholic || false,
      skipModifierScreen: item.item_data?.skip_modifier_screen || false,
      presentAtAllLocations: item.present_at_all_locations || false,
      presentAtLocationIds: item.present_at_location_ids || [],
      categories: item.item_data?.categories || [],
      itemOptions: item.item_data?.item_options || [],
      reportingCategory: item.item_data?.reporting_category || null,
      variations: item.item_data?.variations?.map((variation: any) => ({
        id: variation.id,
        name: variation.item_variation_data?.name || 'Regular',
        sku: variation.item_variation_data?.sku || '',
        ordinal: variation.item_variation_data?.ordinal || 0,
        pricingType: variation.item_variation_data?.pricing_type || 'FIXED_PRICING',
        priceMoney: variation.item_variation_data?.price_money || null,
        sellable: variation.item_variation_data?.sellable || false,
        stockable: variation.item_variation_data?.stockable || false,
        locationOverrides: variation.item_variation_data?.location_overrides || [],
        itemOptionValues: variation.item_variation_data?.item_option_values || []
      })) || [],
      taxIds: item.item_data?.tax_ids || [],
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      version: item.version,
      isDeleted: item.is_deleted || false
    }))

    return NextResponse.json({
      success: true,
      data: {
        items: transformedItems,
        total: transformedItems.length
      }
    })

  } catch (error) {
    console.error('Error fetching Square catalog:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 