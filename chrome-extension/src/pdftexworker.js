"use strict";

importScripts("../resources/scripts/pdflatex.js");
importScripts("../resources/scripts/browserfs.min.js");
importScripts("pool.js");
importScripts("communicator.js");

let thisWorker = self;
let comm = new Communicator(thisWorker);
let bfsWindow = {};
BrowserFS.install(bfsWindow);

BrowserFS.configure({
  fs: "CacheFS",
  options: {
    fast: {
      fs: "AsyncMirror",
      options: {
        sync: {
          fs: "InMemory"
        },
        async: {
          fs: "IndexedDB",
          options: {}
        }
      }
    },
    slow: {
      fs: "XmlHttpRequest",
      options: {
        baseUrl: "https://cdn.jsdelivr.net/gh/TeX-for-Gmail/TeX-Live-Files@2019.0.4/texlive",
        index: "../resources/data/index.json",
        preferXHR: false
      }
    }
  }
}, function (e) {
  if (e) throw e;
  else {
    bfsWindow.fs = BrowserFS.BFSRequire('fs');
    console.log('BFS ready!');
  }
});

// Memory pool to reduce pressure on GC and to avoid out of memory error
let memPool = new Pool({
  count: 2,
  cons: () => new WebAssembly.Memory({ 'initial': 2048, 'maximum': 4096 }),
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

// fileName is without extension
function compileHelper(pdflatexModule, srcCode, fileName, outputFile, params) {
  params = params ? params : [];
  pdflatexModule.FS.writeFile(`${fileName}.tex`, srcCode);
  pdflatexModule.callMain(['-interaction=nonstopmode'].concat(params));
  let pdfFile = pdflatexModule.FS.readFile(`${outputFile}`);
  return pdfFile;
}

async function compile({ srcCode, params }) {
  params = params ? params : [];
  let fileName = "source";
  try {
    let pdfFile = await memPool.process(mem =>
      pdflatexMod({ 'wasmMemory': mem })
        .then(m => compileHelper(m, srcCode, fileName, `${fileName}.pdf`, params.concat([`${fileName}.tex`])))
    );

    return {
      code: Communicator.SUCCESS,
      payload: { pdfFile: pdfFile }, // pdfFile is an Uint8Array
      transferList: [pdfFile.buffer]
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, compile` }
    };
  }
}

async function compileSnippet({ snippet }) {
  let srcCode = `%&/app/texlive/myPreamble\n\\begin{document}${snippet}\\end{document}`;
  return compile({ srcCode: srcCode, params: [] });
}

async function makeFormat({ preamble }) {
  let fileName = "myPreamble";

  try {
    await memPool.process(mem =>
      pdflatexMod({ 'wasmMemory': mem })
        .then(async m => {
          let formatFile = await compileHelper(m, preamble, fileName, `${fileName}.fmt`,
            ['-ini', `-jobname="${fileName}"`, String.raw`&pdflatex ${fileName}.tex\dump`]);

          m.FS.writeFile(`/app/texlive/${fileName}.fmt`, formatFile);
        }));

    return {
      code: Communicator.SUCCESS,
      payload: { msg: `Custom format sucessfully created at /app/texlive/myPreamble.fmt.` }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, makeFormat` }
    };
  }
}

comm.messageHandler.compile = compile;
comm.messageHandler.makeFormat = makeFormat;
comm.messageHandler.compileSnippet = compileSnippet;
