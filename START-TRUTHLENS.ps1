Set-Location $PSScriptRoot
npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }
npm run seed
if ($LASTEXITCODE -ne 0) { throw "Seed failed" }
npm start
