var test = require('tape')
var Ractive = require('ractive')
var makeTestState = require('./helpers/test-state')

test('ractive does not call console.warn', function (t) {
	var state = makeTestState()

	// Setup
	var originalConsoleWarn = console.warn
	var originalConsoleLog = console.log
	console.warn = t.fail
	console.log = function () {}
	Ractive.DEBUG = true

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false },
			'{{>current}}{{postList.join("").replace(/.*/,"")}}{{Object.keys(posts).join("").replace(/.*/,"")}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'Here is an ::file3.md:: thing...')
	state.retrieval.addPost('file3.md', { title: 'Some title', date: new Date(), markdown: false }, 'EMBEDDED')
	state.render('post', {}, function (err, setCurrent) {
		t.ifError(err)

		setCurrent('file1.md', function (err) {
			t.ifError(err)
			setTimeout(function() {
				t.equal(setCurrent.ractive.toHTML(), '<p>This is a post that I <em>totally</em> wrote</p>')

				setCurrent('file2.md', function (err) {
					t.ifError(err)
					setTimeout(function() {
						t.equal(setCurrent.ractive.toHTML(), '<p>Here is an EMBEDDED thing...</p>')

						// Teardown
						Ractive.DEBUG = false
						console.warn = originalConsoleWarn
						console.log = originalConsoleLog
						t.end()
					}, 100)
				})

			}, 100)
		})
	})
})
