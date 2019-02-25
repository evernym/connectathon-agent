const fs = require('fs')
const yaml = require('js-yaml')
const uuid = require('uuid/v4')
const os = require('os')
const base64url = require('base64url')

const CONFIG_PATH = './config.yml'
let config

module.exports = {
  getConfig,
  getYAML,
  getUUID,
  getLocalIP,
  isJSON,
  isJWE,
  b64: {
    encode: base64urlencode,
    decode: base64urldecode
  }
}

function getConfig () {
  if (!config) {
    config = getYAML(CONFIG_PATH)
  }
  return config
}

function getYAML (path) {
  return yaml.safeLoad(fs.readFileSync(path, 'utf8'))
}

function getUUID () {
  return uuid()
}

// This function is very specific to Raspberry Pi and Ubuntu defaults. It will likely need updating to work on other platforms.
function getLocalIP () {
  let ifaceKey
  const ifaces = os.networkInterfaces()
  if (ifaces['eth0']) {
    ifaceKey = 'eth0'
  } else if (ifaces['en0']) {
    ifaceKey = 'en0'
  } else if (ifaces['enp0s3']) {
    ifaceKey = 'enp0s3'
  } else if (ifaces['wlan0']) {
    ifaceKey = 'wlan0'
  } else {
    console.error('Unable to find IP Address')
    return '0.0.0.0'
  }

  for (let iface of ifaces[ifaceKey]) {
    if (iface.family === 'IPv4') {
      return iface.address
    }
  }
}

function isJSON (str) {
  if (typeof str === 'object') {
    str = JSON.stringify(str)
  }
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

function isJWE (obj) {
  return !!(obj.protected && obj.iv && obj.ciphertext && obj.tag)
}

function base64urlencode (str) {
  // Due to differences in base64url implementations, add '==' to every string because this implementation does not include padding. Standard says that extra padding should be ignored.
  return base64url(str) + '=='
}

function base64urldecode (str) {
  return base64url.decode(str)
}
