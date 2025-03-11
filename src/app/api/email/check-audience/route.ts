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
    
    // Get a few members to confirm there are subscribers
    const members = await mailchimp.lists.getListMembersInfo(process.env.MAILCHIMP_AUDIENCE_ID, {
      count: 5
    });
    
    return NextResponse.json({
      success: true,
      audience: {
        id: audience.id,
        name: audience.name,
        memberCount: stats.member_count,
        unsubscribeCount: stats.unsubscribe_count,
        cleanedCount: stats.cleaned_count,
        campaignCount: stats.campaign_count,
        hasMembers: stats.member_count > 0
      },
      sampleMembers: members.members.map(member => ({
        email: member.email_address,
        status: member.status
      }))
    });
  } catch (error) {
    console.error("Error checking audience:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || "Failed to check audience",
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 