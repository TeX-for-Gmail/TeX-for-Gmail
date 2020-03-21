"use strict";

// Wrap port (contentscript <-> background script communication)
// to be used with Communicator
class PortWrapper {
    port;

    constructor(port) {
        this.port = port;
    }

    addEventListener(eventType, listener, options) {
        if (eventType === "message")
            this.port.onMessage.addListener(listener);
        else if (eventType === "disconnect")
            this.port.onDisconnect.addListener(listener);
    }

    removeEventListener(eventType, listener, options) {
        if (eventType === "message")
            this.port.onMessage.removeListener(listener);
        else if (eventType === "disconnect")
            this.port.onDisconnect.removeListener(listener);
    }

    // Events sent via a port is not nested in the `data` field
    postMessage(data, transferList) {
        this.port.postMessage({data: data});
    }
}