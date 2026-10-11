/**
 * Real GenLayer receipts can be snake_case (simplified v1.1.8) or camelCase.
 * Missing execution fields are NOT evidence of failed execution.
 * Pure, auditable decision rules: SUCCESS only with finality and explicit
 * FINISHED_WITH_RETURN, FAILURE only with finality and an explicit error.
 */
function select(tx, ...keys) {
  for (const object of [tx, tx?.result, tx?.transaction, tx?.data]) {
    if (object && typeof object === "object") {
      for (const k of keys) {
        if (object[k] !== undefined && object[k] !== null && object[k] !== "")
          return object[k];
      }
    }
  }
  return null;
}
function normal(value) {
  if (value === null || value === undefined) return "UNKNOWN";
  return String(value).trim().replace(/([a-z])([A-Z])/g,"$1_$2")
    .replace(/[\s-]+/g,"_").toUpperCase();
}
const STATUS_NUMERIC={0:"UNINITIALIZED",1:"PENDING",2:"PROPOSING",3:"COMMITTING",4:"REVEALING",5:"ACCEPTED",6:"UNDETERMINED",7:"FINALIZED",8:"CANCELED"};
const EXEC_NUMERIC={0:"NOT_VOTED",1:"FINISHED_WITH_RETURN",2:"FINISHED_WITH_ERROR",3:"TIMEOUT",4:"NONDET_DISAGREE",5:"DETERMINISTIC_VIOLATION"};
export function inspectTransaction(receipt) {
  const rawStatus=select(receipt,"statusName","status_name","status");
  const rawExec=select(receipt,"txExecutionResultName","tx_execution_result_name",
    "txExecutionResult","tx_execution_result");
  const status=STATUS_NUMERIC[rawStatus]??normal(rawStatus);
  const execution=EXEC_NUMERIC[rawExec]??normal(rawExec);
  const finalized=status==="FINALIZED";
  const confirmedFailure=new Set(["FINISHED_WITH_ERROR","ERROR","TIMEOUT",
    "DETERMINISTIC_VIOLATION","NONDET_DISAGREE"]).has(execution);
  const kind=finalized && execution==="FINISHED_WITH_RETURN" ? "success" :
    finalized && confirmedFailure ? "failed" :
    finalized ? "unverified" : "pending";
  return {
    kind,finalized,consensus:status,execution,
    statusRaw:rawStatus,executionRaw:rawExec
  };
}
