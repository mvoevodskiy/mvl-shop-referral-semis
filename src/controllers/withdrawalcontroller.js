const { MVLoaderBase } = require('mvloader')
const mt = require('mvtools')
const { DateTime } = require('luxon')

class mvlShopReferralWithdrawalController extends MVLoaderBase {
  constructor (App, ...config) {
    const localDefaults = {
      levels: {
        1: 10,
        2: 7,
        3: 5
      },
      statuses: {
        new: 'new',
        done: 'done',
        cancelled: 'cancelled'
      },
      defaultRequest: {
        type: 'withdrawal',
        method: 'bankCard',
        status: 'new'
      },
      minPeriod: 0,
      minAmount: 0
    }
    super(localDefaults, ...config)
    this.App = App
    this.caption = this.constructor.name
    this.STATUSES = {
      NEW: 'new',
      DONE: 'done',
      CANCELLED: 'cancelled'
    }
    this.ERRORS = {
      NOT_ENOUGH_BALANCE: 'notEnoughBalance',
      PREV_WITHDRAWAL_NEAR: 'prevWithdrawalNear'

    }
  }

  async init () {
    return super.init()
  }

  async initFinish () {
    super.initFinish()
    this.Shop = this.App.ext.semis.mvlShop
    this.Referral = this.App.ext.controllers.mvlShopReferral
  }

  async create (user, amount, method, requisites) {
    if (typeof user === 'object' && user !== null && !(user instanceof this.App.DB.models.mvlUser)) {
      amount = user.amount
      method = user.method
      requisites = user.requisites
      user = user.user
    }
    user = await this.Referral.getUser(user)
    const refStatus = await this.Referral.status(user)
    const can = await this.can(refStatus)
    if (can) {
      const request = await this.App.DB.models.mvlShopReferralRequest.create(mt.merge(this.config.defaultRequest, { amount, CustomerId: user.id, method, requisites }))
      return this.success('', { request })
    } else {
      let code
      let message
      if (!can.canSum) {
        code = this.ERRORS.NOT_ENOUGH_BALANCE
        message = 'Not enough money at balance'
      }
      if (!can.canDate) {
        code = this.ERRORS.PREV_WITHDRAWAL_NEAR
        message = 'Not enough time has passed since the previous withdrawal'
      }
      return this.failure(message, {}, code)
    }
  }

  async can (refStatus, request = null) {
    const last = refStatus.lastWithdrawal !== null ? refStatus.lastWithdrawal.createdAt : null
    const balance = !mt.empty(refStatus.account) ? (refStatus.account.balance || 0) : 0
    // console.log('WITHDRAWAL CAN. LAST', last, 'BALANCE', balance, 'REQUEST', request)
    const newDate = this.config.period !== 0 ? DateTime.fromJSDate(last).plus(this.config.period) : null
    const canSum = balance > this.config.minAmount && (parseFloat(request || '0') <= parseFloat(balance))
    const canDate = this.config.period === 0 || (last === null) || (newDate <= DateTime.local())
    const where = {
      CustomerId: !mt.empty(refStatus.account) ? (refStatus.account.CustomerId || 0) : 0,
      status: this.STATUSES.NEW
    }
    const pending = await this.App.DB.models.mvlShopReferralRequest.count({ where, logging: console.log })
    const can = canSum && canDate && (pending === 0)
    return { can, canSum, canDate, pending, newDate, minAmount: this.config.minAmount }
  }
}

module.exports = mvlShopReferralWithdrawalController
