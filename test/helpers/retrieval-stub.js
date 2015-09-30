module.exports = function TestRetrieval() {
	var index = []
	var posts = {}

	this.removeFromIndex = function removeFromIndex(name) {
		index = index.filter(function(stringInIndex) {
			return stringInIndex !== name
		})
	}
	this.removePost = function removePost(name) {
		delete posts[name]
		this.removeFromIndex(name)
	}
	this.addPost = function addPost(name, metadata, content) {
		index.push(name)
		posts[name] = {
			metadata: metadata,
			content: content,
			filename: name
		}
	}
	this.getIndex = function getIndex(cb) {
		setTimeout(cb.bind(null, false, index), 10)
	}
	this.getPost = function getPost(name, cb) {
		setTimeout(function() {
			if (typeof posts[name] === 'undefined') {
				cb("There's nothing there named " + name + ", idiot")
			} else {
				cb(false, posts[name])
			}
		}, 100)
	}
}
