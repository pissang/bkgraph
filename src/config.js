// 所有组件样式
define({
    levels: [
        {
            position: 0,
            title: '僵尸粉',
            content: '我真的只是路过而已，不要叫我僵尸粉啦，不过这张图还是蛮有意思的，你们也赶紧来看看啊~~~ —— 百度知识图谱'
        },
        {
            position: 8,
            title: '初级粉',
            content: '在家宅的飞起！！！其实我看看电视电影就满足了，但是还是蛮想了解更多的，可惜出去看演唱会什么的好麻烦的！！！但是看看这张图我就什么都懂啦！！！ —— 百度知识图谱'
        },
        {
            position: 20,
            title: '中级粉',
            content: '整天宅在家里多不好，还是要出去看看偶像的演唱会的 ，不能当终极粉我还能当个中级粉嘛！！！你想陪我一起去么，可以先看看这张图哟！！！ —— 百度知识图谱'
        },
        {
            position: 40,
            title: '高级粉',
            content: '高级粉成就get！！！国内演唱会，我一场不漏，你们能做到么！！！先保证这张图的所有关系你都了解再来跟我PK吧！！！ —— 百度知识图谱'
        },
        {
            position: 60,
            title: '顶级粉',
            content: '那句歌词怎么唱的，“不管世界变得怎么样，只要有你就会是天堂”，对的，有TA的地方，就会有我，想要追随我的脚步？先看看这张图吧！！！ —— 百度知识图谱'
        },
        {
            position: 90,
            title: '私生粉',
            content: '哈哈哈！！！终于这个世界上没有人对TA的热爱程度能超过我了！！！我就是传说中的私生饭！！！想超越我？看看下面的图再说吧~~~233333 —— 百度知识图谱'
        },
        {
            position: 100,
            title: '',
            interval: 0
        }
    ],

    enableAnimation: !!document.createElement('canvas').getContext,
    // enableAnimation: true,
    
    circleKeywords: '男友,女友,妻子,老婆,丈夫,老公,绯闻,暧昧,对象,干爹,真爱,夫妻,情侣,不和,私生子,艳照门,前夫,前妻,密友,中戏校友,情人',

    voteAPI: 'http://api.open.baidu.com/pae/component/api/vote',
    voteProjectHuoying: 'ks_huoying',

    layout: {
        layerDistance: [0, 100, 300, 300, 300, 300, 300],
        layerConstraint: 0.3
    },

    defaultNodeImage: 'img/default-avatar.png',

    isPlat: false
});