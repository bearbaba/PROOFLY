/** Fail-closed reconciliation: finalized state is usable only for an exact matching pending action. */
export function pendingConfirmedByState(record,state,activeAccount,grant=null){
 if(!record||!state||!activeAccount||record.orderId!==state.id||
    record.account?.toLowerCase()!==activeAccount.toLowerCase())return false;
 if(record.method==="accept_order")
  return state.status!=="PROPOSED"&&Number.isInteger(state.accepted_at)&&state.accepted_at>0&&
   state.contributor.toLowerCase()===activeAccount.toLowerCase()&&record.specSha===state.spec_sha256;
 if(record.method==="submit_evidence")
  return Array.isArray(state.submissions)&&state.submissions.some(s=>
    s.artifact_sha256===record.artifactHash&&s.artifact_url===record.artifactUrl&&s.version===record.expectedVersion);
 if(record.method==="evaluate_submission")
  return Array.isArray(state.submissions)&&state.submissions.some(s=>
   s.version===record.expectedVersion&&s.outcome!==null&&s.outcome!==undefined);
 if(record.method==="claim_milestone_release")
  return grant?.recipient?.toLowerCase()===activeAccount.toLowerCase()&&
    grant?.order_id===state.id&&grant?.spec_sha256===record.specSha;
 return false;
}

/** UI copy for an exact finalized create_order readback when SDK receipt tracking timed out.
 * Verified state is not itself an authenticated transaction-level GenVM receipt. */
export function verifiedCreatedOrderNotice(orderId){
 if(typeof orderId!=="string"||!(/^[1-9][0-9]*$/).test(orderId))throw Error("Invalid verified work order ID");
 return "Work Order #"+orderId+" verified in finalized contract state. If transaction receipt tracking timed out, do not create it again; check Explorer for the transaction-level GenVM result.";
}
