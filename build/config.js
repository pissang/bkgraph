{
    // appDir: './',
    baseUrl: '../src',
    // optimize: 'none',
    paths: {
        'etpl': '../dep/etpl/src/main',
        'Sizzle': '../dep/sizzle',
        // 使用requirejs的text插件
        'text': '../build/text',
        // 使用优化后的excanvas
        'zrender/dep/excanvas': '../../zrender/src/dep/excanvas3'
    },
    packages: [
        {
            name: 'zrender',
            location: '../../zrender/src',
            main: 'zrender'
        },
        {
            name: 'echarts',
            location: '../../echarts/src',
            main: 'echarts'
        },
        {
            name: 'bkgraph',
            location: './',
            main: 'bkgraph'
        }
    ],
    name: 'bkgraph',

    wrap: {
        'startFile' : ['wrap/start.js', 'almond.js'],
        'endFile' : 'wrap/end.js'
    },

    // http://stackoverflow.com/questions/10196977/how-can-i-prevent-the-require-js-optimizer-from-including-the-text-plugin-in-opt
    stubModules : ['text', 'less'],

    out: '../dist/bkgraph.js'
}