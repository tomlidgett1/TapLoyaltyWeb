const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the current badge implementation and replace with minimal version
const oldBadge = `<span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                Updated
                              </span>`;

const newBadge = `<span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                Updated
                              </span>`;

// Replace the badge
content = content.replace(oldBadge, newBadge);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Made Updated badge minimal and removed background!');
