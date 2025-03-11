import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Initialize Mailchimp client
    const mailchimp = require('@mailchimp/mailchimp_marketing');
    mailchimp.setConfig({
      apiKey: process.env.MAILCHIMP_API_KEY,
      server: process.env.MAILCHIMP_SERVER_PREFIX
    });

    // Test the connection
    const pingResponse = await mailchimp.ping.get();
    console.log("Mailchimp ping response:", pingResponse);

    // Get account info
    const accountInfo = await mailchimp.root.getRoot();
    console.log("Account info:", accountInfo);

    // List all campaigns
    const campaigns = await mailchimp.campaigns.list();
    console.log("Existing campaigns:", campaigns);

    // List all audiences
    const audiences = await mailchimp.lists.getAllLists();
    console.log("Available audiences:", audiences);

    return NextResponse.json({
      success: true,
      ping: pingResponse,
      account: {
        name: accountInfo.account_name,
        email: accountInfo.email
      },
      campaignCount: campaigns.total_items,
      audienceCount: audiences.total_items,
      audiences: audiences.lists.map(list => ({
        id: list.id,
        name: list.name,
        memberCount: list.stats.member_count
      }))
    });
  } catch (error) {
    console.error("Mailchimp test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.response?.body?.detail || error.status || "Unknown error"
      },
      { status: 500 }
    );
  }
} 