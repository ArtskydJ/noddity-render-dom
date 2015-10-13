var test = require('tape')

var makeTestState = require('./helpers/test-state')

test('embedded templates', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('herp', { title: 'Some title', date: new Date(), markdown: false }, 'lookit {{1}}')

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					setTimeout(function () {
						t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah lookit wat lookit huh</p> post that I <em>totally</em> wrote</p>')
						t.end()
					}, 50)
				})
			})
		})
	})
})

test('three markdown files deep', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::file3.md|wat:: ::file3.md|huh::')
	state.retrieval.addPost('file3.md', { title: 'Some title', date: new Date() }, 'lookit {{1}}')

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					setTimeout(function() {
						t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah <p>lookit wat</p> <p>lookit huh</p></p> post that I <em>totally</em> wrote</p>')
						t.end()
					}, 100)
				})
			})
		})
	})
})

test('filename starting with a number', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::2.md:: post that I *totally* wrote')
	state.retrieval.addPost('2.md', { title: 'Some title', date: new Date() }, 'lol yeah')
	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					setTimeout(function() {
						t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah</p> post that I <em>totally</em> wrote</p>')
						t.end()
					}, 10)
				})
			})
		})
	})
})

test('render by filename instead of post objects', function(t) {
	var state = makeTestState()
	t.plan(3)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::2.md:: post that I *totally* wrote')
	state.retrieval.addPost('2.md', { title: 'Some title', date: new Date() }, 'lol yeah')
	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent('file1.md', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function() {
				t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah</p> post that I <em>totally</em> wrote</p>')
				t.end()
			}, 10)
		})
	})
})
