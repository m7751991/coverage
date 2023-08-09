/*
 Copyright (c) 2013, Yahoo! Inc.  All rights reserved.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
var istanbul = require('istanbul'),
  hook = istanbul.hook,
  Report = istanbul.Report,
  utils = istanbul.utils,
  Instrumenter = istanbul.Instrumenter,
  instrumenter = null,
  TreeSummarizer = istanbul.TreeSummarizer,
  baselineCoverage = {};

const cover = require('../../model/Coverage')

//single place to get global coverage object
async function getCoverageObject(data) {
  if (!Object.keys(data).length) {
    console.log('Error: 查询参数为空，请检查');
    return
  }
  // global.__coverage__ = global.__coverage__ || {};
  const result = await cover.findData(data);
  console.log('查询成功');
  return result?.coverage ? JSON.parse(result?.coverage) : {}
}

//returns a matcher that returns all JS files under root
//except when the file is anywhere under `node_modules`
//does not use istanbul.matcherFor() so as to expose
//a synchronous interface
function getRootMatcher(root) {
  return function (file) {
    if (file.indexOf(root) !== 0) {
      return false;
    }
    file = file.substring(root.length);
    if (file.indexOf('node_modules') >= 0) {
      return false;
    }
    return true;
  };
}

//deep-copy object
function clone(obj) {
  if (!obj) {
    return obj;
  }
  return JSON.parse(JSON.stringify(obj));
}
/**
 * save the baseline coverage stats for a file. This baseline is not 0
 * because of mainline code that is covered as part of loading the module
 * @method saveBaseline
 * @param file the file for which baseline stats need to be tracked.
 * @private
 */
async function saveBaseline(file) {
  var coverageObject = await getCoverageObject(),
    fileCoverage;
  if (coverageObject && coverageObject[file]) {
    fileCoverage = coverageObject[file];
    if (!baselineCoverage[file]) {
      baselineCoverage[file] = {
        s: clone(fileCoverage.s),
        f: clone(fileCoverage.f),
        b: clone(fileCoverage.b),
      };
    }
  }
}
/**
 * overwrites the coverage stats for the global coverage object to restore to baseline
 * @method restoreBaseline
 */
async function restoreBaseline() {
  var cov = await getCoverageObject(),
    fileCoverage,
    fileBaseline;
  Object.keys(baselineCoverage).forEach(function (file) {
    fileBaseline = baselineCoverage[file];
    if (cov[file]) {
      fileCoverage = cov[file];
      fileCoverage.s = clone(fileBaseline.s);
      fileCoverage.f = clone(fileBaseline.f);
      fileCoverage.b = clone(fileBaseline.b);
    }
  });
  Object.keys(cov).forEach(function (file) {
    if (!baselineCoverage[file]) {
      //throw it out
      delete cov[file];
    }
  });
}
/**
 * hooks `require` to add instrumentation to matching files loaded on the server
 * @method hookLoader
 * @param {Function|String} matcherOrRoot one of:
 *      a match function with signature `fn(file)` that returns true if `file` needs to be instrumented
 *      a root path under which all JS files except those under `node_modules` are instrumented
 * @param {Object} opts instrumenter options
 */
function hookLoader(matcherOrRoot, opts) {
  /*jslint nomen: true */
  var matcherFn, transformer, postLoadHook, postLoadHookFn;

  opts = opts || {};
  opts.coverageVariable = '__coverage__'; //force this always

  postLoadHook = opts.postLoadHook;
  if (!(postLoadHook && typeof postLoadHook === 'function')) {
    postLoadHook = function (/* matcher, transformer, verbose */) {
      return function (/* file */) { };
    };
  }
  delete opts.postLoadHook;

  if (typeof matcherOrRoot === 'function') {
    matcherFn = matcherOrRoot;
  } else if (typeof matcherOrRoot === 'string') {
    matcherFn = getRootMatcher(matcherOrRoot);
  } else {
    throw new Error('Argument was not a function or string');
  }

  if (instrumenter) {
    return;
  } //already hooked
  instrumenter = new Instrumenter(opts);
  transformer = instrumenter.instrumentSync.bind(instrumenter);
  postLoadHookFn = postLoadHook(matcherFn, transformer, opts.verbose);

  hook.hookRequire(matcherFn, transformer, {
    verbose: opts.verbose,
    postLoadHook: function (file) {
      postLoadHookFn(file);
      saveBaseline(file);
    },
  });
}

