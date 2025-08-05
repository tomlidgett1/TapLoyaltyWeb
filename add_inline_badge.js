const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the specific pattern for the Created column and replace it
const pattern = /<div className="text-sm text-gray-600">\s*\{formatCreatedDate\(reward\.createdAt\)\}\s*<\/div>/g;

const replacement = `<div className="flex items-center gap-2 text-sm text-gray-600">
                            {formatCreatedDate(reward.createdAt)}
                            {(reward as any).isRecentlyUpdated && (reward as any).lastEditedAt && (() => {
                              const editedDate = new Date((reward as any).lastEditedAt);
                              const now = new Date();
                              const hoursDiff = (now.getTime() - editedDate.getTime()) / (1000 * 60 * 60);
                              return hoursDiff <= 24;
                            })() && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                Updated
                              </span>
                            )}
                          </div>`;

// Replace all occurrences
content = content.replace(pattern, replacement);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Added inline Updated badge successfully!');
