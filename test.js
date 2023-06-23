#!/usr/bin/env -S deno run --allow-all
// SPDX-License-Identifier: 0BSD
const verbose = false;
const cfbase = "https://tcpworkers.nile.workers.dev/";
const ddbase = "https://duplex.deno.dev/";
const enc = new TextEncoder();
const dec = new TextDecoder();

test(cfbase, "chunk"); // bad
test(cfbase, "empty1"); // bad
test(cfbase, "fixed"); // ok
test(cfbase, "empty2"); // bad

test(ddbase, "chunk"); // ok
test(ddbase, "empty1"); // ok
test(ddbase, "fixed"); // ok
test(ddbase, "empty2"); // ok

// also: echo "POSTBODY" | nc midway.fly.dev 5001
async function test(url, path) {
  const u = url + path;
  // deno supports full duplex req / res with fetch
  const b = enc.encode("POSTBODY\r\n");
  const r = new Request(u, { method: "POST", body: b });
  console.log(u, "send");
  const w = await fetch(r);

  if (verbose) console.debug(u, "res", w);

  let con = "";
  for await (const x of w.body) {
    con += dec.decode(x);
  }
  console.log("---  ---  ---  ---");
  console.log(u, "recv", con, "len", con.length);
}
