const express = require("express")
const app = express()
app.use(express.json())

const clients = {} // { uid: { name, placeId, jobId, ts, pendingCode: [] } }

// client registers / heartbeats
app.post("/register", (req, res) => {
    const { uid, name, placeId, jobId } = req.body
    if (!uid) return res.sendStatus(400)
    if (!clients[uid]) clients[uid] = { uid, name, placeId, jobId, ts: Date.now(), pendingCode: [] }
    else {
        clients[uid].ts = Date.now()
        clients[uid].placeId = placeId
        clients[uid].jobId = jobId
    }
    res.sendStatus(200)
})

// client polls for commands addressed to it
app.get("/poll/:uid", (req, res) => {
    const entry = clients[req.params.uid]
    if (!entry) return res.json({ code: null })
    const code = entry.pendingCode.shift() || null
    res.json({ code })
})

// admin pushes code to a target
app.post("/send", (req, res) => {
    const { targetUid, code, adminKey } = req.body
    if (adminKey !== process.env.ADMIN_KEY) return res.sendStatus(403)
    const entry = clients[targetUid]
    if (!entry) return res.sendStatus(404)
    entry.pendingCode.push(code)
    res.sendStatus(200)
})

// admin gets client list
app.get("/clients", (req, res) => {
    const { adminKey } = req.query
    if (adminKey !== process.env.ADMIN_KEY) return res.sendStatus(403)
    const now = Date.now()
    const alive = Object.values(clients).filter(c => now - c.ts < 15000)
    res.json(alive)
})

// prune dead clients every 20s
setInterval(() => {
    const now = Date.now()
    for (const uid in clients) {
        if (now - clients[uid].ts > 15000) delete clients[uid]
    }
}, 20000)

app.listen(process.env.PORT || 3000, () => console.log("relay up"))
