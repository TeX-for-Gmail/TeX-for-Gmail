console.log("nice!");

let pdftexWorkerPool = new Pool({
  count: 2,
  cons: () => new Communicator(new Worker('pdftexworker.js', { 'name': 'pdftexworker' })),
  autoRelease: true,
  initialize: () => { },
  multiplier: 2
});

let pdfjsWorkerPool = new Pool({
  count: 4,
  cons: () => new Communicator(new Worker('pdfjsworker.js', { 'name': 'pdfjsworker' })),
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
  let res = await pdfjsWorkerPool.process(comm => comm.request("pdf2png", { pdfFile: pdfFile, scale: scale, pageNo: pageNo }, [pdfFile.buffer]));
  return res.pngFile;
}

async function compile2png(srcCode, scale) {
  let pdfFile = await compile(srcCode);
  let pngFile = await pdf2png(pdfFile, scale, 1);

  return new Uint8Array(pngFile);
}

async function compile2pngURL(srcCode, scale) {
  let pngFile = await compile2png(srcCode, scale);
  let blob = new Blob([pngFile], { type: 'application/pdf' });
  let url = URL.createObjectURL(blob);
  return url;
}