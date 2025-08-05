const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the current implementation and replace with stacked version
const oldImplementation = `<div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                            {formatCreatedDate(reward.createdAt)}
                            {(reward as any).isRecentlyUpdated && (reward as any).lastEditedAt && (() => {
                              const editedDate = new Date((reward as any).lastEditedAt);
                              const now = new Date();
                              const hoursDiff = (now.getTime() - editedDate.getTime()) / (1000 * 60 * 60);
                              return hoursDiff <= 24;
                            })() && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                Updated
                              </span>
                            )}
                          </div>`;

const newImplementation = `<div className="flex flex-col items-center gap-1">
                            <div className="text-sm text-gray-600">
                              {formatCreatedDate(reward.createdAt)}
                            </div>
                            {(reward as any).isRecentlyUpdated && (reward as any).lastEditedAt && (() => {
                              const editedDate = new Date((reward as any).lastEditedAt);
                              const now = new Date();
                              const hoursDiff = (now.getTime() - editedDate.getTime()) / (1000 * 60 * 60);
                              return hoursDiff <= 24;
                            })() && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
                                <div className="h-1 w-1 bg-blue-500 rounded-full flex-shrink-0"></div>
                                Updated
                              </span>
                            )}
                          </div>`;

// Replace the implementation
content = content.replace(oldImplementation, newImplementation);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Moved Updated badge below timestamp!');
