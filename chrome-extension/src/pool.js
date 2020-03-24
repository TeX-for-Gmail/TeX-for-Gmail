"use strict";

class Semaphore {
  name;
  capacity;
  availableNo;
  waits;
  destroyed;

  constructor(capacity, name) {
    this.name = name;
    this.destroyed = false;
    this.capacity = capacity;
    this.availableNo = capacity;
    this.waits = [];
  }

  rejectAll() {
    while (this.waits.length > 0) {
      let waitReject = this.waits.pop()[1];
      waitReject(`Workpool ${this.name} already destroyed!`);
    }
  }

  destroy() {
    this.destroyed = true;
    this.rejectAll();
  }

  notifyWaits() {
    if (this.destroyed)
      this.rejectAll();

    while ((this.waits.length > 0) & (this.availableNo > 0)) {
      this.availableNo--;
      let waitResolve = this.waits.pop()[0];
      waitResolve(true);
    }
  }

  release() {
    this.availableNo++;
    this.notifyWaits();
  }

  acquire() {
    if (this.destroyed)
      return Promise.reject(`Workpool ${this.name} already destroyed!`);

    if (this.availableNo > 0) {
      this.availableNo--;
      return true;
    }
    else {
      let p = new Promise((resolve, reject) => {
        this.waits.push([resolve, reject]);
      });

      return p;
    }
  }
}

class Pool {
  name;
  realPool; // actual resource. resourcePool takes into account multiplier
  resourcePool;
  semaphore;
  autoRelease;
  initialize;
  multiplier;
  cons;
  free;
  destroyed;

  constructor({ name, count, cons, free, autoRelease, initialize, multiplier }) {
    this.destroyed = false;
    this.name = name;
    this.cons = cons;
    this.free = free ? free : (el) => { }; // free is optional
    this.initialize = initialize;
    this.autoRelease = autoRelease;
    this.multiplier = multiplier ? multiplier : 1;
    this.semaphore = new Semaphore(count * multiplier, name);
    this.resourcePool = [];
    this.realPool = [];

    for (let i = 0; i < count; i++)
      this.realPool.push(cons());

    for (let j = 0; j < multiplier; j++)
      for (let i = 0; i < count; i++)
        this.resourcePool.push(this.realPool[i]);
  }

  destroy() {
    this.destroyed = true;
    this.semaphore.destroy();
    this.realPool.forEach(elt => this.free(elt));
    this.realPool = [];
    this.resourcePool = [];
  }

  release(resource) {
    this.resourcePool.push(resource);
    this.semaphore.release();
  }

  processHelper(task) {
    let self = this;
    let resource = this.resourcePool.pop();
    this.initialize(resource);
    return task(resource).finally(() => {
      if (self.autoRelease)
        self.release(resource);
    });
  }

  process(task) {
    if (this.destroyed)
      return Promise.reject(`Workpool ${this.name} already destroyed!`);

    let permit = this.semaphore.acquire();

    if (permit === true)
      return this.processHelper(task);
    else
      return permit.then(p => this.processHelper(task));
  }
}