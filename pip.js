// SPDX-License-Identifier: 0BSD
import { connect } from "cloudflare:sockets";

const r400 = new Response(null, { status: 400 });
const r500 = new Response(null, { status: 500 });
const enc = new TextEncoder();

// echo tcp server
// echo "hello" | nc midway.fly.dev 5001
const addr = { hostname: "midway.fly.dev", port: 5001 };
const opts = { secureTransport: "off", allowHalfOpen: true };
const hdr = {
  "Content-Type": "application/octet-stream",
  "Cache-Control": "no-cache",
};

export default {
  async fetch(req, env, ctx) {
    const u = new URL(req.url);
    if (u.pathname.startsWith("/chunk")) {
      return chunk(req); // bad
    } else if (u.pathname.startsWith("/fixed")) {
      return fixed(req); // ok
    } else if (u.pathname.startsWith("/empty1")) {
      return pipeWithoutPreventClose(req); // bad
    } else if (u.pathname.startsWith("/empty2")) {
      return pipePreventClose(req); // bad
    }
    console.log("/chunk (bad), /fixed (ok), /empty1 (bad), /empty2 (bad)");
    return r400;
  },
};

// read ingress chunk by chunk and write it to socket, then cancel ingress
// and close socket writable.
// socket readable doesn't capture response, always empty.
export async function chunk(req) {
  const ingress = req.body;

  if (ingress == null) return r400;

  try {
    console.debug("chunk: connect", addr);
    const egress = connect(addr, opts);
    const rdr = ingress.getReader();
    const wtr = egress.writable.getWriter();

    let ok = true;
    while (ok) {
      const q = await rdr.read();
      console.debug("chunk: read done?", q.done, "v", q.value);
      ok = !q.done;
      if (ok) {
        await wtr.ready;
        await wtr.write(q.value);
        console.debug("chunk: write done");
      }
    }
    rdr.releaseLock();
    wtr.releaseLock();
    await ingress.cancel();
    await wtr.ready;
    await egress.writable.close();

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("chunk: err", ex);
    return r500;
  }
}

// hardcode payload to socket
// works fine
export async function fixed(req) {
  try {
    console.log("fixed: connect", addr);
    const socket = connect(addr, opts);

    const writer = socket.writable.getWriter();
    const u8 = enc.encode("GET IPADDR\r\n");
    await writer.write(u8);
    console.log("fixed: write done");

    return new Response(socket.readable, { headers: hdr });
  } catch (ex) {
    console.error("fixed: err", ex);
    return r500;
  }
}

// pipe request to socket, without preventClose=true
// socket.readable is always empty
export async function pipeWithoutPreventClose(req) {
  const ingress = req.body;

  if (ingress == null) return r400;

  try {
    console.debug("pipeWithoutPreventClose: connect", addr);
    const egress = connect(addr, opts);
    ingress.pipeTo(egress.writable);

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("pipeWithoutPreventClose: err", ex);
    return r500;
  }
}

// pipe request to socket with preventClose=true
// infinitely hangs
export async function pipePreventClose(req) {
  const ingress = req.body;

  if (ingress == null) return r400;

  try {
    console.debug("pipePreventClose: connect", addr);
    const egress = connect(addr, opts);
    ingress.pipeTo(egress.writable, { preventClose: true });

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("pipePreventClose: err", ex);
    return r500;
  }
}
