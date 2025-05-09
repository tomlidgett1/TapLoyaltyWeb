import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/firebase'
import { doc, getDoc, updateDoc, collection, getDocs, query, where, setDoc, writeBatch, Timestamp } from 'firebase/firestore'

// Set the page size for pagination
const PAGE_SIZE = 200

// Add interfaces for Lightspeed API response types
interface LightspeedItem {
  itemID?: string;
  description?: string;
  longDescription?: string;
}

// Define a proper interface for the Note object
interface LightspeedNote {
  note: string;
  [key: string]: any; // Allow for other properties
}

// Add a type guard function to check if an object is a valid Note
function isLightspeedNote(obj: any): obj is LightspeedNote {
  return obj && typeof obj === 'object' && 'note' in obj && typeof obj.note === 'string';
}

// Update the interfaces to match the SaleLine endpoint response structure
interface LightspeedSaleLine {
  saleLineID: string;
  createTime: string;
  timeStamp: string;
  unitQuantity: string;
  unitPrice: string;
  normalUnitPrice: string;
  displayableSubtotal: string;
  displayableUnitPrice: string;
  calcTotal: string;
  calcSubtotal: string;
  calcTax1: string;
  calcTax2?: string;
  itemID: string;
  saleID: string;
  isWorkorder: string;
  customerID: string;
  employeeID: string;
  shopID: string;
  ItemFee?: {
    itemFeeID: string;
    name: string;
    feeValue: string;
  };
  TaxClass?: {
    taxClassID: string;
    name: string;
  };
  Item?: {
    itemID: string;
    description?: string;
    longDescription?: string;
    Prices?: {
      ItemPrice?: {
        amount: string;
        useTypeID: string;
        useType: string;
      }[];
    }
  };
  Sale?: {
    saleID: string;
    timeStamp: string;
    completed: string;
    archived: string;
    voided: string;
    registerID: string;
    Customer?: {
      customerID: string;
      firstName?: string;
      lastName?: string;
    };
  };
  [key: string]: any; // For other properties that we pass through
}

// Update the ProcessedLightspeedItem interface to include the fee information
interface ProcessedLightspeedItem {
  itemID: string;
  name: string;
  description: string;
  unitPrice: string;
  quantity: string;
  extPrice: string;
  fee?: {
    name: string;
    value: string;
  };
}

// Create a type for processed sale data
interface ProcessedSale {
  saleID: string;
  timeStamp: string;
  items: ProcessedLightspeedItem[];
  customerName: string;
  isWorkOrder: string;
  ticketNumber?: string;
  customerID: string;
  employeeID: string;
  shopID: string;
  completed: string;
  voided: string;
  archived: string;
  discountPercent: string;
  calcTotal: string;
  calcSubtotal: string;
  calcTax1: string;
  calcTax2?: string;
  calcNonTaxable?: string;
  balance: string;
  total: string;
  displayableTotal: string;
  registerID: string;
}

interface LightspeedSaleData {
  saleID: string;
  timeStamp: string;
  SaleLines?: {
    SaleLine?: LightspeedSaleLine | LightspeedSaleLine[];
  };
  Customer?: {
    firstName?: string;
    lastName?: string;
  };
  [key: string]: any; // For other properties that we pass through
}

// Add a function to sanitize data for Firestore
function sanitizeForFirestore(obj: any): any {
  // If undefined or null, return null
  if (obj === undefined || obj === null) {
    return null;
  }
  
  // If it's a Date, convert to ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
  }
  
  // If it's a primitive type, return as is
  if (typeof obj !== 'object') {
    return obj;
  }
  
  // Handle arrays by recursively sanitizing each element
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeForFirestore(item));
  }
  
  // For objects, create a new object with only valid properties
  const sanitized: Record<string, any> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Skip functions, undefined values, and keys that start with _
    if (typeof value === 'function' || value === undefined) {
      continue;
    }
    
    // Special handling for timeStamp field - convert to Firestore Timestamp
    if (key === 'timeStamp' && typeof value === 'string') {
      try {
        const date = new Date(value);
        sanitized['date'] = Timestamp.fromDate(date);
        // Also keep the original timestamp as a string
        sanitized[key] = value;
      } catch (error) {
        console.error('Error converting timeStamp to Firestore Timestamp:', error);
        sanitized[key] = value; // Keep original value if conversion fails
      }
    } else {
      // Recursively sanitize the value
      sanitized[key] = sanitizeForFirestore(value);
    }
  }
  
  return sanitized;
}

// Add a simple in-memory cache for item details to improve performance
const itemCache = new Map<string, { description: string, longDescription: string }>();

