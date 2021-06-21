module.exports = function (Sequelize, field) {
  return {
    type: Sequelize.TEXT,
    defaultValue: '{}',
    allowNull: false,
    get () {
      try {
        return JSON.parse(this.getDataValue(field))
      } catch (e) {
        console.error('GETTER OF ' + field + ' FIELD OF MODEL mvlShopProduct. RETURN EMPTY OBJECT. ERROR', e.name)
        return {}
      }
    },
    set (val) {
      try {
        val = typeof val === 'string' ? val : JSON.stringify(val)
      } catch (e) {
        console.error('SETTER OF ' + field + ' FIELD OF MODEL mvlShopProduct. SETTING EMPTY OBJECT. ERROR', e)
        return '{}'
      }
      this.setDataValue(field, val)
    }
  }
}
