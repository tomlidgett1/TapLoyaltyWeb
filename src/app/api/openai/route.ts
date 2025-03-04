import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// This is a server-side API route that will proxy requests to OpenAI
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    const { action, threadId, runId, content, assistantId } = body;

    // Get the OpenAI API key from Firebase
    const configDoc = await getDoc(doc(db, 'config', 'openai'));
    if (!configDoc.exists()) {
      return NextResponse.json(
        { error: 'OpenAI configuration not found' },
        { status: 500 }
      );
    }

    const apiKey = configDoc.data().apiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not found' },
        { status: 500 }
      );
    }

    // Determine which OpenAI API endpoint to call based on the action
    let url = 'https://api.openai.com/v1/';
    let method = 'POST';
    let requestBody = null;

    switch (action) {
      case 'createThread':
        url += 'threads';
        break;
      case 'addMessage':
        url += `threads/${threadId}/messages`;
        requestBody = { role: 'user', content };
        break;
      case 'runAssistant':
        url += `threads/${threadId}/runs`;
        requestBody = { assistant_id: assistantId };
        break;
      case 'getRunStatus':
        url += `threads/${threadId}/runs/${runId}`;
        method = 'GET';
        break;
      case 'getMessages':
        url += `threads/${threadId}/messages`;
        method = 'GET';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    // Make the request to OpenAI
    const openaiResponse = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'OpenAI-Beta': 'assistants=v2'
      },
      ...(requestBody && { body: JSON.stringify(requestBody) })
    });

    // Return the response from OpenAI
    const data = await openaiResponse.json();
    
    if (!openaiResponse.ok) {
      return NextResponse.json(
        { error: data.error?.message || 'Error calling OpenAI API' },
        { status: openaiResponse.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error in OpenAI API route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
} 