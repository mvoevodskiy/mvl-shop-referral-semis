const { MVLoaderBase } = require('mvloader')

class MVLBlankSemis extends MVLoaderBase {
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

MVLoaderBase.exportConfig = {
  ext: {
    classes: {
      semis: {},
      controllers: {},
      handlers: {}
    },
    configs: {
      controllers: {},
      handlers: {
        DBHandler: {
          sequelize: {},
          models: {
            // MVLExampleModel: require('./models/mvlblankexample'),
          }
        }
      },
      semis: {}
    }
  },
  db: {}
}

module.exports = MVLBlankSemis
