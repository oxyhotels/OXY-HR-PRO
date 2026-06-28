const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'tasks', 'my-tasks', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all instances of `task.status === 'In_Progress'` with `(task.status === 'In_Progress' || task.status === 'Paused')`
content = content.replace(/task\.status === 'In_Progress'/g, "(task.status === 'In_Progress' || task.status === 'Paused')");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched my-tasks/page.tsx');
