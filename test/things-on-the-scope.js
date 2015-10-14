var test = require('tape')

var makeTestState = require('./helpers/test-state')

test('post list is properly in scope', function(t) {
	var state = makeTestState()
	t.plan(5)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date(1442361866264) }, ['<ol>{{#postList}}',
				'<li><a href="{{pathPrefix}}{{pagePathPrefix}}{{filename}}">{{title}}</a></li>',
			'{{/postList}}</ol>'].join('\n'))
	state.retrieval.addPost('file2.md', { title: 'Another title', date: new Date(1442361866265) }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('herp', { title: 'Even moar title', date: new Date(1442361866266), markdown: false }, 'lookit {{1}}')

	state.retrieval.getPost('file1.md', function(err, post) {
		var data = {
			pathPrefix: '#!/',
			pagePathPrefix: 'post/'
		}
		state.render(post, data, function (err, setCurrent) {
			t.notOk(err, 'no error')
			state.retrieval.getPost('file1.md', function(err, childPost) {
				t.notOk(err, 'no error')
				setCurrent(childPost, function (err) {
					t.notOk(err, 'no error')
					setTimeout(function() {
						t.notOk(err, 'no error')
						t.equal(setCurrent.ractive.toHTML(), [
							'<ol>',
								'<li><a href="#!/post/file1.md">Some title</a></li>',
								'<li><a href="#!/post/file2.md">Another title</a></li>',
								'<li><a href="#!/post/herp">Even moar title</a></li>',
							'</ol>'].join(''))
						t.end()
					}, 10)
				})
			})
		})
	})
})

test('post list is properly in scope in an embedded template, and the current filename is set at top and embedded levels', function(t) {
	var state = makeTestState()
	t.plan(4)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date(1442361866264) }, ['<ol>{{#postList}}',
				'<li><a href="{{pathPrefix}}{{pagePathPrefix}}{{filename}}">{{title}}</a></li>',
			'{{/postList}}</ol>{{current}}'].join('\n'))
	state.retrieval.addPost('file2.md', { title: 'Another title', date: new Date(1442361866265) }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('container', { title: 'Container', date: new Date(1442361866266), markdown: false }, '::file1.md::{{current}}')

	var data = {
		pathPrefix: '#!/',
		pagePathPrefix: 'post/'
	}
	state.render('post', data, function (err, setCurrent) {
		t.notOk(err, 'no error')

		setCurrent('container', function (err) {
			t.notOk(err, 'no error')
			setTimeout(function () {
				t.notOk(err, 'no error')
				t.equal(setCurrent.ractive.toHTML(), [
					'<ol>',
						'<li><a href="#!/post/file1.md">Some title</a></li>',
						'<li><a href="#!/post/file2.md">Another title</a></li>',
						'<li><a href="#!/post/container">Container</a></li>',
					'</ol>containercontainer'].join(''))
				t.end()
			}, 10)
		})
	})
})

test('removeDots function', function(t) {
	var state = makeTestState()
	t.plan(3)

	state.retrieval.addPost('post', { title: 'TEMPLAAAATE', markdown: false }, '{{>current}}')
	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date(1442361866264), markdown: false }, '{{removeDots("a.b.c")}}')

	state.render('post', {}, function (err, setCurrent) {
		t.notOk(err, 'no error')
		setCurrent('file1.md', function (err) {
			t.notOk(err, 'no error')
			t.equal(setCurrent.ractive.toHTML(), 'abc')
			t.end()
		})
	})
})
