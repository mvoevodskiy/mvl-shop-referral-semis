const jsonField = require('./_jsonField')
module.exports = (Sequelize) => {
  return [
    {
      type: Sequelize.STRING,
      amount: Sequelize.STRING,
      method: Sequelize.STRING,
      requisites: jsonField(Sequelize, 'requisites'),
      status: Sequelize.STRING(20),
      reason: Sequelize.STRING,
      extended: jsonField(Sequelize, 'extended')
    },
    // Model options
    {
      indexes: [
        {
          fields: ['type']
        },
        {
          fields: ['status']
        }
      ]
    },
    // Model associations
    {
      belongsTo: [
        {
          model: 'mvlUser',
          as: 'Customer'
        },
        {
          model: 'mvlShopCustomerAccount',
          as: 'Account'
        }
      ]
    }
  ]
}
