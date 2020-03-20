/* A request event looks like this. `data` is the part we put into postMessage.
event = {
  ...
  data: {
    id: command id, used to reply
    payload: {
      cmd: name of command
      params: the parameters needed
    }
  }
}
*/

/* A reply event looks like this. `data` is the part we put into postMessage.
event = {
  ...
  data: {
    id: command id,
    code: success or failure,
    payload: {
      ...
    }
  }
}
*/
class Communicator {
  target; // where the messages come in/out

  constructor(target) {
    this.target = target;
  }

  static get SUCCESS() {
    return 1;
  }

  static get FAILURE() {
    return 0;
  }

  makeData(cmd, params) {
    return {
      id: Math.round(Math.random() * Math.pow(2, 64)),
      payload: {
        cmd: cmd,
        params: params
      }
    };
  }

  post(cmd, params, transferList) {
    let data = this.makeData(cmd, params);
    this.target.postMessage(data, transferList);
  }

  invoke(cmd, params, transferList) {
    let data = this.makeData(cmd, params);
    let self = this;

    let promise = new Promise((resolve, reject) => {
      let listener = function (ev) {
        if (ev.data.id === data.id) {
          if (ev.data.code === this.SUCCESS)
            resolve(ev.data.payload);
          else
            reject(ev.data.payload);

          self.target.removeEventListener("message", listener, false);
        }
      };

      this.target.addEventListener("message", listener, false);
      this.target.postMessage(data, transferList);
    });

    return promise;
  }

  reply(event, code, payload, transferList) {
    let data = {
      id: event.data.id,
      code: code,
      payload: payload
    };

    this.target.postMessage(data, transferList);
  }
}