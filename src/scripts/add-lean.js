const { Project, SyntaxKind } = require("ts-morph");

const project = new Project();
project.addSourceFilesAtPaths("src/controllers/**/*.ts");

let modifiedCount = 0;

for (const sourceFile of project.getSourceFiles()) {
  let fileModified = false;
  let hasMoreToReplace = true;
  
  while (hasMoreToReplace) {
    hasMoreToReplace = false;
    const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);
    
    for (const callExpr of callExpressions) {
      const parent = callExpr.getParent();
      if (parent && parent.getKind() === SyntaxKind.AwaitExpression) {
        const text = callExpr.getText();
        
        if ((text.includes('.find(') || text.includes('.findOne(') || text.includes('.findById(')) && !text.includes('.lean()')) {
          if (
            text.includes('.save') || 
            text.includes('.update') || 
            text.includes('.delete') || 
            text.includes('.remove') || 
            text.includes('ByIdAndUpdate') ||
            text.includes('ByIdAndDelete') ||
            text.includes('findOneAnd')
          ) {
            continue;
          }

          callExpr.replaceWithText(text + ".lean()");
          fileModified = true;
          modifiedCount++;
          hasMoreToReplace = true;
          break; // break loop to avoid invalid nodes
        }
      }
    }
  }

  if (fileModified) {
    sourceFile.saveSync();
  }
}

console.log("Added .lean() to " + modifiedCount + " queries.");
