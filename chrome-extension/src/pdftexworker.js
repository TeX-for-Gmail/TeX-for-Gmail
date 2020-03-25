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
    "/formats": {
      fs: "AsyncMirror",
      options: {
        sync: {
          fs: "InMemory"
        },
        async: {
          fs: "IndexedDB",
          options: {
            storeName: "formats"
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


function pdflatexMod(opts) {
  return new Promise((resolve, reject) => {
    pdflatex(opts).then2(m => resolve(m));
  });
}

// fileName is without extension
function compileHelper(srcCode, fileName, outputFile, params) {
  copyBuffer(buffer, pdflatexModule.myWasmMem.buffer);
  pdflatexModule.FS.writeFile(`${fileName}.tex`, srcCode);
  pdflatexModule.callMain(['-interaction=nonstopmode'].concat(params));
  let pdfFile = pdflatexModule.FS.readFile(`${outputFile}`);
  return pdfFile;
}

function compile({ srcCode, params }) {
  let fileName = "source";
  try {
    let pdfFile = compileHelper(srcCode, fileName, `${fileName}.pdf`, params.concat([`${fileName}.tex`]));

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

function compileSnippet({ snippet, formatName }) {
  if (bfsWindow.fs.existsSync(`/formats/${formatName}.fmt`)) {
    let srcCode = `%&/app/bfs/formats/${formatName}\n\\begin{document}${snippet}\\end{document}`;
    return compile({ srcCode: srcCode, params: [] });
  } else
    return {
      code: Communicator.FAILURE,
      payload: { err: `Format ${formatName} does not exist.`, location: `pdftexworker.js, compileSnippet` }
    };
}

function makeFormat({ preamble, formatName }) {
  try {
    let formatFile = compileHelper(preamble, formatName, `${formatName}.fmt`,
      ['-ini', `-jobname="${formatName}"`, String.raw`&pdflatex ${formatName}.tex\dump`]);

    pdflatexModule.FS.writeFile(`/app/bfs/formats/${formatName}.fmt`, formatFile);

    return {
      code: Communicator.SUCCESS,
      payload: { msg: `Custom format sucessfully created at /app/texlive/${formatName}.fmt.` }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, makeFormat` }
    };
  }
}

function clearCache({ removeFormats }) {
  try {
    remove(bfsWindow.fs.getRootFS().mntMap['/texlive']._fast, '/');

    if (removeFormats) {
      let rmCache = removeAllFormats();
      if (rmCache.code === Communicator.FAILURE)
        throw rmCache.payload;
    }

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

function removeFormat({ formatName }) {
  try {
    bfsWindow.fs.unlinkSync(`/formats/${formatName}.fmt`);
    return {
      code: Communicator.SUCCESS,
      payload: { msg: `Format ${formatName} deleted.` }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, removeFormat` }
    };
  }
}

function removeAllFormats() {
  try {
    bfsWindow.fs.readdirSync('/formats').forEach(fileName => bfsWindow.fs.unlinkSync(`/formats/${fileName}`));
    return {
      code: Communicator.SUCCESS,
      payload: { msg: `All formats removed.` }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, removeAllFormats.` }
    };
  }
}

function listFormats() {
  try {
    let formats =
      bfsWindow.fs.readdirSync('/formats')
        .filter(fileName => fileName.endsWith('.fmt'))
        .map(fileName => fileName.split('.')[0]);

    return {
      code: Communicator.SUCCESS,
      payload: { formats: formats }
    };
  } catch (ex) {
    return {
      code: Communicator.FAILURE,
      payload: { err: ex.toString(), location: `pdftexworker.js, listFormats.` }
    };
  }
}

comm.messageHandler.compile = compile;
comm.messageHandler.makeFormat = makeFormat;
comm.messageHandler.compileSnippet = compileSnippet;
comm.messageHandler.clearCache = clearCache;
comm.messageHandler.removeFormat = removeFormat;
comm.messageHandler.removeAllFormats = removeAllFormats;
comm.messageHandler.listFormats = listFormats;

// makeFormat({preamble: String.raw`\documentclass[preview, 12pt]{standalone}\usepackage{amsmath, amsfonts, amssymb, mathrsfs, tikz-cd}\usepackage[T1]{fontenc}\usepackage{stix2}`})
