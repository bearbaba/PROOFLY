/** Explicit, user-initiated MetaMask network setup for PROOFLY Studionet. */
export const STUDIONET_CHAIN_ID = 61999;
export const STUDIONET_HEX_ID = "0x" + STUDIONET_CHAIN_ID.toString(16);
export const STUDIONET_NETWORK = Object.freeze({
  chainId: STUDIONET_HEX_ID,
  chainName: "GenLayer Studionet",
  nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
  rpcUrls: ["https://studio.genlayer.com/api"],
  blockExplorerUrls: ["https://explorer-studio.genlayer.com"]
});

export function walletErrorCode(error) {
  const code = error?.code ?? error?.data?.originalError?.code ?? error?.cause?.code;
  return typeof code === "number" || typeof code === "string" ? Number(code) : null;
}

export function rejectedBeforeBroadcast(error) {
  // These wallet/provider outcomes mean no new transaction was broadcast by THIS request.
  return [4001, 4100, 4900, 4901, -32002].includes(walletErrorCode(error));
}

export function explainWalletError(error) {
  const code = walletErrorCode(error);
  if (code === 4001) return "MetaMask request rejected. No transaction was sent; you may try signing again.";
  if (code === 4100) return "This wallet has not authorized PROOFLY. Click Connect MetaMask and approve account access.";
  if (code === -32002) return "A MetaMask request is already open. Open the extension, finish or reject that request, then retry.";
  if (code === 4900 || code === 4901) return "MetaMask is disconnected from the requested network. Reconnect the wallet.";
  if (code === 4902) return "GenLayer Studionet is not configured in MetaMask. Click Connect MetaMask to add it.";
  return String(error?.message || error || "Unexpected wallet error");
}

export async function ensureStudionet(provider, interactive = false) {
  if (!provider || typeof provider.request !== "function") throw Error("MetaMask provider not available. Unlock or install MetaMask.");
  let current = await provider.request({method: "eth_chainId"});
  if (Number(BigInt(current)) === STUDIONET_CHAIN_ID) return true;
  if (!interactive) throw Error("Wrong network: select GenLayer Studionet (61999), then reconnect.");

  try {
    await provider.request({ method: "wallet_switchEthereumChain", params: [{chainId: STUDIONET_HEX_ID}] });
  } catch (error) {
    if (walletErrorCode(error) !== 4902) throw error;
    // Only add the documented network after an explicit wallet-connect click.
    await provider.request({ method: "wallet_addEthereumChain", params: [STUDIONET_NETWORK] });
  }
  current = await provider.request({method: "eth_chainId"});
  if (Number(BigInt(current)) !== STUDIONET_CHAIN_ID) throw Error("MetaMask did not switch to GenLayer Studionet (61999). No signing will occur.");
  return true;
}
