import { NextResponse } from 'next/server';
import axios from 'axios';

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
    
    // Make a direct API call to Mailchimp
    try {
      const response = await axios({
        method: 'post',
        url: `https://${process.env.MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`,
        auth: {
          username: 'anystring',
          password: process.env.MAILCHIMP_API_KEY
        }
      });
      
      console.log("Direct send response:", response.status);
      
      return NextResponse.json({
        success: true,
        message: "Campaign send request successful",
        status: response.status
      });
    } catch (error) {
      console.error("Direct send error:", error.response?.data || error.message);
      
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to send campaign directly",
          details: error.response?.data?.detail || error.message
        },
        { status: 500 }
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