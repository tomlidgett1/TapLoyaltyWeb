import axios from 'axios';

// Mailchimp API configuration
const API_KEY = '47fbae78b915abaa7956de0baf066b4b-us9';
const SERVER_PREFIX = 'us9';
const BASE_URL = `https://${SERVER_PREFIX}.api.mailchimp.com/3.0`;
const LIST_ID = ''; // You'll need to add your main list ID here

// Helper for authorization header
const getHeaders = () => ({
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
});

/**
 * Add or update a customer in Mailchimp with merchant tag
 */
export const addCustomerToMailchimp = async (
  email: string, 
  firstName: string, 
  lastName: string, 
  merchantId: string
) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/lists/${LIST_ID}/members`,
      {
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: firstName,
          LNAME: lastName,
        },
        tags: [`merchant_${merchantId}`],
      },
      {
        headers: getHeaders(),
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error adding customer to Mailchimp:', error);
    throw error;
  }
};

/**
 * Fetch customers for a specific merchant
 */
export const fetchMerchantCustomers = async (merchantId: string) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/lists/${LIST_ID}/members?tag=merchant_${merchantId}`,
      {
        headers: getHeaders(),
      }
    );
    
    return response.data.members;
  } catch (error) {
    console.error('Error fetching merchant customers:', error);
    throw error;
  }
};

/**
 * Fetch available email templates
 */
export const fetchTemplates = async () => {
  try {
    const response = await axios.get(
      `${BASE_URL}/templates`,
      {
        headers: getHeaders(),
      }
    );
    
    return response.data.templates;
  } catch (error) {
    console.error('Error fetching templates:', error);
    throw error;
  }
};

/**
 * Create and send a campaign for a merchant
 */
export const sendMerchantCampaign = async (
  merchantId: string,
  templateId: string,
  subject: string,
  fromName: string,
  replyTo: string
) => {
  try {
    // Create campaign
    const campaignResponse = await axios.post(
      `${BASE_URL}/campaigns`,
      {
        type: "regular",
        recipients: {
          list_id: LIST_ID,
          segment_opts: {
            match: "any",
            conditions: [
              {
                condition_type: "StaticSegment",
                field: "tags",
                op: "contains",
                value: `merchant_${merchantId}`,
              },
            ],
          },
        },
        settings: {
          subject_line: subject,
          reply_to: replyTo,
          from_name: fromName,
          template_id: templateId,
        },
      },
      {
        headers: getHeaders(),
      }
    );
    
    const campaignId = campaignResponse.data.id;
    
    // Send campaign
    await axios.post(
      `${BASE_URL}/campaigns/${campaignId}/actions/send`,
      {},
      {
        headers: getHeaders(),
      }
    );
    
    return { success: true, campaignId };
  } catch (error) {
    console.error('Error sending merchant campaign:', error);
    throw error;
  }
};

/**
 * Get campaign reports for a merchant
 */
export const getMerchantCampaignReports = async (merchantId: string) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/campaigns?tag=merchant_${merchantId}`,
      {
        headers: getHeaders(),
      }
    );
    
    return response.data.campaigns;
  } catch (error) {
    console.error('Error fetching campaign reports:', error);
    throw error;
  }
};

/**
 * Sync customers from your database to Mailchimp
 */
export const syncCustomersToMailchimp = async (merchantId: string, customers: any[]) => {
  try {
    const operations = customers.map(customer => ({
      method: "PUT",
      path: `/lists/${LIST_ID}/members/${hashEmailAddress(customer.email)}`,
      body: JSON.stringify({
        email_address: customer.email,
        status: "subscribed",
        merge_fields: {
          FNAME: customer.firstName,
          LNAME: customer.lastName,
        },
        tags: [`merchant_${merchantId}`],
      })
    }));
    
    const response = await axios.post(
      `${BASE_URL}/batches`,
      { operations },
      {
        headers: getHeaders(),
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error syncing customers to Mailchimp:', error);
    throw error;
  }
};

// Helper function to hash email address for Mailchimp
function hashEmailAddress(email: string) {
  // In a real implementation, you'd use MD5 hash
  // For simplicity, we're just returning the email
  return email;
} 