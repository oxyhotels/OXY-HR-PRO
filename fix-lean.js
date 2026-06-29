const { Project, SyntaxKind } = require('ts-morph');
const path = require('path');
const fs = require('fs');

const project = new Project();
const controllersDir = path.join(__dirname, 'src/controllers');
const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.ts'));

files.forEach(file => {
  project.addSourceFileAtPath(path.join(controllersDir, file));
});

let modifiedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  let fileModified = false;
  
  // Find all CallExpressions of .save()
  const saveCalls = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)
    .filter(c => c.getExpression().getText().endsWith('.save'));
    
  for (const saveCall of saveCalls) {
    const expr = saveCall.getExpression();
    if (expr.getKind() === SyntaxKind.PropertyAccessExpression) {
      const varName = expr.getExpression().getText(); // e.g., 'attendance' in 'attendance.save()'
      
      // Now find where varName is declared in the same scope or file
      const block = saveCall.getFirstAncestorByKind(SyntaxKind.Block) || sourceFile;
      const declarations = block.getDescendantsOfKind(SyntaxKind.VariableDeclaration)
        .filter(d => d.getName() === varName);
        
      for (const decl of declarations) {
        const initializer = decl.getInitializer();
        if (initializer && initializer.getText().includes('.lean()')) {
          // Remove .lean()
          const newInit = initializer.getText().replace(/\.lean\(\)/g, '');
          initializer.replaceWithText(newInit);
          fileModified = true;
          modifiedCount++;
          console.log(`Fixed ${varName} in ${sourceFile.getBaseName()}`);
        }
      }
    }
  }

  if (fileModified) {
    sourceFile.saveSync();
  }
}

console.log(`Total invalid .lean() calls removed: ${modifiedCount}`);
