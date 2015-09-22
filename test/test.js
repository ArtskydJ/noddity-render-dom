var test = require('tape')

var makeTestState = require('./helpers/test-state')

test('embedded templates', function(t) {
	var state = makeTestState()

	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::herp|wat:: ::herp|huh::')
	state.retrieval.addPost('herp', { title: 'Some title', date: new Date(), markdown: false }, 'lookit {{1}}')

	state.retrieval.getPost('file1.md', function(err, post) {
		state.render(post, {})

		setTimeout(function() {
			t.equal(document.querySelector('#test').innerHTML, '<p>This is a <span class="noddity-template" data-noddity-post-file-name="file2.md" data-noddity-template-arguments="{}"><p>lol yeah <span class="noddity-template" data-noddity-post-file-name="herp" data-noddity-template-arguments="{&quot;1&quot;:&quot;wat&quot;}">lookit wat</span> <span class="noddity-template" data-noddity-post-file-name="herp" data-noddity-template-arguments="{&quot;1&quot;:&quot;huh&quot;}">lookit huh</span></p></span> post that I <em>totally</em> wrote</p>')
			t.end()
		}, 1000)
	})
})

test('three markdown files deep', function(t) {
	var state = makeTestState()

	state.retrieval.addPost('file1.md', { title: 'Some title', date: new Date() }, 'This is a ::file2.md:: post that I *totally* wrote')
	state.retrieval.addPost('file2.md', { title: 'Some title', date: new Date() }, 'lol yeah ::file3.md|wat:: ::file3.md|huh::')
	state.retrieval.addPost('file3.md', { title: 'Some title', date: new Date() }, 'lookit {{1}}')

	state.retrieval.getPost('file1.md', function(err, post) {
		state.render(post, {})

		setTimeout(function() {
			t.equal(document.querySelector('#test').innerHTML, '<p>This is a <span class="noddity-template" data-noddity-post-file-name="file2.md" data-noddity-template-arguments="{}"><p>lol yeah <span class="noddity-template" data-noddity-post-file-name="file3.md" data-noddity-template-arguments="{&quot;1&quot;:&quot;wat&quot;}"><p>lookit wat</p></span> <span class="noddity-template" data-noddity-post-file-name="file3.md" data-noddity-template-arguments="{&quot;1&quot;:&quot;huh&quot;}"><p>lookit huh</p></span></p></span> post that I <em>totally</em> wrote</p>')
			t.end()
		}, 1000)
	})
})
