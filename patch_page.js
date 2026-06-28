const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'app', 'dashboard', 'hierarchy', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add import
if (!content.includes('EnterpriseHierarchyView')) {
  content = content.replace("import React, { useEffect, useState } from 'react';", "import React, { useEffect, useState } from 'react';\nimport EnterpriseHierarchyView from '@/components/hierarchy/EnterpriseHierarchyView';");
}

// 2. Replace tree tab content
const startStr = "{activeTab === 'tree' && user?.role !== 'EMPLOYEE' && (";
const endStr = "{activeTab === 'invites' && user?.role !== 'EMPLOYEE' && (";

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `{activeTab === 'tree' && user?.role !== 'EMPLOYEE' && (
              <EnterpriseHierarchyView />
            )}

            {/* TAB 2: INVITES & APPROVALS */}
            `;
  
  content = content.substring(0, startIndex) + replacement + content.substring(endIndex);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully patched page.tsx');
} else {
  console.log('Could not find start or end strings.');
  console.log('startIndex:', startIndex);
  console.log('endIndex:', endIndex);
}
