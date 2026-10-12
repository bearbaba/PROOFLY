/**
 * Render the relationship between a finalized Work Order state and an
 * independently decoded GenVM transaction receipt without conflating them.
 * A finalized contract read may prove a state, but not which transaction
 * caused it or what its individual execution result was.
 */
const STATES=new Set(["PROPOSED","ACTIVE","REVIEWED","SUBMITTED",
  "COMPLETED","CHANGES_REQUIRED","CANCELLED","CANCELED","CLOSED","EXPIRED"]);
const EXEC_UNKNOWN="FINALIZED / EXECUTION NOT VERIFIED";
export function transactionBanner(label,order) {
  const tx=String(label||"");
  if(tx===EXEC_UNKNOWN) {
    const status=String(order?.status||"").toUpperCase();
    const id=String(order?.id||"");
    if(/^[1-9]\d*$/.test(id)&&STATES.has(status)) {
      return {title:"Work order #"+id+" · "+status+" on-chain",
        detail:"The selected work order's status was read from finalized state. The previous transaction's execution receipt is incomplete; its exact outcome is not independently verified.",
        tone:"partial"};
    }
    return {title:"Transaction finalized · details incomplete",
      detail:"The wallet transaction's GenVM execution result is unavailable in this receipt. Its exact outcome remains unverified; check Explorer before retrying.",
      tone:"partial"};
  }
  if(tx==="FINALIZED / EXECUTION FAILED")return {
    title:"Transaction execution failed",detail:"Inspect the GenVM error in Explorer before retrying.",tone:"error"
  };
  if(tx==="FINALIZED / EXECUTION SUCCESS")return {
    title:"Transaction execution verified",detail:"GenVM reports success and the transaction is finalized.",tone:"success"
  };
  if(tx.startsWith("WAITING")||tx.startsWith("SUBMITTED")||
      tx.startsWith("CREATION SUBMITTED"))return {
    title:"Transaction sent · confirming on-chain",detail:"No further MetaMask action is needed. Do not submit this action again.",tone:"pending"
  };
  if(tx==="TRANSACTION STATUS NOT VERIFIED")return {
    title:"Transaction status is not yet verified",detail:"Check the original transaction before another write.",tone:"partial"
  };
  return {title:tx||"Transaction details",detail:"",tone:"neutral"};
}
