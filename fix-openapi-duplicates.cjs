#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const openApiPath = path.join(__dirname, 'openapi.yaml');

// Read the OpenAPI file
let content = fs.readFileSync(openApiPath, 'utf8');

// Pattern to match snake_case alias properties and their preceding lines
// This will match patterns like:
//   someProperty:
//     type: string
//     description: Some description
//   some_property:
//     type: string  
//     description: Some description (snake_case alias)
const snakeCasePattern = /^(\s+)(\w+):(\s*\n(?:\1\s+.*\n)*?\1\s+description:.*\(snake_case alias\)\s*\n)/gm;

let matches = [];
let match;
while ((match = snakeCasePattern.exec(content)) !== null) {
  matches.push({
    fullMatch: match[0],
    indentation: match[1],
    propertyName: match[2],
    propertyBlock: match[3],
    index: match.index
  });
}

console.log(`Found ${matches.length} snake_case alias properties to remove`);

// Remove matches in reverse order to maintain correct indices
matches.reverse().forEach((match, i) => {
  console.log(`Removing ${match.propertyName} (${matches.length - i}/${matches.length})`);
  content = content.substring(0, match.index) + content.substring(match.index + match.fullMatch.length);
});

// Write the cleaned content back
fs.writeFileSync(openApiPath, content, 'utf8');

console.log('✅ Successfully removed all snake_case alias properties from OpenAPI spec');