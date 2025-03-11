import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      campaignName, 
      subject, 
      fromName, 
      fromEmail, 
      emailContent 
    } = data;
    
    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX
    });
    
    // Step 1: Create a campaign
    console.log("Creating Mailchimp campaign...");
    const campaignSettings = {
      type: "regular",
      recipients: {
        list_id: process.env.MAILCHIMP_AUDIENCE_ID
      },
      settings: {
        subject_line: subject,
        title: campaignName,
        from_name: fromName,
        reply_to: fromEmail,
      }
    };
    
    const campaign = await mailchimp.campaigns.create(campaignSettings);
    const campaignId = campaign.id;
    console.log(`Campaign created with ID: ${campaignId}`);
    
    // Step 2: Set the campaign content
    console.log("Setting campaign content...");
    
    // Add required footer with physical address and unsubscribe link
    const htmlContent = `
      <html>
        <head>
          <title>${subject}</title>
        </head>
        <body>
          <div>${emailContent}</div>
          
          <!-- Required footer with physical address and unsubscribe link -->
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666;">
            <p>
              © ${new Date().getFullYear()} ${fromName}. All rights reserved.<br>
              123 Main Street, Suite 100, San Francisco, CA 94105
            </p>
            <p>
              <a href="*|UNSUB|*">Unsubscribe</a> | 
              <a href="*|UPDATE_PROFILE|*">Update Preferences</a>
            </p>
          </div>
        </body>
      </html>
    `;
    
    await mailchimp.campaigns.setContent(campaignId, {
      html: htmlContent
    });
    
    console.log("Campaign content set successfully");
    
    // Step 3: Check if the campaign is ready to send
    console.log("Checking campaign readiness...");
    const checklistResponse = await mailchimp.campaigns.getChecklistItems(campaignId);
    
    if (checklistResponse.items && checklistResponse.items.length > 0) {
      const hasErrors = checklistResponse.items.some(item => item.type === "error");
      
      if (hasErrors) {
        console.error("Campaign has errors and cannot be sent");
        return NextResponse.json(
          { 
            success: false, 
            error: "Campaign has errors and cannot be sent",
            checklistItems: checklistResponse.items,
            campaignId
          },
          { status: 400 }
        );
      }
    }
    
    // Step 4: Send the campaign
    console.log("Sending campaign...");
    await mailchimp.campaigns.send(campaignId);
    
    // Step 5: Check the campaign status
    const campaignStatus = await mailchimp.campaigns.get(campaignId);
    
    return NextResponse.json({
      success: true,
      message: "Campaign created and sent",
      campaignId,
      status: campaignStatus.status
    });
  } catch (error) {
    console.error("Error in manual-send:", error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to send campaign",
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 