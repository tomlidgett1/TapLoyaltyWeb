import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { 
      campaignName, 
      subject, 
      fromName, 
      fromEmail, 
      templateId, 
      emailContent, 
      customization,
      audienceType,
      customEmails = []
    } = data;

    // Check if we should simulate the Mailchimp API call
    const shouldSimulate = process.env.SIMULATE_MAILCHIMP === 'true';
    
    console.log("Environment check:", {
      NODE_ENV: process.env.NODE_ENV,
      SIMULATE_MAILCHIMP: process.env.SIMULATE_MAILCHIMP,
      shouldSimulate
    });

    // For development/testing, we'll simulate a successful campaign
    if (shouldSimulate) {
      console.log("SIMULATING Mailchimp campaign send");
      
      // Wait 2 seconds to simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generate a realistic-looking campaign ID
      const simulatedCampaignId = `campaign_${Math.random().toString(36).substring(2, 15)}`;
      
      console.log(`Simulated campaign created with ID: ${simulatedCampaignId}`);
      
      // If using custom emails, log them
      if (audienceType === "custom" && customEmails.length > 0) {
        console.log(`Simulating adding ${customEmails.length} custom recipients to audience...`);
        
        // Log a few sample emails
        const sampleEmails = customEmails.slice(0, Math.min(5, customEmails.length));
        sampleEmails.forEach(email => {
          console.log(`Simulated subscriber added: ${email}`);
        });
        
        if (customEmails.length > 5) {
          console.log(`... and ${customEmails.length - 5} more`);
        }
      }
      
      console.log("Simulated campaign send complete");
      
      return NextResponse.json({ 
        success: true, 
        message: "Campaign sent successfully (SIMULATED)",
        campaignId: simulatedCampaignId,
        simulated: true,
        details: {
          recipientCount: audienceType === "custom" ? customEmails.length : 25,
          template: templateId,
          subject: subject,
          content: emailContent ? emailContent.substring(0, 100) + (emailContent.length > 100 ? "..." : "") : "(no content)"
        }
      });
    }

    // If not simulating, check if Mailchimp credentials are configured
    if (!process.env.MAILCHIMP_API_KEY || !process.env.MAILCHIMP_SERVER_PREFIX) {
      console.error("Mailchimp credentials not configured");
      return NextResponse.json(
        { 
          success: false, 
          error: "Mailchimp API credentials not configured. Please add them to your environment variables.",
          details: "Missing MAILCHIMP_API_KEY or MAILCHIMP_SERVER_PREFIX"
        },
        { status: 500 }
      );
    }

    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX // e.g., "us19"
    });

    // Verify connection to Mailchimp
    try {
      const response = await mailchimp.ping.get();
      console.log("Mailchimp API connection successful:", response);
    } catch (pingError) {
      console.error("Mailchimp API connection failed:", pingError);
      console.error("Connection details:", {
        apiKey: process.env.MAILCHIMP_API_KEY ? `${process.env.MAILCHIMP_API_KEY.substring(0, 5)}...` : 'undefined',
        server: process.env.MAILCHIMP_SERVER_PREFIX,
        audienceId: process.env.MAILCHIMP_AUDIENCE_ID,
        error: pingError.message,
        stack: pingError.stack,
        response: pingError.response?.body || pingError.response,
        status: pingError.status
      });
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Could not connect to Mailchimp API. Please check your credentials.",
          details: pingError.message,
          serverPrefix: process.env.MAILCHIMP_SERVER_PREFIX || 'not set',
          hasApiKey: !!process.env.MAILCHIMP_API_KEY,
          hasAudienceId: !!process.env.MAILCHIMP_AUDIENCE_ID
        },
        { status: 500 }
      );
    }

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
    console.log(`Campaign created with ID: ${campaignId}, attempting to send...`);

    // Log the full campaign response
    console.log("Full campaign creation response:", JSON.stringify(campaign, null, 2));

    // Step 2: Set campaign content
    console.log("Setting campaign content...");
    // Generate HTML content based on the template and customization
    let htmlContent = `
      <html>
        <head>
          <title>${subject}</title>
        </head>
        <body>
          <h1>${campaignName}</h1>
          <div>${emailContent}</div>
          <!-- Template-specific content would be added here -->
          
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

    // Step 3: If using custom emails, add them to the audience
    if (audienceType === "custom" && customEmails.length > 0) {
      console.log(`Adding ${customEmails.length} custom recipients to audience...`);
      const addedEmails = [];
      const failedEmails = [];

      for (const email of customEmails) {
        try {
          // Hash the email for the subscriber ID (Mailchimp requirement)
          const crypto = require('crypto');
          const subscriberHash = crypto
            .createHash('md5')
            .update(email.toLowerCase())
            .digest('hex');
          
          // Add or update the subscriber
          await mailchimp.lists.setListMember(
            process.env.MAILCHIMP_AUDIENCE_ID,
            subscriberHash,
            {
              email_address: email,
              status_if_new: "subscribed"
            }
          );
          
          addedEmails.push(email);
        } catch (error) {
          console.error(`Failed to add subscriber: ${email}`, error);
          failedEmails.push({ email, error: error.message });
        }
      }
      
      console.log(`Added ${addedEmails.length} subscribers, ${failedEmails.length} failed`);
    }

    // Step 4: Send the campaign
    console.log("Sending campaign...");
    try {
      // Check if the campaign is ready to send
      console.log(`Checking campaign ${campaignId} before sending...`);
      const checklistResponse = await mailchimp.campaigns.getChecklistItems(campaignId);
      
      // Log the full checklist response for debugging
      console.log("Full checklist response:", JSON.stringify(checklistResponse, null, 2));
      
      if (checklistResponse.items && checklistResponse.items.length > 0) {
        // Log any issues found
        console.log("Campaign checklist items:", checklistResponse.items);
        
        const hasErrors = checklistResponse.items.some(item => item.type === "error");
        if (hasErrors) {
          console.error("Campaign has errors and cannot be sent");
          
          // Return the specific errors
          return NextResponse.json(
            { 
              success: false, 
              error: "Campaign has errors and cannot be sent",
              details: checklistResponse.items.map(item => `${item.type}: ${item.details}`).join(', '),
              campaignId: campaignId,
              checklistItems: checklistResponse.items
            },
            { status: 500 }
          );
        }
      }
      
      // Add a timeout to the Mailchimp API calls
      const withTimeout = (promise, timeoutMs = 30000) => {
        let timeoutId;
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => {
            reject(new Error(`Operation timed out after ${timeoutMs}ms`));
          }, timeoutMs);
        });

        return Promise.race([
          promise,
          timeoutPromise
        ]).finally(() => {
          clearTimeout(timeoutId);
        });
      };

      // Then use it in your API calls
      try {
        // The correct way to send a campaign is to POST to the /campaigns/{campaign_id}/actions/send endpoint
        await withTimeout(mailchimp.campaigns.send(campaignId), 20000);
        console.log(`Campaign ${campaignId} sent successfully!`);
        
        // Double-check the campaign status after sending
        const campaignStatus = await mailchimp.campaigns.get(campaignId);
        console.log(`Campaign status after send request: ${campaignStatus.status}`);
        
        if (campaignStatus.status !== 'sent' && campaignStatus.status !== 'sending') {
          console.warn(`Campaign status is ${campaignStatus.status}, not 'sent' or 'sending' as expected`);
          
          // Try an alternative method if the first one didn't work
          if (campaignStatus.status === 'save' || campaignStatus.status === 'paused') {
            console.log("Trying alternative send method...");
            
            // Use a simpler HTTP client
            const https = require('https');
            
            const options = {
              hostname: `${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com`,
              path: `/3.0/campaigns/${campaignId}/actions/send`,
              method: 'POST',
              auth: `anystring:${process.env.MAILCHIMP_API_KEY}`,
              headers: {
                'Content-Type': 'application/json',
                'Content-Length': 0
              }
            };
            
            const req = https.request(options, (res) => {
              console.log(`Fallback send status: ${res.statusCode}`);
              let data = '';
              
              res.on('data', (chunk) => {
                data += chunk;
              });
              
              res.on('end', () => {
                console.log('Fallback send response:', data);
              });
            });
            
            req.on('error', (e) => {
              console.error('Fallback send error:', e);
            });
            
            req.end();
            
            // Return a response even if the fallback is still processing
            return NextResponse.json({
              success: true,
              message: "Campaign send initiated (fallback method)",
              campaignId,
              fallback: true
            });
          }
        }
        
        return NextResponse.json({ 
          success: true, 
          message: "Campaign sent successfully",
          campaignId,
          campaignStatus: campaignStatus.status
        });
      } catch (sendError) {
        console.error(`Error sending campaign ${campaignId}:`, sendError);
        console.error("Full send error details:", {
          message: sendError.message,
          status: sendError.status,
          response: sendError.response?.body || sendError.response,
          stack: sendError.stack
        });
        
        // Check if this is a common error
        let errorMessage = "Campaign was created but could not be sent";
        let errorDetails = sendError.message;
        let errorCode = sendError.status;
        
        // Handle specific error cases
        if (sendError.status === 400) {
          // Check for common 400 errors
          const detailMessage = sendError.response?.body?.detail || '';
          
          if (detailMessage.includes("compliance")) {
            errorMessage = "Campaign failed compliance check";
          } else if (detailMessage.includes("recipient")) {
            errorMessage = "Campaign has no recipients";
          } else if (detailMessage.includes("content")) {
            errorMessage = "Campaign content is invalid";
          } else if (detailMessage.includes("address")) {
            errorMessage = "Missing physical address in campaign";
          } else if (detailMessage.includes("unsubscribe")) {
            errorMessage = "Missing unsubscribe link in campaign";
          }
          
          // Get more detailed error information
          errorDetails = detailMessage || sendError.message;
        }
        
        // Provide a solution based on the error
        let solution = "";
        if (errorDetails.includes("recipient") || errorDetails.includes("audience") || errorDetails.includes("list")) {
          solution = "Make sure your audience has at least one subscriber. Go to your Mailchimp dashboard and add at least one subscriber to your audience.";
        } else if (errorDetails.includes("compliance") || errorDetails.includes("address")) {
          solution = "Your campaign needs to include a physical mailing address to comply with anti-spam laws. Add a footer with your business address.";
        } else if (errorDetails.includes("unsubscribe")) {
          solution = "Your campaign must include an unsubscribe link. Add a standard footer with an unsubscribe option.";
        } else if (errorDetails.includes("test")) {
          solution = "Try sending a test email first to verify the campaign works correctly.";
        } else {
          solution = "Check your Mailchimp dashboard for more details about this campaign. You may need to edit it manually.";
        }
        
        // Try to get the campaign to see its current status
        try {
          const campaignDetails = await mailchimp.campaigns.get(campaignId);
          console.log("Campaign current status:", campaignDetails.status);
          
          return NextResponse.json(
            { 
              success: false, 
              error: errorMessage,
              details: errorDetails,
              solution: solution,
              campaignId: campaignId,
              campaignStatus: campaignDetails.status,
              errorCode: errorCode
            },
            { status: 500 }
          );
        } catch (getError) {
          // If we can't get the campaign details, just return what we have
          return NextResponse.json(
            { 
              success: false, 
              error: errorMessage,
              details: errorDetails,
              solution: solution,
              campaignId: campaignId,
              errorCode: errorCode
            },
            { status: 500 }
          );
        }
      }
    } catch (error) {
      // This catches errors in the outer try block
      console.error("Outer error block:", error);
      // Rest of your error handling...
    }
  } catch (error) {
    console.error("Unhandled error in API route:", error);
    
    // Always return a valid JSON response
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unexpected error occurred",
        details: "The server encountered an error processing your request"
      },
      { status: 500 }
    );
  }
} 