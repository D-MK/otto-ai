import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
};

const server = http.createServer((req, res) => {
  // Remove query string and decode URL
  let filePath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  
  // Default to index.html for root
  if (filePath === '/') {
    filePath = '/index.html';
  }

  // Security: prevent directory traversal
  if (filePath.includes('..')) {
    res.writeHead(400);
    res.end('Bad Request');
    return;
  }

  // Resolve file path
  const fullPath = path.join(__dirname, 'dist', filePath);
  
  // Check if file exists
  fs.access(fullPath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file doesn't exist and it's not an API route, serve index.html (for SPA routing)
      if (!filePath.startsWith('/api/')) {
        const indexPath = path.join(__dirname, 'dist', 'index.html');
        fs.readFile(indexPath, (err, data) => {
          if (err) {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(data);
          }
        });
      } else {
        res.writeHead(404);
        res.end('Not Found');
      }
      return;
    }

    // Read and serve file
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Internal Server Error');
        return;
      }

      const ext = path.extname(fullPath).toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';
      
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

