var TestRetrieval = require('./retrieval-stub.js')
var staticRenderer = require('../../index.js')
var levelmem = require('level-mem')
var Butler = require('noddity-butler')
var Linkify = require('noddity-linkifier')

module.exports = function testState() {
	var retrieval = new TestRetrieval()
	var db = levelmem('no location', {
		valueEncoding: require('noddity-butler/test/retrieval/encoding.js')
	})
	var butler = new Butler(retrieval, db, {
		refreshEvery: 100
	})
	var linkifier = new Linkify('#/prefix')

	if (!document.querySelector('#test')) {
		var ele = document.createElement('div')
		ele.id = 'test'
		document.body.appendChild(ele)
	}

	function render(post, data, cb) {
		staticRenderer(post, {
			butler: butler,
			linkifier: linkifier,
			el: '#test',
			data: data
		}, cb)
	}

	return {
		retrieval: retrieval,
		render: render
	}
}
