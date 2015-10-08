var test = require('tape')
var renderDom = require('../index.js')

test('required options', function (t) {
	var noop = function () {}
	var butler = { getPost: noop }
	var linkifier = { linkify: noop }
	var goodOpts = { butler: butler, linkifier: linkifier }
	
	t.throws(function () {
		renderDom()
	}, 'No arguments')
	t.throws(function () {
		renderDom('rootpost')
	}, 'Post only')
	t.throws(function () {
		renderDom('rootpost', {})
	}, 'Post and empty options')
	t.throws(function () {
		renderDom('rootpost', {}, function () {})
	}, 'Post, empty options, and cb')
	t.throws(function () {
		renderDom('rootpost', goodOpts)
	}, 'post, good opts, no cb')
	t.throws(function () {
		renderDom('rootpost', { butler: butler }, function () {})
	}, 'post, bad opts, cb 1')
	t.throws(function () {
		renderDom('rootpost', { linkifier: linkifier }, function () {})
	}, 'post, bad opts, cb 2')
	t.doesNotThrow(function () {
		renderDom('rootpost', goodOpts, function () {})
	}, 'good opts')
	t.end()
})
