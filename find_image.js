const https = require('https');

https.get('https://html.duckduckgo.com/html/?q=Ed+Scanlan+Arizto', {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const urls = data.match(/https:\/\/[^"']+\.(?:jpg|jpeg|png)/gi);
    if (urls) {
      console.log(Array.from(new Set(urls)).join('\n'));
    } else {
      console.log('No images found');
    }
  });
}).on('error', err => console.error(err));
