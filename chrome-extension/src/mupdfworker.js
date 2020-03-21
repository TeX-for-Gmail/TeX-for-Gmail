"use strict";

let thisFile = "mupdfworker.js";

importScripts("../resources/scripts/libmupdf.js");
importScripts("communicator.js");

let thisWorker = self;
let comm = new Communicator(thisWorker);

// pdfFile is an Uint8Array
async function pdf2png({ pdfFile, scale, pageNo }) {
  try {
    pageNo = pageNo ? pageNo : 1;
    let fileName = `${Math.round(Math.random() * Math.pow(2, 64))}`;
    FS.writeFile(fileName, pdfFile);
    var dataUrl;
    var pdfDoc;
    try {
      pdfDoc = mupdf.openDocument(fileName);
      dataUrl = mupdf.drawPageAsPNG(pdfDoc, pageNo, Math.round(96 * scale));
    } finally {
      mupdf.freeDocument(pdfDoc);
      FS.unlink(fileName);
    }
    let f = await fetch(dataUrl);
    let buf = await f.arrayBuffer();

    return {
      code: Communicator.SUCCESS,
      payload: { pngFile: buf },
      transferList: [buf]
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex, location: `${thisFile}, pdf2png` }
    };
  }
}

comm.messageHandler.pdf2png = pdf2png;