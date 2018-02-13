import { SPECIALS, Special } from 'specials';

export function loginEncode(s: string): string {
  const toHex = (x: number): string => {
    return ('0'+x.toString(16)).substr(-2).toUpperCase();
  };

  let ip: number[] = [127, 0, 0, 1];
  let h = (54 * ip[0] + 41 * ip[1] + 29 * ip[2] + 17 * ip[3]).toString();
  let dec = 128; // there is no reason to actually make this random.
  let enc: string = toHex(dec);

  for (let i = 0; i < s.length; i++) {
    dec = ((dec + s.charCodeAt(i)) % 255) ^ h.charCodeAt(i % h.length);
    enc += toHex(dec);
  }
  return enc;
}

// The proxy "protocol" has an extra round trip in it so the caller needs
// to set up its onmessage handler in its onopen handler.
function connectProxy(onopen: () => void): WebSocket {
  var sock = new WebSocket("ws://localhost:8081/");
  sock.onopen = (event) => {
    sock.send("Hi!");
  };

  var ready = false;
  var num = 0;
  sock.onmessage = (event) => {
    sock.onmessage = undefined;
    onopen();
  };
  return sock;
}

const PARTIAL_UPDATE_CHARS = '!"#$%&\'()*+,-./'
const    FULL_UPDATE_CHARS = '012345acnrsbgqo'
let special_map: {[index:string]: typeof Special} = {};
for (let spec of SPECIALS) {
  special_map[spec.identifier.toLowerCase()] = spec;
}

///////////////////////////
export function networkTest() {
  let username = 'su11y';
  let s = 'tetrisstart ' + username + ' 1.13';
  console.log(s);
  let encoded = loginEncode(s);

  let sock: WebSocket;
  let playerNum = -1;
  const process = (msg: MessageEvent) => {
    // processing
    let cmd = msg.data.split(' ');
    if (cmd[0] == 'playernum') {
      playerNum = parseInt(cmd[1]);
      // Now that we have our number, set our (dummy) team
      sock.send('team ' + playerNum + ' ');
    }
    // logging
    console.log("RECV:", msg.data);
  };
  sock = connectProxy(() => {
    sock.onmessage = process;
    sock.send(encoded);
    console.log("sending ", encoded);
  });
}
