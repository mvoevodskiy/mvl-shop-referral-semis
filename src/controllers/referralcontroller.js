const { MVLoaderBase } = require('mvloader')
const mt = require('mvtools')

class mvlShopReferralController extends MVLoaderBase {
  constructor (App, ...config) {
    const localDefaults = {
      levels: {
        1: 10
      },
      statuses: {
        new: ['new'],
        paid: ['paid'],
        done: ['done'],
        cancelled: ['cancelled']
      },
      accountType: 'referral',
      defaultRequestType: 'withdrawal',
      defaultRequestMethod: 'bankCard',
      profileExtendedKey: 'mvlShopReferral'
    }
    super(localDefaults, ...config)
    this.App = App
    this.caption = this.constructor.name
  }

  async init () {
    return super.init()
  }

  async initFinish () {
    super.initFinish()
    this.Shop = this.App.ext.semis.mvlShop
  }

  async getUser (userOrId) {
    let user = userOrId
    if (typeof user === 'number') user = await this.App.DB.models.mvlUser.findByPk(user)
    return user
  }

  async generateRefId (user) {
    let src
    let id = 0
    if (typeof user === 'number') {
      src = user
      id = user
    } else if (user instanceof this.App.DB.models.mvlUser) {
      src = user.username + user.id
      id = user.id
    } else if (typeof user === 'object') {
      src = JSON.stringify(user)
      id = user.id || 0
    } else src = String(Date.now())
    const md5 = mt.md5(src).substr(4, 6)
    let refId = md5 + String(id)

    while (await this.App.DB.models.mvlUser.count({ where: { refId } })) {
      const rand = String(mt.random(100, 9999))
      const place = mt.random(1, 2)
      refId = (place === 1 ? rand : '') + md5 + (place === 2 ? rand : '')
    }
    return refId
  }

  async getRefId (user) {
    user = await this.getUser(user)
    if (!mt.empty(user)) {
      if (mt.empty(user.refId)) {
        user.set('refId', await this.generateRefId(user))
        await user.save()
      }
      return user.refId
    }
    return null
  }

  registerUser (usersController) {
    return (next) => async (data) => {
      data.refId = await this.generateRefId(data)
      return await next(data)
    }
  }

  changeStatus (statusController) {
    return (next) => async ({ order, status }) => {
      order = await this.App.ext.controllers.mvlShopOrder.get(order)
      const res = await next({ order, status })
      status = await order.getStatus()
      if (status !== null && this.config.statuses.paid.indexOf(status.key) !== -1) {
        setImmediate(async () => await this.accrual(order))
      }
      return res
    }
  }

  /**
   *
   * @param {mvlShopOrder} order
   * @return {Promise<void>}
   */
  async accrual (order) {
    const customer = await order.getCustomer()
    let currentLevelUser = await customer.getRefParent()
    let level = 1
    if (customer !== null) {
      while (true) {
        if (level in this.config.levels && currentLevelUser !== null) {
          let percent = this.config.levels[level]
          const ext = await this.getProfileExt(currentLevelUser)
          const personalPercent = mt.extract('levels.' + level, ext)
          const intPersonalPercent = parseInt(personalPercent)
          if (personalPercent !== undefined && !isNaN(intPersonalPercent) && intPersonalPercent > 0) percent = intPersonalPercent
          const amount = Math.round(order.cost * percent / 100)
          if (amount > 0) {
            const values = {
              OrderId: order.id,
              CustomerId: currentLevelUser.id,
              CreatorId: customer.id,
              extended: { level, percent }
            }
            const account = await this.App.ext.controllers.mvlShopCustomerAccount.get(this.config.accountType, currentLevelUser)
            await this.App.ext.controllers.mvlShopCustomerAccount.increase(account, amount, values)
          }
          currentLevelUser = await currentLevelUser.getRefParent()
          level++
        } else break
      }
    }
  }

  async status (user, periods = {}) {
    user = await this.getUser(user)
    const promises = []
    const account = await this.Shop.CustomerAccount.get(this.config.accountType, user)
    let lastReceive
    let lastWithdrawal
    const conversion = {}
    const receive = {}
    const withdrawal = {}
    promises.push(
      (async () => {
        lastReceive = await this.App.DB.models.mvlShopCustomerAccountLog.findOne({
          where: { AccountId: account.id, amount: { [this.App.DB.S.Op.gt]: 0 } },
          order: [['createdAt', 'DESC']]
        }).catch(e => console.error(e))
      })(),
      (async () => {
        lastWithdrawal = await this.App.DB.models.mvlShopCustomerAccountLog.findOne({
          where: { AccountId: account.id, amount: { [this.App.DB.S.Op.lt]: 0 } },
          order: [['createdAt', 'DESC']]
        }).catch(e => console.error(e))
      })()
    )
    for (const key in periods) {
      if (Object.prototype.hasOwnProperty.call(periods, key)) {
        const { start, end } = this.getStartEndFromPeriod(periods[key])
        console.log('PERIOD', key, periods[key], 'START', start, 'END', end, 'PERIOD TYPE', typeof periods[key] === 'object' ? periods[key].constructor.name : typeof periods[key])
        promises.push(
          (async () => { conversion[key] = await this.getReferralsCountByLevels(user, start, end) })(),
          (async () => { receive[key] = await this.getReceiveSum(user, start, end) })(),
          (async () => { withdrawal[key] = await this.getWithdrawalSum(user, start, end) })()
        )
      }
    }
    await Promise.allSettled(promises)
    return { account, lastReceive, lastWithdrawal, conversion, receive, withdrawal }
  }

