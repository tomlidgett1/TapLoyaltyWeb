import { NextResponse } from 'next/server';

// This is a server-side API route which doesn't have CORS issues
export async function POST(request: Request) {
  try {
    // Get request body
    const body = await request.json();
    console.log('API Route: Received request', body);
    
    // Make sure we have required parameters
    if (!body.question || !body.merchantId) {
      console.log('API Route: Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }
    
    // Prepare request payload for Firebase
    // Directly send the parameters without wrapping in 'data'
    const payload = {
      question: body.question,
      merchantId: body.merchantId
    };
    
    console.log('API Route: Sending to Firebase with payload', payload);
    
    // Forward request to Firebase function
    const response = await fetch('https://us-central1-tap-loyalty-fb6d0.cloudfunctions.net/merchantAnalyticsAgent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });
    
    // Check if the request was successful
    if (!response.ok) {
      const errorStatus = response.status;
      const errorText = await response.text().catch(e => 'Could not read error response');
      
      console.error('API Route: Firebase function error:', {
        status: errorStatus,
        text: errorText,
        url: response.url
      });
      
      // TEMPORARY: Force debug by returning real error info to frontend
      return NextResponse.json({
        success: false,
        debug: {
          status: errorStatus,
          error: errorText,
          url: response.url
        },
        error: `Firebase function returned error status ${errorStatus}`
      }, { status: 500 });
      
      // Once working, we can switch back to fallback data
      /*
      // Return a fallback example response for development
      return NextResponse.json({
        success: true,
        data: {
          sql: "SELECT desc AS item, SUM(ext) AS revenue \nFROM `tap-loyalty-fb6d0.livedata.lightspeed_sales_items` \nWHERE merchantId = @merchantId \n  AND EXTRACT(MONTH FROM timestamp) = EXTRACT(MONTH FROM DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) \n  AND EXTRACT(YEAR  FROM timestamp) = EXTRACT(YEAR  FROM DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)) \nGROUP BY item \nORDER BY revenue DESC \nLIMIT 5",
          rows: [
            { item: "Flat White", revenue: 812.50 },
            { item: "Cappuccino", revenue: 646.00 },
            { item: "Latte", revenue: 571.20 },
            { item: "Banana Bread", revenue: 429.00 },
            { item: "Muffin", revenue: 312.75 }
          ],
          answer: `Demo response to: "${body.question}"\nIn the past month your best-selling product by revenue was the Flat White ($812.50), followed by Cappuccino and Latte. Food items like Banana Bread and Muffins rounded out the top five.`,
          viz: {
            type: "bar",
            xField: "item",
            yField: "revenue"
          },
          keyFigures: {
            totalRevenueTop5: 2771.45
          }
        }
      });
      */
    }
    
    // Parse and return the response
    try {
      const responseData = await response.json();
      console.log('API Route: Firebase function success response', responseData);
      return NextResponse.json(responseData);
    } catch (jsonError) {
      const responseText = await response.text();
      console.error('API Route: Could not parse JSON from Firebase response', responseText, jsonError);
      return NextResponse.json(
        { error: 'Invalid response from Firebase function', debug: responseText },
        { status: 500 }
      );
    }
    
  } catch (error: any) {
    console.error('API Route: Unhandled error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 