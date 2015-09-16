var render = require('noddity-renderer')
var Ractive = require('ractive')
var extend = require('xtend')

var NODDITY_SPAN_SELECTOR = '.noddity-template[data-noddity-post-file-name][data-noddity-template-arguments]'

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

	var rootData = extend(options.data, rootPost.metadata)
	var rootRactive = new Ractive({
		el: options.el,
		template: render(rootPost, options.linkifier),
		data: rootData
	})

	var childRactive = null

	function switchPost(postName) {
		var node = rootRactive.find('#noddity-entry-point')
		if (childRactive) childRactive.teardown()
		getPost(postName, function(err, newPost) {
			childRactive = new Ractive({
				template: render(newPost, options.linkifier),
				data: extend(rootData, newPost.metadata)
			})
		})
	}

	/*
	ractive find all noddity template divs
	for each div found:
		create a ractive obj with those attributes
		make the child ractive listen on its parents demise


	*/

	return switchPost
})
