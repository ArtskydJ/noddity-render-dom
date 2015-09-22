var render = require('noddity-renderer')
var Ractive = require('ractive')
var extend = require('xtend')
var uuid = require('random-uuid-v4')
var runParallel = require('run-parallel') // using run-parallel because async-all does not support arrays.
Ractive.DEBUG = false;

var VALID_NODDITY_TEMPLATE_ELEMENT = '.noddity-template[data-noddity-post-file-name][data-noddity-template-arguments]'
var ARGUMENTS_ATTRIBUTE = 'data-noddity-template-arguments'
var FILENAME_ATTRIBUTE = 'data-noddity-post-file-name'

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

	nodes.forEach(createContextReference)

	var fileNames = getFileNames(nodes)

	// Maybe all the logic needs to be rewritten
	// 1. To allow for "lifecycle events" (like when the butler says "new post")
	// 2. To avoid line 70
	// 3. To fix the attempt to inline a partial reference (line 98)

	var getNewPosts = fileNames
		.filter(fileNameHasNoPartial(ractive)) // new file names
		.map(function (fileName) {
			return function (next) {
				getPost(fileName, next)
			}
		})

	runParallel(getNewPosts, function (err, posts) {
		posts.forEach(function (post) {
			ractive.resetPartial(post.filename, post.content)
		})

		nodes.forEach(function (node) {
			var templateId = node.getAttribute('data-noddity-template-id')
			if (!ractive.partials[templateId]) {
				var postFileName = node.getAttribute('data-noddity-post-file-name')
				var templateArgs = node.getAttribute('data-noddity-template-arguments')
				templateArgs = JSON.parse(templateArgs) // do this safely?

				// ReferenceError: post is not defined
				// Can't get the post easily now, because the filename array was filtered to get the new posts.
				var context = extend(post.metadata, templateArgs)

				var contextPartialContent = makePartialString(postFileName, context)
				ractive.resetPartial(templateId, contextPartialContent)
			}
		})

		if (posts && posts.length) scan(getPost, ractive)
	})
}

function getFileNames(nodes) {
	var fileNameMap = nodes.reduce(function (fileNameMap, node) {
		var fileName = node.getAttribute('data-noddity-post-file-name')
		fileNameMap[fileName] = true
		return fileNameMap
	}, {})
	return Object.keys(fileNameMap)
}

function createContextReference(node) {
	var templateId = node.getAttribute('data-noddity-template-id')
	if (!templateId) {
		templateId = uuid()
		node.setAttribute('data-noddity-template-id', templateId)

		// THIS IS THE WRONG WAY TO DROP A STRING INTO THE DOM!!!
		// I think this partial reference needs to be dropped into the template before it can be put into the dom.
		// Does this mean we have to parse a dom string?
		node.innerHTML = makePartialString(templateId) // drop {{>123-12-12-1234}} into the dom
	}
}

function filenameToPartialName(partialName) {
	return partialName.replace(/\./g, '_')
}

function makePartialString(partialName, partialContext) {
	partialContext = JSON.stringify(partialContext) || ''
	return '{{>' + partialName + ' ' + partialContext + '}}'
}

function fileNameHasNoPartial(ractive) {
	return function (fileName) {
		return !ractive.partials[filenameToPartialName(fileName)]
	}
}
