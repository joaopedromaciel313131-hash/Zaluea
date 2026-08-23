import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITE_DIR = path.join(__dirname, 'Site');

const MIME_TYPES = {
    '.html': 'text/html; charset=UTF-8',
    '.htm': 'text/html; charset=UTF-8',
    '.js': 'application/javascript; charset=UTF-8',
    '.mjs': 'application/javascript; charset=UTF-8',
    '.css': 'text/css; charset=UTF-8',
    '.json': 'application/json; charset=UTF-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf'
};

function requestHandler(req, res) {
    // Permissive headers for preview proxies and iframes
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    if (req.url.startsWith('/bare/')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', info: 'Zaluea Bare Engine' }));
        return;
    }

    try {
        let reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        let decodedPath = decodeURIComponent(reqUrl.pathname);

        // If root "/", serve index.html or redirect to GTA game
        let filePath = path.join(SITE_DIR, decodedPath);

        // Prevent path traversal
        if (!filePath.startsWith(SITE_DIR)) {
            res.writeHead(403, { 'Content-Type': 'text/plain' });
            res.end('Forbidden');
            return;
        }

        // If directory or path exists
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            if (stat.isDirectory()) {
                const indexPath = path.join(filePath, 'index.html');
                if (fs.existsSync(indexPath)) {
                    filePath = indexPath;
                } else {
                    res.writeHead(404, { 'Content-Type': 'text/plain' });
                    res.end('Directory Index Not Found');
                    return;
                }
            }
        } else {
            if (fs.existsSync(filePath + '.html')) {
                filePath = filePath + '.html';
            } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
                filePath = path.join(filePath, 'index.html');
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('404 Not Found');
                return;
            }
        }

        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        const stream = fs.createReadStream(filePath);
        res.writeHead(200, { 'Content-Type': contentType });
        stream.pipe(res);
    } catch (err) {
        console.error('Server error:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
    }
}

// Create servers on both port 3000 and port 8080 for universal preview compatibility
const ports = [3000, 8080];
const HOST = '0.0.0.0';

ports.forEach(port => {
    const server = http.createServer(requestHandler);
    server.listen(port, HOST, () => {
        console.log(`Zaluea Server running on http://${HOST}:${port}`);
    });
});
