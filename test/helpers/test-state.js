var TestRetrieval = require('./retrieval-stub.js')
var renderDom = require('../../index.js')
var levelmem = require('level-mem')
var Butler = require('noddity-butler')
var Linkify = require('noddity-linkifier')
require('ractive').DEBUG = false

module.exports = function testState(retrieval, butlerOptions) {
	retrieval = retrieval || new TestRetrieval()
	var db = levelmem('no location', {
		valueEncoding: require('noddity-butler/test/retrieval/encoding.js')
	})
	var butler = new Butler(retrieval, db, butlerOptions || {
		refreshEvery: 100
	})
	var linkifier = new Linkify('#/prefix/')

	function render(rootPost, data, cb) {
		if (!rootPost) throw new Error('No root post!')
		renderDom(rootPost, {
			butler: butler,
			linkifier: linkifier,
			data: data
		}, cb)
	}

	return {
		retrieval: retrieval,
		render: render,
		butler: butler
	}
}
