'use strict';

const _ = require('lodash');

/**
 * model
 */
export default class extends think.model.base {


  /**
   * 生成订单的编号order_sn
   * @returns {string}
   */
  generateOrderNumber(){
    let date = new Date();
    return date.getFullYear() + _.padStart(date.getMonth(), 2, '0') + _.padStart(date.getDay(), 2, '0')
          + _.padStart(date.getHours(), 2, '0') + _.padStart(date.getMinutes(), 2, '0') + _.padStart(date.getSeconds(), 2, '0')
          + _.random(100000, 999999);
  }

  /**
   * 获取订单可操作的选项
   * @param orderId
   * @returns {Promise.<{cancel: boolean, delete: boolean, pay: boolean, comment: boolean, delivery: boolean, confirm: boolean, return: boolean}>}
   */
  async getOrderHandleOption(orderId){

    let handleOption = {
      cancel: false,  //取消操作
      delete: false,　//删除操作
      pay: false,　 　//支付操作
      comment: false,　//评论操作
      delivery: false,　//确认收货操作
      confirm: false,　　//完成订单操作
      return: false, //退换货操作
      buy: false, //再次购买
    };

    let orderInfo = await this.where({id: orderId}).find();

    //订单流程：　下单成功－》支付订单－》发货－》收货－》评论

    //订单相关状态字段设计，采用单个字段表示全部的订单状态
    //1xx 表示订单取消和删除等状态 0订单创建成功等待付款，　101订单已取消，　102订单已删除
    //2xx 表示订单支付状态　201订单已付款，等待发货
    //3xx 表示订单物流相关状态　300订单已发货， 301用户确认收货
    //4xx 表示订单退换货相关的状态　401 没有发货，退款　402 已收货，退款退货

    //如果订单已经取消或是已完成，则可删除和再次购买
    if (orderInfo.order_status === 101) {
      handleOption.delete = true;
      handleOption.buy = true;
    }

    //如果订单没有被取消，且没有支付，则可支付，可取消
    if (orderInfo.order_status === 0) {
      handleOption.cancel = true;
      handleOption.pay = true;
    }

    //如果订单为货到付款，没有发货，则可退款操作
    if (orderInfo.order_status === 200) {
      handleOption.return = true;
    }

    //如果订单已付款，没有发货，则可退款操作
    if (orderInfo.order_status === 201) {
      handleOption.return = true;
    }

    //如果订单已经发货，没有收货，则可收货操作和退款、退货操作
    if (orderInfo.order_status === 300) {
      handleOption.cancel = true;
      handleOption.pay = true;
      handleOption.return = true;
    }

    //如果订单已经支付，且已经收货，则可完成交易、评论和再次购买
    if (orderInfo.order_status === 301) {
      handleOption.delete = true;
      handleOption.comment = true;
      handleOption.buy = true;
    }

    return handleOption;
  }

  async getOrderStatusText(orderId){
    let orderInfo = await this.where({id: orderId}).find();
    let statusText = '未付款';
    switch (orderInfo.order_status) {
      case 0:
        statusText = '未付款';
        break;
			case 200:
				statusText = '货到付款';
				break;
			case 201:
				statusText = '已付款';
				break;
			case 300:
				statusText = '已发货';
				break;
			case 301:
				statusText = '已收货';
				break;
    }

    return statusText;
  }

  async getOrderPaymentStatusText(orderId){
    let orderInfo = await this.where({id: orderId}).find();
    let statusText = '未付款';
    switch (orderInfo.pay_status) {
      case 0:
        statusText = '未付款';
        break;
			case 1:
				statusText = '已付款';
				break;
    }

    return statusText;
  }
}
