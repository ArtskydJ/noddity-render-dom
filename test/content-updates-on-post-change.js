var test = require('tape-catch')

var makeTestState = require('./helpers/test-state')

test('contents update when the post changes', function(t) {
	var state = makeTestState()
	t.plan(7)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('herp', { title: 'Some title', date: new Date(), markdown: false }, 'lookit {{1}}')

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')

			setCurrent.on('error', t.fail.bind(t, 'error event'))

			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					setTimeout(function () {
						t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah lookit wat lookit huh</p> post that I <em>totally</em> wrote</p>')

						state.retrieval.addPost('new', { title: 'Some title', date: new Date(), markdown: false, key: 'val' }, 'new {{key}} {{1}}')
						state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date(), lol: 'lolz' }, 'lol yeah ::herp|wat:: {{lol}} ::new|arg::')
						setTimeout(function () {
							t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah lookit wat lolz new val arg</p> post that I <em>totally</em> wrote</p>', 'metadata gets added')

							state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: {{lol}} ::new|arg::')
							setTimeout(function () {
								t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah lookit wat  new val arg</p> post that I <em>totally</em> wrote</p>', 'metadata gets removed')
								t.end()
							}, 700)
						}, 700)
					}, 700)
				})
			})
		})
	})
})

test('contents update when the root post changes', function(t) {
	var state = makeTestState()
	t.plan(4)

	state.retrieval.addPost('root', { title: 'TEMPLAAAATE', markdown: false }, 'Echo {{>current}}')
	state.retrieval.addPost('curr', { title: 'Some title', date: new Date() }, 'Hello world!!! {{title}}')


	state.render('root', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent.on('error', t.fail.bind(t, 'error event'))

		setCurrent('curr', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function () {
				t.equal(setCurrent.ractive.toHTML(), 'Echo <p>Hello world!!! Some title</p>')

				state.retrieval.addPost('root', { title: 'TEMPLAAATE 2', date: new Date(), markdown: false }, 'Echoing {{>current}}')
				setTimeout(function () {
					t.equal(setCurrent.ractive.toHTML(), 'Echoing <p>Hello world!!! Some title</p>')
					t.end()
				}, 500)
			}, 500)
		})
	})
})

test('contents update when the current post changes', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('root', { title: 'TEMPLAAAATE', markdown: false }, 'Echo {{>current}}')
	state.retrieval.addPost('curr', { title: 'Some title', date: new Date() }, 'Hello world!!! {{title}}')


	state.render('root', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent.on('error', t.fail.bind(t, 'error event'))

		setCurrent('curr', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function () {
				t.equal(setCurrent.ractive.toHTML(), 'Echo <p>Hello world!!! Some title</p>')

				state.retrieval.addPost('new', { title: 'Different title', date: new Date(), markdown: false }, '{{1}}')
				state.retrieval.addPost('curr', { title: 'Different title', date: new Date(), markdown: false, key: 'val' }, 'new {{key}} {{title}} ::new|update 1::')
				setTimeout(function () {
					t.equal(setCurrent.ractive.toHTML(), 'Echo new val Different title update 1')

					state.retrieval.addPost('curr', { title: 'Another title', date: new Date(), markdown: false }, 'newer {{key}}{{title}} ::new|update 2::')
					setTimeout(function () {
						t.equal(setCurrent.ractive.toHTML(), 'Echo newer Another title update 2')
						t.end()
					}, 1500)
				}, 700)
			}, 700)
		})
	})
})

test('contents update when the current post changes and setCurrent is called right afterward', function(t) {
	var state = makeTestState()
	t.plan(7)

	state.retrieval.addPost('root', { title: 'TEMPLAAAATE', markdown: false }, 'Echo {{>current}}')
	state.retrieval.addPost('curr', { title: 'Some title', date: new Date() }, 'Hello world!!! {{title}}')


	state.render('root', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent.on('error', t.fail.bind(t, 'error event'))

		setCurrent('curr', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function () {
				t.equal(setCurrent.ractive.toHTML(), 'Echo <p>Hello world!!! Some title</p>')

				state.retrieval.addPost('new', { title: 'Different title', date: new Date(), markdown: false }, '{{1}}')
				state.retrieval.addPost('curr', { title: 'Different title', date: new Date(), markdown: false, key: 'val' }, 'new {{key}} {{title}} ::new|update 1::')
				setCurrent('curr', function (err) {
					t.notOk(err, 'no error')
					setTimeout(function () {
						t.equal(setCurrent.ractive.toHTML(), 'Echo new val Different title update 1')

						state.retrieval.addPost('curr', { title: 'Another title', date: new Date(), markdown: false }, 'newer {{key}}{{title}} ::new|update 2::')
						setCurrent('curr', function (err) {
							t.notOk(err, 'no error')
							setTimeout(function () {
								t.equal(setCurrent.ractive.toHTML(), 'Echo newer Another title update 2')
								t.end()
							}, 1500)
						})
					}, 700)
				})
			}, 700)
		})
	})
})
