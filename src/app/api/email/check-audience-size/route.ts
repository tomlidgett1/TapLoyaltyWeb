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
    
    // Get audience details
    const audience = await mailchimp.lists.getList(process.env.MAILCHIMP_AUDIENCE_ID);
    
    // Get audience stats
    const stats = audience.stats;
    
    // Check if the audience has subscribers
    const hasSubscribers = stats.member_count > 0;
    
    if (!hasSubscribers) {
      return NextResponse.json({
        success: false,
        error: "Your audience has no subscribers",
        details: "Mailchimp requires at least one subscriber in your audience to send campaigns",
        solution: "Add at least one subscriber to your audience in Mailchimp",
        audience: {
          id: audience.id,
          name: audience.name,
          memberCount: stats.member_count
        }
      });
    }
    
    return NextResponse.json({
      success: true,
      audience: {
        id: audience.id,
        name: audience.name,
        memberCount: stats.member_count,
        hasSubscribers
      }
    });
  } catch (error) {
    console.error("Error checking audience size:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to check audience size",
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 