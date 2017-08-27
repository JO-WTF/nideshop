'use strict';

import Base from './base.js';
const rp = require("request-promise");
const request = require("request");
var config=require('./config');

export default class extends Base {

    // 支付类型 1 微信支付 2支付宝
    // TODO 支付功能由于没有公司账号和微信支付账号，所以没有经过测试，如您可以提供相关账号测试，可联系 tumobi@163.com

    /**
     * 获取支付信息（订单信息和支持的支付方式信息）
     * @return {Promise} []
     */
    async indexAction() {
        //auto render template file index_index.html
        return this.display();
    }

    /**
     * 获取支付的请求参数
     * @returns {Promise<PreventPromise|void|Promise>}
     */
    async payPrepayAction() {

        const orderId = this.get('orderId');
        const payType = this.get('payType');

        const orderInfo = await this.model('order').where({id: orderId}).find();
        if (think.isEmpty(orderInfo)) {
            return this.fail(400, '订单已取消');
        }
        console.log(orderInfo)
        if (parseInt(orderInfo.pay_status) !== 0) {
            return this.fail(400, '订单已支付，请不要重复操作');
        }

        //微信支付统一调用接口，body参数请查看微信支付文档：https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_sl_api.php?chapter=9_1
        let options = {
            method: 'POST',
            url: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
            body: {
                appid: 'payload',
                mch_id: '',
                sub_appid: '',
                sub_mch_id: '',
                device_info: '',
                nonce_str: think.uuid(32),
                sign: '',
                sign_type: 'MD5',
                body: '',
                out_trade_no: '',
                total_fee: orderInfo.actual_price * 100,
                spbill_create_ip: '',
                notify_url: '',
                trade_type: 'JSAPI',
                openid: '',
                sub_openid: '',
            },
						json:true
        };
        //let payParam = await rp(options);

        //统一返回成功，方便测试
        return this.success({
            'timeStamp': getTime().toString(),
            'nonceStr': think.uuid(16),
            'package': 'prepay_id=wx201410272009395522657a690389285100',
            'signType': 'MD5',
            'paySign': 'jdsdlsdsd',
        });
    }

		/**
		 * 更改订单支付状态: 未支付更改为已支付
		 */
		async changePayStatusAction() {

				const orderId = this.get('orderId');
				const payType = this.get('payType');

				const orderInfo = await this.model('order').where({id: orderId}).find();
				if (think.isEmpty(orderInfo)) {
						return this.fail(400, '订单已取消');
				}
				console.log(orderInfo)
				if (parseInt(orderInfo.pay_status) !== 0) {
						return this.fail(400, '订单已支付，请不要重复操作');
				}

				newOrderInfo = await this.model('order').where({ id: orderId }).update({
		      pay_status: 1,
					pay_time: parseInt(new Date().getTime() / 1000)
					/** 待办：
					 *	pay_id: 支付ID, 如微信支付单号
					 *	pay_name: 支付人姓名（需要？）
					 *	pay_method: 支付方式
					 */
		    });
		}

		/**
		 * 订单通知：货到付款订单直接发送通知；在线支付订单支付状态改变时发送通知
		 */
		async notifyShopAction() {
				const orderId = this.get('orderId');
				const payType = this.get('payType');
				const orderInfo = await this.model('order').where({id: orderId}).find();
				if (think.isEmpty(orderInfo)) {
						return this.fail(400, '订单已取消');
				}
				console.log(orderInfo)
				let goodsList = await this.model('order_goods').where({order_id: orderInfo.id}).select();
				let orderGoodsList='';
				goodsList.forEach(v => {
						 orderGoodsList=orderGoodsList+v.goods_name+"*"+v.number+"\n";
				});


				//获取openid
		    let options = {
		      method: 'GET',
		      url: 'https://api.weixin.qq.com/cgi-bin/token',
		      qs: {
		        grant_type: 'client_credential',
		        secret: config.wxpushsecret,
		        appid: config.wxpushid
		      },
					json: true
		    };
		    let access_token = await rp(options);
				console.log(access_token.access_token);

				let options2 = {
		      method: 'POST',
		      url: 'https://api.weixin.qq.com/cgi-bin/message/template/send?access_token='+access_token.access_token.toString(),
		      body: {
						touser:'oSqQOw1t90SbnwRDSnkYZFloJeAM',
		        template_id: 'tRTemTRV3kqN4sXvTkXR2PSGfeV3qZWISvSaek8YihY',
						data:{
							first:"接收到新订单！",
							keyword1:{value:orderInfo.id},
							keyword2:{value:orderGoodsList},
							keyword3:{value:orderInfo.actual_price},
							keyword4:{value:orderInfo.consignee},
							keyword5:{value:'货到付款'},
							remark:{value:orderInfo.postscript}
						}
					},
					json:true
		    };
				let notification = await rp(options2);
				console.log(notification);

				return this.success(notification);

				// if (payType>=1){
				// 	const orderInfo = await this.model('order').where({id: orderId}).find();
				// 	if (parseInt(orderInfo.pay_status) == 0) {
				// 			return this.fail(400, '订单支付状态未改变，不发送通知');
				// 	}
				// }

		}
}
