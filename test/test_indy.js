/* global describe, it, before */
const expect = require('chai').expect
const indy = require('../src/indy')
const fs = require('fs')
let did, verKey
let receiverDid, receiverVerKey

describe('Test indy.js functions', function () {
  before(async function () {
    this.timeout(10000)
    if (fs.existsSync('~/.indy_client/wallet/test_wallet')) {
      fs.unlinkSync('~/.indy_client/wallet/test_wallet')
    }
    await indy.init('test_wallet');
    [did, verKey] = await indy.createAndStoreMyDid();
    [receiverDid, receiverVerKey] = await indy.createAndStoreMyDid()
    console.log('did = ', did)
    console.log('verkey = ', verKey)
    console.log('receiver did = ', receiverDid)
    console.log('receiver verkey = ', receiverVerKey)
  })

  it('test pack, unpack for authcrypting a string', async function () {
    this.timeout(10000)
    const message = 'hello, world!'
    const jwe = await indy.packMessage(message, [receiverVerKey], verKey)
    const msg = await indy.unpackMessage(jwe)
    console.log(msg)
    expect(msg.message).to.equal(message)
  })

  it('test pack, unpack for anoncrypting a string', async function () {
    this.timeout(10000)
    const message = 'hello, world!'
    const jwe = await indy.packMessage(message, [receiverVerKey], null)
    const msg = await indy.unpackMessage(jwe)
    console.log(msg)
    expect(msg.message).to.equal(message)
  })

  it('test pack, unpack for authcrypting an object', async function () {
    this.timeout(10000)
    const message = { hello: 'world' }
    const jwe = await indy.packMessage(message, [receiverVerKey], verKey)
    const msg = await indy.unpackMessage(jwe)
    console.log(msg)
    expect(msg.message).to.deep.equal(message)
  })

  it('test pack, unpack for anoncrypting an object', async function () {
    this.timeout(10000)
    const message = { hello: 'world' }
    const jwe = await indy.packMessage(message, [receiverVerKey], null)
    const msg = await indy.unpackMessage(jwe)
    console.log(msg)
    expect(msg.message).to.deep.equal(message)
  })

  it('test pairwise create, get, etc', async function () {
    const [myDid] = await indy.createAndStoreMyDid()
    const [theirDid, theirVerkey] = await indy.createAndStoreMyDid()
    await indy.storeTheirDid({
      did: theirDid,
      verkey: theirVerkey
    })
    await indy.createPairwise(theirDid, myDid, { label: 'testing' })
    const pairwise = await indy.getPairwise(theirDid)
    console.log(pairwise)
    expect(pairwise.my_did).to.equal(myDid)
    expect(pairwise.metadata).to.deep.equal({ label: 'testing' })
  })
})
