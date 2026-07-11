const fs = require('fs');
const path = require('path');

const rootDirs = [
  'C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/src',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/public',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/package.json',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/super_admin_web/README.md',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/clinic-dashboard/app',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/clinic-dashboard/utils',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/clinic-dashboard/package.json',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/clinic-dashboard/README.md',
  'C:/Users/HOME/OneDrive/Attachments/ai agent/README.md'
];

const replacements = [
  { search: /Queue Care/g, replace: 'BruvoFlow' },
  { search: /QueueCare/g, replace: 'BruvoFlow' },
  { search: /queue-care/g, replace: 'bruvoflow' },
  { search: /queue_care/g, replace: 'bruvoflow' },
];

function processPath(targetPath) {
  if (!fs.existsSync(targetPath)) return;
  
  const stats = fs.statSync(targetPath);
  if (stats.isDirectory()) {
    const files = fs.readdirSync(targetPath);
    for (const file of files) {
      // skip node_modules and .next
      if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'dist') continue;
      processPath(path.join(targetPath, file));
    }
  } else if (stats.isFile()) {
    // Only process text files
    const ext = path.extname(targetPath).toLowerCase();
    const allowedExts = ['.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.md', ''];
    if (allowedExts.includes(ext) || ext === '') {
      try {
        let content = fs.readFileSync(targetPath, 'utf8');
        let modified = false;
        
        for (const rule of replacements) {
          if (content.match(rule.search)) {
            content = content.replace(rule.search, rule.replace);
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(targetPath, content, 'utf8');
          console.log(`Updated: ${targetPath}`);
        }
      } catch (e) {
        console.error(`Error processing ${targetPath}:`, e.message);
      }
    }
  }
}

for (const dir of rootDirs) {
  processPath(dir);
}
console.log('Renaming complete.');
