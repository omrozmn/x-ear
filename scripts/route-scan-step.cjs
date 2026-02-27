console.log('step script start');
const fs = require('fs');
const path = require('path');
console.log('fs,path required');
const apps = [
  { name: 'web', baseUrl: 'http://localhost:8080', routes: ['/login','/dashboard'] },
  { name: 'admin', baseUrl: 'http://localhost:8082', routes: ['/login','/dashboard'] }
];
console.log('apps defined', apps.length);
for (const app of apps) {
  console.log('scanning', app.name);
}
console.log('done');
