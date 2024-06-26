This is a test repository. Prod at [serverless-proxy](https://github.com/serverless-proxy/serverless-proxy).

---

Attempt a full duplex ([ref](https://developer.chrome.com/articles/fetch-streaming-requests)) request / response with Socket Workers.

- [`pip.js`](https://github.com/ignoramous/tcpworkers/blob/main/pip.js) attempts full duplex
  req / res with 3 functions that use 3 subtly different techniques to do so:
   - `chunk`, `pipe`, and `pipe2`. All succeed.
   - The other function, `fixed` (derived from [Cloudflare's documentation](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets)) works, but it isn't piping the `Request.body` (*ReadableStream*) through to `Socket.writable`.
- [`denopip.js`](https://github.com/ignoramous/tcpworkers/blob/main/denopip.js) does the same thing as
  `pip.js` but for the Deno Deploy platform.
- [`test.js`](https://github.com/ignoramous/tcpworkers/blob/main/test.js) uses Deno to make full duplex `fetch` calls
  into Workers to help test the four functions mentioned above with help of [an echo server deployed at midway.fly.dev:5001](https://github.com/celzero/midway).

Instructions:
```bash
# after git clone
# globally install wrangler, if needed
npm i wrangler@3 -g

# setup wrangler, as needed
# developers.cloudflare.com/workers/wrangler/install-and-update/
wrangler deploy

# edit ./test.js to point to your workers.dev and deno-deploy url
# install deno deno.com/manual/getting_started/installation, then:
./test.js

# test the echo server
echo "hello" | nc midway.fly.dev 5001
```

---

This proxy is deployed to production at `https://ken.rethinkdns.com/` for anti-censorship and anti-surveillance
purposes by the [Rethink Open Source Project](https://github.com/celzero/rethink-app).
