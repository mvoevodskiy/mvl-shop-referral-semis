const { MVLoaderBase } = require('mvloader')

class MVLBlankController extends MVLoaderBase {
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

module.exports = MVLBlankController
