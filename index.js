/**
 * fis.baidu.com
 */

var path = require('path');

module.exports = function(fis, isMount) {
  var sets = {
    'namespace': '',
    'static': 'static',
    'template': 'template',
    'smarty': {
      'left_delimiter': '{%',
      'right_delimiter': '%}'
    }
  };

  fis.set('server.type', 'smarty');

  var matchRules = {
    // all release to $static dir
    '*': {
      release: '/${static}/${namespace}/$0'
    },
    '*.{js,css,less}': {
      useHash: true
    },
    '*.js': {
      optimizer: fis.plugin('uglify-js')
    },
    '*.less': {
      parser: fis.plugin('less'),
      rExt: '.css'
    },
    '*.tmpl': {
      parser: fis.plugin('bdtmpl', {
        LEFT_DELIMITER : '<#',
        RIGHT_DELIMITER : '#>'
      }),
      rExt: '.js'
    },
    '*.{css,less}': {
      optimizer: fis.plugin('clean-css')
    },
    '::image': {
      useHash: true
    },
    '*.png': {
      optimizer: fis.plugin('png-compressor')
    },
    '/(**.tpl)': {
      preprocessor: fis.plugin('extlang'),
      optimizer: [
        fis.plugin('smarty-xss'),
        fis.plugin('html-compress')
      ],
      useMap: true,
      release: '/${template}/${namespace}/$1'
    },
    '*.{tpl,js}': {
      useSameNameRequire: true
    },
    // page dir
    '/page/**.tpl': {
      // 标记是否是个页面，向下兼容
      extras: {
        isPage: true
      }
    },
    // widget
    '/(widget/**.tpl)': {
      url: '${namespace}/$1',
      useMap: true,
    },
    '/widget/{*.{js,css},**/*.{js,css}}': {
      isMod: true
    },
    '/{plugin/**.*,smarty.conf,domain.conf,**.php}': {
      release: '$0'
    },
    'server.conf': {
      release: '/server-conf/${namespace}.conf'
    },
    '/static/(**)': {
      release: '/${static}/${namespace}/$1'
    },
    // test & config
    '/(test)/(**)': {
      useMap: false,
      release: '/$1/${namespace}/$2'
    },
    '/(config)/(**)': {
      useMap: false,
      release: '/$1/${namespace}/$2'
    },
    '${namespace}-map.json': {
      release: '/config/$0'
    },
    '*.sh': {
      release: '$0'
    },
    '::package': {
      prepackager: [
        fis.plugin('widget-inline'),
        fis.plugin('js-i18n')
      ]
    }
  };

  function mount() {
    // smarty
    fis.set('system.localNPMFolder', path.join(__dirname, 'node_modules'));

    // since fis3@3.3.21
    // 帮当前目录的查找提前在 global 查找的前面，同时又保证 local 的查找是优先的。
    if (fis.require.paths && fis.require.paths.length) {
      fis.require.paths.splice(1, 0, path.join(__dirname, 'node_modules'));
    }

    fis.util.map(sets, function(key, value) {
      fis.set(key, value);
    });

    fis.util.map(matchRules, function(selector, rules) {
      fis.match(selector, rules);
    });

    // 模块化支持
    fis.hook('commonjs');

    // map.json
    fis.match('::package', {
      postpackager: function createMap(ret) {
        var path = require('path')
        var root = fis.project.getProjectPath();
        var map = fis.file.wrap(path.join(root, fis.get('namespace') ? fis.get('namespace') + '-map.json' : 'map.json'));;
        map.setContent(JSON.stringify(ret.map, null, map.optimizer ? null : 4));
        ret.pkg[map.subpath] = map;
      }
    });
  }

  if (isMount !== false) {
    mount();
  }

  return {
    loadPath: path.join(__dirname, 'node_modules'),
    sets: sets,
    matchRules: matchRules
  }
};
