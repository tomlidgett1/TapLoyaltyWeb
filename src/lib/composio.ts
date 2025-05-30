import { OpenAIToolSet } from 'composio-core';

// Composio configuration - using the exact values provided
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || 'smwbexfl2lqlcy3wb0cq3';
const GMAIL_INTEGRATION_ID = process.env.COMPOSIO_GMAIL_INTEGRATION_ID || '48ab3736-146c-4fdf-bd30-dda79973bd1d';
const GOOGLE_CALENDAR_INTEGRATION_ID = process.env.COMPOSIO_GOOGLE_CALENDAR_INTEGRATION_ID || 'e4c1c614-421c-4ab2-9544-20b3b1b8c5d3';
const GOOGLE_DOCS_INTEGRATION_ID = process.env.COMPOSIO_GOOGLE_DOCS_INTEGRATION_ID || 'b75caef3-ef36-4abd-893a-a350cc1d4a31';

// Define the dynamic actions type for Composio
type ComposioActions = {
  [key: string]: (params: any, options?: any) => Promise<any>;
};

/**
 * Initializes the Composio OpenAI ToolSet
 * @returns The initialized Composio ToolSet
 */
export function getComposioToolset() {
  return new OpenAIToolSet({ apiKey: COMPOSIO_API_KEY });
}

/**
 * Gets the Gmail integration from Composio
 * @returns The Gmail integration object
 */
export async function getGmailIntegration() {
  const toolset = getComposioToolset();
  return await toolset.integrations.get({
    integrationId: GMAIL_INTEGRATION_ID
  });
}

/**
 * Initiates a Gmail integration connection for a merchant
 * @param merchantId The merchant ID to connect
 * @returns The connected account object with connection status and redirect URL
 */
export async function initiateGmailConnection(merchantId: string) {
  if (!merchantId) {
    throw new Error('Merchant ID is required');
  }
  
  const toolset = getComposioToolset();
  const integration = await getGmailIntegration();
  
  return await toolset.connectedAccounts.initiate({
    integrationId: integration.id,
    entityId: merchantId,
    redirectUri: "https://app.taployalty.com.au"
  });
}

/**
 * Gets the status of a Gmail connection for a merchant
 * @param connectedAccountId The connected account ID to check
 * @returns The connected account object with current status
 */
export async function getGmailConnectionStatus(connectedAccountId: string) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  return await toolset.connectedAccounts.get({
    connectedAccountId
  });
}

/**
 * Sends an email using the Composio Gmail integration
 * @param connectedAccountId The connected account ID to use
 * @param recipientEmail The recipient's email address
 * @param subject The email subject
 * @param body The email body content
 * @param options Additional options like CC, BCC, etc.
 * @returns The result of the send operation
 */
export async function sendGmailEmail(
  connectedAccountId: string,
  recipientEmail: string,
  subject: string,
  body: string,
  options: {
    cc?: string[];
    bcc?: string[];
    isHtml?: boolean;
  } = {}
) {
  if (!connectedAccountId || !recipientEmail || !subject || !body) {
    throw new Error('Missing required parameters for sending email');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GMAIL_SEND_EMAIL({
    params: {
      recipient_email: recipientEmail,
      subject,
      body,
      cc: options.cc,
      bcc: options.bcc,
      is_html: options.isHtml
    }
  }, {
    connectedAccountId
  });
}

/**
 * Creates a draft email using the Composio Gmail integration
 * @param connectedAccountId The connected account ID to use
 * @param recipientEmail The recipient's email address
 * @param subject The email subject
 * @param body The email body content
 * @param options Additional options like CC, BCC, etc.
 * @returns The result of the draft creation
 */
export async function createGmailDraft(
  connectedAccountId: string,
  recipientEmail: string,
  subject: string,
  body: string,
  options: {
    cc?: string[];
    bcc?: string[];
    isHtml?: boolean;
  } = {}
) {
  if (!connectedAccountId || !recipientEmail || !subject || !body) {
    throw new Error('Missing required parameters for creating draft');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GMAIL_CREATE_EMAIL_DRAFT({
    params: {
      recipient_email: recipientEmail,
      subject,
      body,
      cc: options.cc,
      bcc: options.bcc,
      is_html: options.isHtml
    }
  }, {
    connectedAccountId
  });
}

/**
 * Fetches emails from Gmail using the Composio integration
 * @param connectedAccountId The connected account ID to use
 * @param options Query options like max results, labels, etc.
 * @returns The fetched emails
 */
export async function fetchGmailEmails(
  connectedAccountId: string,
  options: {
    maxResults?: number;
    labelIds?: string[];
    query?: string;
    includeSpamTrash?: boolean;
  } = {}
) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GMAIL_FETCH_EMAILS({
    params: {
      max_results: options.maxResults,
      label_ids: options.labelIds,
      query: options.query,
      include_spam_trash: options.includeSpamTrash
    }
  }, {
    connectedAccountId
  });
}

/**
 * Gets Gmail profile information
 * @param connectedAccountId The connected account ID to use
 * @returns The Gmail profile information
 */
export async function getGmailProfile(connectedAccountId: string) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GMAIL_GET_PROFILE({
    params: {}
  }, {
    connectedAccountId
  });
}

// Google Calendar Integration Functions

/**
 * Gets the Google Calendar integration from Composio
 * @returns The Google Calendar integration object
 */
export async function getGoogleCalendarIntegration() {
  const toolset = getComposioToolset();
  return await toolset.integrations.get({
    integrationId: GOOGLE_CALENDAR_INTEGRATION_ID
  });
}

/**
 * Initiates a Google Calendar integration connection for a merchant
 * @param merchantId The merchant ID to connect
 * @returns The connected account object with connection status and redirect URL
 */
