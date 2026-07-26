import { createServer } from "node:http";
const server = createServer((req, res) => {
    const payload = {
        price: "0.10",
        network: "stellar:testnet",
        payTo: "GABCDEF1234567890STELLARADDRESSEXAMPLE",
    };
    const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
    res.writeHead(402, { "PAYMENT-REQUIRED": encoded });
    res.end();
});
server.listen(4402, () => console.log("Dummy x402 server on http://localhost:4402"));
