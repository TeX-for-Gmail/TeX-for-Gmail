importScripts("../resources/scripts/pdflatex.js");
importScripts("pool.js");
importScripts("communicator.js");

let thisWorker = self;
let comm = new Communicator(thisWorker);

// Memory pool to reduce pressure on GC and to avoid out of memory error
let memPool = new Pool({
  count: 2,
  cons: () => new WebAssembly.Memory({ 'initial': 2048, 'maximum': 2048 }),
  autoRelease: true,
  initialize: wasmMem => cleanMem(wasmMem),
  multiplier: 1
});

function cleanMem(wasmMemory) {
  var i32 = new Uint32Array(wasmMemory.buffer);
  i32.fill(0);
  return wasmMemory;
}

function pdflatexMod(opts) {
  return new Promise((resolve, reject) => {
    pdflatex(opts).then2(m => resolve(m));
  });
}

function compileHelper(pdflatexModule, srcCode) {
  let fileName = 'source';
  pdflatexModule.FS.writeFile(`${fileName}.tex`, srcCode);
  pdflatexModule.callMain([`${fileName}.tex`, '-interaction=nonstopmode']);
  let pdfFile = pdflatexModule.FS.readFile(`${fileName}.pdf`);
  return pdfFile;
}

function compile({ srcCode }) {
  return memPool.process(mem => pdflatexMod({ 'wasmMemory': mem }).then(m => compileHelper(m, srcCode)));
}

// See communicator.js for the structure of event
function processMessage(event) {
  let eventData = event.data;
  try {
    switch (eventData.payload.cmd) {
      case "compile": // params for compile is of the form {srcCode: "..."}
        compile(eventData.payload.params)
          .then(res => comm.reply(event, comm.SUCCESS, { "pdfFile": res }, [res.buffer]));
        break;
    }
  } catch (err) {
    comm.reply(event, comm.FAILURE, { err: err });
  }
}

addEventListener("message", event => processMessage(event));


// onmessage = function(event) {
//   console.log(event);
// }
