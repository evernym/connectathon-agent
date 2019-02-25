// const os = require('os') // Uncomment for GPIO. handlers[messageTypes.BASIC_MESSAGE].
const indy = require('./indy')
const sql = require('./sql')
const globals = require('./globals')
const messageTypes = globals.messageTypes

module.exports = {
  isSupportedMessage,
  handle
}

function isSupportedMessage (msg) {
  for (const messageType of Object.values(messageTypes)) {
    if (msg.message['@type'] === messageType) {
      return true
    }
  }
  return false
}

async function handle (msg) {
  console.log(`Message: ${JSON.stringify(msg.message, null, 2)}`)
  return handlers[msg.message['@type']](msg)
}

// FIXME: Set variables for long object value references (EX: msg.message.connection.DIDDoc.service[0].recipientKeys[0]), don't reuse them.
const handlers = {}

handlers[messageTypes.CONN_INVITE] = async function (msg) {
  console.log(msg.message)
  const [myDID, myVerKey] = await indy.createAndStoreMyDid()
  const connectionRequest = indy.getConnectionRequest(myDID, myVerKey)
  await sql.addPendingConnReq(connectionRequest['@id'], myDID, { label: msg.message.label })
  for (const recipientKey of msg.message.recipientKeys) {
    await indy.send(msg.message.serviceEndpoint, connectionRequest, [recipientKey], myVerKey)
  }
}

handlers[messageTypes.CONN_REQUEST] = async function (msg) {
  const [myDid, myVerkey] = await indy.createAndStoreMyDid()
  await indy.storeTheirDid({
    did: msg.message.connection.DID,
    verkey: msg.message.connection.DIDDoc.service[0].recipientKeys[0] // This is obviously oversimplified but works for the Connectathon use case
  })
  await indy.setDidMetadata(msg.message.connection.DID, {
    label: msg.message.label,
    didDoc: msg.message.connection.DIDDoc
  })
  const metadata = {
    label: msg.message.label,
    endpoint: msg.message.connection.DIDDoc.service[0].serviceEndpoint
  }
  await indy.createPairwise(msg.message.connection.DID, myDid, metadata)
  const connectionResponse = await indy.getConnectionResponse(msg.message['@id'], myDid, myVerkey)
  await indy.send(metadata.endpoint, connectionResponse, msg.message.connection.DIDDoc.service[0].recipientKeys, myVerkey)
}

handlers[messageTypes.CONN_RESPONSE] = async function (msg) {
  const connectionRequest = await sql.getPendingConnReq(msg.message['~thread'].thid)
  msg.message.connection = await indy.unpackAndVerifyConnectionSig(msg.message['connection~sig'])
  if (connectionRequest) {
    await indy.storeTheirDid({
      did: msg.message.connection.DID,
      verkey: msg.message.connection.DIDDoc.service[0].recipientKeys[0] // This is obviously oversimplified but works for the Connectathon use case
    })
    await indy.setDidMetadata(msg.message.connection.DID, {
      label: connectionRequest.metadata.label,
      didDoc: msg.message.connection.DIDDoc
    })
    const metadata = connectionRequest.metadata
    metadata.endpoint = msg.message.connection.DIDDoc.service[0].serviceEndpoint
    await indy.createPairwise(msg.message.connection.DID, connectionRequest.myDID, metadata)
    await indy.sendTrustPing(msg.message.connection.DID)
  } else {
    console.log('Connection request not found')
  }
}

handlers[messageTypes.TRUST_PING] = async function (msg) {
  // Do nothing for now. Eventually confirm connection if not yet confirmed and update last trust ping in metadata
  // use Date.now() for timestamp
  console.log('Got trust ping')
}

handlers[messageTypes.BASIC_MESSAGE] = async function (msg) {
  console.log(`Basic Message: ${msg.message.content}`)
  // The following block is for opening the "Cookie Jar"
  // Uncomment to briefly write a 1 to GPIO pin 21 when an "open" message is received
  // Note that it introduces the additional dependency of 'onoff', an npm module
  /*
  if (msg.message.content === 'open') {
    if (os.arch() === 'arm') {
      const GPIO = require('onoff').Gpio
      const lock = new GPIO(21, 'out')
      lock.writeSync(1)
      setTimeout(() => {
        lock.writeSync(0)
        lock.unexport()
      }, 500)
    }
  }
  */
}
