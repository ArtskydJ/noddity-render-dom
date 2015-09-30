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
var butler = new Butler('http://example.com/blogfiles/', levelUpDb)
var linkifier = new Linkifier('#/myposts/')

butler.getPost('excellent-missive.md', function(err, post) {
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

	renderDom(post, options)
})
```

# api

```js
var renderDom = require('noddity-render-dom')
```

## `renderDom(post, options)`

- `post`: a Noddity post object returned by a Noddity Butler
- `options`: all the other arguments
	- `butler`: a [Noddity Butler](https://www.npmjs.com/package/noddity-butler)
	- `linkifier`: a [Noddity Linkifier](https://www.npmjs.com/package/noddity-linkifier)
	- `el`: a selector string of the element to which the Ractive object will be bound
	- `data`: Any properties on the `data` object will be made available to the templates.

# license

[VOL](http://veryopenlicense.com)
