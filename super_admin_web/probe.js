const net = require('net');

function probe(port) {
  const socket = new net.Socket();
  socket.setTimeout(2000);
  socket.on('connect', () => {
    console.log(`Port ${port} is OPEN`);
    socket.destroy();
  }).on('timeout', () => {
    console.log(`Port ${port} TIMEOUT`);
    socket.destroy();
  }).on('error', (err) => {
    console.log(`Port ${port} CLOSED: ${err.message}`);
  });
  socket.connect(port, '127.0.0.1');
}

probe(5432);
probe(54322);
probe(54321);
