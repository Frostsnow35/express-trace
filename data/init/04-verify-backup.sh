#!/bin/sh
# 备份恢复验证（T10）：seed -> archive dump -> drop -> restore -> count
set -e
mongosh --quiet /init/03-seed-data.js
mongodump --db=express_trace --archive=/dump/express_trace_backup.archive --gzip
mongosh --quiet --eval 'db.getSiblingDB("express_trace").dropDatabase()'
mongorestore --archive=/dump/express_trace_backup.archive --gzip --drop
mongosh --quiet --eval 'var d=db.getSiblingDB("express_trace"); print("orders:", d.orders.countDocuments({}), "bags:", d.bags.countDocuments({}))'
