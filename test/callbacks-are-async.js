var test = require('tape')
var makeTestState = require('./helpers/test-state')

test('callback is async (post object style)', function(t) {
	var state = makeTestState()
	t.plan(6)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')
	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'main ::x::')
	state.retrieval.addPost('x', { title: 'Title', date: new Date() }, 'x')
	state.retrieval.addPost('a', { title: 'Title', date: new Date() }, 'a')

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')

		var sync1 = true
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			t.notOk(sync1, 'not synchronous')

			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')

				var sync2 = true
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					t.notOk(sync2, 'not synchronous')
					t.end()
				})
				sync2 = false
			})
		})
		sync1 = false
	})
})

test('callback is async (post filename style)', function(t) {
	var state = makeTestState()
	t.plan(4)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, 'container {{>current}} container')
	state.retrieval.addPost('file1.md', { title: 'Title', date: new Date() }, 'main ::x::')
	state.retrieval.addPost('x', { title: 'Title', date: new Date() }, 'x')

	var sync1 = true
	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')
		t.notOk(sync1, 'not synchronous')

		var sync2 = true
		setCurrent('file1.md', function (err) {
			t.notOk(err, 'no error')
			t.notOk(sync2, 'not synchronous')
			t.end()
		})
		sync2 = false
	})
	sync1 = false
})
