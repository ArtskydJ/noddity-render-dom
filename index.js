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
		var state = renderPost(rootPost)

		var ractive = new Ractive({
			el: options.el,
			data: {},
			// staticDelimiters: [ '[[static]]', '[[/static]]' ],
			// staticTripleDelimiters: [ '[[[static]]]', '[[[/static]]]' ],
			template: makePartialString(rootPost.filename)
		})
		function resetPartial(partialName, templateString) {
			ractive.resetPartial(normalizePartialName(partialName), '[[=[[static]] [[/static]]=]]\n' + templateString) // horrible hack
		}
		function partialExists(filename) {
			return filename && !!ractive.partials[normalizePartialName(filename)]
		}
		resetPartial(rootPost.filename, state.templateString)
		resetPartial('current', '')

		function setCurrent(currentPostOrString, onLoadCb) {
			if (!onLoadCb) onLoadCb = function (err) { if (err) throw err }

			postOrString(currentPostOrString, butler, function (err, currPost) {
				if (err) return onLoadCb(err)

				augmentCurrentData(currPost, butler, function (err, data) {
					if (err) return onLoadCb(err)

					var thisPostChanged = state.current === currPost.filename
					state.current = currPost.filename

					data.removeDots = removeDots
					ractive.reset(extend(options.data || {}, data)) // remove old data

					resetPartial('current', makePartialString(currPost.filename))
					scan(currPost, util, state, thisPostChanged)

					onLoadCb(null)
				})
			})
		}

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

		var util = {
			getPost: butler.getPost,
			renderPost: renderPost,
			emit: setCurrent.emit.bind(setCurrent),
			partialExists: partialExists,
			resetPartial: resetPartial
		}

		butler.on('post changed', function (filename, post) {
			if (partialExists(filename)) { // only scan for posts that are in the system
				if (filename === state.current) {
					setCurrent(post)
				} else {
					scan(post, util, state, true)
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

function scan(post, util, state, thisPostChanged) {
	var rendered = util.renderPost(post)

	util.resetPartial(post.filename, rendered.templateString)

	extendMapOfArraysMutate(state.filenameUuidsMap, rendered.filenameUuidsMap)
	extendMutate(state.uuidArgumentsMap, rendered.uuidArgumentsMap)

	// Create embedded contexts
	;(state.filenameUuidsMap[post.filename] || []).filter(function (uuid) {
		return thisPostChanged || !util.partialExists(uuid)
	}).forEach(function (uuid) {
		var templateArgs = state.uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs)
		util.resetPartial(uuid, makePartialString(post.filename, partialData))
	})

	// Fetch any files that were found
	var filenamesToFetch = Object.keys(state.filenameUuidsMap).filter(function (filename) {
		var fileIsInThisPost = !!rendered.filenameUuidsMap[filename]
		return thisPostChanged ? fileIsInThisPost : !util.partialExists(filename)
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
			scan(childPost, util, state)
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