function getTreeSummary(collector) {
  var summarizer = new TreeSummarizer();
  collector.files().forEach(function (key) {
    summarizer.addFileCoverageSummary(key, utils.summarizeFileCoverage(collector.fileCoverageFor(key)));
  });
  return summarizer.getTreeSummary();
}

function getPathMap(treeSummary) {
  var ret = {};

  function walker(node) {
    ret[node.fullPath()] = node;
    node.children.forEach(function (child) {
      walker(child);
    });
  }
  walker(treeSummary.root);
  return ret;
}

async function render(filePath, res, prefix, query) {
  var collector = new istanbul.Collector(),
    treeSummary,
    pathMap,
    linkMapper,
    outputNode,
    report,
    fileCoverage,
    coverage = await getCoverageObject(query);

  if (!(coverage && Object.keys(coverage).length > 0)) {
    res.setHeader('Content-type', 'text/plain');
    return res.end('No coverage information has been collected'); //TODO: make this a fancy HTML report
  }

  prefix = prefix || '';
  if (prefix.charAt(prefix.length - 1) !== '/') {
    prefix += '/';
  }

  utils.removeDerivedInfo(coverage);

  collector.add(coverage);
  treeSummary = getTreeSummary(collector);
  pathMap = getPathMap(treeSummary);

  filePath = filePath || treeSummary.root.fullPath();

  outputNode = pathMap[filePath];

  if (!outputNode) {
    res.statusCode = 404;
    return res.end('No coverage for file path [' + filePath + ']');
  }

  linkMapper = {
    hrefFor: function (node) {
      return prefix + 'show?p=' + node.fullPath();
    },
    fromParent: function (node) {
      return this.hrefFor(node);
    },
    ancestor: function (node, num) {
      var i;
      for (i = 0; i < num; i += 1) {
        node = node.parent;
      }
      return this.hrefFor(node);
    },
    asset: function (node, name) {
      return prefix + 'asset/' + name;
    },
  };

  report = Report.create('html', { linkMapper: linkMapper });
  res.setHeader('Content-type', 'text/html');
  if (outputNode.kind === 'dir') {
    report.writeIndexPage(res, outputNode);
  } else {
    fileCoverage = coverage[outputNode.fullPath()];
    console.log(fileCoverage, 'outputNode11');
    utils.addDerivedInfoForFile(fileCoverage);

    report.writeDetailPage(res, outputNode, fileCoverage);
  }

  return res.end();
}

async function mergeClientCoverage(params) {
  const { env, appId } = params
  const obj = params.coverage

  const searchData = {
    env,
    appId
  };
  if (!obj) {
    console.log('必要覆盖率参数不存在');
    return {
      status:false,
      msg:'coverage不能为空'
    };
  }
  var coverage = await getCoverageObject(searchData);
  const isUpdate = Object.keys(coverage).length

  Object.keys(obj).forEach(function (filePath) {
    var original = coverage[filePath],
      added = obj[filePath],
      result;

    if (original) {
      result = utils.mergeFileCoverage(original, added);
    } else {
      result = added;
    }
    coverage[filePath] = result;
  });

  try {
    if (isUpdate) {
      console.log('更新')
      await cover.updataData(searchData, {
        ...params,
        coverage: JSON.stringify(coverage)
      })
    } else {
      console.log('新增')
      await cover.createData({
        ...params,
        coverage: JSON.stringify(coverage)
      })
    }
    return  {
      status:true,
      msg:'成功'
    }
  } catch (error) {
    console.log(error);
    return  {
      status:false,
      msg:'写入失败',
      error
    }
  }


  // console.log(data,'result');
}

module.exports = {
  getCoverageObject: getCoverageObject,
  getInstrumenter: function () {
    return instrumenter;
  },
  restoreBaseline: restoreBaseline,
  hookLoader: hookLoader,
  render: render,
  mergeClientCoverage: mergeClientCoverage,
};
