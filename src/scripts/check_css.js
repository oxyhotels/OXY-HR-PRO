const http = require('http');

http.get('http://localhost:5000/login', (res) => {
  let html = '';
  res.on('data', (chunk) => { html += chunk; });
  res.on('end', () => {
    console.log('--- STYLESHEETS ---');
    const matches = html.match(/href="([^"]+\.css[^"]*)"/g);
    if (!matches) {
      console.log('No CSS links found in HTML.');
      process.exit(0);
    }
    console.log(matches);
    
    // Fetch the first CSS stylesheet link
    const cssUrl = matches[0].match(/href="([^"]+)"/)[1];
    console.log(`Fetching CSS from: ${cssUrl}`);
    
    const fullUrl = cssUrl.startsWith('http') ? cssUrl : `http://localhost:5000${cssUrl}`;
    http.get(fullUrl, (cssRes) => {
      let css = '';
      cssRes.on('data', (chunk) => { css += chunk; });
      cssRes.on('end', () => {
        console.log(`CSS Length: ${css.length}`);
        const index = css.indexOf('input-with-icon-left');
        if (index !== -1) {
          console.log('FOUND: input-with-icon-left matches in CSS!');
          console.log(css.substring(index - 100, index + 300));
        } else {
          console.log('NOT FOUND: input-with-icon-left is missing in server-served CSS!');
        }
      });
    });
  });
});
