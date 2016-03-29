var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var extendMutate = require('xtend/mutable')
var uuid = require('random-uuid-v4')
var oneTime = require('onetime')
var makeEmitter = require('make-object-an-emitter')
var each = require('async-each')

var BASE_DATA = {
	postList: [],
	posts: {}
}

module.exports = function renderDom(rootPostOrString, options, cb) {
	if (!options || !options.linkifier || !options.butler) {
		throw new Error('Expected linkifier and butler properties on options object.')
	}
	var butler = options.butler
	cb = oneTime(cb)

	postOrString(rootPostOrString, butler, function (err, rootPost) {
		if (err) return cb(err)
		var state = {
			filenameUuidsMap: {},
			uuidArgumentsMap: {}
		}
		var currentFilename = ''

		var ractive = new Ractive({
			el: options.el,
			data: extend(BASE_DATA),
			// staticDelimiters: [ '[[static]]', '[[/static]]' ],
			// staticTripleDelimiters: [ '[[[static]]]', '[[[/static]]]' ],
			template: makePartialString(rootPost.filename)
		})
		function resetPartial(partialName, templateString) {
			ractive.resetPartial(partialName, '[[=[[static]] [[/static]]=]]\n' + templateString) // See issue #18
		}
		function partialExists(filename) {
			return filename && !!ractive.partials[filename]
		}

		function setCurrent(currentPostOrString, setCurrentData, onLoadCb) {
			if (typeof setCurrentData === 'function') {
				onLoadCb = setCurrentData
				setCurrentData = {}
			}
			if (!onLoadCb) onLoadCb = function (err) { if (err) throw err }
			if (!setCurrentData) setCurrentData = {}

			postOrString(currentPostOrString, butler, function (err, currPost) {
				if (err) return onLoadCb(err)

				augmentCurrentData(currPost, butler, { local: true }, function(err, postListData) {
					if (err) return onLoadCb(err)

					scan(currPost, util, state, currentFilename === currPost.filename, function() {
						var startingData = extend(BASE_DATA, options.data || {}, postListData, setCurrentData, {
							removeDots: removeDots,
							metadata: currPost.metadata,
							current: currPost.filename
						})

						currentFilename = currPost.filename

						ractive.reset(startingData) // reset() removes old data

						onLoadCb(null)

						augmentCurrentData(currPost, butler, { local: false }, function(err, data) {
							if (err) {
								console.error(err)
							}

							ractive.set(data)
						})
					})
				})
			})
		}

		makeEmitter(setCurrent)
		setCurrent.ractive = ractive

		var util = {
			getPost: butler.getPost,
			renderPost: render.bind(null, options.linkifier),
			emit: setCurrent.emit.bind(setCurrent),
			partialExists: partialExists,
			resetPartial: resetPartial
		}

		butler.on('post changed', function (filename, post) {
			if (partialExists(filename)) { // Only cares about posts that are in the system
				if (filename === currentFilename) { // Current post changed
					setCurrent(post)
				} else {
					scan(post, util, state, true)
				}
			}
		})

		scan(rootPost, util, state)
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

function scan(post, util, state, thisPostChanged, cb) {
	cb = cb || function noop() {}
	var rendered = util.renderPost(post)

	// The following line causes a ractive warning if the "current" template is undefined
	util.resetPartial(post.filename, rendered.templateString.replace('{{{html}}}', '{{>current}}'))

	extendMapOfArraysMutate(state.filenameUuidsMap, rendered.filenameUuidsMap)
	extendMutate(state.uuidArgumentsMap, rendered.uuidArgumentsMap)

	// Create embedded contexts
	var uuids = state.filenameUuidsMap[post.filename]
	if (state.filenameUuidsMap[post.filename]) {
		uuids.filter(function (uuid) {
			return thisPostChanged || !util.partialExists(uuid)
		}).forEach(function (uuid) {
			var templateArgs = state.uuidArgumentsMap[uuid]
			var partialData = extend(post.metadata, templateArgs)
			util.resetPartial(uuid, makePartialString(post.filename, partialData))
		})
	}

	function fetchPost(filename, cb) {
		util.getPost(filename, function (err, childPost) {
			if (err) {
				console.error(err)
				util.emit('error', err)
				cb()
			} else if (childPost) {
				scan(childPost, util, state, null, cb)
			} else {
				cb()
			}
		})
	}

	// Fetch any files that were found
	var postsToLoad = Object.keys(rendered.filenameUuidsMap)
	if (postsToLoad.length > 0) {
		each(postsToLoad, fetchPost, cb)
	} else {
		cb()
	}
}

function makePartialString(partialName, partialContext) {
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

function augmentCurrentData(post, butler, options, cb) {
	butler.getPosts(options, function(err, posts) {
		if (err) {
			cb(err)
		} else {
			cb(null, extend(post.metadata, {
				postList: posts.reverse().filter(function(post) {
					return typeof post.metadata.title === 'string' && post.metadata.date
				}).map(function(post) {
					return extend(post, post.metadata)
				}),
				posts: posts.reduce(function(posts, post) {
					posts[removeDots(post.filename)] = post
					return posts
				}, {})
			}))
		}
	})
}

function removeDots(str) {
	return str.replace(/\./g, '')
}
