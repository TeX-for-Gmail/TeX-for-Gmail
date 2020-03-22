"use strict";

let port = chrome.runtime.connect({ name: `${Math.round(Math.random() * Math.pow(2, 64))}` });
let comm = new Communicator(new PortWrapper(port));

async function receiveUrl(req) {
  let res = await req();
  let f = await fetch(res.url);
  let blob = await f.blob()
  let url = URL.createObjectURL(blob)
  comm.post("revokeUrl", { url: res.url });
  return url;
}

async function compile2pngURL(srcCode, scale, params) {
  return receiveUrl(() => comm.request("compile2pngURL", { srcCode: srcCode, scale: scale, params: params }));
}

async function compile2pdfURL(srcCode, params) {
  return receiveUrl(() => comm.request("compile2pdfURL", { srcCode: srcCode, params: params }));
}

console.log(compile2pngURL("\\documentclass{article}\\begin{document}Test222\\end{document}", 2));