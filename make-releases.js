// Writes releases.json: the newest release of every app in catalogue.json, and of the Suite, in the shape of GitHub's
// releases/latest answer. releases.js, in every SCAFFApps app, reads it through the SCAFFApps website (or straight
// from raw.githubusercontent.com) instead of asking GitHub's API, which answers only 60 questions an hour for each
// internet connection.
//
// Run it after publishing any SCAFFApps release, then commit and push releases.json:
//     node make-releases.js
// It asks GitHub through the GitHub CLI (gh), signed in, so its own questions are not limited that way.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const catalogue = JSON.parse(fs.readFileSync(path.join(__dirname, 'catalogue.json'), 'utf8'));
const repos = [...catalogue.apps.map((a) => a.repo), 'Rady193/scaffapps-suite'];
const out = { generated: new Date().toISOString(), repos: {} };
for (const repo of repos) {
  const r = JSON.parse(execFileSync('gh', ['api', `repos/${repo}/releases/latest`], { encoding: 'utf8' }));
  out.repos[repo.split('/')[1]] = {
    tag_name: r.tag_name, name: r.name, body: r.body, published_at: r.published_at, html_url: r.html_url,
    assets: (r.assets || []).map((a) => ({ name: a.name, size: a.size, digest: a.digest, browser_download_url: a.browser_download_url })),
  };
  console.log(`${repo}: ${r.tag_name}, ${(r.assets || []).length} files`);
}
fs.writeFileSync(path.join(__dirname, 'releases.json'), JSON.stringify(out, null, 1) + '\n');
console.log('releases.json written: commit and push it.');