// Optimize the fetchItemDetails function for better performance
async function fetchItemDetails(accessToken: string, accountId: string, itemIDs: string[]) {
  if (!itemIDs.length) return new Map();
  
  // Filter out itemIDs that are already in the cache
  const cachedItems = new Map();
  const uncachedItemIDs = [];
  
  for (const itemID of itemIDs) {
    if (itemCache.has(itemID)) {
      cachedItems.set(itemID, itemCache.get(itemID));
    } else {
      uncachedItemIDs.push(itemID);
    }
  }
  
  console.log(`Item cache hit: ${cachedItems.size}, cache miss: ${uncachedItemIDs.length}`);
  
  if (uncachedItemIDs.length === 0) {
    return cachedItems; // All items are cached, return directly
  }
  
  // Remove duplicates from remaining uncached items
  const uniqueItemIDs = [...new Set(uncachedItemIDs)];
  
  const newItemsMap = new Map();
  // Use a larger batch size for efficiency
  const BATCH_SIZE = 50; 
  
  // Skip batch approach and go straight to individual lookups which work well
  // This prevents the initial batch failure which was just adding latency
  console.log(`Fetching details for ${uniqueItemIDs.length} unique items using direct lookups`);
  
  // Use Promise.all for parallel fetching to improve performance
  const lookupPromises = uniqueItemIDs.map(async (itemID) => {
    try {
      const individualUrl = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Item/${itemID}.json`;
      
      const individualResponse = await fetch(individualUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (individualResponse.ok) {
        const itemData = await individualResponse.json();
        
        if (itemData.Item) {
          const itemDetails = {
            itemID,
            description: itemData.Item.description || '',
            longDescription: itemData.Item.longDescription || ''
          };
          
          // Add to the result map
          newItemsMap.set(itemID, itemDetails);
          
          // Add to the cache for future requests
          itemCache.set(itemID, {
            description: itemDetails.description,
            longDescription: itemDetails.longDescription
          });
          
          // Reduced logging for better performance
          if (itemDetails.description) {
            return { success: true, itemID };
          } else {
            return { success: false, itemID, reason: 'no-description' };
          }
        }
      }
      return { success: false, itemID, reason: 'api-error' };
    } catch (individualError) {
      return { success: false, itemID, reason: 'exception' };
    }
  });
  
  // Wait for all lookups to complete
  const results = await Promise.all(lookupPromises);
  
  // Log summary instead of individual results
  const successful = results.filter(r => r.success).length;
  console.log(`Item lookup complete. Successfully fetched ${successful}/${uniqueItemIDs.length} items.`);
  
  // Combine cached and newly fetched items
  return new Map([...cachedItems, ...newItemsMap]);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const merchantId = searchParams.get('merchantId')
  const accountId = searchParams.get('accountId')
  const maxPages = parseInt(searchParams.get('pages') || '1')
  
  // Get date range parameters if provided
  const startDate = searchParams.get('startDate') // Format: YYYY-MM-DD
  const endDate = searchParams.get('endDate') // Format: YYYY-MM-DD
  
  // Create date range object if either parameter is provided
  const dateRange = (startDate || endDate) ? { 
    startDate: startDate || undefined, 
    endDate: endDate || undefined 
  } : undefined
  
  // New parameter to control how many pages to fetch (max 5 to prevent overload)
  const pagesToFetch = Math.min(Math.max(1, maxPages), 5)

  // Add validation for accountId to ensure it's a valid ID format
  if (!merchantId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Merchant ID is required' 
    }, { status: 400 })
  }

  if (!accountId) {
    return NextResponse.json({ 
      success: false, 
      error: 'Lightspeed Account ID is required' 
    }, { status: 400 })
  }
  
  // Add validation for accountId to ensure it's valid
  if (!/^\d+$/.test(accountId)) {
    console.error('Invalid Lightspeed Account ID format:', accountId);
    return NextResponse.json({ 
      success: false, 
      error: 'Invalid Lightspeed Account ID format. Must be a numeric value.' 
    }, { status: 400 });
  }
  
  // Log the request parameters
  console.log(`Processing request for merchantId: ${merchantId}, accountId: ${accountId}, pages to fetch: ${pagesToFetch}`);
  if (dateRange) {
    console.log(`Date range: ${dateRange.startDate || 'beginning'} to ${dateRange.endDate || 'present'}`);
  }

  try {
    // Get stored Lightspeed integration credentials
    const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`)
    const integrationDoc = await getDoc(integrationDocRef)

    if (!integrationDoc.exists()) {
      return NextResponse.json({ 
        success: false, 
        error: 'Lightspeed integration not found for this merchant' 
      }, { status: 404 })
    }

    const integrationData = integrationDoc.data()
    
    // Check if we have a valid access token
    if (!integrationData.access_token) {
      return NextResponse.json({ 
        success: false, 
        error: 'Lightspeed access token not found' 
      }, { status: 401 })
    }

    // Initialize data collection arrays
    let allProcessedSales: ProcessedSale[] = [];
    let totalRecords = 0;
    let currentToken = integrationData.access_token;
    let currentPage = 1;
    let nextUrl: string | undefined = undefined;
    
    // Fetch multiple pages of data
    while (currentPage <= pagesToFetch) {
      console.log(`Fetching page ${currentPage} of ${pagesToFetch}...`);
      
      // Fetch sales data from the Lightspeed API with pagination
      const response = await fetchSalesData(
        currentToken, 
        accountId,
        currentPage,
        PAGE_SIZE,
        dateRange,
        nextUrl
      );
      
      // If the token is expired on the first request, try refreshing it
      if (response.status === 401 && integrationData.refresh_token && currentPage === 1 && !nextUrl) {
        console.log('Access token expired, attempting to refresh...')
        const refreshedToken = await refreshLightspeedToken(merchantId, integrationData.refresh_token)
        
        if (refreshedToken) {
          // Update the token for subsequent requests
          currentToken = refreshedToken;
          
          // Retry with the new token
          const retryResponse = await fetchSalesData(
            refreshedToken, 
            accountId,
            currentPage,
            PAGE_SIZE,
            dateRange
          );
          
          if (!retryResponse.ok) {
            return NextResponse.json({ 
              success: false, 
              error: 'Failed to fetch sales data after token refresh',
              status: retryResponse.status
            }, { status: retryResponse.status })
          }
          
          // Process the data from this page
          const pageResult = await processPageData(retryResponse, currentPage, merchantId);
          if (!pageResult.success) {
            return NextResponse.json({ 
              success: false, 
              error: `Failed to process page ${currentPage}`,
              details: pageResult.error
            }, { status: 500 });
          }
          
          allProcessedSales = [...allProcessedSales, ...(pageResult.sales || [])];
          totalRecords += pageResult.count || 0;
          
          // Extract next URL for pagination
          nextUrl = pageResult.nextUrl;
          
          // Break the loop if there's no next page
          if (!nextUrl || (pageResult.sales && pageResult.sales.length < PAGE_SIZE)) {
            console.log(`No more pages available or fewer records than page size, ending pagination`);
            break;
          }
          
          currentPage++;
          continue;
        } else {
          return NextResponse.json({ 
            success: false, 
            error: 'Token refresh failed',
            details: 'Unable to refresh expired access token'
          }, { status: 401 })
        }
      }
      
      // If response failed for any other reason
      if (!response.ok) {
        // Don't fail completely, just log error and stop fetching more pages
        console.error(`Failed to fetch page ${currentPage}: ${response.status} ${response.statusText}`);
        break;
      }
      
      // Process the data from this page
      const pageResult = await processPageData(response, currentPage, merchantId);
      if (!pageResult.success) {
        console.error(`Error processing page ${currentPage}:`, pageResult.error);
        break;
      }
      
      allProcessedSales = [...allProcessedSales, ...(pageResult.sales || [])];
      totalRecords += pageResult.count || 0;
      
      // Extract next URL for pagination
      nextUrl = pageResult.nextUrl;
      
      // Break the loop if there's no next page
      if (!nextUrl || (pageResult.sales && pageResult.sales.length < PAGE_SIZE)) {
        console.log(`No more pages available or fewer records than page size, ending pagination`);
        break;
      }
      
      currentPage++;
    }
    
    // Sort all sales by timestamp to ensure newest first
    allProcessedSales.sort((a, b) => {
      return new Date(b.timeStamp).getTime() - new Date(a.timeStamp).getTime();
    });
    
    // Save all the collected sales to Firestore
    if (merchantId && allProcessedSales.length > 0) {
      // Save to regular lightspeed_sales collection
      saveNewSalesToFirestore(merchantId, allProcessedSales).catch(error => {
        console.error('Error saving sales to Firestore:', error);
      });
      
      // Also save to daily sales collection
      saveDailySales(merchantId, allProcessedSales).catch(error => {
        console.error('Error saving daily sales to Firestore:', error);
      });
    }
    
    console.log(`Successfully retrieved ${allProcessedSales.length} total sales across ${currentPage} pages`);
    
    return NextResponse.json({ 
      success: true, 
      sales: allProcessedSales,
      pagination: {
        pagesFetched: currentPage,
        maxPages: pagesToFetch,
        pageSize: PAGE_SIZE,
        totalSales: allProcessedSales.length,
        totalRecords: totalRecords,
        dateRange: dateRange || 'all time'
      }
    });
  } catch (error) {
    console.error('Error fetching Lightspeed sales:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

// Helper function to process a page of data
async function processPageData(response: Response, page: number, merchantId: string): Promise<{
  success: boolean;
  sales?: ProcessedSale[];
  count?: number;
  error?: any;
  nextUrl?: string;
}> {
  try {
    // Clone the response to avoid "body already read" errors
    const responseClone = response.clone();
    const data = await response.json();
    
    // Extract the next URL from the response for pagination
    let nextUrl: string | undefined = undefined;
    if (data['@attributes'] && data['@attributes'].next) {
      nextUrl = data['@attributes'].next;
      console.log(`Found next URL for pagination: ${nextUrl}`);
    }
    
    if (!data.SaleLine) {
      return {
        success: true,
        sales: [],
        count: 0,
        nextUrl
      };
    }
    
    // Process the response data into sales
    const result = await processAndReturnSalesData(responseClone, page, PAGE_SIZE, merchantId);
    
    if (!result.ok) {
      return {
        success: false,
        error: `Error processing page ${page}: ${result.status} ${result.statusText}`,
        nextUrl
      };
    }
    
    const resultData = await result.json();
    
    if (!resultData.success) {
      return {
        success: false,
        error: resultData.error || 'Unknown error processing data',
        nextUrl
      };
    }
    
    return {
      success: true,
      sales: resultData.sales || [],
      count: data.SaleLine ? (Array.isArray(data.SaleLine) ? data.SaleLine.length : 1) : 0,
      nextUrl
    };
  } catch (error) {
    console.error(`Error processing page ${page}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      nextUrl: undefined
    };
  }
}

// Update the fetchSalesData function to ensure item details are loaded
async function fetchSalesData(accessToken: string, accountId: string, page: number, pageSize: number, dateRange?: { startDate?: string; endDate?: string }, nextUrl?: string) {
  // If nextUrl is provided, use it directly (for pagination)
  const url = nextUrl || `https://api.lightspeedapp.com/API/V3/Account/${accountId}/SaleLine.json`;
  
  // Build standard parameters - using a format that will properly load item details
  const params = new URLSearchParams();
  
  // Only add these parameters if we're not using nextUrl
  if (!nextUrl) {
    // Add essential parameters
    params.append('sort', '-timeStamp');
    params.append('limit', pageSize.toString());
    // No longer using offset parameter as it's deprecated
    
    // Add more comprehensive relation loading for items
    // Make sure to include both Item and its Price details
    // V3 requires load_relations to be a JSON encoded array
    params.append('load_relations', JSON.stringify(["Item", "Sale", "TaxClass"]));
    
    // Add parameter to expand Item details if needed
    params.append('expand_Item', 'true');
    
    // Add date range filtering if provided
    if (dateRange) {
      let filterParts = [];
      
      if (dateRange.startDate) {
        // Format: timeStamp >= "2023-01-01 00:00:00"
        filterParts.push(`timeStamp >= "${dateRange.startDate} 00:00:00"`);
      }
      
      if (dateRange.endDate) {
        // Format: timeStamp <= "2023-12-31 23:59:59"
        filterParts.push(`timeStamp <= "${dateRange.endDate} 23:59:59"`);
      }
      
      if (filterParts.length > 0) {
        // Join multiple conditions with AND
        params.append('filter', filterParts.join(' AND '));
        console.log(`Applied date filter: ${filterParts.join(' AND ')}`);
      }
    }
  }
  
  // Construct full URL with parameters
  const finalUrl = nextUrl || `${url}?${params.toString()}`;
  
  console.log(`Fetching Lightspeed sale lines: page ${page}, limit ${pageSize}`);
  console.log(`API URL: ${finalUrl}`);
  
  try {
    // Perform the request with detailed logging
    console.log(`Making request to Lightspeed API with URL: ${finalUrl}`);
    
    const response = await fetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.error(`Lightspeed API request failed with status ${response.status} ${response.statusText}`);
      
      // Try to get more details from the error response
      try {
        const errorText = await response.clone().text();
        console.error(`Error response body: ${errorText}`);
      } catch (err) {
        console.error(`Couldn't read error response: ${err}`);
      }
    } else {
      // Log success details
      console.log(`Lightspeed API request succeeded with status ${response.status}`);
      console.log(`Response headers: ${JSON.stringify(Object.fromEntries([...response.headers.entries()]))}`);
    }
    
    return response;
  } catch (error) {
    console.error('Error in fetch request to Lightspeed API:', error);
    throw error;
  }
}

// Add function to get access token for a merchant
async function getAccessTokenForMerchant(merchantId: string): Promise<string | null> {
  try {
    // Get stored Lightspeed integration credentials
    const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`);
    const integrationDoc = await getDoc(integrationDocRef);

    if (!integrationDoc.exists()) {
      console.error('Lightspeed integration not found for merchant:', merchantId);
      return null;
    }

    const integrationData = integrationDoc.data();
    
    // Check if we have a valid access token
    if (!integrationData.access_token) {
      console.error('No access token found for merchant:', merchantId);
      return null;
    }

    return integrationData.access_token;
  } catch (error) {
    console.error('Error getting access token for merchant:', error);
    return null;
  }
}

// Helper function to fetch customer details for sales that have a customerID
async function fetchCustomersForSales(accessToken: string, accountId: string, customerIDs: string[]) {
  // Remove duplicate and invalid customer IDs
  const uniqueCustomerIDs = [...new Set(customerIDs.filter(id => id && id !== '0'))];
  
  if (uniqueCustomerIDs.length === 0) {
    console.log('No valid customer IDs to fetch');
    return new Map<string, { firstName: string, lastName: string }>();
  }
  
  console.log(`Fetching details for ${uniqueCustomerIDs.length} unique customers`);
  
  // Create a map to store customer information
  const customerMap = new Map<string, { firstName: string, lastName: string }>();
  
  // Fetch customers in batches to avoid URL length issues
  const BATCH_SIZE = 20;
  
  for (let i = 0; i < uniqueCustomerIDs.length; i += BATCH_SIZE) {
    const batch = uniqueCustomerIDs.slice(i, i + BATCH_SIZE);
    
    try {
      // Create filter string for customerIDs: "customerID IN (123,456,789)"
      const filterParam = `customerID IN (${batch.join(',')})`;
      const url = `https://api.lightspeedapp.com/API/V3/Account/${accountId}/Customer.json?filter=${filterParam}&limit=100`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.error(`Failed to fetch customer details: ${response.status} ${response.statusText}`);
        
        // If token is expired (401), we can't refresh it here so just log the error
        if (response.status === 401) {
          console.error('Access token may be expired for customer lookup');
        }
        
        continue;
      }
      
      const data = await response.json();
      
      // Handle the response which could contain single customer or array of customers
      if (data.Customer) {
        const customers = Array.isArray(data.Customer) ? data.Customer : [data.Customer];
        
        customers.forEach((customer: any) => {
          if (customer.customerID) {
            customerMap.set(customer.customerID, {
              firstName: customer.firstName || '',
              lastName: customer.lastName || ''
            });
          }
        });
        
        console.log(`Added ${customers.length} customers to the map`);
      }
    } catch (error) {
      console.error(`Error fetching customer batch ${i}-${i+BATCH_SIZE}:`, error);
    }
  }
  
  return customerMap;
}

// Update the processAndReturnSalesData function to add detailed debugging for the first 3 sales
async function processAndReturnSalesData(response: Response, page: number, pageSize: number, merchantId: string) {
  try {
    const responseData = await response.json();
    
    // Log total count information
    console.log(`Received sale line data with attributes:`, responseData['@attributes']);
    
    // Extract the next URL from the response attributes if available
    let nextUrl: string | undefined = undefined;
    if (responseData['@attributes'] && responseData['@attributes'].next) {
      nextUrl = responseData['@attributes'].next;
      console.log(`Found next URL for pagination: ${nextUrl}`);
    }
    
    // Check which relations are loaded in the API response
    console.log('=== ANALYZING API RESPONSE STRUCTURE ===');
    console.log('Relations that should have been loaded:', ['Item', 'Sale', 'TaxClass']);
    
    // Check if any sale lines exist
    if (!responseData.SaleLine) {
      console.log('No SaleLine data found in response');
    } else {
      const sampleLine = Array.isArray(responseData.SaleLine) ? responseData.SaleLine[0] : responseData.SaleLine;
      const loadedRelations = [];
      
      // Check which relations are actually loaded
      if (sampleLine) {
        console.log('Sample sale line keys:', Object.keys(sampleLine));
        if (sampleLine.Item) loadedRelations.push('Item');
        if (sampleLine.Sale) loadedRelations.push('Sale');
        if (sampleLine.TaxClass) loadedRelations.push('TaxClass');
        
        console.log('Detected loaded relations:', loadedRelations);
        
        // Check Item structure if it exists
        if (sampleLine.Item) {
          console.log('Item relation structure:', {
            hasItemID: !!sampleLine.Item.itemID,
            hasDescription: !!sampleLine.Item.description,
            hasLongDescription: !!sampleLine.Item.longDescription,
            availableProperties: Object.keys(sampleLine.Item)
          });
        } else {
          console.log('❌ Item relation not loaded!');
        }
      }
    }
    console.log('=== END ANALYSIS ===');
    
    // Handle case where there are no sales
    if (!responseData.SaleLine) {
      console.log('No sale line data returned from Lightspeed API');
      return NextResponse.json({ 
        success: true, 
        sales: [],
        pagination: {
          page,
          pageSize,
          hasMore: !!nextUrl,
          nextUrl
        }
      });
    }
    
    // Ensure the sale line data is always an array
    const saleLines = Array.isArray(responseData.SaleLine) 
      ? responseData.SaleLine 
      : [responseData.SaleLine]; // Handle case where only one sale line is returned
    
    console.log(`Processing ${saleLines.length} sale line records on page ${page}`);
    
    // Add detailed debugging for the first 3 sale lines to understand data structure
    if (page === 1) {
      console.log('=== DETAILED DEBUG: FIRST 3 SALE LINES ===');
      for (let i = 0; i < Math.min(3, saleLines.length); i++) {
        console.log(`\n--- SALE LINE #${i+1} ---`);
        console.log('saleID:', saleLines[i].saleID);
        console.log('itemID:', saleLines[i].itemID);
        console.log('Full sale line object:', JSON.stringify(saleLines[i], null, 2));
        
        // Check specifically for Item structure
        if (saleLines[i].Item) {
          console.log('Item structure available with keys:', Object.keys(saleLines[i].Item));
          console.log('Item details:', {
            itemID: saleLines[i].Item.itemID,
            description: saleLines[i].Item.description,
            longDescription: saleLines[i].Item.longDescription
          });
        } else {
          console.log('❌ No Item object found in this sale line!');
        }
        
        // Check for TaxClass as well since it's a fallback
        if (saleLines[i].TaxClass) {
          console.log('TaxClass available:', saleLines[i].TaxClass);
        }
      }
      console.log('=== END DETAILED DEBUG ===');
    }
    
    // Group sale lines by saleID to reconstruct sales
    const salesMap = new Map<string, LightspeedSaleLine[]>();
    
    saleLines.forEach((saleLine: LightspeedSaleLine) => {
      if (!saleLine.saleID) return;
      
      if (!salesMap.has(saleLine.saleID)) {
        salesMap.set(saleLine.saleID, []);
      }
      
      salesMap.get(saleLine.saleID)?.push(saleLine);
    });
    
    console.log(`Grouped into ${salesMap.size} distinct sales on page ${page}`);
    
    // Add debugging for the first 3 complete sales after grouping
    if (page === 1) {
      console.log('=== DETAILED DEBUG: FIRST 3 SALES AFTER GROUPING ===');
      let saleCounter = 0;
      for (const [saleID, lines] of salesMap.entries()) {
        if (saleCounter >= 3) break;
        console.log(`\n--- SALE #${saleCounter+1} (ID: ${saleID}) ---`);
        console.log('Contains', lines.length, 'line items');
        
        // Print detailed info for first line in this sale
        const firstLine = lines[0];
        console.log('First line item attributes:', {
          saleLineID: firstLine.saleLineID,
          itemID: firstLine.itemID,
          hasItem: !!firstLine.Item,
          hasItemDescription: firstLine.Item?.description ? true : false,
          description: firstLine.Item?.description || 'N/A',
          longDescription: firstLine.Item?.longDescription || 'N/A'
        });
        
        saleCounter++;
      }
      console.log('=== END DETAILED DEBUG ===');
    }

    // Extract accountId from the response URL if possible
    let accountId: string = '';
    try {
      // The URL will be something like https://api.lightspeedapp.com/API/V3/Account/{accountId}/SaleLine.json
      const urlParts = response.url.split('/');
      const accountIndex = urlParts.indexOf('Account');
      if (accountIndex >= 0 && accountIndex + 1 < urlParts.length) {
        accountId = urlParts[accountIndex + 1];
      }
    } catch (e) {
      console.error('Failed to extract accountId from response URL:', e);
    }
    
    // After grouping sale lines and before processing sales, check if we need to fetch additional item data
    // Count how many sale lines are missing Item data
    const missingItemLines = [...salesMap.values()].flat().filter(line => !line.Item || !line.Item.description);
    if (missingItemLines.length > 0 && accountId) {
      console.log(`Found ${missingItemLines.length} sale lines missing item details (${(missingItemLines.length / saleLines.length * 100).toFixed(2)}% of total). Attempting to fetch.`);
      
      // Log example of missing items
      console.log('Examples of lines missing item details:', missingItemLines.slice(0, 3).map(line => ({
        itemID: line.itemID,
        saleLineID: line.saleLineID,
        hasItem: !!line.Item,
        itemKeysIfExists: line.Item ? Object.keys(line.Item) : 'null'
      })));
    
      // Get unique item IDs that need details
      const missingItemIDs = missingItemLines.map(line => line.itemID).filter(Boolean);
      
      if (missingItemIDs.length > 0) {
        console.log(`Need to fetch details for ${missingItemIDs.length} unique item IDs`);
        // Get access token from the original request
        const accessToken = await getAccessTokenForMerchant(merchantId);
        
        if (accessToken) {
          // Fetch missing item details
          const itemDetailsMap = await fetchItemDetails(accessToken, accountId, missingItemIDs);
          
          // If we got any item details, update the sale lines
          if (itemDetailsMap.size > 0) {
            console.log(`Successfully fetched details for ${itemDetailsMap.size} items. Updating sale lines.`);
            
            // Log a few examples of the fetched item details
            console.log('Examples of fetched item details:');
            let count = 0;
            for (const [itemID, details] of itemDetailsMap.entries()) {
              if (count++ >= 3) break;
              console.log(`Item #${itemID}:`, details);
            }
            
            // Update sale lines with item details
            for (const saleLines of salesMap.values()) {
              for (const line of saleLines) {
                if ((!line.Item || !line.Item.description) && itemDetailsMap.has(line.itemID)) {
                  // Create or update Item object with fetched details
                  const itemDetails = itemDetailsMap.get(line.itemID);
                  if (!line.Item) {
                    // If Item is undefined, create a new object with the required properties
                    line.Item = {
                      itemID: line.itemID,
                      description: itemDetails.description,
                      longDescription: itemDetails.longDescription
                    };
                    console.log(`Created new Item object for itemID ${line.itemID} with description: "${itemDetails.description}"`);
                  } else {
                    // Otherwise update the existing Item object
                    line.Item.description = itemDetails.description;
                    line.Item.longDescription = itemDetails.longDescription;
                    console.log(`Updated existing Item object for itemID ${line.itemID} with description: "${itemDetails.description}"`);
                  }
                }
              }
            }
          } else {
            console.log('❌ Failed to fetch any item details from separate API call!');
          }
        }
      }
    }
    
    // After grouping sale lines and before processing sales, collect unique customer IDs
    const customerIDs = Array.from(salesMap.values())
      .map(lines => lines[0]?.customerID || '0')
      .filter(id => id !== '0');
    
    // Fetch customer information if there are valid customer IDs
    let customerMap = new Map<string, { firstName: string, lastName: string }>();
    if (customerIDs.length > 0 && accountId) {
      try {
        // Get access token from the original request
        const accessToken = await getAccessTokenForMerchant(merchantId);
        
        if (accessToken) {
          customerMap = await fetchCustomersForSales(accessToken, accountId, customerIDs);
        } else {
          console.log('Could not get access token for customer lookup');
        }
      } catch (error) {
        console.error('Error fetching customer information:', error);
        // Continue without customer data
      }
    }
    
    // Process the grouped sale lines into sales
    const processedSales: ProcessedSale[] = [];
    
    for (const [saleID, lines] of salesMap.entries()) {
      try {
        // Use the first line for common sale properties
        const firstLine = lines[0];
        
        // Look up customer information if available
        let customerName = '';
        if (firstLine.customerID && firstLine.customerID !== '0') {
          // First try to get name from customer map
          const customer = customerMap.get(firstLine.customerID);
          if (customer) {
            customerName = `${customer.firstName} ${customer.lastName}`.trim();
            console.log(`Using customer name from lookup: ${customerName} for customerID ${firstLine.customerID}`);
          } 
          // Fall back to Sale.Customer if available
          else if (firstLine.Sale?.Customer) {
            const saleCustomer = firstLine.Sale.Customer;
            const firstName = saleCustomer.firstName || '';
            const lastName = saleCustomer.lastName || '';
            customerName = `${firstName} ${lastName}`.trim();
            console.log(`Using customer name from Sale.Customer: ${customerName} for customerID ${firstLine.customerID}`);
          } else {
            console.log(`No customer name found for customerID ${firstLine.customerID}`);
          }
        } else {
          console.log('No customerID available for this sale');
        }
        
        // Create items array from the lines
        const items = lines.map(line => {
          // Log the line structure for debugging
          console.log(`Processing sale line for item extraction:`, {
            saleID: line.saleID,
            saleLineID: line.saleLineID,
            hasItem: !!line.Item,
            itemDescription: line.Item?.description || 'No description',
            itemID: line.itemID
          });
          
          // Enhanced item extraction with better debugging and fallback strategies
          // Log more details for debugging item structure
          if (line.Item) {
            console.log('Item data found, detailed structure:', {
              itemID: line.Item.itemID,
              hasDescription: !!line.Item.description,
              descriptionLength: line.Item.description ? line.Item.description.length : 0,
              description: line.Item.description ? `"${line.Item.description}"` : null,
              hasLongDescription: !!line.Item.longDescription,
              longDescriptionLength: line.Item.longDescription ? line.Item.longDescription.length : 0,
              longDescription: line.Item.longDescription ? `"${line.Item.longDescription.substring(0, 50)}${line.Item.longDescription.length > 50 ? '...' : ''}"` : null,
              hasTaxClass: !!line.TaxClass,
              taxClassName: line.TaxClass?.name || 'No tax class',
              allKeys: Object.keys(line.Item)
            });
          } else {
            console.log(`No Item data found for line ${line.saleLineID}, itemID: ${line.itemID}`);
          }
          
          // Try to extract item name using multiple fallback strategies
          let itemName = 'Unnamed Item';
          let itemDescription = '';
          let sourcePath = 'default';
          
          // First priority: Use Item.description directly
          if (line.Item && typeof line.Item === 'object') {
            if (line.Item.description) {
              itemName = line.Item.description;
              sourcePath = 'Item.description';
              console.log(`✅ Using Item.description: "${itemName}"`);
            } else if (line.Item.longDescription) {
              // Second priority: Use longDescription if description is missing
              itemName = line.Item.longDescription.substring(0, 50) + (line.Item.longDescription.length > 50 ? '...' : '');
              sourcePath = 'Item.longDescription';
              console.log(`⚠️ Using Item.longDescription (truncated): "${itemName}"`);
            } else {
              // Third priority: Use item ID with a prefix
              itemName = `Item #${line.itemID}`;
              sourcePath = 'itemID (fallback)';
              console.log(`⚠️ Using itemID: "${itemName}" (No description or longDescription available)`);
            }
            
            // Set description separately
            itemDescription = line.Item.longDescription || '';
          } 
          // Fourth priority: Fall back to TaxClass name if no Item object
          else if (line.TaxClass && line.TaxClass.name) {
            itemName = line.TaxClass.name;
            sourcePath = 'TaxClass.name';
            console.log(`⚠️ Using TaxClass.name: "${itemName}" (No Item object available)`);
          } 
          // Last resort: Just use itemID
          else {
            itemName = `Item #${line.itemID}`;
            sourcePath = 'itemID (last resort)';
            console.log(`❌ No item details found, using default "Item #${line.itemID}"`);
          }
          
          return {
            itemID: line.itemID || '',
            name: itemName,
            sourcePath, // Add this for debugging
            description: itemDescription,
            unitPrice: line.unitPrice || '0',
            quantity: line.unitQuantity || '1',
            extPrice: line.calcTotal || '0',
            // Include fee information if available
            fee: line.ItemFee ? {
              name: line.ItemFee.name,
              value: line.ItemFee.feeValue
            } : undefined
          };
        });
        
        // Calculate sale totals by aggregating line values
        const calcTotal = lines.reduce((sum, line) => sum + parseFloat(line.calcTotal || '0'), 0).toFixed(2);
        const calcSubtotal = lines.reduce((sum, line) => sum + parseFloat(line.calcSubtotal || '0'), 0).toFixed(2);
        const calcTax1 = lines.reduce((sum, line) => sum + parseFloat(line.calcTax1 || '0'), 0).toFixed(2);
        const calcTax2 = lines.reduce((sum, line) => {
          const tax2 = line.calcTax2 ? parseFloat(line.calcTax2) : 0;
          return sum + tax2;
        }, 0).toFixed(2);
        
        // Determine if any line is a work order
        const isWorkOrder = lines.some(line => line.isWorkorder === 'true');
        
        // Also extract better sale information if Sale relation is loaded
        // Use Sale relation data for better information where available
        let completed = 'true';
        let voided = 'false';
        let archived = 'false';
        let registerID = '0';
        
        // Get sale info from the relation if available
        if (firstLine.Sale && typeof firstLine.Sale === 'object') {
          completed = firstLine.Sale.completed || completed;
          voided = firstLine.Sale.voided || voided;
          archived = firstLine.Sale.archived || archived;
          registerID = firstLine.Sale.registerID || registerID;
          
          // If Sale has Customer info, use it
          if (firstLine.Sale.Customer && !customerName) {
            const saleCustomer = firstLine.Sale.Customer;
            const firstName = saleCustomer.firstName || '';
            const lastName = saleCustomer.lastName || '';
            customerName = `${firstName} ${lastName}`.trim();
          }
        }
        
        // Create the processed sale
        const processedSale: ProcessedSale = {
          saleID,
          timeStamp: firstLine.timeStamp,
          items,
          customerName: customerName || '(No customer name)', // Use a placeholder if no customer name found
          customerID: firstLine.customerID || '0',
          employeeID: firstLine.employeeID || '0',
          shopID: firstLine.shopID || '0',
          isWorkOrder: isWorkOrder ? 'true' : 'false',
          completed, // Use data from Sale relation
          voided,
          archived,
          discountPercent: '0',
          calcTotal,
          calcSubtotal,
          calcTax1,
          calcTax2,
          balance: '0',
          total: calcTotal,
          displayableTotal: calcTotal,
          ticketNumber: `LS-${saleID}`,
          registerID
        };
        
        processedSales.push(processedSale);
      } catch (error) {
        console.error(`Error processing sale ${saleID}:`, error);
      }
    }
    
    console.log(`Successfully processed ${processedSales.length} sales from page ${page}, from ${saleLines.length} sale lines`);

    // Return the processed sales without saving to Firestore
    // We'll save them in the main function after collecting all pages
    return NextResponse.json({ 
      success: true, 
      sales: processedSales,
      pagination: {
        page,
        pageSize,
        totalCount: processedSales.length,
        hasMore: !!nextUrl,
        nextUrl
      }
    });
  } catch (error) {
    console.error('Error processing sales data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to process sales data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}

// Enhance the saveNewSalesToFirestore function with better debugging and error handling
async function saveNewSalesToFirestore(merchantId: string, sales: ProcessedSale[]) {
  if (!sales.length) return;
  
  try {
    console.log(`Attempting to save ${sales.length} sales to Firestore for merchant ${merchantId}`);
    console.log(`First sale ID: ${sales[0].saleID}, timestamp: ${sales[0].timeStamp}`);
    console.log(`Item count in first sale: ${sales[0].items.length}`);
    console.log(`First item name: ${sales[0].items.length > 0 ? sales[0].items[0].name : 'No items'}`);
    
    // Process sales in smaller batches to avoid Firestore limits
    const BATCH_SIZE = 50; // Using a smaller batch size for better reliability
    let newSalesCount = 0;
    let processedCount = 0;
    
    // Process sales in chunks to avoid Firestore batch size limits
    while (processedCount < sales.length) {
      // Get the next chunk of sales
      const salesChunk = sales.slice(processedCount, processedCount + BATCH_SIZE);
      processedCount += salesChunk.length;
      
      console.log(`Processing chunk ${processedCount / BATCH_SIZE} with ${salesChunk.length} sales`);
      
      // Create a new batch for this chunk
      const batch = writeBatch(db);
      let chunkNewCount = 0;
      
      // First check which sales already exist
      const existingChecks = await Promise.all(
        salesChunk.map(async (sale) => {
          if (!sale.saleID) return null;
          const saleRef = doc(db, `merchants/${merchantId}/lightspeed_sales/${sale.saleID}`);
          const existingSale = await getDoc(saleRef);
          return {
            sale,
            ref: saleRef,
            exists: existingSale.exists()
          };
        })
      );
      
      console.log(`Existence checks complete: ${existingChecks.filter(check => check && !check.exists).length} new sales found`);
      
      // Now add only new sales to batch
      existingChecks.forEach(check => {
        if (check && !check.exists) {
          // Store the full sale object with all details, but sanitize it for Firestore
          const saleData = sanitizeForFirestore({
            ...check.sale,
            _savedAt: Timestamp.now(),
            _merchantId: merchantId,
            _source: 'lightspeed_saleline' // Mark the source of this data
          });
          
          try {
            batch.set(check.ref, saleData);
            chunkNewCount++;
          } catch (error) {
            console.error(`Failed to add sale ${check.sale.saleID} to batch:`, error);
          }
        }
      });
      
      // Commit this batch if there are new sales
      if (chunkNewCount > 0) {
        try {
          await batch.commit();
          newSalesCount += chunkNewCount;
          console.log(`Successfully committed batch: ${chunkNewCount} new sales saved (processed ${processedCount}/${sales.length})`);
        } catch (error) {
          console.error(`Failed to commit batch of ${chunkNewCount} sales:`, error);
        }
      } else {
        console.log(`No new sales to commit in this batch (processed ${processedCount}/${sales.length})`);
      }
    }
    
    if (newSalesCount > 0) {
      console.log(`Total success: Saved ${newSalesCount} new sales to Firestore`);
    } else {
      console.log('No new sales saved to Firestore (all were duplicates)');
    }
    
    // At the end of the saveNewSalesToFirestore function, add more specific debugging
    // After the batch commit or if no new sales to save, add this:
    try {
      // Verify a sample sale was actually saved
      if (newSalesCount > 0) {
        const sampleSaleId = sales[0].saleID;
        const sampleSaleRef = doc(db, `merchants/${merchantId}/lightspeed_sales/${sampleSaleId}`);
        const savedSale = await getDoc(sampleSaleRef);
        
        if (savedSale.exists()) {
          console.log('✅ Verification: Successfully saved and retrieved sample sale from Firestore');
          console.log(`Sample sale data:`, {
            saleID: savedSale.id,
            timeStamp: savedSale.data().timeStamp,
            items: savedSale.data().items.length
          });
        } else {
          console.error('❌ Verification: Failed to save sample sale to Firestore');
        }
      }
    } catch (verifyError) {
      console.error('Error during save verification:', verifyError);
    }
    
    return newSalesCount;
  } catch (error) {
    console.error('Error saving sales to Firestore:', error);
    throw error;
  }
}

// Helper function to refresh an expired token
async function refreshLightspeedToken(merchantId: string, refreshToken: string) {
  try {
    // Get the client credentials
    const clientId = process.env.NEXT_PUBLIC_LIGHTSPEED_NEW_CLIENT_ID || process.env.LIGHTSPEED_NEW_CLIENT_ID
    const clientSecret = process.env.LIGHTSPEED_NEW_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      console.error('Missing Lightspeed client credentials')
      return null
    }

    // Exchange the refresh token for a new access token
    const tokenParams = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })

    const response = await fetch('https://cloud.lightspeedapp.com/auth/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: tokenParams.toString()
    })

    if (!response.ok) {
      console.error('Failed to refresh token:', response.status, response.statusText)
      return null
    }

    const tokenData = await response.json()

    if (!tokenData.access_token) {
      console.error('No access token in refresh response')
      return null
    }

    // Update the stored tokens
    const integrationDocRef = doc(db, `merchants/${merchantId}/integrations/lightspeed_new`)
    await updateDoc(integrationDocRef, {
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || refreshToken, // Use new refresh token if provided
      expires_in: tokenData.expires_in,
      updated_at: Timestamp.now()
    })

    return tokenData.access_token
  } catch (error) {
    console.error('Error refreshing token:', error)
    return null
  }
}

// Add a new function to save sales by day
async function saveDailySales(merchantId: string, sales: ProcessedSale[]) {
  if (!sales.length) return;
  
  try {
    console.log(`Organizing ${sales.length} sales into daily buckets for merchant ${merchantId}`);
    
    // First, filter out invalid items from each sale
    const sanitizedSales = sales.map(sale => {
      // Create a copy of the sale with filtered items
      return {
        ...sale,
        // Filter out items with itemID = '0'
        items: sale.items.filter(item => item.itemID && item.itemID !== '0')
      };
    });
    
    console.log(`Filtered out items with itemID = '0' from sales`);
    
    // Group sales by day
    const salesByDay = new Map<string, ProcessedSale[]>();
    
    sanitizedSales.forEach(sale => {
      if (!sale.timeStamp) return;
      
      // Extract the date part from the timestamp (YYYY-MM-DD)
      const saleDate = new Date(sale.timeStamp);
      const dayId = saleDate.toISOString().split('T')[0]; // Format: YYYY-MM-DD
      
      if (!salesByDay.has(dayId)) {
        salesByDay.set(dayId, []);
      }
      
      salesByDay.get(dayId)?.push(sale);
    });
    
    console.log(`Sales organized into ${salesByDay.size} distinct days`);
    
    // Process each day's sales
    for (const [dayId, daySales] of salesByDay.entries()) {
      console.log(`Processing ${daySales.length} sales for day ${dayId}`);
      
      // Create a document for the day if it doesn't exist
      const dayDocRef = doc(db, `merchants/${merchantId}/dailysales/${dayId}`);
      
      // Get the current day document if it exists
      const dayDoc = await getDoc(dayDocRef);
      
      if (dayDoc.exists()) {
        // Day document exists, update it with new sales
        console.log(`Day document ${dayId} exists, updating with new sales`);
        
        // Get existing sales
        const existingSales = dayDoc.data().sales || [];
        const existingSaleIds = new Set(existingSales.map((s: any) => s.saleID));
        
        // Filter out sales that already exist in the document
        const newSales = daySales.filter(sale => !existingSaleIds.has(sale.saleID));
        
        if (newSales.length > 0) {
          // Add new sales to existing ones
          const updatedSales = [...existingSales, ...newSales.map(sale => sanitizeForFirestore(sale))];
          
          // Update the document with the combined sales
          await setDoc(dayDocRef, {
            dayId,
            merchantId,
            date: dayId,
            sales: updatedSales,
            totalSales: updatedSales.length,
            totalAmount: updatedSales.reduce((sum, sale: any) => sum + parseFloat(sale.total || '0'), 0).toFixed(2),
            lastUpdated: Timestamp.now()
          });
          
          console.log(`Updated day ${dayId} with ${newSales.length} new sales, total now ${updatedSales.length}`);
        } else {
          console.log(`No new sales to add for day ${dayId}`);
        }
      } else {
        // Day document doesn't exist, create it
        console.log(`Creating new day document for ${dayId} with ${daySales.length} sales`);
        
        // Create the document with all sales for this day
        await setDoc(dayDocRef, {
          dayId,
          merchantId,
          date: dayId,
          sales: daySales.map(sale => sanitizeForFirestore(sale)),
          totalSales: daySales.length,
          totalAmount: daySales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0).toFixed(2),
          lastUpdated: Timestamp.now()
        });
        
        console.log(`Created day document ${dayId} with ${daySales.length} sales`);
      }
      
      // Also save a summary document with just the totals (no individual sales)
      const summaryDocRef = doc(db, `merchants/${merchantId}/dailysales_summary/${dayId}`);
      
      await setDoc(summaryDocRef, {
        dayId,
        merchantId,
        date: dayId,
        totalSales: daySales.length,
        totalAmount: daySales.reduce((sum, sale) => sum + parseFloat(sale.total || '0'), 0).toFixed(2),
        lastUpdated: Timestamp.now()
      });
      
      console.log(`Updated summary for day ${dayId}`);
    }
    
    console.log(`Successfully saved sales data to daily buckets for ${salesByDay.size} days`);
    
    return salesByDay.size; // Return the number of days processed
  } catch (error) {
    console.error('Error saving daily sales to Firestore:', error);
    throw error;
  }
}