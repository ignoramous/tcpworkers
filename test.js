#!/usr/bin/env -S deno run --allow-all
// SPDX-License-Identifier: 0BSD
const verbose = false;
const testdd = true; // test deno deploy?
const cfbase = "https://tcpworkers.nile.workers.dev/";
const ddbase = "https://midway.deno.dev/";
const enc = new TextEncoder();
const dec = new TextDecoder();

test(cfbase, "chunk"); // ok
test(cfbase, "pipe"); // ok
test(cfbase, "fixed"); // ok
test(cfbase, "pipe2"); // ok

if (testdd) {
  test(ddbase, "chunk"); // ok
  test(ddbase, "pipe"); // ok
  test(ddbase, "fixed"); // ok
  test(ddbase, "pipe2"); // ok
}

// also: echo "POSTBODY" | nc midway.fly.dev 5001
async function test(url, path) {
  const u = url + path;
  // deno supports full duplex req / res with fetch
  const b = enc.encode(path + ":POSTBODY\r\n");
  const r = new Request(u, { method: "POST", body: b });
  console.log(u, "send");
  const w = await fetch(r);

  if (verbose) console.debug(u, "req", req, "res", w);

  let con = "";
  for await (const x of w.body) {
    con += dec.decode(x);
  }
  console.log("---  ---  ---  ---");
  console.log(u, "recv", con, "len", con.length);
}
