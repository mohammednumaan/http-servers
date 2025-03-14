/*
 this is the basic implementation of a http/0.9 server
 referred document for HTTP/0.9: https://www.w3.org/Protocols/HTTP/AsImplemented.html
*/

const net = require("net");
const path = require("path");
const fs = require("fs");

const SERVER_CONFIG = {
    port: 3000
}

const tcpServer = net.createServer(handleConnection);
tcpServer.listen(SERVER_CONFIG.port, () => {
    console.log("Server Listening At Port:", tcpServer.address());
});

function handleConnection(socket){
    console.log('Client connected...');
    socket.on('data', (data) => {
        const request = data.toString();
        const [method, requestPath] = request.split("\r\n")[0].split(" ");

        if (method === 'GET'){
            const filePath = path.join(__dirname, `/pages${requestPath}`);
            fs.readFile(filePath, (err, data) => {
                if (err){
                    socket.write("<h1>File Not Found<h1>\n");
                    socket.end()
                    return;
                }
                socket.write(`${data}\n`);
                socket.end()
            })
        } 

        else {
            socket.write("<h1>Invalid Request, HTTP/0.9 only supports GET Method</h1>\n");
            socket.end();
        }
    })

    socket.on('end', () => {
        console.log('Client disconnected...');
    });

    socket.on('error', (err) => {
        console.log("Error: ", err.address(), err.message);
    })
}
