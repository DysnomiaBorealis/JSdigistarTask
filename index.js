const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

// Utility function to send a JSON response
const sendJSONResponse = (res, statusCode, data) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data, null, 2));
};

// Middleware to log each incoming request with detailed information
const logRequest = (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} request for ${req.url}`);
    console.log('Headers:', req.headers);
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            console.log('Body:', body);
            next();
        });
    } else {
        next();
    }
};

// Middleware to parse JSON and URL-encoded form data
const parseBody = (req, res, next) => {
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            if (req.headers['content-type'] === 'application/json') {
                try {
                    req.body = JSON.parse(body);
                } catch (e) {
                    return sendJSONResponse(res, 400, { error: 'Invalid JSON' });
                }
            } else if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
                req.body = querystring.parse(body);
            }
            next();
        });
    } else {
        next();
    }
};

// Middleware to handle static file serving
const serveStatic = (req, res, next) => {
    const parsedUrl = url.parse(req.url);
    let pathname = `./public${parsedUrl.pathname}`;

    fs.exists(pathname, (exist) => {
        if (!exist) {
            next();
            return;
        }

        if (fs.statSync(pathname).isDirectory()) {
            pathname += '/index.html';
        }

        fs.readFile(pathname, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.end(`Error: ${err.message}`);
            } else {
                const ext = path.parse(pathname).ext;
                const map = {
                    '.ico': 'image/x-icon',
                    '.html': 'text/html',
                    '.js': 'text/javascript',
                    '.json': 'application/json',
                    '.css': 'text/css',
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.wav': 'audio/wav',
                    '.mp4': 'video/mp4',
                    '.woff': 'application/font-woff',
                    '.ttf': 'application/font-ttf',
                    '.eot': 'application/vnd.ms-fontobject',
                    '.otf': 'application/font-otf',
                    '.svg': 'application/image/svg+xml'
                };
                res.setHeader('Content-type', map[ext] || 'text/plain');
                res.end(data);
            }
        });
    });
};

// Error handler for unsupported routes or methods
const handleError = (res, statusCode, message) => {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'text/html');
    res.end(`<h2>${message}</h2>`);
};

const server = http.createServer((req, res) => {
    logRequest(req, res, () => {
        parseBody(req, res, () => {
            serveStatic(req, res, () => {
                const parsedUrl = url.parse(req.url, true);
                const pathname = parsedUrl.pathname;

                if (pathname === '/' && req.method === 'GET') {
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end('<h2>Hello, Digistar!</h2>');
                } else if (pathname === '/info' && req.method === 'GET') {
                    const info = {
                        httpVersion: req.httpVersion,
                        method: req.method,
                        url: req.url,
                        headers: req.headers,
                        queryParameters: parsedUrl.query
                    };
                    sendJSONResponse(res, 200, info);
                } else if (pathname === '/about' && req.method === 'GET') {
                    const name = parsedUrl.query.name || 'Digistar';
                    res.statusCode = 200;
                    res.setHeader('Content-Type', 'text/html');
                    res.end(`<h2>Hello, Ini Halaman About ${name}!</h2>`);
                } else if (pathname === '/submit' && req.method === 'POST') {
                    sendJSONResponse(res, 200, {
                        message: 'Data submitted successfully!',
                        data: req.body
                    });
                } else if (req.method !== 'GET' && req.method !== 'POST') {
                    handleError(res, 405, 'Method Not Allowed');
                } else {
                    handleError(res, 404, 'Page Not Found');
                }
            });
        });
    });
});

server.listen(3000, () => {
    console.log('Server running at http://127.0.0.1:3000/');
});
