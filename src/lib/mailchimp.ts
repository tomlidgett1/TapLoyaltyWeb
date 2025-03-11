import mailchimp from "@mailchimp/mailchimp_marketing";

// Initialize the Mailchimp client
mailchimp.setConfig({
  apiKey: process.env.NEXT_PUBLIC_MAILCHIMP_API_KEY,
  server: process.env.NEXT_PUBLIC_MAILCHIMP_SERVER_PREFIX // This is the server prefix (e.g., "us19")
});

export default mailchimp; 