var test = require('tape')
var makeTestState = require('./helpers/test-state')

test('call the callback when initially loaded', { timeout: 1000 }, function(t) {
	var state = makeTestState()

	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('herp', { title: 'Some title', date: new Date(), markdown: false }, 'lookit {{1}}')

	state.retrieval.getPost('file1.md', function(err, post) {
		state.render(post, {}, function (err) {
			t.notOk(err, 'no error')
			t.equal(document.querySelector('body').innerHTML, '<p>This is a <p>lol yeah lookit wat lookit huh</p> post that I <em>totally</em> wrote</p>')
			t.end()
		})
	})
})
