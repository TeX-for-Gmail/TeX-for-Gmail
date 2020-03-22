"use strict";

console.log("Welcome to LaTeX for Gmail!");

var ports = {};

let pdftexWorkerPool = new Pool({
  count: 3  ,
  cons: () => new Communicator(new Worker('pdftexworker.js', { 'name': 'pdftexworker' })),
  autoRelease: true,
  initialize: () => { },
  multiplier: 2
});

let mupdfWorkerPool = new Pool({
  count: 2,
  cons: () => new Communicator(new Worker('mupdfworker.js', { 'name': 'mupdfworker' })),
  autoRelease: true,
  initialize: () => { },
  multiplier: 4
});

async function compile(srcCode) {
  let res = await pdftexWorkerPool.process(comm => comm.request("compile", { srcCode: srcCode }));
  return res.pdfFile;
}

// pdfFile is an Uint8Array
async function pdf2png(pdfFile, scale, pageNo) {
  let res = await mupdfWorkerPool.process(comm => comm.request("pdf2png", { pdfFile: pdfFile, scale: scale, pageNo: pageNo }, [pdfFile.buffer]));
  return res.pngFile;
}

async function compile2png(srcCode, scale) {
  let pdfFile = await compile(srcCode);
  let pngFile = await pdf2png(pdfFile, scale, 1);
  return new Uint8Array(pngFile);
}

async function toUrlFactory(f, tpe) {
  let file = await f();
  let blob = new Blob([file], { type: tpe });
  let url = URL.createObjectURL(blob);
  return {
    code: Communicator.SUCCESS,
    payload: { url: url }
  };
}

async function compile2pngURL({ srcCode, scale }) {
  return toUrlFactory(() => compile2png(srcCode, scale), 'image/png');
}

async function compile2pdfURL({ srcCode }) {
  return toUrlFactory(() => compile(srcCode), 'application/pdf');
}

function revokeUrl({ url }) {
  URL.revokeObjectURL(url);
}

chrome.runtime.onConnect.addListener(function (port) {
  let comm = new Communicator(new PortWrapper(port));
  ports[port.name] = comm;

  comm.messageHandler.compile2pngURL = compile2pngURL;
  comm.messageHandler.compile2pdfURL = compile2pdfURL;
  comm.messageHandler.revokeUrl = revokeUrl;

  port.onDisconnect.addListener(function () {
    delete ports[port.name];
  });
});
