"use strict";

importScripts("../resources/scripts/pdflatex.js");
importScripts("../resources/scripts/browserfs.min.js");
importScripts("pool.js");
importScripts("communicator.js");

let thisWorker = self;
let comm = new Communicator(thisWorker);
let bfsWindow = {};
var pdflatexModule;
var buffer;
BrowserFS.install(bfsWindow);

BrowserFS.configure({
  fs: "MountableFileSystem",
  options: {
    "/texlive": {
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
              options: {
                storeName: "texlive"
              }
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
    },
    "/format": {
      fs: "AsyncMirror",
      options: {
        sync: {
          fs: "InMemory"
        },
        async: {
          fs: "IndexedDB",
          options: {
            storeName: "format"
          }
        }
      }
    }
  }
}, function (e) {
  if (e) throw e;
  else {
    bfsWindow.fs = BrowserFS.BFSRequire('fs');
    pdflatexMod().then(m => {
      pdflatexModule = m;
      buffer = new ArrayBuffer(pdflatexModule.myWasmMem.buffer.byteLength);
      copyBuffer(pdflatexModule.myWasmMem.buffer, buffer);
      console.log(`${thisWorker.name} is ready!`);
    });
  }
});

function copyBuffer(src, target) {
  (new Uint8Array(target)).set(new Uint8Array(src));
  return target;
}


function pdflatexMod(opts) {
  return new Promise((resolve, reject) => {
    pdflatex(opts).then2(m => resolve(m));
  });
}

// fileName is without extension
function compileHelper(pdflatexModule, srcCode, fileName, outputFile, params) {
  copyBuffer(buffer, pdflatexModule.myWasmMem.buffer);
  pdflatexModule.FS.writeFile(`${fileName}.tex`, srcCode);
  pdflatexModule.callMain(['-interaction=nonstopmode'].concat(params));
  let pdfFile = pdflatexModule.FS.readFile(`${outputFile}`);
  return pdfFile;
}

async function compile({ srcCode, params }) {
  let fileName = "source";
  try {
    let pdfFile = compileHelper(pdflatexModule, srcCode, fileName, `${fileName}.pdf`, params.concat([`${fileName}.tex`]));

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
  let srcCode = `%&/app/bfs/format/myPreamble\n\\begin{document}${snippet}\\end{document}`;
  return compile({ srcCode: srcCode, params: [] });
}

async function makeFormat({ preamble }) {
  let fileName = "myPreamble";

  try {
    await pdflatexMod()
      .then(async m => {
        let formatFile = await compileHelper(m, preamble, fileName, `${fileName}.fmt`,
          ['-ini', `-jobname="${fileName}"`, String.raw`&pdflatex ${fileName}.tex\dump`]);

        m.FS.writeFile(`/app/bfs/format/${fileName}.fmt`, formatFile);
      });

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

function clearCache({ }) {
  function remove(fs, p) {
    p = fs.realpathSync(p); // normalize

    if (fs.statSync(p, true).isFile())
      fs.unlinkSync(p);
    else {
      fs.readdirSync(p).forEach(el => remove(fs, `${p}/${el}`));
      if (p === '/') return;
      fs.rmdirSync(p);
    }
  }

  try {
    remove(bfsWindow.fs.getRootFS().mntMap['/texlive']._fast, '/');

    return {
      code: Communicator.SUCCESS,
      payload: { msg: `Cache cleared.` }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, clearCache` }
    };
  }
}

comm.messageHandler.compile = compile;
comm.messageHandler.makeFormat = makeFormat;
comm.messageHandler.compileSnippet = compileSnippet;
comm.messageHandler.clearCache = clearCache;

// makeFormat({preamble: String.raw`\documentclass[preview, 12pt]{standalone}\usepackage{amsmath, amsfonts, amssymb, mathrsfs, tikz-cd}\usepackage[T1]{fontenc}\usepackage{stix2}`})
