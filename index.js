var parseTemplate = require('noddity-template-parser')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var runParallel = require('run-parallel')
Ractive.DEBUG = false

//MAIN
//	- RENDER(original post)
//	- make root ractive object with the newly created template string
module.exports = function getRenderedPostWithTemplates(post, options) {
	if (!options.linkifier || !options.butler || !options.el || !options.data) {
		throw new Error('Must haz moar options!')
	}
	var renderPost = function (post) {
		var ast = parseTemplate(post, options.linkifier)
		return render(ast)
	}
	var ractive = new Ractive({
		el: options.el,
		template: renderPost(post).templateString, // FIXME preferably don't call renderPost 2x on `post`
		data: extend(options.data, post.metadata)
	})
	var getPost = options.butler.getPost
	scan(post, getPost, renderPost, ractive, {}, {})
}

// parse the original post
// drop in the uuid partial references
// add the uuid the the filename -> uuid and the uuid -> arguments map
// return a template string
function render(ast) {
	var filenameUuidsMap = {}
	var uuidArgumentsMap = {}

	var templateString = ast.map(function (piece) {
		if (piece.type === 'template') {
			var id = uuid()
			if (!filenameUuidsMap[piece.filename]) filenameUuidsMap[piece.filename] = []
			filenameUuidsMap[piece.filename].push(id)
			uuidArgumentsMap[id] = piece.arguments
			return '{{>\'' + id + '\'}}'
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


//RECURSE
//	- for each unique file name
//		- get that post
//			- RENDER
//			- set up the ractive context partial
function scan(post, getPost, renderPost, ractive, filenameUuidsMap, uuidArgumentsMap) {
	var rendered = renderPost(post)
	ractive.resetPartial(post.filename, rendered.templateString)
	filenameUuidsMap = extendMapOfArrays(filenameUuidsMap, rendered.filenameUuidsMap)
	uuidArgumentsMap = extend(uuidArgumentsMap, rendered.uuidArgumentsMap)

	;(filenameUuidsMap[post.filename] || []).forEach(function (uuid) {
		var templateArgs = uuidArgumentsMap[uuid]
		var partialData = extend(post.metadata, templateArgs)
		var childContextPartial = makePartialString(post.filename, partialData)
		ractive.resetPartial(uuid, childContextPartial)
	})

	var filenamesToFetch = Object.keys(filenameUuidsMap).filter(filenameHasNoPartial(ractive))

	var tasks = filenamesToFetch.map(function (filename) {
		return function task(next) {
			getPost(filename, function (err, childPost) {
				if (!err) {
					scan(childPost, getPost, renderPost, ractive, filenameUuidsMap, uuidArgumentsMap)
				}
				next(err)
			})
		}
	})
	runParallel(tasks, function (err) {
		if (err) console.error(err)
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
