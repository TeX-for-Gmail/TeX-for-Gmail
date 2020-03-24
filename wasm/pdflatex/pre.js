var me = self;
me.wasmURL = "../resources/wasm/pdflatex.wasm";

if (typeof Module.preRun === "undefined")
  Module.preRun = [];

if (typeof Module.postRun === "undefined")
  Module.postRun = [];


// Module['print'] = function (text) {};

Module.preRun.push(function () {
  let bfs = '/app/bfs';
  let texlive = `${bfs}/texlive`;

  Module.BFS = new BrowserFS.EmscriptenFS(FS, PATH, ERRNO_CODES);

  FS.createDataFile("/", Module['thisProgram'], "dummy for kpathsea", true, true);

  // Everything happens in here
  FS.mkdir('/app');

  // Setup tex directory structure and environment variables 
  // so pdflatex knows where to find things
  FS.mkdir(`${bfs}`);
  FS.mount(Module.BFS, { root: '/' }, `${bfs}`);
  ENV.TEXMFCNF = `${texlive}/:${texlive}/texmf-dist/web2c/`;
  ENV.TEXMFROOT = `${texlive}`;
  ENV.TEXMFLOCAL = `${texlive}/texmf-local`;
  ENV.TEXMFDIST = `${texlive}/texmf-dist`;
  ENV.TEXMFSYSVAR = `${texlive}/texmf-var`;
  ENV.TEXMFSYSCONFIG = `${texlive}/texmf-config`;
  ENV.TEXMFVAR = `${texlive}/user-texmf-var`;

  // Working source files should be in here
  FS.mkdir('/app/working');
  FS.chdir('/app/working');
});

Module.postRun.push(function () {
  Module.BFS = null;
});


function getModuleP() {
  if (!me.wasmModule)
    return fetch(me.wasmURL, { credentials: 'same-origin' })
      .then(res => res.arrayBuffer())
      .then(wasmBin => WebAssembly.compile(wasmBin))
      .then(wasmMod => {
        me.wasmModule = wasmMod; // cache
        return me.wasmModule;
      });

  return new Promise((resolve, reject) => resolve(me.wasmModule));
}

Module['instantiateWasm'] = function (info, cb) {
  getModuleP()
    .then(wasmMod => WebAssembly.instantiate(wasmMod, info))
    .then(instance => cb(instance));
};

Module['thisProgram'] = '/pdflatex';

