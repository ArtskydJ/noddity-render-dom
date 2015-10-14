var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var extendMutate = require('xtend/mutable')
var uuid = require('random-uuid-v4')
var oneTime = require('onetime')
var makeEmitter = require('make-object-an-emitter')
var parallel = require('run-parallel')
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
			data: {},
			template: rendered.templateString
		})
		var state = {
			filenameUuidsMap: rendered.filenameUuidsMap,
			uuidArgumentsMap: rendered.uuidArgumentsMap
		}
		ractive.resetPartial('current', '')

		function setCurr(thisPostChanged, currentPostOrString, onLoadCb) {
			if (!onLoadCb) onLoadCb = function () {}

			postOrString(currentPostOrString, butler, function (err, currPost) {
				if (err) return onLoadCb(err)

				augmentCurrentData(currPost, butler, function (err, data) {
					if (err) return onLoadCb(err)

					data.removeDots = removeDots
					ractive.reset(extend(options.data || {}, data)) // remove old data

					var partialString = makePartialString(currPost.filename)
					ractive.resetPartial('current', partialString)
					scan(currPost, util, state.filenameUuidsMap, state.uuidArgumentsMap, thisPostChanged)

					onLoadCb(null)
				})
			})
		}
		var setCurrent = setCurr.bind(null, false)

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

		var util = {
			getPost: butler.getPost,
			renderPost: renderPost,
			emit: setCurrent.emit.bind(setCurrent),
			ractive: ractive
		}

		butler.on('post changed', function (filename, post) {
			if (partialExists(ractive, filename)) { // only scan for posts that are in the system
				if (filename === ractive.get('current')) {
					setCurr(true, post)
				} else {
					scan(post, util, state.filenameUuidsMap, state.uuidArgumentsMap, true)
				}
			}
		})

		cb(null, setCurrent)
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

function scan(post, util, filenameUuidsMap, uuidArgumentsMap, thisPostChanged) {
	var ractive = util.ractive
	var rendered = util.renderPost(post)

	var partialName = normalizePartialName(post.filename)
	ractive.resetPartial(partialName, rendered.templateString)

	extendMapOfArraysMutate(filenameUuidsMap, rendered.filenameUuidsMap)
	extendMutate(uuidArgumentsMap, rendered.uuidArgumentsMap)

	// Create embedded contexts
	;(filenameUuidsMap[post.filename] || []).filter(function (uuid) {
		var contextDoesNotExist = !partialExists(ractive, uuid)
		return thisPostChanged || contextDoesNotExist
	}).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs)
		var childContextPartial = makePartialString(post.filename, partialData)
		var partialName = normalizePartialName(uuid)
		ractive.resetPartial(partialName, childContextPartial)
	})

	// Fetch any files that were found
	var filenamesToFetch = Object.keys(filenameUuidsMap).filter(function (filename) {
		var fileInThisPost = !!rendered.filenameUuidsMap[filename]
		var fileIsNotAround = !partialExists(ractive, filename)
		return thisPostChanged ? fileInThisPost : fileIsNotAround
	})

	var tasks = filenamesToFetch.map(function (filename) {
		return function (next) {
			return util.getPost(filename, function (err, childPost) {
				if (err) {
					util.emit('error', err)
					next(null, null)
				} else {
					next(null, childPost)
				}
			})
		}
	})
	parallel(tasks, function (_, childrenPosts) {
		var actualPosts = childrenPosts.filter(Boolean)
		actualPosts.forEach(function (childPost) {
			scan(childPost, util, filenameUuidsMap, uuidArgumentsMap)
		})
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

function partialExists(ractive, filename) {
	return !!ractive.partials[normalizePartialName(filename)]
}

function extendMapOfArrays(map1, map2) {
	return Object.keys(map1).concat(Object.keys(map2)).reduce(function (combined, key) {
		combined[key] = (map1[key] || []).concat(map2[key] || [])
		return combined
	}, {})
}

function extendMapOfArraysMutate(map1, map2) {
	Object.keys(map1).concat(Object.keys(map2)).forEach(function (key) {
		map1[key] = (map1[key] || []).concat(map2[key] || [])
	})
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

function augmentCurrentData(post, butler, cb) {
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
