console.log("nice!");

let pdfWorkerPool = new Pool({
  count: 4,
  cons: () => new Communicator(new Worker('pdftexworker.js', { 'name': 'pdftexworker' })),
  autoRelease: true,
  initialize: () => { },
  multiplier: 2
});

// let myWorker = new Worker('pdftexworker.js', { 'name': 'pdftexworker' });
// let comm = new Communicator(myWorker);

// for (i = 0; i < 100; i++)
//   pdfWorkerPool.process(comm => comm.invoke("compile", { srcCode: "\\documentclass{article}\\begin{document}Test\\end{document}" }).catch(ex => console.log(ex)))