# noddity-render-dom

> Render Noddity posts to the DOM

[![Build Status](https://travis-ci.org/ArtskydJ/noddity-render-dom.svg?branch=master)](https://travis-ci.org/ArtskydJ/noddity-render-dom)

# example

```js
var renderDom = require('noddity-render-dom')
var Butler = require('noddity-butler')
var Linkifier = require('noddity-linkifier')
var LevelJs = require('level-js')

var db = new LevelJs('noddity-posts-db')
var butler = new Butler('http://example.com/blogfiles/', db)
var linkifier = new Linkifier('#/myposts/')

var options = {
	butler: butler,
	linkifier: linkifier,
	el: 'body',
	data: {
		config: {
			configProperty: 'configValue'
		},
		arbitraryValue: 'lol'
	}
}

renderDom('post-template.html', options, function (err, setCurrent) {
	setCurrent('my-awesome-post.md', function (err) {
		if (err) throw err // 404
	})
})
```

# api

```js
var renderDom = require('noddity-render-dom')
```

## `renderDom(post, options, cb)`

- `post`: a Noddity post object or a post filename
- `options`: all the other arguments
	- `butler`: a [Noddity Butler](https://www.npmjs.com/package/noddity-butler)
	- `linkifier`: a [Noddity Linkifier](https://www.npmjs.com/package/noddity-linkifier)
	- `el`: a selector string of the element to which the Ractive object will be bound. *Optional*
	- `data`: Any properties on the `data` object will be made available to the templates. *Optional*
- `cb(err, setCurrent)`: a function to be called when the first render is finished.

## `setCurrent(post, [cb])`

`setCurrent` is a function/event emitter.

Call the function to change the current post to a different post.

- `post`: a Noddity post object, or a post filename
- `cb(err)`: an optional function that is called when the current post is set or a fatal error occurs

### events

- `error(err)` is emitted on non-fatal errors, e.g. an embedded template not loading
	- `err` is an Error object

```js
setCurrent('my-post.md', function (err) {
	if (err) throw err // Could not set 'my-post.md' to be the current post
})

setCurrent.on('error', function (err) {
	console.error(err) // Probably an embedded template didn't load
})
```

# values accessible in ractive expressions

- `postList`: an array of post objects that have dates, ordered by date descending.  Metadata is accessible on the object iself without having to use the `metadata` property
- `posts`: an object whose keys are the post file names, and whose value is the post object.  Right now the keys all have periods `.` stripped from them due to an issue with Ractive
- `removeDots`: a function that takes a string as input and returns a version with dots `.` removed
- `current`: the file name of the currently displayed post (the one specified in the url)

# license

[VOL](http://veryopenlicense.com)
