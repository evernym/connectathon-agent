/* global describe, it */
const expect = require('chai').expect
const yaml = require('js-yaml')
const fs = require('fs')
const utils = require('../src/utils')

describe('test utils functions', function () {
  it('getYAML() should correctly load a yaml file', function () {
    const testObj = {
      this: {
        is: {
          some: 'nested',
          object: 'object'
        }
      }
    }
    fs.writeFileSync('testYaml.yml', yaml.dump(testObj))
    const data = utils.getYAML('testYaml.yml')
    expect(data).to.deep.equal(testObj)
    fs.unlinkSync('testYaml.yml')
  })
})
