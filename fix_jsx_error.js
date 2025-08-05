const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Split into lines
let lines = content.split('\n');

// Find and remove the duplicate lines (around 3431-3439)
let fixedLines = [];
let skipNext = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Skip the duplicate content that starts around line 3430
  if (line.trim() === 'Updated' && i > 3420 && i < 3440) {
    // Skip this and the following lines until we find the proper closing
    skipNext = true;
    continue;
  }
  
  if (skipNext) {
    if (line.includes('</TableCell>')) {
      skipNext = false;
      fixedLines.push(line);
    }
    continue;
  }
  
  fixedLines.push(line);
}

// Write back to file
fs.writeFileSync(filePath, fixedLines.join('\n'));
console.log('✅ Fixed JSX parsing error!');
