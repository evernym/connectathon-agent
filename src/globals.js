
const messageTypes = {
  CONN_INVITE: 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/connections/1.0/invitation',
  CONN_REQUEST: 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/connections/1.0/request',
  CONN_RESPONSE: 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/connections/1.0/response',
  TRUST_PING: 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/trustping/1.0/ping', // should be "trust_ping" according to hipe, test suite has "trustping"
  BASIC_MESSAGE: 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/basicmessage/1.0/message'
}

let endpoint = ''
let walletName = ''

module.exports = {
  messageTypes,
  endpoint,
  walletName
}
