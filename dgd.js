const https = require('https');

const req = https.request({
  hostname: 'lite.duckduckgo.com',
  path: '/lite/',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'User-Agent': 'Mozilla/5.0'
  }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const links = data.match(/https?:\/\/[^"']+/g);
    const images = links ? links.filter(l => l.match(/\.(jpg|jpeg|png)$/i)) : [];
    console.log(images.slice(0, 5).join('\n'));
  });
});

req.write('q=Ed+Scanlan+Arizto+profile+photo');
req.end();
