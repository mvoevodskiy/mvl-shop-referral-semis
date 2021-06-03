const { MVLoader } = require('mvloader')
// const DBHandler = require('mvl-db-handler');
// const ExampleSemis = require('./mvlblanksemis');

/**
 *
 * @class
 *
 * @property {Object.<import('mvl-db-handler').Sequelize>} DB
 * @property {Object.<import('mvtools')>} MT
 */

class MVLBlankProject extends MVLoader {
  constructor (config) {
    const localConfig = {
      ext: {
        classes: {
          controllers: {
            // MVLBlankController: require('./controllers/mvlblankcontroller'),
          },
          handlers: {
            // DBHandler: DBHandler,
            // MVLBlankHandler: require('./handlers/mvlblankhandler'),
          },
          semis: {
            // ExampleSemis: ExampleSemis,
          }
        },
        configs: {
          handlers: {
            DBHandler: {
              sequelize: {},
              models: {
                // MVLExampleModel: require('./models/mvlblankexample'),
              }
            }
          }
        }
      }
    }
    super(localConfig, config)
  }

  async init () {
    return super.init()
  }

  async initFinish () {
    super.initFinish()
  }
}

module.exports = MVLBlankProject
