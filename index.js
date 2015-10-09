var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var oneTime = require('onetime')
var EventEmitter = require('events').EventEmitter
Ractive.DEBUG = false

module.exports = function renderDom(rootPostOrString, options, cb) {
	if (!options || !options.linkifier || !options.butler) {
		throw new Error('Expected linkifier and butler properties on options object.')
	}
	var butler = options.butler
	cb = oneTime(cb)
	var renderPost = render.bind(null, options.linkifier)

	postOrString(rootPostOrString, butler, function (err, rootPost) {
		if (err) return cb(err)
		var rendered = renderPost(rootPost)

		var ractive = new Ractive({
			el: options.el,
			data: extend(options.data || {}),
			template: rendered.templateString
		})
		ractive.resetPartial('current', '') // required until https://github.com/ractivejs/ractive/pull/2187

		augmentRootData(rootPost, butler, function (err, data) {
			if (err) return cb(err)

			ractive.set(data)

			cb(null, setCurrent)
		})

		function setCurrent(currentPostOrString, onLoadCb) {
			postOrString(currentPostOrString, butler, function (err, currPost) {
				if (err) return onLoadCb(err)

				var partialString = makePartialString(currPost.filename)
				ractive.resetPartial('current', partialString)
				scan(currPost, util, rendered.filenameUuidsMap, rendered.uuidArgumentsMap)

				onLoadCb(null)
			})
			global.DEBUG = true // lol
		}

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

		var util = {
			getPost: butler.getPost,
			renderPost: renderPost,
			emit: setCurrent.emit.bind(setCurrent),
			ractive: ractive
		}

		butler.on('post changed', function (filename, post) {
			if (!filenameHasNoPartial(ractive)(filename)) { // only scan for posts that are in the system
				console.log('\n\nPOST CHANGED', filename, '\n\n')
				//scan(post, util, rendered.filenameUuidsMap, rendered.uuidArgumentsMap)
				scan(post, util, {}, {}, true)
			}
		})
	})
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

function scan(post, util, filenameUuidsMap, uuidArgumentsMap, fetchAll) {
	if (global.DEBUG) console.log('scan', post.filename, post.metadata)
	var ractive = util.ractive

	var rendered = util.renderPost(post)

	var partialName = normalizePartialName(post.filename)
	ractive.resetPartial(partialName, rendered.templateString)

	console.log('---rendered.filenameUuidsMap', rendered.filenameUuidsMap)

	filenameUuidsMap = extendMapOfArrays(filenameUuidsMap, rendered.filenameUuidsMap)
	uuidArgumentsMap = extend(uuidArgumentsMap, rendered.uuidArgumentsMap)
	if (global.DEBUG) {
		console.log(' filenameUuidsMap', filenameUuidsMap)
		console.log(' uuidArgumentsMap', uuidArgumentsMap)
	}

	createEmbeddedContexts(post, ractive, filenameUuidsMap, uuidArgumentsMap)

	var filenamesToFetch = Object.keys(filenameUuidsMap)
	console.log(' filename list', filenamesToFetch)
	if (!fetchAll) filenamesToFetch = filenamesToFetch.filter(filenameHasNoPartial(ractive))
	console.log(' fetch these', filenamesToFetch)

	filenamesToFetch.forEach(function (filename) {
		util.getPost(filename, function (err, childPost) {
			if (err) {
				util.emit('error', err)
			} else {
				scan(childPost, util, filenameUuidsMap, uuidArgumentsMap)
			}
		})
	})
}

function createEmbeddedContexts(post, ractive, filenameUuidsMap, uuidArgumentsMap) {
	console.log('creating context for', post.filename)
	;(filenameUuidsMap[post.filename] || []).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs) // parent post metadata is not transferred...
		if (global.DEBUG) {
			console.log('post.metadata 3', post.filename, post.metadata)
			console.log('\npartialData', partialData)
		}
		var childContextPartial = makePartialString(post.filename, partialData)
		var partialName = normalizePartialName(uuid)
		ractive.resetPartial(partialName, childContextPartial)
	})
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
		process.nextTick(function () {
			cb(null, post)
		})
	}
}

function augmentRootData(post, butler, cb) {
	butler.getPosts(function(err, posts) {
		if (err) {
			cb(err)
		} else {
			cb(null, extend(post.metadata, {
				postList: posts.filter(function(post) {
					return post.metadata.date
				}).map(function(post) {
					return extend(post, post.metadata)
				}),
				posts: posts.reduce(function(posts, post) {
					posts[removeDots(post.filename)] = post
					return posts
				}, {}),
				current: post.filename
			}))
		}
	})
}

function removeDots(str) {
	return str.replace(/\./g, '')
}

function makeEmitter(fn) {
	var emitter = new EventEmitter()
	Object.keys(EventEmitter.prototype).filter(function(key) {
		return typeof EventEmitter.prototype[key] === 'function'
	}).forEach(function(key) {
		fn[key] = EventEmitter.prototype[key].bind(emitter)
	})
}
