<template>
  <view class="my-settle-container">
    <!-- 全选 -->
    <label class="radio" @click="changeAllState">
      <radio color="#c00000" :checked="isFullCheck" /><text>全选</text>
    </label>
    <!-- 合计 -->
    <view class="amount-box">
      合计：<text class="amount">￥{{checkedGoodsAmount}}</text>
    </view>
    <!-- 结算按钮 -->
    <view class="btn-settle" @click="settlement">结算({{checkedCount}})</view>
  </view>
</template>

<script>
  import {mapGetters,mapMutations,mapState} from 'vuex'
  export default {
    name:"my_settle",
    data() {
      return {
        // 倒计时的秒数
        seconds:3,
        // 定时器的id
        timer:null
      };
    },
    computed:{
      ...mapGetters('m_cart',['checkedCount','total','checkedGoodsAmount']),
      ...mapGetters('m_user',['addstr']),
      ...mapState('m_user',['token']),
      ...mapState('m_cart',['cart']),
      isFullCheck(){
        return this.total===this.checkedCount
      }
    },
    methods:{
      ...mapMutations('m_cart',['updateAllGoodsState']),
      ...mapMutations('m_user',['updateRedirectInfo']),
      changeAllState(){
        this.updateAllGoodsState(!this.isFullCheck)
      },
      // 点击了结算按钮
      settlement() {
        // 1. 先判断是否勾选了要结算的商品
        if (!this.checkedCount) return uni.$showMsg('请选择要结算的商品！')
        // 2. 再判断用户是否选择了收货地址
        if (!this.addstr) return uni.$showMsg('请选择收货地址！')
        // 3. 最后判断用户是否登录了
        // if (!this.token) return uni.$showMsg('请先登录！')
        if (!this.token) return this.delayNavigate()
        this.payOrder()
      },
      // 微信支付
      async payOrder() {
        // 1. 创建订单
        // 1.1 组织订单的信息对象
        const orderInfo = {
          // 开发期间，注释掉真实的订单价格，
          // order_price: this.checkedGoodsAmount,
          // 写死订单总价为 1 分钱
          order_price: 0.01,
          consignee_addr: this.addstr,
          goods: this.cart.filter(x => x.goods_state).map(x => ({ goods_id: x.goods_id, goods_number: x.goods_count, goods_price: x.goods_price }))
        }
        // 1.2 发起请求创建订单
        const { data: res } = await uni.$http.post('/api/public/v1/my/orders/create', orderInfo)
        if (res.meta.status !== 200) return uni.$showMsg('创建订单失败！')
        // 1.3 得到服务器响应的“订单编号”
        const orderNumber = res.message.order_number
        // 2. 订单预支付
         // 2.1 发起请求获取订单的支付信息
         const { data: res2 } = await uni.$http.post('/api/public/v1/my/orders/req_unifiedorder', { order_number: orderNumber })
         // 2.2 预付订单生成失败
         if (res2.meta.status !== 200) return uni.$showError('预付订单生成失败！')
         // 2.3 得到订单支付相关的必要参数
         const payInfo = res2.message.pay
         // 3. 发起微信支付
          // 3.1 调用 uni.requestPayment() 发起微信支付
          const [err, succ] = await uni.requestPayment(payInfo)
          // 3.2 未完成支付
          if (err) return uni.$showMsg('订单未支付！')
          // 3.3 完成了支付，进一步查询支付的结果
          const { data: res3 } = await uni.$http.post('/api/public/v1/my/orders/chkOrder', { order_number: orderNumber })
          // 3.4 检测到订单未支付
          if (res3.meta.status !== 200) return uni.$showMsg('订单未支付！')
          // 3.5 检测到订单支付完成
          uni.showToast({
            title: '支付完成！',
            icon: 'success'
          })
       },

      // 延迟导航到 my 页面
      delayNavigate() {
        this.seconds=3
        // 1. 展示提示消息，此时 seconds 的值等于 3
        this.showTips(this.seconds)
        // 2. 创建定时器，每隔 1 秒执行一次
        this.timer=setInterval(() => {
          // 2.1 先让秒数自减 1
          this.seconds--
          if(this.seconds<=0){
            clearInterval(this.timer)
            uni.switchTab({
              url:'/pages/my/my',
              success:()=>{
                this.updateRedirectInfo({
                  // 跳转的方式
                  openType: 'switchTab',
                  // 从哪个页面跳转过去的
                  from: '/pages/cart/cart'
                })
              }
            })
            // 这个return是防止后面的提示信息依然出现
            return
          }
          // 2.2 再根据最新的秒数，进行消息提示
          this.showTips(this.seconds)
        }, 1000)
      },
      // 展示倒计时的相关信息
      showTips(n){
        uni.showToast({
          icon:'none',
          title:'请登录后再结算！'+n+'秒之后自动跳转到登录界面',
          // 点击穿透，防止用户点击后面的值
          mask:true,
          duration:1500
        })
      }
    },
  }
</script>

<style lang="scss">
.my-settle-container{
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 50px;
  background-color: red;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: white;
  font-size: 14px;
  padding-left: 5px;
  .radio{
    display: flex;
    align-items: center;
  }
  .amount-box{
    .amount{
      color: #c00000;
      font-weight: bold;
    }
  }
  .btn-settle{
    background-color: #c00000;
    height: 50px;
    color: white;
    line-height: 50px;
    padding: 0 10px;
    min-width: 100px;
    text-align: center;
  }
}
</style>