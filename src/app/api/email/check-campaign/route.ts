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
    
    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX
    });
    
    // Get campaign details
    const campaign = await mailchimp.campaigns.get(campaignId);
    
    // Check if the campaign is ready to send
    const checklistResponse = await mailchimp.campaigns.getChecklistItems(campaignId);
    
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        status: campaign.status,
        recipients: campaign.recipients,
        settings: campaign.settings
      },
      checklistItems: checklistResponse.items || [],
      canSend: !(checklistResponse.items && checklistResponse.items.some(item => item.type === "error")),
      hasWarnings: checklistResponse.items && checklistResponse.items.some(item => item.type === "warning")
    });
  } catch (error) {
    console.error("Error checking campaign:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to check campaign",
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 