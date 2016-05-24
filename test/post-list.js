var test = require('tape-catch')
var makeTestState = require('./helpers/test-state')

test('should not start loading posts until after rendering the first post', function(t) {
	var rendered = false
	var posts = {
		post: {
			filename: 'post',
			metadata: { title: 'TEMPLAAAATE', markdown: false },
			content: '{{>current}}'
		},
		'file1.md': {
			filename: 'file1.md',
			metadata: { title: 'Some title', date: new Date() },
			content: '?{{posts.post.metadata.title}}'
		}
	}
	var retrieval = {
		getIndex: function(cb) {
			process.nextTick(function() {
				cb(null, ['post', 'file1.md', 'file2.md', 'herp'])
			})
		},
		getPost: function(name, cb) {
			if (posts[name]) {
				process.nextTick(function() {
					cb(null, posts[name])
				})
			} else if (!rendered) {
				t.fail('Should not try to load ' + name)
			} else {
				cb(null, {})
			}
		}
	}
	var state = makeTestState(retrieval, {
		refreshEvery: 100,
		loadPostsOnIndexChange: false
	})
	t.plan(4)

	state.retrieval.getPost('post', function(err, post) {
		t.notOk(err, 'no error')
		state.render(post, {}, function (err, setCurrent) {
			t.notOk(err, 'no error')
			setCurrent('file1.md', function(err) {
				t.notOk(err)
				rendered = true
				t.equal(setCurrent.ractive.toHTML(), '<p>?TEMPLAAAATE</p>')
				state.butler.stop()
				t.end()
			})
		})
	})
})
