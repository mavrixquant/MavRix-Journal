-- Strip reserved Trade field names from accounts.columnConfigs and trades.dynamic.
-- Fixes: editing a trade shows exitPrice / entryPrice / takeProfit / stopLoss /
-- mae / mfe / slPoints / pnl etc. as duplicate "custom columns" — leftover from
-- before these became real Trade columns.
-- Also enforced at write time in accounts.service.js / trades.service.js.
UPDATE "accounts"
   SET "columnConfigs" = "columnConfigs" - ARRAY['id','accountId','tradeId','strategyId','date','entryTime','exitTime','direction','symbol','mae','mfe','slPoints','entryPrice','exitPrice','takeProfit','stopLoss','pnl','quantity','commission','notes','dynamic','strategy','createdAt','updatedAt']::text[]
 WHERE "columnConfigs" ?| ARRAY['id','accountId','tradeId','strategyId','date','entryTime','exitTime','direction','symbol','mae','mfe','slPoints','entryPrice','exitPrice','takeProfit','stopLoss','pnl','quantity','commission','notes','dynamic','strategy','createdAt','updatedAt']::text[];

UPDATE "trades"
   SET "dynamic" = "dynamic" - ARRAY['id','accountId','tradeId','strategyId','date','entryTime','exitTime','direction','symbol','mae','mfe','slPoints','entryPrice','exitPrice','takeProfit','stopLoss','pnl','quantity','commission','notes','dynamic','strategy','createdAt','updatedAt']::text[]
 WHERE "dynamic" ?| ARRAY['id','accountId','tradeId','strategyId','date','entryTime','exitTime','direction','symbol','mae','mfe','slPoints','entryPrice','exitPrice','takeProfit','stopLoss','pnl','quantity','commission','notes','dynamic','strategy','createdAt','updatedAt']::text[];