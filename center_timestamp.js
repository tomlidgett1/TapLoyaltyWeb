const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the current implementation and replace with centered version
const oldImplementation = `<div className="flex items-center gap-2 text-sm text-gray-600">`;

const newImplementation = `<div className="flex items-center justify-center gap-2 text-sm text-gray-600">`;

// Replace the div class
content = content.replace(oldImplementation, newImplementation);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Centered timestamp with column title!');
