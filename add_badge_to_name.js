const fs = require('fs');

// Read the file
const filePath = 'src/app/(dashboard)/store/overview/page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Find the reward name line and add the Updated badge next to it
const oldNameLine = `<div className="truncate font-medium text-sm">{reward.rewardName}</div>`;

const newNameLine = `<div className="flex items-center gap-2">
                                  <div className="truncate font-medium text-sm">{reward.rewardName}</div>
                                  {(reward as any).isRecentlyUpdated && (reward as any).lastEditedAt && (() => {
                                    const editedDate = new Date((reward as any).lastEditedAt);
                                    const now = new Date();
                                    const hoursDiff = (now.getTime() - editedDate.getTime()) / (1000 * 60 * 60);
                                    return hoursDiff <= 24;
                                  })() && (
                                    <span className="inline-flex items-center gap-0.5 text-xs text-gray-500 flex-shrink-0">
                                      <div className="h-1 w-1 bg-blue-500 rounded-full"></div>
                                      Updated
                                    </span>
                                  )}
                                </div>`;

// Replace the reward name line
content = content.replace(oldNameLine, newNameLine);

// Write back to file
fs.writeFileSync(filePath, content);
console.log('✅ Added Updated badge next to reward name!');
