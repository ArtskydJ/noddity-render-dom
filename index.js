var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var runParallel = require('run-parallel')
var oneTime = require('onetime')
var EventEmitter = require('events').EventEmitter
Ractive.DEBUG = false

module.exports = function renderDom(post, options, cb) {
	if (!options || !options.linkifier || !options.butler || !options.data) {
		throw new Error('Expected linkifier, butler, and data properties on options object.')
	}
	var butler = options.butler
	cb = oneTime(cb)
	var renderPost = render.bind(null, options.linkifier)

	postOrString(post, butler, initialize)

	function initialize(err, rootPost) {
		if (err) return cb(err)
		var rendered = renderPost(rootPost)

		var ractive = new Ractive({
			el: options.el,
			data: extend(options.data || {}, rootPost.metadata),
			template: rendered.templateString
		})
		ractive.resetPartial('current', '') // required until https://github.com/ractivejs/ractive/pull/2187

		augmentData(rootPost, butler, function (err, data) {
			if (err) return cb(err)

			ractive.set(data)

			cb(null, setCurrent)
		})

		function setCurrent(post, onLoadCb) {
			if (typeof post === 'string') throw new Error('TODO') // postOrString(post, butler, cb)
			var util = {
				getPost: butler.getPost,
				renderPost: renderPost,
				ractive: ractive
			}
			var partialString = makePartialString(post.filename)
			ractive.resetPartial('current', partialString)
			scan(post, util, rendered.filenameUuidsMap, rendered.uuidArgumentsMap, function () {})
			setTimeout(onLoadCb, 500, null)
		}

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

	}
}

function render(linkifier, post) {
	var filenameUuidsMap = {}
	var uuidArgumentsMap = {}
	var ast = parseTemplate(post, linkifier)
	var templateString = ast.map(function (piece) {
		if (piece.type === 'template') {
			var id = uuid()
			if (!filenameUuidsMap[piece.filename]) filenameUuidsMap[piece.filename] = []
			filenameUuidsMap[piece.filename].push(id)
			uuidArgumentsMap[id] = piece.arguments
			return makePartialString(id)
		} else if (piece.type === 'string') {
			return piece.value
		}
	}).join('')

	return {
		templateString: templateString,
		filenameUuidsMap: filenameUuidsMap,
		uuidArgumentsMap: uuidArgumentsMap
	}
}

function scan(post, util, filenameUuidsMap, uuidArgumentsMap, onLoadCb) {
	var ractive = util.ractive

	var rendered = util.renderPost(post)

	var partialName = normalizePartialName(post.filename)
	ractive.resetPartial(partialName, rendered.templateString)

	filenameUuidsMap = extendMapOfArrays(filenameUuidsMap, rendered.filenameUuidsMap)
	uuidArgumentsMap = extend(uuidArgumentsMap, rendered.uuidArgumentsMap)

	;(filenameUuidsMap[post.filename] || []).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs) // parent post metadata is not transferred...
		var childContextPartial = makePartialString(post.filename, partialData)
		var partialName = normalizePartialName(uuid)
		ractive.resetPartial(partialName, childContextPartial)
	})

	var filenamesToFetch = Object.keys(filenameUuidsMap).filter(filenameHasNoPartial(ractive))

	var tasks = filenamesToFetch.map(function (filename) {
		return function task(next) {
			util.getPost(filename, function (err, childPost) {
				if (!err) {
					scan(childPost, util, filenameUuidsMap, uuidArgumentsMap)
				}
				next(err)
			})
		}
	})
	runParallel(tasks, onLoadCb)
}

function normalizePartialName(partialName) {
	return partialName.replace(/\./g, '_')
}

function makePartialString(partialName, partialContext) {
	partialName = normalizePartialName(partialName)
	partialContext = (partialContext ? JSON.stringify(partialContext) : '')
	return '{{>\'' + partialName + '\' ' + partialContext + '}}'
}

function filenameHasNoPartial(ractive) {
	return function (filename) {
		return !ractive.partials[normalizePartialName(filename)]
	}
}

function extendMapOfArrays(map1, map2) {
	return Object.keys(map1).concat(Object.keys(map2)).reduce(function (combined, key) {
		combined[key] = (map1[key] || []).concat(map2[key] || [])
		return combined
	}, {})
}

function postOrString(post, butler, cb) {
	if (typeof post === 'string') {
		butler.getPost(post, cb)
	} else {
		cb(null, post)
	}
}

function augmentData(post, butler, cb) {
	butler.getPosts(function(err, posts) {
		if (err) {
			cb(err)
		} else {
			cb(null, {
				postList: posts.map(function(post) {
					return extend(post, post.metadata)
				}),
				posts: posts.reduce(function(posts, post) {
					posts[post.filename] = post
					return posts
				}, {}),
				current: post.filename
			})
		}
	})
}

function makeEmitter(fn) {
	var emitter = new EventEmitter()
	Object.keys(EventEmitter.prototype).filter(function(key) {
		return typeof EventEmitter.prototype[key] === 'function'
	}).forEach(function(key) {
		fn[key] = EventEmitter.prototype[key].bind(emitter)
	})
}
