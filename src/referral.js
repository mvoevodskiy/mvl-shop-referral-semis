const { MVLoaderBase } = require('mvloader')

class mvlShopReferral extends MVLoaderBase {
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

mvlShopReferral.exportConfig = {
  ext: {
    classes: {
      semis: {},
      controllers: {
        mvlShopReferral: require('./controllers/referralcontroller'),
        mvlShopReferralOverride: require('./controllers/overridecontroller'),
        mvlShopReferralWithdrawal: require('./controllers/withdrawalcontroller')
      },
      handlers: {}
    },
    configs: {
      controllers: {
        mvlShopOrderStatus: {
          middlewares: [
            ['change', 'mvlShopReferralController.changeStatus']
            // require('./controllers/subscriptioncontroller')
          ]
        },
        mvlUsers: {
          middlewares: [
            ['register', 'mvlShopReferralController.registerUser']
            // require('./controllers/subscriptioncontroller')
          ]
        }
      },
      handlers: {
        DBHandler: {
          sequelize: {},
          models: {
            mvlShopReferralRequest: require('./models/mvlShopReferralRequest')
          }
        }
      },
      semis: {}
    }
  },
  db: {}
}

module.exports = { mvlShopReferral }
