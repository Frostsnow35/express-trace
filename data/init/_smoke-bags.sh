#!/bin/sh
# T11~T17 袋接口冒烟（对照 document/04 §4.1）——修正版：补 ARRIVE 步骤，T16 用未入袋订单
B=http://127.0.0.1:3000/api/v1
J() { python -c "import sys,json;d=json.load(sys.stdin);print(eval(sys.argv[1]))" "$1"; }

echo "== T11 建袋+装3件（0001/0003/0004） =="
BAG=$(curl -s -X POST $B/bags -H 'Content-Type: application/json' -d '{"dest_node":"长沙中转场"}')
BAGNO=$(echo "$BAG" | J "d['data']['bag_no']")
echo "建袋: $BAGNO $(echo "$BAG" | J "d['data']['status']")"
for O in ET20261117000001 ET20261117000003 ET20261116000004; do
  curl -s -X POST $B/bags/$BAGNO/items -H 'Content-Type: application/json' -d "{\"order_no\":\"$O\"}" > /dev/null
done
R=$(curl -s -X POST $B/bags/$BAGNO/items -H 'Content-Type: application/json' -d '{"order_no":"ET20261117000001"}')
echo "T11 幂等重复装件: code=$(echo "$R" | J "d['code']") (期望0)"

echo "== T12 袋扫件动 SEAL -> DEPART =="
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T09:00:00+08:00","node":"长沙分拨","action":"封袋，总牌标注长沙中转场","type":"SEAL"}')
echo "SEAL: code=$(echo "$R" | J "d['code']") propagated=$(echo "$R" | J "d['data']['propagated_count']") status=$(echo "$R" | J "d['data']['bag']['status']")"
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T09:30:00+08:00","node":"长沙分拨","action":"整袋发运","type":"DEPART"}')
echo "DEPART: propagated=$(echo "$R" | J "d['data']['propagated_count']") (期望3) status=$(echo "$R" | J "d['data']['bag']['status']")"

echo "== T17 写传播幂等: 重发同 DEPART =="
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T09:30:00+08:00","node":"长沙分拨","action":"整袋发运","type":"DEPART"}')
echo "重发DEPART: propagated=$(echo "$R" | J "d['data']['propagated_count']") (期望0)"

echo "== T13 袋状态机 =="
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T10:00:00+08:00","node":"长沙分拨","action":"重复封袋","type":"SEAL"}')
echo "SEALED袋再SEAL: code=$(echo "$R" | J "d['code']") (期望40902)"

echo "== T14 装件互斥 =="
B2=$(curl -s -X POST $B/bags -H 'Content-Type: application/json' -d '{"dest_node":"武汉中转场"}')
BAGNO2=$(echo "$B2" | J "d['data']['bag_no']")
R=$(curl -s -X POST $B/bags/$BAGNO2/items -H 'Content-Type: application/json' -d '{"order_no":"ET20261117000001"}')
echo "已在袋A的件装入袋B: code=$(echo "$R" | J "d['code']") (期望40903)"

echo "== T15 拆袋解籍: ARRIVE -> OPEN =="
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T19:00:00+08:00","node":"长沙中转场","action":"整袋到达","type":"ARRIVE"}')
echo "ARRIVE: code=$(echo "$R" | J "d['code']") status=$(echo "$R" | J "d['data']['bag']['status']") (期望ARRIVED)"
R=$(curl -s -X POST $B/bags/$BAGNO/scan -H 'Content-Type: application/json' -d '{"time":"2026-11-18T20:00:00+08:00","node":"长沙中转场","action":"到港拆袋，逐件分拣","type":"OPEN"}')
echo "OPEN拆袋: propagated=$(echo "$R" | J "d['data']['propagated_count']") (期望3) status=$(echo "$R" | J "d['data']['bag']['status']") (期望OPENED) order_nos快照=$(echo "$R" | J "len(d['data']['bag']['order_nos'])") (期望3)"
R=$(curl -s -X POST $B/bags/$BAGNO/items -H 'Content-Type: application/json' -d '{"order_no":"ET20261115000005"}')
echo "OPENED袋装件: code=$(echo "$R" | J "d['code']") (期望40902)"

echo "== T16 影响面: 袋B装0005 -> 标记BROKEN -> impact =="
R=$(curl -s -X POST $B/bags/$BAGNO2/items -H 'Content-Type: application/json' -d '{"order_no":"ET20261115000005"}')
echo "装件0005: code=$(echo "$R" | J "d['code']")"
R=$(curl -s -X POST $B/bags/$BAGNO2/exception -H 'Content-Type: application/json' -d '{"type":"BROKEN","action":"集包袋破损，小件散落"}')
echo "标记BROKEN: code=$(echo "$R" | J "d['code']") status=$(echo "$R" | J "d['data']['status']")"
R=$(curl -s $B/bags/$BAGNO2/impact)
echo "影响面: $(echo "$R" | J "'affected=%s dist=%s orders=%s' % (d['data']['affected_count'], d['data']['status_dist'], [o['order_no'] for o in d['data']['orders']])") (期望affected=1)"
R=$(curl -s -X POST $B/bags/$BAGNO2/exception -H 'Content-Type: application/json' -d '{"type":"LOST","action":"重复标记"}')
echo "重复标记异常: code=$(echo "$R" | J "d['code']") (期望40902)"

echo "== 额外: 种子破损袋影响面 =="
R=$(curl -s $B/bags/BG202611160002/impact)
echo "种子异常袋: $(echo "$R" | J "'affected=%s status=%s dist=%s' % (d['data']['affected_count'], d['data']['status'], d['data']['status_dist'])") (期望2/BROKEN)"
