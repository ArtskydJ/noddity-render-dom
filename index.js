var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var runParallel = require('run-parallel')
var oneTime = require('onetime')
Ractive.DEBUG = false

module.exports = function getRenderedPostWithTemplates(post, options, cb) {
	if (!options.linkifier || !options.butler || !options.el || !options.data) {
		throw new Error('Expected linkifier, butler, el, and data properties on options object.')
	}
	cb = oneTime(cb || function (err) { if (err) console.error(err) })

	var renderPost = render.bind(null, options.linkifier)

	var rendered = renderPost(post)
	augmentData(post, options.butler, function (err, data) {
		var ractive = new Ractive({
			el: options.el,
			data: extend(data, options.data, post.metadata),
			template: rendered.templateString
		})
		var util = {
			getPost: options.butler.getPost,
			renderPost: renderPost,
			ractive: ractive
		}
		scan(post, util, rendered.filenameUuidsMap, rendered.uuidArgumentsMap, cb)
	})
}

function render(linkifier, post) {
	var filenameUuidsMap = {}
	var uuidArgumentsMap = {}

	var ast = parseTemplate(post, linkifier)
	var templateString = ast.map(function (piece) {
		if (piece.type === 'template') {
			var id = '_' + uuid()
			if (!filenameUuidsMap[piece.filename]) filenameUuidsMap[piece.filename] = []
			filenameUuidsMap[piece.filename].push(id)
			uuidArgumentsMap[id] = piece.arguments
			return '{{>' + id + '}}'
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

function scan(post, util, filenameUuidsMap, uuidArgumentsMap, cb) {
	var ractive = util.ractive

	;(filenameUuidsMap[post.filename] || []).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialName = filenameToPartialName(post.filename)
		var partialData = extend(post.metadata, templateArgs) // parent post metadata is not transferred...
		var childContextPartial = makePartialString(partialName, partialData)
		ractive.resetPartial(uuid, childContextPartial)
	})

	var filenamesToFetch = Object.keys(filenameUuidsMap).filter(filenameHasNoPartial(ractive))

	var tasks = filenamesToFetch.map(function (filename) {
		return function task(next) {
			util.getPost(filename, function (err, childPost) {
				if (!err) {
					var rendered = util.renderPost(childPost)

					var partialName = filenameToPartialName(childPost.filename)
					ractive.resetPartial(partialName, rendered.templateString)

					scan(childPost, util,
						extendMapOfArrays(filenameUuidsMap, rendered.filenameUuidsMap),
						extend(uuidArgumentsMap, rendered.uuidArgumentsMap),
						cb
					)
				}
				next(err)
			})
		}
	})
	runParallel(tasks, function (err) {
		if (err) {
			cb(err)
		} else if (filenamesToFetch.length === 0) {
			cb(null, ractive.toHTML())
		}
	})
}

function filenameToPartialName(partialName) {
	return partialName.replace(/\./g, '_')
}

function makePartialString(partialName, partialContext) {
	partialContext = JSON.stringify(partialContext) || ''
	return '{{>' + partialName + ' ' + partialContext + '}}'
}

function filenameHasNoPartial(ractive) {
	return function (filename) {
		return !ractive.partials[filenameToPartialName(filename)]
	}
}

function extendMapOfArrays(map1, map2) {
	return Object.keys(map1).concat(Object.keys(map2)).reduce(function (combined, key) {
		combined[key] = (map1[key] || []).concat(map2[key] || [])
		return combined
	}, {})
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
