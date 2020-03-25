"use strict";

importScripts("../resources/scripts/libmupdf.js");
importScripts("utils.js")
importScripts("communicator.js");

let thisWorker = self;
let comm = new Communicator(thisWorker);

// pdfFile is an Uint8Array
async function pdf2png({ pdfFile, scale, pageNo, alpha }) {
  try {
    pageNo = pageNo ? pageNo : 1;
    let fileName = `${random_id(64)}`;
    FS.writeFile(fileName, pdfFile);
    var dataUrl;
    var pdfDoc;
    try {
      pdfDoc = mupdf.openDocument(fileName);
      dataUrl = mupdf.drawPageAsPNG(pdfDoc, pageNo, Math.round(72 * scale), alpha);
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
      payload: { err: ex, location: `mupdfworker.js, pdf2png` }
    };
  }
}

comm.messageHandler.pdf2png = pdf2png;