import test from "node:test";
import assert from "node:assert/strict";
import {ensureStudionet,STUDIONET_HEX_ID,STUDIONET_NETWORK,rejectedBeforeBroadcast,explainWalletError} from "./wallet-connect.mjs";

test("correct network performs no switch or add", async()=>{
 const calls=[];
 const p={request:async req=>{calls.push(req.method);return STUDIONET_HEX_ID}};
 await ensureStudionet(p,false);
 assert.deepEqual(calls,["eth_chainId"]);
});
test("silent check never opens MetaMask network popup",async()=>{
 const calls=[];
 const p={request:async req=>{calls.push(req.method);return "0x1"}};
 await assert.rejects(()=>ensureStudionet(p,false),/Wrong network/);
 assert.deepEqual(calls,["eth_chainId"]);
});
test("interactive check switches an existing Studionet network",async()=>{
 let chain="0x1";const calls=[];
 const p={request:async req=>{calls.push(req.method);if(req.method==="wallet_switchEthereumChain"){assert.equal(req.params[0].chainId,STUDIONET_HEX_ID);chain=STUDIONET_HEX_ID;return null;}return chain;}};
 await ensureStudionet(p,true);
 assert.deepEqual(calls,["eth_chainId","wallet_switchEthereumChain","eth_chainId"]);
});
test("interactive check adds only the official Studionet RPC on 4902",async()=>{
 let chain="0x1";const calls=[];
 const p={request:async req=>{calls.push(req.method);if(req.method==="wallet_switchEthereumChain")throw {code:4902};if(req.method==="wallet_addEthereumChain"){assert.deepEqual(req.params[0],STUDIONET_NETWORK);chain=STUDIONET_HEX_ID;return null;}return chain;}};
 await ensureStudionet(p,true);
 assert.deepEqual(calls,["eth_chainId","wallet_switchEthereumChain","wallet_addEthereumChain","eth_chainId"]);
});
test("user rejects chain switch: no automatic network addition",async()=>{
 const calls=[];const p={request:async req=>{calls.push(req.method);if(req.method==="eth_chainId")return "0x1";throw {code:4001}}};
 await assert.rejects(()=>ensureStudionet(p,true),x=>x.code===4001);
 assert.deepEqual(calls,["eth_chainId","wallet_switchEthereumChain"]);
});
test("a switch that did not happen remains blocked",async()=>{
 const p={request:async req=>req.method==="eth_chainId"?"0x1":null};
 await assert.rejects(()=>ensureStudionet(p,true),/did not switch/);
});
test("wallet rejection/unauthorized/pending requests are not unknown broadcasts",()=>{
 for(const code of [4001,4100,4900,4901,-32002])assert.equal(rejectedBeforeBroadcast({code}),true);
 for(const code of [-32603,-32000,42])assert.equal(rejectedBeforeBroadcast({code}),false);
 assert.match(explainWalletError({code:4001}),/No transaction was sent/);
 assert.match(explainWalletError({code:-32002}),/already open/);
});
