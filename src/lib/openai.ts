import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

export async function getAIResponse(message: string) {
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: `You are TapAI, a helpful assistant for a loyalty program platform called Tap Loyalty. 
          You help merchants:
          1. Create and optimize loyalty programs
          2. Design engaging rewards
          3. Set up points rules
          4. Create marketing campaigns
          5. Engage customers effectively

          When suggesting rewards, ALWAYS format them as a JSON array like this:
          \`\`\`json
          [
            {
              "name": "Reward Name",
              "description": "Reward description",
              "points_required": 100,
              "expiry_days": 30,
              "terms": ["Term 1", "Term 2"]
            }
          ]
          \`\`\`

          Keep responses concise and practical. Always include the JSON data when suggesting rewards.`
        },
        {
          role: "user",
          content: message
        }
      ],
      temperature: 0.7,
      max_tokens: 1000,
      stream: false
    })

    return completion.choices[0].message.content
  } catch (error: any) {
    console.error('OpenAI API error:', error.message)
    if (error.code === 'insufficient_quota') {
      throw new Error('API quota exceeded. Please try again later.')
    }
    throw new Error('Failed to get AI response. Please try again.')
  }
} 