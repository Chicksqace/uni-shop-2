import {mapGetters} from 'vuex'
export default {
  computed:{
    ...mapGetters('m_cart',['total'])
  },
  watch:{
    total(){
      this.setBadge()
    }
  },
  onShow() {
    this.setBadge()
  },
  methods:{
    setBadge(){
      uni.setTabBarBadge({
        index:2,//下标索引第二就是购物车的tabbar
        text:this.total+''//必须是字符串
      })
    }
  }
}