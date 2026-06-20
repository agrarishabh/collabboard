const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  // Replace various transparent backdrop classes with bg-bg-secondary
  content = content.replace(/bg-black\/[0-9]+/g, 'bg-bg-secondary');
  content = content.replace(/backdrop-blur-(sm|md|lg|\[.*?\])/g, '');
  content = content.replace(/bg-bg-primary\/80/g, 'bg-bg-primary');
  fs.writeFileSync(filePath, content, 'utf8');
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walkDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      replaceInFile(fullPath);
    }
  }
}

walkDir(path.join(__dirname, 'apps/web/src/components'));
walkDir(path.join(__dirname, 'apps/web/src/app'));
console.log('Backgrounds updated to plain solid colors.');
