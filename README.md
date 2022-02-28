# CI-HPC-APP for flow123d
[![Actions Status](https://github.com/flow123d/ci-hpc-app/workflows/Python%20application/badge.svg)](https://github.com/flow123d/ci-hpc-app/actions) [![Coveralls github](https://img.shields.io/coveralls/github/flow123d/ci-hpc-app?logo=codeforces&logoColor=999&style=flat&labelColor=393939)](https://coveralls.io/github/flow123d/ci-hpc-app)

This fork is for flow123d use only.

Current setup:
- Jenkins job `charon-service` configured in flow123d repository
- ciflow Jenkins call task scheduling on Charon over the SSH twice a day
  sampling service on Charon is possibly restarted
- scheduling and service run under jan_brezina account, out of PBS, on charon23





```js
db.getCollection('timers-2019-2').aggregate([
    {
        "$group": {
            "_id": "$index.cpus",
            "sum": { "$sum": 1 }
        }
    }
])

db.getCollection('timers-2019-2').find({"index.cpus": "< cpus >"})

db.getCollection('timers-2019-2').updateMany(
    { "index.cpus": "< cpus >" },
    {
        "$set": {
            "index.cpus": 1.0
        }
    }
)
```
