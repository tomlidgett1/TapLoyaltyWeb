const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/email/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Fix the specific area with indentation issues
const lines = content.split('\n');
if (lines.length >= 5394) {
  // Fix line 5392 (content line)
  if (lines[5391].includes('selectedAgentTask.finalMessage')) {
    lines[5391] = '                                          {selectedAgentTask.finalMessage || selectedAgentTask.agentResponse || selectedAgentTask.response}';
  }
  
  // Fix line 5393 (closing div)
  if (lines[5392].includes('</div>')) {
    lines[5392] = '                                        </div>';
  }
  
  content = lines.join('\n');
  fs.writeFileSync(filePath, content);
  console.log('Fixed indentation issues');
} else {
  console.log('File does not have enough lines');
}
