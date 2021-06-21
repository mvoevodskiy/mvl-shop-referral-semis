const { MVLoaderBase } = require('mvloader')
const mt = require('mvtools')

class OverrideController extends MVLoaderBase {
  constructor (App, ...config) {
    const localDefaults = {}
    super(localDefaults, ...config)
    this.App = App
  }

  async init () {
    this.extendModels()
    return super.init()
  }

  async initFinish () {
    super.initFinish()
  }

  extendModels () {
    this.extendModelMvlUser()
    // this.extendModelMvlShopCustomerAccount()
  }

  extendModelMvlUser () {
    const mvlUser = this.App.config.ext.configs.handlers.DBHandler.models.mvlUser
    this.App.config.ext.configs.handlers.DBHandler.models.mvlUser = (Sequelize) => {
      const user = mvlUser(Sequelize)
      user[0] = mt.mergeRecursive(user[0], { refId: Sequelize.STRING })
      user[2] = mt.mergeRecursive(user[2], {
        hasMany: [
          {
            model: 'mvlUser',
            as: 'Referrals',
            foreignKey: 'RefParentId'
          },
          {
            model: 'mvlShopCustomerAccount',
            as: 'RefAccount',
            foreignKey: 'CustomerId',
            scope: 'referral'
          }
        ],
        hasOne: [
        ],
        belongsTo: [
          {
            model: 'mvlUser',
            as: 'RefParent'
          }
        ]
      })
      return user
    }
  }

  extendModelMvlShopCustomerAccount () {
    const mvlShopCustomerAccount = this.App.config.ext.configs.handlers.DBHandler.models.mvlShopCustomerAccount
    if (mvlShopCustomerAccount !== undefined) {
      this.App.config.ext.configs.handlers.DBHandler.models.mvlShopCustomerAccount = (Sequelize) => {
        const account = mvlShopCustomerAccount(Sequelize)
        account[1] = mt.mergeRecursive(account[1], {
          scope: {
            referral: { where: { type: 'referral' } }
          }
        })
        return account
      }
    }
  }
}

module.exports = OverrideController
