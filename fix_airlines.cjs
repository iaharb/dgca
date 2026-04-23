const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'src', 'components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));
files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (content.includes('airlines')) {
    // Replace .select('*, airlines(...)') with carriers
    content = content.replace(/airlines\(/g, 'carriers(');
    content = content.replace(/airlines!/g, 'carriers!');
    content = content.replace(/airlines\?:/g, 'carriers?:');
    content = content.replace(/airlines\./g, 'carriers.');
    content = content.replace(/airlines\?/g, 'carriers?');
    // Also replace .eq('airlines. with carriers.
    content = content.replace(/'airlines\./g, '\'carriers.');
    fs.writeFileSync(filePath, content);
    console.log('Fixed', file);
  }
});
