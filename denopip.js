import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const r400 = new Response(null, { status: 400 });
const r500 = new Response(null, { status: 500 });
const enc = new TextEncoder();
// echo tcp server
// echo "hello" | nc midway.fly.dev 5001
const addr = { hostname: "midway.fly.dev", port: 5001 };
const hdr = {
  "Content-Type": "application/octet-stream",
  "Cache-Control": "no-cache",
};

async function handle(req) {
  const u = new URL(req.url);

  if (u.pathname.startsWith("/chunk")) {
    return chunk(req); // ok
  } else if (u.pathname.startsWith("/fixed")) {
    return fixed(req); // ok
  } else if (u.pathname.startsWith("/empty1")) {
    return pipeWithoutPreventClose(req); // ok
  } else if (u.pathname.startsWith("/empty2")) {
    return pipe(req.body, addr); // ok
  } else if (u.pathname.startsWith("/p")) {
    const p = u.pathname.split("/");

    const ingress = req.body;

    if (p.length < 3) return pipe(ingress, addr);

    const dst = p[2];
    if (!dst) return pipe(ingress, addr);

    const dstport = p[3] || "443";
    const proto = p[4] || "tcp";
    const uaddr = { hostname: dst, port: dstport, transport: proto };

    return pipe(ingress, uaddr);
  }
  console.log("/chunk (bad), /fixed (ok), /empty1 (bad), /empty2 (bad)");
  return r400;
}

// read ingress chunk by chunk and write it to socket, then cancel ingress
// and close socket writable.
export async function chunk(req) {
  const ingress = req.body;

  if (ingress == null) return r400;

  try {
    console.debug("chunk: connect", addr);
    const egress = await Deno.connect(addr);
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
    // await ingress.cancel();
    await wtr.ready;
    wtr.releaseLock();
    // await egress.writable.close();

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("chunk: err", ex);
    return r500;
  }
}

// hardcode payload to socket
export async function fixed(req) {
  try {
    console.log("fixed: connect", addr);
    const socket = await Deno.connect(addr);

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
export async function pipeWithoutPreventClose(req) {
  const ingress = req.body;

  if (ingress == null) return r400;

  try {
    console.debug("pipeWithoutPreventClose: connect", addr);
    const egress = await Deno.connect(addr);
    ingress.pipeTo(egress.writable);

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("pipeWithoutPreventClose: err", ex);
    return r500;
  }
}

// pipe request to socket w preventClose=true
async function pipe(ingress, addr) {
  try {
    console.debug("pipe: connect", addr);
    // Deno.connect is limited on free plans
    const egress = await Deno.connect(addr);

    ingress.pipeTo(egress.writable, { preventClose: true });

    return new Response(egress.readable, { headers: hdr });
  } catch (ex) {
    console.error("pipe: err", ex);
    return r500;
  }
}

serve(handle);
