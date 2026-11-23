const { IncomingMessage, ServerResponse } = require('http');

function headerObject(webHeaders) {
  const headers = {};
  webHeaders.forEach((value, key) => {
    const name = key.toLowerCase();
    if (headers[name]) {
      headers[name] = Array.isArray(headers[name])
        ? headers[name].concat(value)
        : [headers[name], value];
    } else {
      headers[name] = value;
    }
  });
  return headers;
}

function webHeadersFromNode(nodeHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(nodeHeaders)) {
    if (value == null) continue;
    if (Array.isArray(value)) value.forEach(item => headers.append(key, String(item)));
    else headers.set(key, String(value));
  }
  return headers;
}

/**
 * Run one Express request inside a Next.js route handler.
 * The existing controllers, auth, uploads, and webhooks stay on this app.
 */
function handleExpress(app, webRequest) {
  return new Promise(async (resolve, reject) => {
    let settled = false;
    const finish = (response) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(response);
    };
    const fail = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(error);
    };

    const timer = setTimeout(() => {
      fail(new Error('API handler timed out'));
    }, 55000);

    try {
      const url = new URL(webRequest.url);
      const body = webRequest.method === 'GET' || webRequest.method === 'HEAD'
        ? Buffer.alloc(0)
        : Buffer.from(await webRequest.arrayBuffer());

      const headers = headerObject(webRequest.headers);
      delete headers['transfer-encoding'];
      headers['content-length'] = String(body.length);
      if (!headers['x-forwarded-for']) headers['x-forwarded-for'] = '127.0.0.1';

      const ip = String(headers['x-forwarded-for'] || '127.0.0.1').split(',')[0].trim();
      // Node's Socket.remoteAddress is a getter. A plain socket keeps the client IP
      // available to Express and the rate limiter without touching that getter.
      const socket = {
        remoteAddress: ip,
        remotePort: 0,
        localAddress: '127.0.0.1',
        localPort: 0,
        encrypted: false,
        destroyed: false,
        destroy() { this.destroyed = true; },
        on() { return this; },
        once() { return this; },
        removeListener() { return this; },
        emit() { return false; },
      };

      const req = new IncomingMessage(socket);
      req.method = webRequest.method;
      req.url = `${url.pathname}${url.search}`;
      req.originalUrl = req.url;
      req.headers = headers;
      req.httpVersion = '1.1';
      req.httpVersionMajor = 1;
      req.httpVersionMinor = 1;

      const res = new ServerResponse(req);
      const chunks = [];
      let ended = false;

      res.writeHead = (statusCode, statusMessage, responseHeaders) => {
        if (statusCode) res.statusCode = statusCode;
        const extra = typeof statusMessage === 'object' && statusMessage !== null
          ? statusMessage
          : responseHeaders;
        if (extra && typeof extra === 'object') {
          for (const [key, value] of Object.entries(extra)) res.setHeader(key, value);
        }
        return res;
      };

      res.write = (chunk, encoding, callback) => {
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
        }
        if (typeof encoding === 'function') encoding();
        else if (typeof callback === 'function') callback();
        return true;
      };

      res.end = (chunk, encoding, callback) => {
        if (ended) return res;
        ended = true;
        if (chunk && typeof chunk !== 'function') {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, typeof encoding === 'string' ? encoding : undefined));
        }
        const status = res.statusCode || 200;
        const headers = webHeadersFromNode(res.getHeaders());
        const emptyStatus = status === 204 || status === 304;
        finish(new Response(emptyStatus ? null : Buffer.concat(chunks), {
          status,
          headers,
        }));
        if (typeof chunk === 'function') chunk();
        if (typeof encoding === 'function') encoding();
        if (typeof callback === 'function') callback();
        return res;
      };

      if (body.length) req.push(body);
      req.push(null);

      app.handle(req, res, (err) => {
        if (err) fail(err);
        else if (!ended) {
          finish(new Response(JSON.stringify({ success: false, message: 'Not found' }), {
            status: 404,
            headers: { 'content-type': 'application/json' },
          }));
        }
      });
    } catch (error) {
      fail(error);
    }
  });
}

module.exports = { handleExpress };
