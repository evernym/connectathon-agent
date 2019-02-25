#!/usr/bin/env node

const express = require('express')
const readline = require('readline')
const bodyParser = require('body-parser')
const indy = require('./src/indy')
const handlers = require('./src/handlers')
const cli = require('./src/cli')
const utils = require('./src/utils')
const config = utils.getConfig()
const globals = require('./src/globals')
const app = express()
const argv = require('yargs').argv
const port = argv.p || config.default_port
globals.walletName = argv.w || null
globals.myName = argv.n || config.default_name

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

app.use(bodyParser.json({ type: [
  'application/ssi-agent-wire',
  'application/json'
] }))

app.use((req, res, next) => {
  // Uncomment to log all incoming requests
  // console.log(`Incoming Request: ${req.method} ${req.url}\n\tBody: `, req.body)
  next()
})

app.get('/', function (req, res) {
  res.send('I\'m alive!')
})

app.get('/invite', function (req, res) {
  const invitation = indy.getInvitationMessage()
  res.send(`http://example.com/ssi?c_i=${utils.b64.encode(JSON.stringify(invitation))}`)
})

app.post('/', async function (req, res) {
  try {
    let msg
    if (utils.isJWE(req.body)) { // Handle invitation msg
      msg = await indy.unpackMessage(req.body)
    } else {
      msg = {
        message: req.body,
        sender_verkey: null,
        recipient_verkey: null
      }
    }
    if (handlers.isSupportedMessage(msg)) {
      console.log(`Handling message of type ${msg.message['@type']}`)
      await handlers.handle(msg)
    } else {
      console.log(`Unsupported message type ${msg.message['@type']}`)
    }
    res.status(202).send('Accepted')
  } catch (e) {
    console.error(e)
    console.error('Unable to handle message')
    res.status(400).send('Unable to handle message')
  }
})

globals.endpoint = `http://${config.hostname || utils.getLocalIP()}:${port}`

indy.init(globals.walletName, argv.k.toString())
  .then(() => {
    app.listen(port, () => {
      console.log(`Listening on port ${port}!`)
      process.stdout.write('> ')
      rl.on('line', async (input) => {
        await cli(input)
        process.stdout.write('> ')
      })
    })
  })
