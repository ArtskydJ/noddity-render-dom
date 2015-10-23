var test = require('tape')

var makeTestState = require('./helpers/test-state')

test('mediawiki style links work', function(t) {
	var state = makeTestState()
	t.plan(3)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() },
		'This `[[some-page-you-want-to-link-to.md|wiki-style internal links]]` turns into [[some-page-you-want-to-link-to.md|wiki-style internal links]]')
	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent('file1.md', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function() {
				t.equal(setCurrent.ractive.toHTML(), '<p>This <code>[[some-page-you-want-to-link-to.md|wiki-style internal links]]</code> ' +
					'turns into <a href="#/prefix/some-page-you-want-to-link-to.md">wiki-style internal links</a></p>')
				t.end()
			}, 100)
		})
	})
})
