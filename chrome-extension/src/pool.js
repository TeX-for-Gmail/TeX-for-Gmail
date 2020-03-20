class Semaphore {
  capacity;
  availableNo;
  waits;

  constructor(capacity) {
    this.capacity = capacity;
    this.availableNo = capacity;
    this.waits = [];
  }

  notifyWaits() {
    while ((this.waits.length > 0) & (this.availableNo > 0)) {
      this.availableNo--;
      let waitResolve = this.waits.pop();
      waitResolve(true);
    }
  }

  release() {
    this.availableNo++;
    this.notifyWaits();
  }

  acquire() {
    if (this.availableNo > 0) {
      this.availableNo--;
      return true;
    }
    else {
      let p = new Promise((resolve, reject) => {
        this.waits.push(resolve);
      });

      return p;
    }
  }
}

class Pool {
  resourcePool;
  semaphore;
  autoRelease;
  initialize;
  multiplier;

  constructor({ count, cons, autoRelease, initialize, multiplier }) {
    this.initialize = initialize;
    this.autoRelease = autoRelease;
    this.multiplier = multiplier ? multiplier : 1;
    this.semaphore = new Semaphore(count * multiplier);
    this.resourcePool = [];
    let resourcePool = [];

    for (let i = 0; i < count; i++)
      resourcePool.push(cons());

    for (let j = 0; j < multiplier; j++)
      for (let i = 0; i < count; i++)
        this.resourcePool.push(resourcePool[i]);
  }

  release(resource) {
    this.resourcePool.push(resource);
    this.semaphore.release();
  }

  processHelper(task) {
    let resource = this.resourcePool.pop();
    this.initialize(resource);
    return task(resource).finally(() => {
      if (this.autoRelease)
        this.release(resource);
    });
  }

  process(task) {
    let permit = this.semaphore.acquire();

    if (permit === true)
      return this.processHelper(task);
    else
      return permit.then(p => this.processHelper(task));
  }
}