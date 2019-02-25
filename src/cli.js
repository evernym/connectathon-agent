const URL = require('url').URL
const indy = require('./indy')
const handlers = require('./handlers')
const globals = require('./globals')
const utils = require('./utils')

const commands = {}

module.exports = async function (command) {
  const commandArgs = command.split(' ')
  if (commands[commandArgs[0]]) {
    try {
      return commands[commandArgs[0]].handler(commandArgs)
    } catch (e) {
      console.error(e)
    }
  } else if (/^\s*$/.test(commandArgs[0])) { // if is whitespace
    // do nothing
  } else {
    console.log(`Error: Command "${commandArgs[0]}" unknown`)
  }
}

commands['help'] = {
  handler: async function (commandArgs) {
    console.log('Welcome to Indy Agent. Available commands: ')
    for (let command in commands) {
      console.log(`\t${commands[command].help}`)
    }
  },
  help: 'help'
}

commands['exit'] = {
  handler: async function (commandArgs) {
    process.exit(0)
  },
  help: 'exit'
}

commands['endpoint'] = {
  handler: async function (commandArgs) {
    console.log(globals.endpoint)
  },
  help: 'endpoint: Print current endpoint'
}

commands['newdid'] = {
  handler: async function (commandArgs) {
    const [myDid, myVerkey] = await indy.createAndStoreMyDid()
    console.log(`myDID: ${myDid}`)
    console.log(`myVerKey: ${myVerkey}`)
  },
  help: 'newdid: Create new DID and VerKey.'
}

commands['invite'] = {
  handler: async function (commandArgs) {
    if (commandArgs[1]) {
      await indy.sendInvite(commandArgs[1])
    } else {
      const invitation = indy.getInvitationMessage()
      console.log(`http://example.com/ssi?c_i=${utils.b64.encode(JSON.stringify(invitation))}`)
    }
  },
  help: 'invite <option endpoint>: Create invite and optionally POST to endpoint'
}

commands['connect'] = {
  handler: async function (commandArgs) {
    try {
      const url = new URL(commandArgs[1])
      const msg = {
        message: JSON.parse(utils.b64.decode(url.searchParams.get('c_i'))),
        sender_verkey: null,
        recipient_verkey: null
      }
      await handlers.handle(msg) // FIXME: Be careful. Technically any message can be sent this way now.
    } catch (e) {
      console.error(e)
      console.log('Invalid invitation URL')
    }
  },
  help: 'connect <invitation url>: Connect using invitation url'
}

commands['connections'] = {
  handler: async function (commandArgs) {
    const connections = await indy.listPairwise()
    for (const connection of connections) {
      console.log(`${connection.metadata.label} --> myDID: ${connection.my_did}, theirDID: ${connection.their_did}`)
    }
  },
  help: 'connections: List current connections'
}

commands['ping'] = {
  handler: async function (commandArgs) {
    const connections = await indy.listPairwise()
    commandArgs.shift() // remove first element
    const label = commandArgs.join(' ')
    for (const connection of connections) {
      if (connection.metadata.label === label) {
        return indy.sendTrustPing(connection.their_did)
      }
    }
    console.log(`Connection "${label}" not found`)
  },
  help: 'ping <label>: Send trust ping to connection'
}

commands['msg'] = {
  handler: async function (commandArgs) {
    commandArgs.shift()
    const label = commandArgs[0]
    commandArgs.shift()
    const content = commandArgs.join(' ')
    const connections = await indy.listPairwise()
    for (const connection of connections) {
      if (connection.metadata.label === label) {
        return indy.sendBasicMessage(connection.their_did, content)
      }
    }
    console.log(`Connection "${label}" not found`)
  },
  help: 'msg <label> <content>: Send a basic message to a connection'
}
