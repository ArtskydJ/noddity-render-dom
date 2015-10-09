var test = require('tape')

var makeTestState = require('./helpers/test-state')

test('contents update when the post changes', function(t) {
	var state = makeTestState()
	t.plan(6)

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

						state.retrieval.addPost('new', { title: 'Some title', date: new Date(), markdown: false, key: 'val' }, 'new {{key}} {{1}}')
						state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date(), lol: 'lolz' }, 'lol yeah ::herp|wat:: {{lol}} ::new|arg::')
						setTimeout(function () {
							t.equal(setCurrent.ractive.toHTML(), '<p>This is a <p>lol yeah lookit wat lolz new val arg</p> post that I <em>totally</em> wrote</p>')

							//console.log(require('util').inspect(setCurrent.ractive.partials, { depth: null }))
							t.end()
						}, 3000)

						setCurrent.on('error', t.fail.bind(t, 'error event'))
					}, 500)
				})
			})
		})
	})
})
