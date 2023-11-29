let { protocol, host } = new URL(document.location.href);

let websocketProtocol = protocol.replace('http', 'ws');
let websocketUrl = `${websocketProtocol}//${host}/ws`;

let websocket = new WebSocket(websocketUrl);

websocket.onmessage = (event) => {
  let { data } = event;
  let { command } = JSON.parse(data);

  if (command === 'reload') {
    globalThis.location.reload();
  }
};
