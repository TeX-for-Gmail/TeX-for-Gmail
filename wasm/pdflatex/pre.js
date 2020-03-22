var me = self;
me.wasmURL = "../resources/wasm/pdflatex.wasm";

if (typeof Module.preRun === "undefined")
  Module.preRun = [];

if (typeof Module.postRun === "undefined")
  Module.postRun = [];


// Module['print'] = function (text) {};

Module.preRun.push(function () {
  Module.BFS = new BrowserFS.EmscriptenFS(FS, PATH, ERRNO_CODES);

  FS.createDataFile("/", Module['thisProgram'], "dummy for kpathsea", true, true);

  // Everything happens in here
  FS.mkdir('/app');

  // Setup tex directory structure and environment variables 
  // so pdflatex knows where to find things
  FS.mkdir('/app/texlive');
  FS.mount(Module.BFS, { root: '/' }, '/app/texlive');
  ENV.TEXMFCNF = '/app/texlive/:/app/texlive/texmf-dist/web2c/';
  ENV.TEXMFROOT = '/app/texlive';
  ENV.TEXMFLOCAL = '/app/texlive/texmf-local';
  ENV.TEXMFDIST = '/app/texlive/texmf-dist';
  ENV.TEXMFSYSVAR = '/app/texlive/texmf-var';
  ENV.TEXMFSYSCONFIG = '/app/texlive/texmf-config';
  ENV.TEXMFVAR = '/app/texlive/user-texmf-var';

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

