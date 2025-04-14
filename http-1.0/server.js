/*
    this is the basic implementation of a http/1.0 server
 referred document for HTTP/1.0: https://datatracker.ietf.org/doc/html/rfc1945

    REQUEST FORMAT FOR HTTP/1.0:
        GET <path> <http-ver> ---> request line
        <request-headers> ---> headers
                          ---> end of headers
        <body>            ---> request body (for POST requests)
*/

// imports
const net = require("net");
const path = require("path");
const fs = require("fs");

// basic server config for tcp (can be extended to add more properties)
const SERVER_CONFIG = {
  port: 3000,
};

// setting up a new TCP server
const tcpServer = net.createServer(handleConnection);
tcpServer.listen(SERVER_CONFIG.port, () => {
  console.log("Server Listening At Port:", tcpServer.address());
});

// a function to parse the HTTP request
function readRequestLine(requestLine) {
  const acceptedMethods = ["GET", "POST", "HEAD"];
  const [method, path, httpVer] = requestLine.split(" ");

  if (!acceptedMethods.includes(method) || !method) {
    return sendResponse({
      statusCode: "400",
      statusPhrase: "Bad Request",
      data: "Invalid Method!",
    });
  }
  if (!path) {
    return sendResponse({
      statusCode: "400",
      statusPhrase: "Bad Request",
      data: "Invalid Path!",
    });
  }

  if (!httpVer) {
    return sendResponse({
      statusCode: "400",
      statusPhrase: "Bad Request",
      data: "Invalid HTTP Version!",
    });
  }

  return [method, path, httpVer];
}

// a function to parse the HTTP request headers
function readRequestHeaders(requestHeaders) {
  const headerObj = {};

  for (const header of requestHeaders) {
    const [key, val] = header.split(": ");

    if (key === "" && !val) break;
    headerObj[key.toLowerCase()] = val;
  }
  console.log(headerObj);
  return headerObj;
}

// a simple utility function to check the validity of the contentLength header (if exits)
function checkContentLength(contentLength) {
  if (isNaN(contentLength) || contentLength < 0) return false;
  else return true;
}

// a simple utility function to read a file and return its contents
function readFileAndSendResponse(socket, request, filename) {
  const filePath = path.join(__dirname, `/pages/${filename}.html`);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      sendResponse(socket, request, {
        statusCode: "500",
        statusPhrase: "Internal Server Error",
        err,
      });
      return;
    }
    sendResponse(socket, request, {
      statusCode: filename === "404" ? "404" : "200",
      statusPhrase: "OK",
      data,
    });
  });
}

function handleConnection(socket) {
  console.log("Client connected...");

  let buffer = "";
  let bodyBuffer = "";
  let headersParsed = false;

  let contentLength = 0;
  let request = {
    headers: [],
    method: "",
    path: "",
    httpVer: "",
  };
  socket.on("data", (data) => {
    if (!headersParsed) {
      buffer += data.toString();

      // checks if the request message contains a new empty line
      // if it does, we know that it represents the end of the request line and
      // its request headers and can proceed to parse the request body (if its a POST request)
      const endOfHeaderIdx = buffer.indexOf("\r\n\r\n");
      if (endOfHeaderIdx === -1) return;

      // splitting the receieved HTTP message by each line
      // this will help me to extract the requestLine, requestHeaders and requestBody
      const requestArr = buffer.split("\r\n");
      const [method, path, httpVer] = readRequestLine(requestArr[0]);
      const headersObj = readRequestHeaders(
        requestArr.slice(1, endOfHeaderIdx)
      );

      request.method = method;
      request.path = path;
      request.httpVer = httpVer;
      request.headers = headersObj;

      contentLength = parseInt(request.headers["content-length"]);
      headersParsed = true;

      if (request.method === "GET") {
        handleGetRequest(socket, request);
        return;
      }

      if (request.method === "HEAD") {
        handleHeadRequest(socket, request);
        return;
      }
      return;
    }

    if (
      headersParsed &&
      request.method === "POST" &&
      checkContentLength(contentLength)
    ) {
      bodyBuffer += data.toString();
      if (bodyBuffer.length >= contentLength) {
        request.body = bodyBuffer.slice(0, contentLength);
        handlePostRequest(socket, request);
      }
    } else {
      sendResponse(socket, request, {
        statusCode: "400",
        statusPhrase: "Bad Request",
        data: "Content Length Is Not Specified",
      });
    }
  });

  socket.on("end", () => {
    console.log("\r\nClient disconnected...");
  });

  socket.on("error", (err) => {
    console.log("Error: ", err.address(), err.message);
  });
}

/* FUNCTIONS TO PROCESS GET, POST AND HEAD REQUESTS */
function handleGetRequest(socket, request) {
  switch (request.path) {
    case "/":
      readFileAndSendResponse(socket, request, "index");
      break;

    default:
      readFileAndSendResponse(socket, request, "404");
  }
}

function handleHeadRequest(socket, request) {
  switch (request.path) {
    case "/":
      readFileAndSendResponse(socket, request, "index");
      break;

    default:
      readFileAndSendResponse(socket, request, "404");
  }
}

function handlePostRequest(socket, request) {
  switch (request.path) {
    case "/echo":
      sendResponse(socket, request, {
        statusCode: "200",
        statusPhrase: "OK",
        data: request.body,
      });
      break;

    default:
      readFileAndSendResponse(socket, request, "404");
  }
}

/* FUNCTION TO SEND RESPONSES */
function sendResponse(socket, request, response) {
  let finalResponse = "";
  let responseLine = `${request.httpVer} ${response.statusCode} ${response.statusPhrase}`;

  // this basic version only supports text/html (as of now)
  let headers = `Content-Type: text/html\r\nContent-Length: ${response.data.length}`;

  if (request.method !== "HEAD") {
    let data = response.data;
    finalResponse += responseLine + "\r\n" + headers + "\r\n\r\n" + data;
  } else {
    finalResponse += responseLine + "\r\n" + headers;
  }

  socket.write(finalResponse);
  socket.end();
}
