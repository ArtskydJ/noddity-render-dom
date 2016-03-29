var test = require('tape-catch')
var makeTestState = require('./helpers/test-state')

test('call the callback when initially loaded (post object style)', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')
	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'main ::x:: ::a:: main')
	state.retrieval.addPost('x', { title: 'Title', date: new Date() }, 'x')
	state.retrieval.addPost('a', { title: 'Title', date: new Date(), markdown: false }, 'a ::b::')
	state.retrieval.addPost('b', { title: 'Title', date: new Date(), markdown: false }, 'b ::c::')
	state.retrieval.addPost('c', { title: 'Title', date: new Date(), markdown: false }, 'c ::d::')
	state.retrieval.addPost('d', { title: 'Title', date: new Date(), markdown: false }, 'd')

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					t.equal(setCurrent.ractive.toHTML(), 'container <p>main <p>x</p> a b c d main</p> container')
					t.end()
				})
			})
		})
	})
})

test('call the callback when initially loaded (post filename style)', function(t) {
	var state = makeTestState()
	t.plan(3)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')
	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'main ::x:: ::a:: main')
	state.retrieval.addPost('x', { title: 'Title', date: new Date() }, 'x')
	state.retrieval.addPost('a', { title: 'Title', date: new Date(), markdown: false }, 'a ::b::')
	state.retrieval.addPost('b', { title: 'Title', date: new Date(), markdown: false }, 'b ::c::')
	state.retrieval.addPost('c', { title: 'Title', date: new Date(), markdown: false }, 'c ::d::')
	state.retrieval.addPost('d', { title: 'Title', date: new Date(), markdown: false }, 'd')

	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')
		setCurrent('file1.md', function (err) {
			t.notOk(err, 'no error')
			t.equal(setCurrent.ractive.toHTML(), 'container <p>main <p>x</p> a b c d main</p> container')
			t.end()
		})
	})
})
