const https = require('https');
const fs = require('fs');

https.get('https://images.unsplash.com/photo-1594911130456-f0458e0a294d?q=80&w=2000&auto=format&fit=crop', (res) => {
  if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
    https.get(res.headers.location, (res2) => {
      res2.pipe(fs.createWriteStream('public/orewa.jpg'));
    });
  } else {
    res.pipe(fs.createWriteStream('public/orewa.jpg'));
  }
});
