const sdk = require('indy-sdk')
const request = require('request-promise')
const utils = require('./utils')
const globals = require('./globals')
const config = utils.getConfig()
let walletHandle

module.exports = {
  init,
  sdk, // testing only. Should not be referenced in production code.
  packMessage,
  unpackMessage,
  createAndStoreMyDid,
  storeTheirDid,
  setDidMetadata,
  createPairwise,
  getPairwise,
  listPairwise,
  getInvitationMessage,
  getConnectionRequest,
  getConnectionResponse,
  unpackAndVerifyConnectionSig,
  getMyDidDoc,
  send,
  sendInvite,
  sendTrustPing,
  sendBasicMessage
}

async function init (walletName = null, walletKey = null) {
  // sdk.setDefaultLogger('trace') // Uncomment this line to enable libindy logs.
  const walletConfig = { 'id': walletName || config.default_wallet_name }
  const walletCredentials = { 'key': walletKey || config.default_wallet_key }
  try {
    await sdk.createWallet(walletConfig, walletCredentials)
  } catch (e) {
    if (e.message !== 'WalletAlreadyExistsError') {
      throw e
    }
  }
  walletHandle = await sdk.openWallet(walletConfig, walletCredentials)
}

async function packMessage (message, receiverKeys, senderVk) {
  if (typeof message === 'object') {
    message = JSON.stringify(message)
  }
  return sdk.packMessage(walletHandle, Buffer.from(message, 'utf8'), receiverKeys, senderVk)
}

async function unpackMessage (jwe) {
  if (typeof jwe === 'object') {
    jwe = JSON.stringify(jwe)
  }
  // console.log(`Trying to unpack ${jwe}`)
  let msg = await sdk.unpackMessage(walletHandle, Buffer.from(jwe, 'utf8'))
  msg = JSON.parse(msg)
  if (utils.isJSON(msg.message)) {
    msg.message = JSON.parse(msg.message)
  }
  return msg
}

async function createAndStoreMyDid (did = {}) {
  return sdk.createAndStoreMyDid(walletHandle, did)
}

async function storeTheirDid (identity) {
  return sdk.storeTheirDid(walletHandle, identity)
}

async function setDidMetadata (did, metadata) {
  return sdk.setDidMetadata(walletHandle, did, JSON.stringify(metadata))
}

async function createPairwise (theirDid, myDid, metadata) {
  return sdk.createPairwise(walletHandle, theirDid, myDid, JSON.stringify(metadata))
}

async function getPairwise (theirDid) {
  const pairwise = await sdk.getPairwise(walletHandle, theirDid)
  pairwise.metadata = JSON.parse(pairwise.metadata)
  return pairwise
}

async function listPairwise () {
  const pairwises = await sdk.listPairwise(walletHandle)
  for (const pairwise of pairwises) {
    pairwise.metadata = JSON.parse(pairwise.metadata)
  }
  return pairwises
}

function getInvitationMessage () {
  return {
    '@type': globals.messageTypes.CONN_INVITE,
    '@id': utils.getUUID(),
    'label': globals.myName,
    'recipientKeys': [config.invitation_key], // Not used here
    'serviceEndpoint': globals.endpoint
  }
}

function getConnectionRequest (myNewDid, myNewVerKey) {
  return {
    '@id': utils.getUUID(),
    '@type': globals.messageTypes.CONN_REQUEST,
    'label': globals.myName,
    'connection': {
      'DID': myNewDid,
      'DIDDoc': getMyDidDoc(myNewDid, myNewVerKey)
    }
  }
}

async function getConnectionResponse (requestMessageId, myDID, myVerKey) { // FIXME: Ended here on 2/18/19. Finish filling out attributes
  const connection = Buffer.from(JSON.stringify({
    'DID': myDID,
    'DIDDoc': getMyDidDoc(myDID, myVerKey)
  }), 'ascii')
  const timestamp = Buffer.alloc(8) // FIXME: Date.now()
  const sigData = utils.b64.encode(Buffer.concat([timestamp, connection]))
  const signature = await sdk.cryptoSign(walletHandle, myVerKey, Buffer.from(sigData, 'ascii'))
  return {
    '@type': globals.messageTypes.CONN_RESPONSE,
    '@id': utils.getUUID(),
    '~thread': {
      'thid': requestMessageId
    },
    'connection~sig': {
      '@type': 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/signature/1.0/ed25519Sha512_single',
      'signature': utils.b64.encode(signature, 'ascii'),
      'sig_data': sigData,
      'signer': myVerKey
    }
  }
}

// FIXME: The signature is not being verified yet!
async function unpackAndVerifyConnectionSig (connectionSig) {
  // const signature = Buffer.from(utils.b64.decode(connectionSig.signature, 'ascii'), 'ascii')
  const sigData = Buffer.from(utils.b64.decode(connectionSig.sig_data, 'ascii'), 'ascii')
  // const verified = await sdk.cryptoVerify(connectionSig.signer, sigData, signature)
  // console.log(`Connection response signature = ${verified}`) // FIXME: Don't move on if not valid
  const connection = JSON.parse(sigData.slice(8))
  return connection
}

function getMyDidDoc (did, verKey) {
  return {
    'id': `did:sov:${did}`,
    '@context': 'https://w3id.org/did/v1',
    'publicKey': [{
      'id': `did:sov:${did}#${verKey}`,
      'type': 'Ed25519VerificationKey2018',
      'controller': `did:sov:${did}`,
      'publicKeyBase58': verKey
    }],
    'service': [{
      'type': 'IndyAgent',
      'recipientKeys': [ verKey ],
      'routingKeys': [],
      'serviceEndpoint': globals.endpoint
    }]
  }
}

async function send (endpoint, message, receiverKeys, senderVk) {
  console.log(`Sending message of type ${message['@type']} to ${endpoint}`)
  const msg = await packMessage(message, receiverKeys, senderVk)
  await request({
    url: endpoint,
    method: 'POST',
    body: msg,
    headers: {
      'Content-Type': 'application/ssi-agent-wire'
    }
  })
  console.log(`Message sent!`)
}

async function sendInvite (endpoint) {
  if (!config.invitation_key) {
    throw Error('config.yml missing invitation key!')
  }
  const invitation = getInvitationMessage()
  await request({
    url: endpoint,
    method: 'POST',
    body: JSON.stringify(invitation),
    headers: {
      'Content-Type': 'application/json'
    }
  })
}

async function sendTrustPing (theirDid) {
  const pairwise = await getPairwise(theirDid)
  const myVerkey = await sdk.keyForLocalDid(walletHandle, pairwise.my_did)
  const theirVerkey = await sdk.keyForLocalDid(walletHandle, theirDid)

  const message = {
    '@type': globals.messageTypes.TRUST_PING,
    '@id': utils.getUUID()
  }

  await send(pairwise.metadata.endpoint, message, [theirVerkey], myVerkey)
}

async function sendBasicMessage (theirDid, content) {
  const pairwise = await getPairwise(theirDid)
  const myVerkey = await sdk.keyForLocalDid(walletHandle, pairwise.my_did)
  const theirVerkey = await sdk.keyForLocalDid(walletHandle, theirDid)

  const message = {
    '@id': utils.getUUID(),
    '@type': globals.messageTypes.BASIC_MESSAGE,
    '~l10n': { 'locale': 'en' },
    'sent_time': (new Date()).toISOString(),
    'content': content
  }

  console.log('myVerkey = ', myVerkey)
  await send(pairwise.metadata.endpoint, message, [theirVerkey], myVerkey)
}
