const https = require('https');

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=7%20Bonair%20Crescent&components=country:nz&key=${API_KEY}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log(JSON.parse(data).predictions.map(p => p.description));
  });
});
