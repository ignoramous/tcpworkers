#!/usr/bin/env -S deno run --allow-all
// SPDX-License-Identifier: 0BSD
const verbose = false;
const base = "https://tcpworkers.nile.workers.dev/";
const enc = new TextEncoder();
const dec = new TextDecoder();

test(base, "chunk"); // bad
test(base, "empty1"); // bad
test(base, "fixed"); // ok
test(base, "empty2"); // bad

// also: echo "POSTBODY" | nc midway.fly.dev 5001
async function test(url, path) {
  // deno supports full duplex req / res with fetch
  const b = enc.encode("POSTBODY\r\n");
  const r = new Request(url + path, { method: "POST", body: b });
  console.log(path, "send");
  const w = await fetch(r);

  if (verbose) console.debug(path, "res", w);

  let con = "";
  for await (const x of w.body) {
    con += dec.decode(x);
  }
  console.log("---  ---  ---  ---");
  console.log(path, "recv", con, "len", con.length);
}
