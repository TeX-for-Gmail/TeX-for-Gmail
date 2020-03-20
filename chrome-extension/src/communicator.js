/* A request event looks like this. `data` is the part we put into postMessage.
event = {
  ...
  data: {
    id: command id, used to reply
    code: FAILURE, SUCCESS, REQUEST, OR POST   // These are used to determine the type of message
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
    code: FAILURE, SUCCESS, REQUEST, OR POST
    payload: {
      ...
    }
  }
}
*/
class Communicator {
  target; // where the messages come in/out
  messageHandler;

  constructor(target) {
    this.target = target;
    this.messageHandler = {};
    this.target.addEventListener(
      "message",
      event => this.handleMessage(event),
      false);
  }

  static get FAILURE() {
    return '0';
  }

  static get SUCCESS() {
    return '1';
  }

  static get REQUEST() {
    return '2';
  }

  static get POST() {
    return '3';
  }

  makeData(cmd, code, params) {
    return {
      id: Math.round(Math.random() * Math.pow(2, 64)),
      code: code,
      payload: {
        cmd: cmd,
        params: params
      }
    };
  }

  post(cmd, params, transferList) {
    let data = this.makeData(cmd, Communicator.POST, params);
    this.target.postMessage(data, transferList);
  }

  request(cmd, params, transferList) {
    let data = this.makeData(cmd, Communicator.REQUEST, params);
    let self = this;

    let promise = new Promise((resolve, reject) => {
      let listener = function (ev) {
        if (ev.data.id === data.id) {
          if (ev.data.code === Communicator.SUCCESS)
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

  handleMessage(event) {
    let self = this;
    if (event.data.code === Communicator.REQUEST)
      try {
        Promise.resolve(this.messageHandler[event.data.payload.cmd](event.data.payload.params))
          .then(res => self.reply(event, res.code, res.payload, res.transferList))
          .catch(err => self.reply(event, Communicator.FAILURE, { err: err }));
      } catch (ex) {
        self.reply(event, Communicator.FAILURE, { err: ex });
      }
  }
}