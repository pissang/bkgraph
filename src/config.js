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
            content: '我现在对TA已经了如指掌了，你要不要也来看看TA的圈子有哪些人呢？—— 百度知识图谱',
            interval: 0
        }
    ],
    // weibo分享 随机
    share: [
        '贵圈果然很乱！我在看{name}的图谱，竟然真相了！—— 百度知识图谱',
        '读书少怕被骗？来{name}的图谱一探究竟，一秒变元芳！—— 百度知识图谱',
        '想要逼格甩出别人一个殖民地吗？恐怕答案就在{name}的图谱中了 —— 百度知识图谱',
        '还在纠结{name}复杂的人物关系么？我在看TA的图谱哟，快来跟我一起扒一扒吧~ —— 百度知识图谱'
    ],

    // 样式配置
    // 普通节点不同状态的样式
    nodeStates: {
        normal: {
            shapeStyle: {
                label: {
                    color: '#000',
                    textColor: '#fff'
                },
                outline: {
                    lineWidth: 1,
                    strokeColor: '#e4e9f2'
                }
            }
        },
        hover: {
            shapeStyle: {
                label: {
                    color: '#ff860d'
                },
                outline: {
                    lineWidth: 2,
                    strokeColor: '#ff860d'
                }
            }
        },
        active: {
            shapeStyle: {
                label: {
                    color: '#ff860d'
                },
                outline: {
                    lineWidth: 2,
                    strokeColor: '#ff860d'
                }
            }
        }
    },

    // 主节点不同状态的样式
    mainNodeStates: {
        normal: {
            shapeStyle: {
                label: {
                    color: '#3385ff',
                    textColor: '#fff'
                },
                outline: {
                    lineWidth: 2,
                    strokeColor: '#3385ff'
                }
            },
            labelAlpha: 0.9
        },
        hover: {
            shapeStyle: {
                label: {
                    color: '#ff860d'
                },
                outline: {
                    strokeColor: '#ff860d'
                }
            }
        },
        active: {
            shapeStyle: {
                label: {
                    color: '#ff860d'
                },
                outline: {
                    strokeColor: '#ff860d'
                }
            }
        }
    },

    // 普通边不同状态的样式
    edgeStates: {
        normal: {
            shapeStyle: {
                labelLine: {
                    color: '#3385ff',
                    strokeColor: '#3385ff',
                    textColor: '#3385ff',
                    opacity: 0.3,
                    lineWidth: 1
                }
            }
        },
        hover: {
            shapeStyle: {
                labelLine: {
                    color: '#ff860d',
                    strokeColor: '#ff860d',
                    textColor: '#ff860d',
                    opacity: 1,
                    lineWidth: 1
                }
            }
        },
        active: {
            shapeStyle: {
                labelLine: {
                    color: '#ff860d',
                    strokeColor: '#ff860d',
                    textColor: '#ff860d',
                    opacity: 1,
                    lineWidth: 1
                }
            }
        }
    },

    // 补边不同状态的样式
    extraEdgeStates: {
        normal: {
            shapeStyle: {
                labelLine: {
                    color: '#3385ff',
                    strokeColor: '#3385ff',
                    textColor: '#3385ff',
                    opacity: 0.3,
                    lineWidth: 0.4
                }
            }
        },
        hover: {
            shapeStyle: {
                labelLine: {
                    color: '#ff860d',
                    strokeColor: '#ff860d',
                    textColor: '#ff860d',
                    opacity: 1,
                    lineWidth: 0.4
                }
            }
        },
        active: {
            shapeStyle: {
                labelLine: {
                    color: '#ff860d',
                    strokeColor: '#ff860d',
                    textColor: '#ff860d',
                    opacity: 1,
                    lineWidth: 0.4
                }
            }
        }
    },

    tip: {
        edge: '大家都很关注这里哟，点击一探究竟吧~',
        edgeOther: '大家也很关注这里哟，点击一探究竟吧~',
        node: '点击头像，查看TA的详细资料吧~',
        nodeEnd: '显示已经到头了哦~'
    },

    enableAnimation: !!document.createElement('canvas').getContext,
    // enableAnimation: true,

    voteAPI: 'http://api.open.baidu.com/pae/component/api/vote',
    voteProjectHuoying: 'ks_huoying',

    layout: {
        layerDistance: [0, 200, 300, 300, 300, 300, 300],
        layerConstraint: [100, 1, 0.3, 0.3, 0.2, 0.2, 0.1]
    },

    defaultNodeImage: 'img/default-avatar.png',

    isPlat: false
});