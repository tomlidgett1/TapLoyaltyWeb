const fs = require('fs');

// Read the file
const filePath = 'src/app/email/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the Tap Agent Section
const tapAgentSectionRegex = /{\s*\/\*\s*Tap Agent Section.*?\*\/\s*}/;
const match = content.match(tapAgentSectionRegex);

if (match) {
  // Replace the section with the conditional version
  const originalSection = match[0];
  const newSection = `{/* Tap Agent Section - Hidden when generating response */}
          {!localIsGenerating && (`;
  
  content = content.replace(originalSection, newSection);
  
  // Find where to add the closing parenthesis
  const messageContentRegex = /{\s*\/\*\s*Message Content\s*\*\/\s*}/;
  const messageContentMatch = content.match(messageContentRegex);
  
  if (messageContentMatch) {
    const messageContentSection = messageContentMatch[0];
    const newMessageContentSection = `)}

            ${messageContentSection}`;
    
    content = content.replace(messageContentSection, newMessageContentSection);
    
    // Write the modified content back to the file
    fs.writeFileSync('src/app/email/page.tsx.fixed', content);
    console.log('File updated successfully!');
  } else {
    console.error('Could not find Message Content section');
  }
} else {
  console.error('Could not find Tap Agent Section');
}
