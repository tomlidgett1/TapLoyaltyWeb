import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check environment variables
    const envCheck = {
      NODE_ENV: process.env.NODE_ENV,
      SIMULATE_MAILCHIMP: process.env.SIMULATE_MAILCHIMP,
      MAILCHIMP_SERVER_PREFIX: process.env.MAILCHIMP_SERVER_PREFIX || 'not set',
      HAS_MAILCHIMP_API_KEY: !!process.env.MAILCHIMP_API_KEY,
      HAS_MAILCHIMP_AUDIENCE_ID: !!process.env.MAILCHIMP_AUDIENCE_ID,
      // Mask the API key for security but show if it exists
      MAILCHIMP_API_KEY_PREVIEW: process.env.MAILCHIMP_API_KEY 
        ? `${process.env.MAILCHIMP_API_KEY.substring(0, 4)}...${process.env.MAILCHIMP_API_KEY.substring(process.env.MAILCHIMP_API_KEY.length - 4)}`
        : 'not set'
    };
    
    console.log("Environment variables check:", envCheck);
    
    // Test if we can load the mailchimp package
    let mailchimpLoaded = false;
    try {
      const mailchimp = require('@mailchimp/mailchimp_marketing');
      mailchimpLoaded = true;
    } catch (loadError) {
      console.error("Failed to load mailchimp package:", loadError);
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      mailchimpPackageLoaded: mailchimpLoaded,
      serverTime: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug environment error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        stack: error.stack
      },
      { status: 500 }
    );
  }
} 