export async function initiateGoogleCalendarConnection(merchantId: string) {
  if (!merchantId) {
    throw new Error('Merchant ID is required');
  }
  
  const toolset = getComposioToolset();
  const integration = await getGoogleCalendarIntegration();
  
  return await toolset.connectedAccounts.initiate({
    integrationId: integration.id,
    entityId: merchantId,
    redirectUri: "https://app.taployalty.com.au"
  });
}

/**
 * Gets the status of a Google Calendar connection for a merchant
 * @param connectedAccountId The connected account ID to check
 * @returns The connected account object with current status
 */
export async function getGoogleCalendarConnectionStatus(connectedAccountId: string) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  return await toolset.connectedAccounts.get({
    connectedAccountId
  });
}

/**
 * Creates a calendar event using the Composio Google Calendar integration
 * @param connectedAccountId The connected account ID to use
 * @param summary The event title/summary
 * @param startDateTime The start date and time (ISO string)
 * @param endDateTime The end date and time (ISO string)
 * @param options Additional options like description, attendees, etc.
 * @returns The result of the event creation
 */
export async function createGoogleCalendarEvent(
  connectedAccountId: string,
  summary: string,
  startDateTime: string,
  endDateTime: string,
  options: {
    description?: string;
    location?: string;
    attendees?: string[];
    timeZone?: string;
  } = {}
) {
  if (!connectedAccountId || !summary || !startDateTime || !endDateTime) {
    throw new Error('Missing required parameters for creating calendar event');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GOOGLECALENDAR_CREATE_EVENT({
    params: {
      summary,
      start_date_time: startDateTime,
      end_date_time: endDateTime,
      description: options.description,
      location: options.location,
      attendees: options.attendees,
      time_zone: options.timeZone
    }
  }, {
    connectedAccountId
  });
}

/**
 * Lists calendar events using the Composio Google Calendar integration
 * @param connectedAccountId The connected account ID to use
 * @param options Query options like time range, max results, etc.
 * @returns The fetched calendar events
 */
export async function listGoogleCalendarEvents(
  connectedAccountId: string,
  options: {
    timeMin?: string;
    timeMax?: string;
    maxResults?: number;
    calendarId?: string;
    singleEvents?: boolean;
    orderBy?: string;
  } = {}
) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GOOGLECALENDAR_LIST_EVENTS({
    params: {
      time_min: options.timeMin,
      time_max: options.timeMax,
      max_results: options.maxResults,
      calendar_id: options.calendarId || 'primary',
      single_events: options.singleEvents,
      order_by: options.orderBy
    }
  }, {
    connectedAccountId
  });
}

/**
 * Updates a calendar event using the Composio Google Calendar integration
 * @param connectedAccountId The connected account ID to use
 * @param eventId The ID of the event to update
 * @param updates The fields to update
 * @returns The result of the event update
 */
export async function updateGoogleCalendarEvent(
  connectedAccountId: string,
  eventId: string,
  updates: {
    summary?: string;
    description?: string;
    location?: string;
    startDateTime?: string;
    endDateTime?: string;
    attendees?: string[];
  }
) {
  if (!connectedAccountId || !eventId) {
    throw new Error('Connected account ID and event ID are required');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GOOGLECALENDAR_UPDATE_EVENT({
    params: {
      event_id: eventId,
      summary: updates.summary,
      description: updates.description,
      location: updates.location,
      start_date_time: updates.startDateTime,
      end_date_time: updates.endDateTime,
      attendees: updates.attendees
    }
  }, {
    connectedAccountId
  });
}

/**
 * Deletes a calendar event using the Composio Google Calendar integration
 * @param connectedAccountId The connected account ID to use
 * @param eventId The ID of the event to delete
 * @returns The result of the event deletion
 */
export async function deleteGoogleCalendarEvent(
  connectedAccountId: string,
  eventId: string
) {
  if (!connectedAccountId || !eventId) {
    throw new Error('Connected account ID and event ID are required');
  }
  
  const toolset = getComposioToolset();
  
  return await (toolset.actions as unknown as ComposioActions).mcp_composio_composio_GOOGLECALENDAR_DELETE_EVENT({
    params: {
      event_id: eventId
    }
  }, {
    connectedAccountId
  });
}

// Google Docs Integration Functions

/**
 * Gets the Google Docs integration from Composio
 * @returns The Google Docs integration object
 */
export async function getGoogleDocsIntegration() {
  const toolset = getComposioToolset();
  return await toolset.integrations.get({
    integrationId: GOOGLE_DOCS_INTEGRATION_ID
  });
}

/**
 * Initiates a Google Docs integration connection for a merchant
 * @param merchantId The merchant ID to connect
 * @returns The connected account object with connection status and redirect URL
 */
export async function initiateGoogleDocsConnection(merchantId: string) {
  if (!merchantId) {
    throw new Error('Merchant ID is required');
  }
  
  const toolset = getComposioToolset();
  const integration = await getGoogleDocsIntegration();
  
  return await toolset.connectedAccounts.initiate({
    integrationId: integration.id,
    entityId: merchantId,
    redirectUri: "https://app.taployalty.com.au"
  });
}

/**
 * Gets the status of a Google Docs connection for a merchant
 * @param connectedAccountId The connected account ID to check
 * @returns The connected account object with current status
 */
export async function getGoogleDocsConnectionStatus(connectedAccountId: string) {
  if (!connectedAccountId) {
    throw new Error('Connected account ID is required');
  }
  
  const toolset = getComposioToolset();
  return await toolset.connectedAccounts.get({
    connectedAccountId
  });
} 