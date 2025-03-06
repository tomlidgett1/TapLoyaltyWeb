import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(request: NextRequest) {
  try {
    const { message, threadId } = await request.json();
    
    if (!message) {
      return NextResponse.json({ 
        content: "Message is required" 
      }, { status: 400 });
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    // Use the specific Assistant ID
    const assistantId = "asst_Aymz6DWL61Twlz2XubPu49ur";
    
    // Create or retrieve thread
    let thread;
    if (threadId) {
      // Use existing thread
      thread = { id: threadId };
    } else {
      // Create a new thread
      thread = await openai.beta.threads.create();
    }
    
    // Add message to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    
    // Run the assistant on the thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: assistantId
    });
    
    // Poll for completion
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Wait for the run to complete (with timeout)
    const startTime = Date.now();
    const timeout = 30000; // 30 seconds timeout
    
    while (runStatus.status === "queued" || runStatus.status === "in_progress") {
      // Check for timeout
      if (Date.now() - startTime > timeout) {
        return NextResponse.json({
          content: "The assistant is taking too long to respond. Please try again.",
          threadId: thread.id
        }, { status: 504 });
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    }
    
    if (runStatus.status === "completed") {
      // Get the latest messages
      const messages = await openai.beta.threads.messages.list(thread.id);
      
      // Find the assistant's response (the latest assistant message)
      const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
      
      if (assistantMessages.length > 0) {
        const latestMessage = assistantMessages[0];
        
        // Extract the text content
        let content = "";
        if (latestMessage.content && latestMessage.content.length > 0) {
          for (const contentPart of latestMessage.content) {
            if (contentPart.type === "text") {
              content += contentPart.text.value;
            }
          }
        }
        
        return NextResponse.json({
          content: content,
          threadId: thread.id
        });
      } else {
        return NextResponse.json({
          content: "No response from assistant",
          threadId: thread.id
        }, { status: 404 });
      }
    } else {
      return NextResponse.json({
        content: `Run failed with status: ${runStatus.status}`,
        threadId: thread.id
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error using OpenAI Assistants API:', error);
    return NextResponse.json({ 
      content: "Sorry, I encountered an error processing your request. Please try again." 
    }, { status: 500 });
  }
} 