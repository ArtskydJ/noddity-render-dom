var render = require('noddity-renderer')
var Ractive = require('ractive')
var extend = require('xtend')
var after = require('after')
Ractive.DEBUG = false

var VALID_NODDITY_TEMPLATE_ELEMENT = '.noddity-template[data-noddity-post-file-name][data-noddity-template-arguments][data-noddity-partial-name]'
var FILENAME_ATTRIBUTE = 'data-noddity-post-file-name'
var ARGUMENTS_ATTRIBUTE = 'data-noddity-template-arguments'
var PARTIAL_NAME_ATTRIBUTE = 'data-noddity-partial-name'

/*
options is an object like:
{
	linkifier,
	butler,
	el,
	data
}
*/
module.exports = function getRenderedPostWithTemplates(rootPost, options) {
	if (!options.linkifier || !options.butler || !options.el || !options.data) {
		throw new Error('Must haz moar options!')
	}
	var getPost = options.butler.getPost

	var ractive = new Ractive({
		el: options.el,
		template: render(rootPost, options.linkifier),
		data: extend(options.data, rootPost.metadata)
	})

	scan(getPost, ractive)
}

function scan(getPost, ractive) {
	var nodes = ractive.findAll(VALID_NODDITY_TEMPLATE_ELEMENT)
	var filenamesToUuidsMap = getFilenameToUuidsMap(nodes)
	var uuidToArgumentsMap = getUuidToArgumentsMap(nodes)

	var filenamesToFetch = Object.keys(filenamesToUuidsMap).filter(filenameHasNoPartial(ractive))

	if (filenamesToFetch.length > 0) {
		var next = after(filenamesToFetch.length, function fetched(err) {
			scan(getPost, ractive)
		})

		filenamesToFetch.forEach(function (filename) {
			getPost(filename, function (err, post) {
				if (!err) {
					ractive.resetPartial(filename, post.content)

					filenamesToUuidsMap[filename].forEach(function (uuid) {
						var templateArgs = uuidToArgumentsMap[uuid]
						var partialData = extend(post.metadata, templateArgs)
						var context = makePartialString(filename, partialData)
						ractive.resetPartial(uuid, context)
					})
				}
				next(err)
			})
		})
	}
}

function getFilenameToUuidsMap(nodes) {
	return nodes.reduce(function (map, node) {
		var filename = node.getAttribute(FILENAME_ATTRIBUTE)
		var uuid = node.getAttribute(PARTIAL_NAME_ATTRIBUTE)

		if (!map[filename]) map[filename] = []
		map[filename].push(uuid)
		return map
	}, {})
}

function getUuidToArgumentsMap(nodes) {
	return nodes.reduce(function (map, node) {
		var uuid = node.getAttribute(PARTIAL_NAME_ATTRIBUTE)
		var templateArgs = node.getAttribute(ARGUMENTS_ATTRIBUTE)
		try {
			map[uuid] = JSON.parse(templateArgs)
		} catch (e) {}
		return map
	}, {})
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
