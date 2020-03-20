importScripts("../resources/scripts/pdf.min.js");
importScripts("../resources/scripts/pdf.worker.min.js");
importScripts("communicator.js");

pdfjsLib.GlobalWorkerOptions.workerSrc = "pdf.worker.min.js";

let thisWorker = self;
let comm = new Communicator(thisWorker);

// pdfFile is an Uint8Array
async function pdf2png({ pdfFile, scale, pageNo }) {
  try {
    pageNo = pageNo ? pageNo : 1;
    let pdfDoc = await pdfjsLib.getDocument(pdfFile).promise;

    try {
      let page = await pdfDoc.getPage(pageNo);
      let viewport = page.getViewport({ scale: scale });
      let offscreen = new OffscreenCanvas(viewport.width, viewport.height);
      let context = offscreen.getContext('2d');
      await page.render({ canvasContext: context, viewport: viewport }).promise;
      let blob = await offscreen.convertToBlob();
      let arrBuff = await blob.arrayBuffer();
      console.log(blob);
      return {
        code: Communicator.SUCCESS,
        payload: { pngFile: arrBuff },
        transferList: [arrBuff]
      }
    } finally {
      pdfDoc.destroy();
    }
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex }
    };
  }
}

comm.messageHandler.pdf2png = pdf2png;