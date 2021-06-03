const { MVLoaderBase } = require('mvloader')

class MVLBlankHandler extends MVLoaderBase {
  constructor (App, ...config) {
    const localDefaults = {}
    super(localDefaults, ...config)
    this.App = App
  }

  async init () {
    return super.init()
  }

  async initFinish () {
    super.initFinish()
  }
}

module.exports = MVLBlankHandler
