import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  // Get campaign ID from query params
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get('id');
  
  if (!campaignId) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Campaign ID is required"
      },
      { status: 400 }
    );
  }
  
  try {
    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX
    });
    
    // Get campaign details
    const campaign = await mailchimp.campaigns.get(campaignId);
    
    return NextResponse.json({
      success: true,
      campaign: {
        id: campaign.id,
        status: campaign.status,
        sendTime: campaign.send_time,
        webId: campaign.web_id,
        recipients: {
          recipientCount: campaign.recipients.recipient_count,
          listId: campaign.recipients.list_id,
          listName: campaign.recipients.list_name
        },
        settings: {
          subject: campaign.settings.subject_line,
          fromName: campaign.settings.from_name,
          replyTo: campaign.settings.reply_to
        }
      }
    });
  } catch (error) {
    console.error("Error checking campaign status:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to check campaign status",
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 