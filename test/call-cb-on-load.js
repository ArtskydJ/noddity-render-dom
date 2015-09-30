var test = require('tape')
var makeTestState = require('./helpers/test-state')

test('call the callback when initially loaded', { timeout: 5000 }, function(t) {
	var state = makeTestState()
	t.plan(4)

	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'one ::x:: ::a::')
	state.retrieval.addPost('x', { title: 'Title', date: new Date() }, 'x')
	state.retrieval.addPost('a', { title: 'Title', date: new Date(), markdown: false }, 'a ::b::')
	state.retrieval.addPost('b', { title: 'Title', date: new Date(), markdown: false }, 'b ::c::')
	state.retrieval.addPost('c', { title: 'Title', date: new Date(), markdown: false }, 'c ::d::')
	state.retrieval.addPost('d', { title: 'Title', date: new Date(), markdown: false }, 'd')

	state.retrieval.getPost('file1.md', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, initialHtml) {
			t.notOk(err, 'no error')
			t.equal(initialHtml, '<p>one <p>x</p> a b c d</p>')
			t.equal(document.querySelector('body').innerHTML, '<p>one <p>x</p> a b c d</p>')
			t.end()
		})
	})
})
