import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const data = await request.json();
    
    // Log the request
    console.log("Simple send request received:", data);
    
    // Return a success response
    return NextResponse.json({
      success: true,
      message: "Simple send API working",
      receivedData: {
        campaignName: data.campaignName,
        subject: data.subject,
        fromEmail: data.fromEmail
      }
    });
  } catch (error) {
    console.error("Error in simple-send API:", error);
    
    // Always return a response
    return NextResponse.json({
      success: false,
      error: error.message || "Unknown error"
    }, { status: 500 });
  }
} 