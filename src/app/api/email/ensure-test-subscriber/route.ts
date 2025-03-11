import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX
    });
    
    // Check if audience ID is configured
    if (!process.env.MAILCHIMP_AUDIENCE_ID) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Mailchimp audience ID is not configured"
        },
        { status: 500 }
      );
    }
    
    // Get audience details to check if it exists
    try {
      await mailchimp.lists.getList(process.env.MAILCHIMP_AUDIENCE_ID);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Audience not found. Please check your MAILCHIMP_AUDIENCE_ID."
        },
        { status: 404 }
      );
    }
    
    // Add a test subscriber
    const testEmail = "tom@lidgett.net";
    
    try {
      // Hash the email for the subscriber ID (Mailchimp requirement)
      const crypto = require('crypto');
      const subscriberHash = crypto
        .createHash('md5')
        .update(testEmail.toLowerCase())
        .digest('hex');
      
      // Add or update the subscriber
      const response = await mailchimp.lists.setListMember(
        process.env.MAILCHIMP_AUDIENCE_ID,
        subscriberHash,
        {
          email_address: testEmail,
          status_if_new: "subscribed",
          merge_fields: {
            FNAME: "Tom",
            LNAME: "Lidgett"
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        message: "Test subscriber added or updated successfully",
        subscriber: {
          email: response.email_address,
          status: response.status
        }
      });
    } catch (error) {
      console.error("Error adding test subscriber:", error);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to add test subscriber",
          details: error.response?.body?.detail || error.message
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "An unexpected error occurred"
      },
      { status: 500 }
    );
  }
} 