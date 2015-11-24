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

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a post that I *totally* wrote')
	state.render('post', {}, function (err, setCurrent) {
		t.ifError(err)

		setCurrent('file1.md', function (err) {
			t.ifError(err)
			setTimeout(function() {
				t.equal(setCurrent.ractive.toHTML(), '<p>This is a post that I <em>totally</em> wrote</p>')

				// Teardown
				Ractive.DEBUG = false
				console.warn = originalConsoleWarn
				console.log = originalConsoleLog
				t.end()
			}, 10)
		})
	})
})
