import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { campaignId } = data;
    
    if (!campaignId) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Campaign ID is required"
        },
        { status: 400 }
      );
    }
    
    console.log(`Attempting to send campaign ${campaignId} directly...`);
    
    try {
      // Create auth header
      const authString = Buffer.from(`anystring:${process.env.MAILCHIMP_API_KEY}`).toString('base64');
      const headers = {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      };
      
      // First, check if the campaign is ready to send
      const checkResponse = await fetch(
        `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}`,
        { headers }
      );
      
      const checkData = await checkResponse.json();
      console.log(`Campaign status before sending: ${checkData.status}`);
      
      // If the campaign is already sent or sending, return success
      if (checkData.status === 'sent' || checkData.status === 'sending') {
        return NextResponse.json({
          success: true,
          message: "Campaign is already being sent",
          status: checkData.status
        });
      }
      
      // Check for campaign readiness
      const readinessResponse = await fetch(
        `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}/send-checklist`,
        { headers }
      );
      
      const readinessData = await readinessResponse.json();
      const checklistItems = readinessData.items || [];
      const hasErrors = checklistItems.some(item => item.type === 'error');
      
      if (hasErrors) {
        console.log("Campaign has errors and cannot be sent:", checklistItems);
        return NextResponse.json({
          success: false,
          error: "Campaign has errors and cannot be sent",
          checklistItems
        }, { status: 400 });
      }
      
      // Send the campaign
      const sendResponse = await fetch(
        `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`,
        { 
          method: 'POST',
          headers,
          body: JSON.stringify({})
        }
      );
      
      if (!sendResponse.ok) {
        const errorData = await sendResponse.json();
        return NextResponse.json({
          success: false,
          error: "Failed to send campaign",
          details: errorData.detail || errorData.message || "Unknown error",
          status: sendResponse.status
        }, { status: sendResponse.status });
      }
      
      // Check the campaign status after sending
      const afterSendResponse = await fetch(
        `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}`,
        { headers }
      );
      
      const afterSendData = await afterSendResponse.json();
      console.log(`Campaign status after sending: ${afterSendData.status}`);
      
      return NextResponse.json({
        success: true,
        message: "Campaign send request successful",
        status: afterSendData.status,
        campaignId
      });
    } catch (error) {
      console.error("Direct send error:", error);
      
      // Extract the most useful error information
      const errorDetail = error.response?.data?.detail || error.message;
      const errorTitle = error.response?.data?.title || "Failed to send campaign";
      const errorStatus = error.response?.status || 500;
      
      return NextResponse.json(
        { 
          success: false, 
          error: errorTitle,
          details: errorDetail,
          status: errorStatus
        },
        { status: errorStatus }
      );
    }
  } catch (error) {
    console.error("Error in direct-send route:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
} 