/*
 this is the basic implementation of a http/0.9 server
 referred document for HTTP/1.0: https://datatracker.ietf.org/doc/html/rfc1945

REQUEST FORMAT FOR HTTP/1.0:
    GET <path> <http-ver> ---> request line
    <request-headers> ---> headers
                        ---> end of headers
    <body>            ---> request body (optional)
*/

const net = require("net");
const path = require("path");
const fs = require("fs");

const SERVER_CONFIG = {
    port: 3000
}

// setting up a new TCP server
const tcpServer = net.createServer(handleConnection);
tcpServer.listen(SERVER_CONFIG.port, () => {
    console.log("Server Listening At Port:", tcpServer.address());
});

// a function to parse the HTTP request
function readRequestLine(requestLine){
    const acceptedMethods = ["GET", "POST", "HEAD"]
    const [method, path, httpVer] = requestLine.split(" ");

    if (!acceptedMethods.includes(method) || !method){
        throw new Error("Invalid Method");
    }
    if (!path){
        throw new Error("Invalid Path");
    }

    if (!httpVer || httpVer !== "HTTP/1.0"){
        throw new Error("Invalid HTTP Version");
    }

    return [method, path, httpVer];
}

// a function to parse the HTTP request headers
function readRequestHeaders(requestHeaders){
    const acceptedHeaders = ["Content-Type", "User-Agent", "Host"];
    const headerObj = {};

    for (const header of requestHeaders){
        const [key, val] = header.split(": ");
        console.log(header.split(": "), header)
        if (key === "" && !val) break;
        if (!key || !acceptedHeaders.includes(key)) throw new Error("Invalid Request Header");
        headerObj[key] = val;
    }

    return headerObj;
}

function handleConnection(socket){
    console.log('Client connected...');
    socket.on('data', (data) => {
        const request = data.toString();
        const requestArr = request.split("\r\n");

        const [method, path, httpVer] = readRequestLine(requestArr[0]);
        const headersObj = readRequestHeaders(requestArr.slice(1));
        console.log(method, path, httpVer);
        console.log(headersObj); 

    })

    socket.on('end', () => {
        console.log('Client disconnected...');
    }); 

    socket.on('error', (err) => {
        console.log("Error: ", err.address(), err.message);
    })
}