  async statusAll (periods = {}) {
    const promises = []
    const receive = {}
    const withdrawal = {}
    let accountsSum
    promises.push(
      (async () => {
        accountsSum = await this.App.DB.models.mvlShopCustomerAccount.sum('balance', {
          where: { type: this.config.accountType }
        }).catch(e => console.error(e))
      })()
    )
    for (const key in periods) {
      if (Object.prototype.hasOwnProperty.call(periods, key)) {
        const { start, end } = this.getStartEndFromPeriod(periods[key])
        // console.log('PERIOD', key, periods[key], 'START', start, 'END', end, 'PERIOD TYPE', typeof periods[key] === 'object' ? periods[key].constructor.name : typeof periods[key])
        promises.push(
          (async () => { receive[key] = await this.getReceiveSum(null, start, end) })(),
          (async () => { withdrawal[key] = await this.getWithdrawalSum(null, start, end) })()
        )
      }
    }
    await Promise.allSettled(promises)
    return { accountsSum, receive, withdrawal }
  }

  // /**
  //  * Counter uses objective method for queries
  //  * @param user
  //  * @param current
  //  * @param depth
  //  * @return {Promise<{level1: number, level3: number, level2: number}>}
  //  */
  // async getReferralsCountByLevels (user, current, depth = null) {
  //   if (depth === null) depth = Math.max(Object.keys(this.config.levels))
  //   const referrals = await user.getReferrals()
  //   let key = 'level' + current
  //   let counts = {[key]: referrals.length}
  //   if (current < depth) {
  //     const next = current + 1
  //     key = 'level' + next
  //     counts[key] = 0
  //     for (const referral of referrals) {
  //       const nextCounts = await this.getReferralsCountByLevels(referral, next, depth)
  //       for (const levelKey in nextCounts) {
  //         if (Object.prototype.hasOwnProperty.call(nextCounts, levelKey)) {
  //           if (levelKey in counts) counts[levelKey] += nextCounts[levelKey]
  //           else counts[levelKey] = nextCounts[levelKey]
  //         }
  //       }
  //     }
  //   }
  //   return counts
  // }

  async getReferralsCountByLevels (user = null, start = null, end = null) {
    const count = {}
    const levels = Object.keys(this.config.levels)
    let level = parseInt(levels[0])
    const max = parseInt(levels[levels.length - 1])
    const where = {}
    if (user !== null) where.RefParentId = [user.id]
    if (start !== null) where.createdAt = { [this.App.DB.S.Op.gte]: start }
    if (end !== null) where.createdAt = { [this.App.DB.S.Op.lte]: end }
    while (level <= max) {
      if (where.RefParentId.length) {
        const userIds = await this.App.DB.models.mvlUser.findAll({ where, attributes: ['id'], raw: true })
        // console.log('COUNTS BY LEVELS. LEVEL', level, 'USER IDS', userIds)
        count[level] = userIds.length
        where.RefParentId = []
        for (const userId of userIds) where.RefParentId.push(userId.id)
      } else count[level] = 0
      // console.log('COUNTS BY LEVELS. LEVEL', level, 'COUNT', count[level])
      level++
    }
    return count
  }

  async getReceiveSum (user, start = null, end = null) {
    // console.log('GET RECEIVE BY SUM')
    return await this.getLogSum(user, 'gt', start, end)
  }

  async getWithdrawalSum (user, start = null, end = null) {
    // console.log('GET WITHDRAWAL BY SUM')
    return -1 * (await this.getLogSum(user, 'lt', start, end))
  }

  async getLogSum (user, comparison = 'gt', start = null, end = null) {
    const where = { type: this.config.accountType, amount: { [this.App.DB.S.Op[comparison]]: 0 } }
    if (user !== null) where.CustomerId = user.id
    if (start !== null) where.createdAt = { [this.App.DB.S.Op.gte]: start }
    if (end !== null) where.createdAt = { [this.App.DB.S.Op.lte]: end }
    return (
      await this.App.DB.models.mvlShopCustomerAccountLog.sum('amount', { where, logging: console.log })
        .catch((e) => {
          console.error(e)
          return 0
        })
    ) || 0
  }

  async requestCreate (user, amount, request) {
    user = this.getUser(user)
    return this.App.DB.models.mvlShopReferralRequest.create({
      amount,
      type: request.type || this.config.defaultRequestType,
      requisites: request.requisites || {},
      method: request.method || this.config.defaultRequestMethod,
      extended: request.extended || {},
      CustomerId: user.id

    })
  }

  async getProfileExt (userOrProfile) {
    let ext = {}
    const profile = await this.getProfile(userOrProfile)
    if (!mt.empty(profile)) ext = mt.extract(this.config.profileExtendedKey, profile.get('extended'), {})
    return ext
  }

  async getProfile (userOrProfile) {
    return userOrProfile instanceof this.App.DB.models.mvlUser ? await userOrProfile.getProfile() : userOrProfile
  }

  async setProfileExt (userOrProfile, newExt) {
    const profile = await this.getProfile(userOrProfile)
    if (!mt.empty(profile)) {
      const ext = profile.get('extended')
      ext[this.config.profileExtendedKey] = newExt
      profile.set('extended', ext)
      await profile.save()
    }
    return profile
  }

  async setPersonalLevels (userOrProfile, levels) {
    const ext = this.getProfileExt(userOrProfile)
    ext.levels = levels
    return this.setProfileExt(userOrProfile, ext)
  }

  getStartEndFromPeriod (period) {
    let start = null
    let end = null
    if (period !== undefined && period !== null) {
      if (typeof period === 'string' || (typeof period === 'object' && period instanceof Date)) start = period
      else if (typeof period === 'object') {
        if (!mt.empty(period.start)) start = period.start
        if (!mt.empty(period.end)) end = period.end
      }
    } else {
      // console.log('PERIOD EMPTY:', periods[key])
    }
    return { start, end }
  }
}

module.exports = mvlShopReferralController
