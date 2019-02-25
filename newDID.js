#!/usr/bin/env node
const indy = require('./src/indy')
const argv = require('yargs').argv

main()

async function main () {
  if (!argv.w || !argv.k) {
    console.log('USAGE: ./newDID.js -w <wallet name> -k <wallet key>')
  } else {
    await indy.init(argv.w.toString(), argv.k.toString())
    const [myDid, myVerkey] = await indy.createAndStoreMyDid()
    console.log(`myDID: ${myDid}`)
    console.log(`myVerKey: ${myVerkey}`)
  }
}
